from __future__ import annotations

import gc
import hashlib
import json
import math
import os
import sys
import threading
from collections import deque
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from time import perf_counter
from typing import Any, Dict, List

import pandas as pd
import psutil

from .config import get_settings
from .data_access import extract_buildings, extract_street_graph, make_bounding_polygon
from .routing import (
    add_final_weights,
    add_samples_to_edges,
    compute_route,
    compute_shortest_route,
    compute_shade_weights,
    summarize_route,
)
from .shadow import project_shadows
from shapely.geometry import box, Polygon, MultiPolygon


def get_memory_usage_mb() -> float:
    """Get current process memory usage in MB."""
    try:
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024
    except Exception:
        # Fallback if psutil is not available
        return 0.0


def estimate_object_size_mb(obj: Any) -> float:
    """Estimate object size in MB using sys.getsizeof recursively."""
    import sys
    from collections import deque
    
    seen = set()
    size = 0
    
    def _get_size(o):
        obj_id = id(o)
        if obj_id in seen:
            return 0
        seen.add(obj_id)
        
        s = sys.getsizeof(o)
        if isinstance(o, dict):
            s += sum(_get_size(k) + _get_size(v) for k, v in o.items())
        elif isinstance(o, (list, tuple, deque)):
            s += sum(_get_size(item) for item in o)
        elif isinstance(o, set):
            s += sum(_get_size(item) for item in o)
        return s
    
    return _get_size(obj) / 1024 / 1024


@dataclass
class ShadowRouteResult:
    polyline: list[list[float]]
    shadow_ratio: float
    shadow_segments: list[dict]
    metadata: dict[str, Any]


class ShadowRoutingService:
    """High-level orchestration of data extraction, shadow modeling, and routing."""

    def __init__(self):
        self.settings = get_settings()
        # 內存緩存: {key: (timestamp, result, params)}
        self._memory_cache: Dict[str, tuple[float, ShadowRouteResult, dict[str, Any]]] = {}
        
        # 文件系統緩存索引表
        self.cache_dir = Path(self.settings.cache_dir) / "route"
        self.cache_dir.mkdir(exist_ok=True)

        # 索引文件
        self.index_file = self.cache_dir / "index.json"
        
        # 索引表格式: List[{"key": str, "start_lat": float, "start_lon": float, 
        #              "end_lat": float, "end_lon": float, "timestamp": str, 
        #              "alpha": float, "created_at": float}]
        self._index: List[dict[str, Any]] = []
        
        # Memory limits (in MB) - combined limit for both route and graph caches
        self._combined_cache_memory_limit_mb = 300.0
        self._cache_lock = threading.Lock()
        
        # 加載所有索引
        self._load_index()
        
        # Start periodic cleanup thread
        self._start_periodic_cleanup()

    def _start_periodic_cleanup(self) -> None:
        """Start a background thread for periodic cache cleanup (both route and graph caches)."""
        import logging
        logger = logging.getLogger(__name__)
        
        def cleanup_worker():
            import time
            while True:
                try:
                    time.sleep(300)  # Run every 5 minutes
                    self._cleanup_combined_caches_by_memory()
                except Exception as e:
                    logger.error(f"Error in periodic cache cleanup: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
        logger.info("Started periodic unified cache cleanup thread (runs every 5 minutes, cleans both route and graph caches)")

    def _estimate_cache_memory_mb(self) -> float:
        """Estimate total memory usage of the route cache in MB."""
        total_mb = 0.0
        for key, (timestamp, result, params) in self._memory_cache.items():
            # Estimate size of result object
            total_mb += estimate_object_size_mb(result)
            # Estimate size of params (small, but include it)
            total_mb += estimate_object_size_mb(params)
        return total_mb

    def _estimate_combined_cache_memory_mb(self) -> float:
        """Estimate total memory usage of both route and graph caches combined in MB."""
        route_cache_mb = self._estimate_cache_memory_mb()
        
        # Get graph cache memory
        from .data_access import _graph_cache
        graph_cache_mb = _graph_cache._estimate_cache_memory_mb()
        
        return route_cache_mb + graph_cache_mb

    def _cleanup_combined_caches_by_memory(self) -> None:
        """Clean up both route and graph caches if combined memory exceeds limit."""
        import logging
        logger = logging.getLogger(__name__)
        
        from .data_access import _graph_cache
        
        # Acquire locks for both caches
        self._cache_lock.acquire()
        _graph_cache._cache_lock.acquire()
        
        try:
            combined_memory_mb = self._estimate_combined_cache_memory_mb()
            
            if combined_memory_mb <= self._combined_cache_memory_limit_mb:
                return
            
            logger.info(f"Combined cache memory ({combined_memory_mb:.1f} MB) exceeds limit ({self._combined_cache_memory_limit_mb} MB), cleaning up...")
            
            # Clean route cache first (oldest entries)
            route_memory_mb = self._estimate_cache_memory_mb()
            route_removed = 0
            if route_memory_mb > 0:
                sorted_route_entries = sorted(self._memory_cache.items(), key=lambda x: x[1][0])
                while combined_memory_mb > self._combined_cache_memory_limit_mb and sorted_route_entries:
                    oldest_key, (timestamp, result, params) = sorted_route_entries.pop(0)
                    entry_size_mb = estimate_object_size_mb(result) + estimate_object_size_mb(params)
                    self._memory_cache.pop(oldest_key, None)
                    route_removed += 1
                    combined_memory_mb -= entry_size_mb
                    self._index = [e for e in self._index if e.get("key") != oldest_key]
            
            # Clean graph cache if still over limit
            graph_removed = 0
            if combined_memory_mb > self._combined_cache_memory_limit_mb:
                while combined_memory_mb > self._combined_cache_memory_limit_mb and _graph_cache.entries:
                    oldest_entry = _graph_cache.entries.pop(0)
                    entry_size_mb = _graph_cache._estimate_graph_size_mb(oldest_entry[1])
                    combined_memory_mb -= entry_size_mb
                    graph_removed += 1
            
            if route_removed > 0:
                self._save_index()
            if route_removed > 0 or graph_removed > 0:
                route_after = self._estimate_cache_memory_mb()
                graph_after = _graph_cache._estimate_cache_memory_mb()
                logger.info(f"[CACHE] Cleaned up {route_removed} route cache entries and {graph_removed} graph cache entries")
                logger.info(f"[CACHE] After cleanup - Route cache: {route_after:.1f} MB, Graph cache: {graph_after:.1f} MB, Combined: {combined_memory_mb:.1f} MB")
            else:
                logger.debug(f"[CACHE] No cleanup needed - combined memory ({combined_memory_mb:.1f} MB) is within limit")
            
            # Force garbage collection after cleanup
            gc.collect()
        finally:
            _graph_cache._cache_lock.release()
            self._cache_lock.release()

    def _cleanup_cache_by_memory(self, _lock_held: bool = False) -> None:
        """Clean up route cache entries if combined memory exceeds limit.
        
        Args:
            _lock_held: Internal flag indicating if the cache lock is already held.
        """
        # Use the combined cleanup method
        if not _lock_held:
            self._cleanup_combined_caches_by_memory()
        else:
            # If lock is already held, we need to check combined memory
            # but we can't acquire graph cache lock here, so just clean route cache
            # This is a fallback for when called from _set_cache
            import logging
            logger = logging.getLogger(__name__)
            
            combined_memory_mb = self._estimate_combined_cache_memory_mb()
            
            if combined_memory_mb <= self._combined_cache_memory_limit_mb:
                return
            
            # Clean route cache entries
            cache_memory_mb = self._estimate_cache_memory_mb()
            sorted_entries = sorted(self._memory_cache.items(), key=lambda x: x[1][0])
            removed_count = 0
            
            # Calculate how much we need to free from route cache
            excess_mb = combined_memory_mb - self._combined_cache_memory_limit_mb
            
            while excess_mb > 0 and sorted_entries:
                oldest_key, (timestamp, result, params) = sorted_entries.pop(0)
                entry_size_mb = estimate_object_size_mb(result) + estimate_object_size_mb(params)
                self._memory_cache.pop(oldest_key, None)
                removed_count += 1
                excess_mb -= entry_size_mb
                self._index = [e for e in self._index if e.get("key") != oldest_key]
            
            if removed_count > 0:
                self._save_index()
                logger.debug(f"Cleaned up {removed_count} route cache entries to reduce combined memory")

    def _load_index(self) -> None:
        """在索引文件中搜尋，不存在才重算路徑"""
        import logging
        logger = logging.getLogger(__name__)
        
        if self.index_file.exists():
            try:
                with open(self.index_file, "r", encoding="utf-8") as f:
                    self._index = json.load(f)
                # 清理过期的索引条目
                self._cleanup_expired_index()
                logger.info(f"Loaded cache index with {len(self._index)} entries")
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load cache index: {e}, starting with empty index")
                self._index = []
        else:
            # 不存在
            logger.info("Index file not found, attempting to rebuild from existing cache files...")
            self._rebuild_index_from_cache_files()
            if self._index:
                logger.info(f"Rebuilt index with {len(self._index)} entries from existing cache files")
            else:
                logger.info("No valid cache files found, starting with empty index")
    
    def _rebuild_index_from_cache_files(self) -> None:
        """index 不存在才掃描所有 cache"""
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        self._index = []
        
        # 掃描所有 cache
        cache_files = list(self.cache_dir.glob("*.json"))
        logger.debug(f"Scanning {len(cache_files)} cache files...")
        
        for cache_file in cache_files:
            if cache_file.name == "index.json":
                continue
            
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    preview = f.read(1024)
                    f.seek(0)

                    if '"params"' not in preview:
                        logger.debug(f"Skipping old format cache file: {cache_file.name}")
                        continue
                    
                    cache_data = json.load(f)
                
                if "params" in cache_data and "created_at" in cache_data:
                    key = cache_file.stem
                    params = cache_data["params"]
                    created_at = cache_data.get("created_at", 0)
                    
                    index_entry = {
                        "key": key,
                        "start_lat": params.get("start_lat"),
                        "start_lon": params.get("start_lon"),
                        "end_lat": params.get("end_lat"),
                        "end_lon": params.get("end_lon"),
                        "timestamp": params.get("timestamp"),
                        "alpha": params.get("alpha", self.settings.alpha),
                        "created_at": created_at,
                    }
                    
                    if all(k in index_entry and index_entry[k] is not None for k in ["key", "start_lat", "start_lon", "end_lat", "end_lon", "timestamp"]):
                        self._index.append(index_entry)
                    else:
                        logger.warning(f"Skipping incomplete cache file: {cache_file.name}")
                    
            except (json.JSONDecodeError, IOError, KeyError) as e:
                logger.debug(f"Failed to process cache file {cache_file.name}: {e}")
                continue
        
        rebuild_time = time.time() - start_time
        logger.info(f"Rebuilt index from {len(self._index)} cache files in {rebuild_time:.2f}s")
        
        if self._index:
            self._save_index()
    
    def _save_index(self) -> None:
        """保存 index 到文件"""
        try:
            with open(self.index_file, "w", encoding="utf-8") as f:
                json.dump(self._index, f, indent=2)
        except IOError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to save cache index: {e}")
    
    def _cleanup_expired_index(self) -> None:
        """清理過期的 index"""
        current_time = pd.Timestamp.utcnow().timestamp()
        valid_index = []
        
        for entry in self._index:
            if current_time - entry.get("created_at", 0) <= self.settings.cache_ttl_seconds:
                valid_index.append(entry)
            else:
                cache_file = self.cache_dir / f"{entry['key']}.json"
                if cache_file.exists():
                    try:
                        cache_file.unlink()
                    except OSError:
                        pass
        
        self._index = valid_index
        self._save_index()
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """計算兩點距離 < 10m"""
        R = 6371000
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _cache_key(self, params: dict[str, Any]) -> str:
        serialized = json.dumps(params, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def _get_cached_exact(self, key: str) -> ShadowRouteResult | None:
        """先查內存 -> 再查 index"""
        import logging
        logger = logging.getLogger(__name__)
        
        entry = self._memory_cache.get(key)
        if entry:
            timestamp, value, _ = entry
            current_ts = pd.Timestamp.utcnow().timestamp()
            if current_ts - timestamp <= self.settings.cache_ttl_seconds:
                logger.debug(f"Memory cache hit: {key[:16]}...")
                return value
            else:
                self._memory_cache.pop(key, None)
        
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            try:
                import time
                start_time = time.time()
                with open(cache_file, "r", encoding="utf-8") as f:
                    cache_data = json.load(f)
                load_time = time.time() - start_time
                logger.debug(f"Loaded cache file in {load_time:.3f}s: {cache_file.name}")
                
                created_at = cache_data.get("created_at", 0)
                current_ts = pd.Timestamp.utcnow().timestamp()
                if current_ts - created_at <= self.settings.cache_ttl_seconds:
                    # 加到內存
                    result = ShadowRouteResult(
                        polyline=cache_data["polyline"],
                        shadow_ratio=cache_data["shadow_ratio"],
                        shadow_segments=cache_data["shadow_segments"],
                        metadata=cache_data["metadata"],
                    )
                    params = cache_data.get("params", {})
                    self._memory_cache[key] = (created_at, result, params)
                    logger.debug(f"File cache hit: {key[:16]}...")
                    return result
                else:
                    logger.debug(f"Cache expired, deleting: {cache_file.name}")
                    cache_file.unlink()
                    # Also remove from index if present
                    index_before = len(self._index)
                    self._index = [e for e in self._index if e.get("key") != key]
                    if len(self._index) < index_before:
                        self._save_index()
            except (json.JSONDecodeError, IOError, KeyError) as e:
                logger.warning(f"Failed to load cache file {cache_file.name}: {e}")
                try:
                    cache_file.unlink()
                    # Also remove from index if present
                    index_before = len(self._index)
                    self._index = [e for e in self._index if e.get("key") != key]
                    if len(self._index) < index_before:
                        self._save_index()
                except OSError:
                    pass
        
        return None

    def _get_cached_fuzzy(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
        timestamp: datetime,
        alpha: float,
    ) -> ShadowRouteResult | None:
        """模糊匹配"""
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        # 最多 5 秒，避免阻塞
        max_fuzzy_search_time = 5.0
        
        current_time = pd.Timestamp(timestamp)
        if current_time.tzinfo is None:
            from .config import get_settings
            settings = get_settings()
            current_time = current_time.tz_localize(settings.timezone)
        current_timestamp = current_time.timestamp()

        distance_threshold = self.settings.cache_distance_threshold_m
        time_threshold_seconds = self.settings.cache_time_threshold_minutes * 60
        current_ts = pd.Timestamp.utcnow().timestamp()

        logger.debug(f"Fuzzy cache lookup: index size={len(self._index)}")

        # Collect expired entries to remove from index
        expired_entry_keys = []
        valid_entries = []
        
        # First pass: identify expired entries and collect valid ones
        for entry in self._index:
            if current_ts - entry.get("created_at", 0) > self.settings.cache_ttl_seconds:
                expired_entry_keys.append(entry["key"])
            else:
                valid_entries.append(entry)
        
        # Remove expired entries from index if any found
        if expired_entry_keys:
            self._index = valid_entries
            # Also remove expired cache files
            for key in expired_entry_keys:
                cache_file = self.cache_dir / f"{key}.json"
                if cache_file.exists():
                    try:
                        cache_file.unlink()
                    except OSError:
                        pass
            # Save updated index
            self._save_index()
            logger.debug(f"Removed {len(expired_entry_keys)} expired entries from index (now {len(self._index)} entries)")

        # 使用索引表快速查找（現在只包含有效條目）
        for i, entry in enumerate(self._index):
            if time.time() - start_time > max_fuzzy_search_time:
                logger.warning(f"Fuzzy cache search timeout after {i} entries, aborting")
                break
            cached_alpha = entry.get("alpha", self.settings.alpha)

            if abs(cached_alpha - alpha) > 1e-6:
                continue
            start_dist = self._haversine_distance(
                start_lat, start_lon,
                entry["start_lat"], entry["start_lon"]
            )

            if start_dist > distance_threshold:
                continue
            end_dist = self._haversine_distance(
                end_lat, end_lon,
                entry["end_lat"], entry["end_lon"]
            )

            if end_dist > distance_threshold:
                continue
            cached_timestamp_str = entry["timestamp"]
            cached_time = pd.Timestamp(cached_timestamp_str)

            if cached_time.tzinfo is None:
                from .config import get_settings
                settings = get_settings()
                cached_time = cached_time.tz_localize(settings.timezone)
            cached_timestamp = cached_time.timestamp()

            time_diff = abs(current_timestamp - cached_timestamp)

            if time_diff > time_threshold_seconds:
                continue

            cache_key = entry["key"]
            
            memory_entry = self._memory_cache.get(cache_key)
            if memory_entry:
                cache_timestamp: float
                cache_timestamp, result, _ = memory_entry
                if pd.Timestamp.utcnow().timestamp() - cache_timestamp <= self.settings.cache_ttl_seconds:
                    total_time = time.time() - start_time
                    logger.info(f"Fuzzy cache hit (memory): key={cache_key[:16]}..., start_dist={start_dist:.2f}m, end_dist={end_dist:.2f}m, time_diff={time_diff/60:.1f}min, checked={i+1} entries, total={total_time:.3f}s")
                    return result
            
            cache_file = self.cache_dir / f"{cache_key}.json"
            if cache_file.exists():
                try:
                    file_size = cache_file.stat().st_size
                    if file_size > 50 * 1024 * 1024:  # 50MB
                        logger.warning(f"Cache file too large ({file_size / 1024 / 1024:.1f}MB), skipping: {cache_file.name}")
                        continue
                    
                    file_start = time.time()
                    with open(cache_file, "r", encoding="utf-8") as f:
                        cache_data = json.load(f)
                    file_load_time = time.time() - file_start
                    
                    if file_load_time > 2.0:
                        logger.warning(f"Slow cache file load: {file_load_time:.3f}s for {cache_file.name}")
                    
                    result = ShadowRouteResult(
                        polyline=cache_data["polyline"],
                        shadow_ratio=cache_data["shadow_ratio"],
                        shadow_segments=cache_data["shadow_segments"],
                        metadata=cache_data["metadata"],
                    )
                    
                    params = cache_data.get("params", {})
                    created_at_float = float(entry.get("created_at", 0))
                    self._memory_cache[cache_key] = (created_at_float, result, params)
                    
                    total_time = time.time() - start_time
                    logger.info(f"Fuzzy cache hit: key={cache_key[:16]}..., start_dist={start_dist:.2f}m, end_dist={end_dist:.2f}m, time_diff={time_diff/60:.1f}min, checked={i+1} entries, file_load={file_load_time:.3f}s, total={total_time:.3f}s")
                    return result
                except (json.JSONDecodeError, IOError, KeyError) as e:
                    logger.warning(f"Failed to load cache file {cache_file}: {e}")
                    continue

        total_time = time.time() - start_time
        logger.debug(f"Fuzzy cache miss: checked {len(self._index)} entries in {total_time:.3f}s")
        return None

    def _make_json_serializable(self, obj: Any) -> Any:
        """轉為 JSON"""
        import numpy as np
        
        if isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {key: self._make_json_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self._make_json_serializable(item) for item in obj]
        elif isinstance(obj, (pd.Timestamp, datetime)):
            return obj.isoformat()
        else:
            return obj
    
    def _set_cache(self, key: str, value: ShadowRouteResult, params: dict[str, Any]) -> None:
        """保存到內存跟 index"""
        import logging
        logger = logging.getLogger(__name__)
        
        created_at = pd.Timestamp.utcnow().timestamp()
        
        with self._cache_lock:
            # Check combined memory limit (route + graph caches) before adding
            current_combined_memory_mb = self._estimate_combined_cache_memory_mb()
            route_cache_mb = self._estimate_cache_memory_mb()
            from .data_access import _graph_cache
            graph_cache_mb = _graph_cache._estimate_cache_memory_mb()
            new_entry_size_mb = estimate_object_size_mb(value) + estimate_object_size_mb(params)
            
            # Log cache memory status
            logger.info(f"[CACHE] Route cache: {route_cache_mb:.1f} MB, Graph cache: {graph_cache_mb:.1f} MB, Combined: {current_combined_memory_mb:.1f} MB, New entry: {new_entry_size_mb:.1f} MB, Limit: {self._combined_cache_memory_limit_mb} MB")
            
            # If adding this entry would exceed combined limit, clean up first
            if current_combined_memory_mb + new_entry_size_mb > self._combined_cache_memory_limit_mb:
                logger.warning(f"[CACHE] Combined cache memory ({current_combined_memory_mb:.1f} MB) + new entry ({new_entry_size_mb:.1f} MB) would exceed limit ({self._combined_cache_memory_limit_mb} MB), cleaning up...")
                self._cleanup_cache_by_memory(_lock_held=True)
                current_combined_memory_mb = self._estimate_combined_cache_memory_mb()
                route_cache_mb = self._estimate_cache_memory_mb()
                graph_cache_mb = _graph_cache._estimate_cache_memory_mb()
                logger.info(f"[CACHE] After cleanup - Route cache: {route_cache_mb:.1f} MB, Graph cache: {graph_cache_mb:.1f} MB, Combined: {current_combined_memory_mb:.1f} MB")
            
            # Also check count-based limit (fallback)
            if len(self._memory_cache) >= self.settings.cache_size:
                oldest = min(self._memory_cache.items(), key=lambda x: x[1][0])[0]
                self._memory_cache.pop(oldest, None)
                # Also remove from index
                self._index = [e for e in self._index if e.get("key") != oldest]
            
            # Add new entry
            self._memory_cache[key] = (created_at, value, params)
            
            # Log if combined memory is getting high
            new_combined_memory_mb = self._estimate_combined_cache_memory_mb()
            if new_combined_memory_mb > self._combined_cache_memory_limit_mb * 0.8:
                logger.warning(f"Combined cache memory usage is high: {new_combined_memory_mb:.1f} MB / {self._combined_cache_memory_limit_mb} MB")
        
        # 保存到 index
        cache_file = self.cache_dir / f"{key}.json"
        cache_data = {
            "polyline": self._make_json_serializable(value.polyline),
            "shadow_ratio": self._make_json_serializable(value.shadow_ratio),
            "shadow_segments": self._make_json_serializable(value.shadow_segments),
            "metadata": self._make_json_serializable(value.metadata),
            "params": self._make_json_serializable(params),
            "created_at": created_at,
        }
        
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(cache_data, f)
        except (IOError, TypeError) as e:
            logger.warning(f"Failed to save cache file {cache_file}: {e}")
        
        # 更新索引表
        index_entry = {
            "key": key,
            "start_lat": params["start_lat"],
            "start_lon": params["start_lon"],
            "end_lat": params["end_lat"],
            "end_lon": params["end_lon"],
            "timestamp": params["timestamp"],
            "alpha": params["alpha"],
            "created_at": created_at,
        }
        
        existing_index = [e for e in self._index if e["key"] == key]
        if not existing_index:
            self._index.append(index_entry)
            # 限制索引大小
            if len(self._index) > self.settings.cache_size * 2:
                self._index.sort(key=lambda x: x.get("created_at", 0))
                self._index = self._index[-self.settings.cache_size:]
            self._save_index()

    def route(self, start_lat: float, start_lon: float, end_lat: float, end_lon: float, timestamp: datetime, alpha: float | None = None, request_start_time: float | None = None) -> ShadowRouteResult:
        import logging
        logger = logging.getLogger(__name__)
        
        alpha = alpha if alpha is not None else self.settings.alpha

        # 保留 6 位小數
        start_lat_rounded = round(start_lat, 6)
        start_lon_rounded = round(start_lon, 6)
        end_lat_rounded = round(end_lat, 6)
        end_lon_rounded = round(end_lon, 6)
        
        params = {
            "start_lat": start_lat_rounded,
            "start_lon": start_lon_rounded,
            "end_lat": end_lat_rounded,
            "end_lon": end_lon_rounded,
            "timestamp": timestamp.isoformat(),
            "alpha": alpha,
        }

        timings: dict[str, float] = {}
        
        # 記錄請求開始時間（如果提供）
        if request_start_time is not None:
            service_start = perf_counter()
            timings["request_to_service_ms"] = (service_start - request_start_time) * 1000
            logger.info(f"[TIMING] Request reached service in {timings['request_to_service_ms']:.2f}ms")

        # 精準匹配
        key = self._cache_key(params)
        logger.debug(f"Cache lookup - exact key: {key[:16]}..., memory cache: {len(self._memory_cache)}, index: {len(self._index)}")

        cache_start = perf_counter()
        cached = self._get_cached_exact(key)
        exact_time = perf_counter() - cache_start
        timings["cache_lookup_exact_ms"] = exact_time * 1000

        if cached:
            logger.info(f"Cache hit (exact match) in {exact_time:.3f}s")
            return cached

        # 模糊匹配
        logger.debug("Cache miss (exact), trying fuzzy match...")
        fuzzy_start = perf_counter()
        cached = self._get_cached_fuzzy(start_lat, start_lon, end_lat, end_lon, timestamp, alpha)
        fuzzy_time = perf_counter() - fuzzy_start
        timings["cache_lookup_fuzzy_ms"] = fuzzy_time * 1000

        if cached:
            logger.info(f"Cache hit (fuzzy match) in {fuzzy_time:.3f}s")
            return cached

        total_cache_time = perf_counter() - cache_start
        if total_cache_time > 1.0:
            logger.warning(f"Cache lookup took {total_cache_time:.3f}s (exact: {exact_time:.3f}s, fuzzy: {fuzzy_time:.3f}s)")
        
        compute_start = perf_counter()
        logger.info("Cache miss - computing new route")
        
        # Memory monitoring: start
        memory_before = get_memory_usage_mb()
        logger.info(f"[MEMORY] Before route computation: {memory_before:.1f} MB")
        memory_log = [("Start", memory_before)]

        buffer_m = self.settings.bounding_box_buffer_m
        logger.debug("Creating bounding polygon...")
        step_start = perf_counter()
        polygon = make_bounding_polygon(start_lat, start_lon, end_lat, end_lon, buffer_m)
        timings["make_bounding_polygon_ms"] = (perf_counter() - step_start) * 1000
        
        logger.debug("Extracting street graph...")
        step_start = perf_counter()
        G, nodes, edges = extract_street_graph(polygon)
        timings["extract_street_graph_ms"] = (perf_counter() - step_start) * 1000
        logger.debug(f"Extracted graph: {len(nodes)} nodes, {len(edges)} edges")
        memory_after_graph = get_memory_usage_mb()
        memory_log.append(("After extract_street_graph", memory_after_graph))
        logger.info(f"[MEMORY] After extract_street_graph: {memory_after_graph:.1f} MB (delta: +{memory_after_graph - memory_before:.1f} MB)")

        logger.debug("Extracting buildings...")
        step_start = perf_counter()
        buildings = extract_buildings(polygon, timing_dict=timings)
        extract_buildings_ms = (perf_counter() - step_start) * 1000
        timings["extract_buildings_ms"] = extract_buildings_ms
        logger.debug(f"Extracted {len(buildings)} buildings in {extract_buildings_ms:.2f}ms")
        memory_after_buildings = get_memory_usage_mb()
        memory_log.append(("After extract_buildings", memory_after_buildings))
        logger.info(f"[MEMORY] After extract_buildings: {memory_after_buildings:.1f} MB (delta: +{memory_after_buildings - memory_after_graph:.1f} MB)")
        
        # 轉換時間並確保時區正確（Asia/Taipei）
        if isinstance(timestamp, datetime):
            ts = pd.Timestamp(timestamp)
        else:
            ts = pd.Timestamp(timestamp)
        
        # 確保時區為 Asia/Taipei
        if ts.tzinfo is None:
            ts = ts.tz_localize('Asia/Taipei')
        else:
            ts = ts.tz_convert('Asia/Taipei')
        
        # 提取 date 和 hour（台灣時區）
        query_date = ts.date()
        query_hour = ts.hour
        
        # 取得路徑的 bounding box
        route_bounds = polygon.bounds  # (minx, miny, maxx, maxy)
        route_min_lon, route_min_lat, route_max_lon, route_max_lat = route_bounds
        
        # 嘗試使用預計算陰影
        shadow_gdf = None
        precompute_time = 0.0
        
        if self.settings.shadow_precompute_enabled:
            try:
                from database.queries import get_precomputed_shadows
                precompute_start = perf_counter()
                precomputed = get_precomputed_shadows(
                    date=query_date,
                    hour=query_hour,
                    min_lon=route_min_lon,
                    min_lat=route_min_lat,
                    max_lon=route_max_lon,
                    max_lat=route_max_lat,
                )
                precompute_time = perf_counter() - precompute_start
                
                if precomputed and isinstance(precomputed, dict):
                    features = precomputed.get("features", [])
                    if len(features) > 0:
                        # 將 GeoJSON 轉換為 GeoDataFrame
                        import geopandas as gpd
                        from shapely.geometry import shape
                        geometries = [shape(feature["geometry"]) for feature in features if feature.get("geometry")]
                        if geometries:
                            shadow_gdf = gpd.GeoDataFrame({"geometry": geometries}, crs="EPSG:4326")
                            logger.info(
                                f"Using precomputed shadows for route (date={query_date}, hour={query_hour}, "
                                f"query time: {precompute_time*1000:.2f}ms, {len(geometries)} polygons)"
                            )
                            timings["project_shadows_ms"] = precompute_time * 1000
                            timings["precomputed_shadows_ms"] = precompute_time * 1000
                            # Initialize memory tracking for precomputed shadows
                            memory_after_shadows = get_memory_usage_mb()
                            memory_log.append(("After project_shadows (precomputed)", memory_after_shadows))
                            logger.info(f"[MEMORY] After project_shadows (precomputed): {memory_after_shadows:.1f} MB (delta: +{memory_after_shadows - memory_after_buildings:.1f} MB)")
            except Exception as e:
                logger.warning(f"Failed to get precomputed shadows for route: {e}, falling back to real-time computation")
        
        # 如果預計算陰影不可用，使用即時計算
        # Initialize memory_after_shadows to ensure it's always set
        memory_after_shadows = None
        bbox_m = None  # Initialize to None, will be set only if real-time computation is used
        bbox_gdf = None  # Initialize to None, will be set only if real-time computation is used
        bbox_polygon = None  # Initialize to None, will be set only if real-time computation is used
        if shadow_gdf is None:
            logger.debug("Projecting shadows (real-time)...")
            step_start = perf_counter()
            # Create bounding box polygon for clipping shadows (use the same polygon used for building extraction)
            bbox_polygon = polygon
            # Calculate max shadow length based on bounding box size
            import geopandas as gpd
            bbox_gdf = gpd.GeoDataFrame({"geometry": [bbox_polygon]}, crs="EPSG:4326")
            bbox_m = bbox_gdf.to_crs(epsg=3857)
            bbox_bounds = bbox_m.total_bounds
            bbox_width_m = bbox_bounds[2] - bbox_bounds[0]
            bbox_height_m = bbox_bounds[3] - bbox_bounds[1]
            max_shadow_length = max(bbox_width_m, bbox_height_m) * 1.5  # 1.5x diagonal for safety
            max_shadow_length = min(max_shadow_length, 1000.0)  # Cap at 1km
            
            shadow_gdf = project_shadows(
                buildings, 
                lat=start_lat, 
                lon=start_lon, 
                timestamp=ts,
                bounding_box=bbox_polygon,
                max_shadow_length_m=max_shadow_length
            )
            timings["project_shadows_ms"] = (perf_counter() - step_start) * 1000
            logger.debug(f"Projected {len(shadow_gdf)} shadow polygons (clipped to bbox)")
            memory_after_shadows = get_memory_usage_mb()
            memory_log.append(("After project_shadows", memory_after_shadows))
            logger.info(f"[MEMORY] After project_shadows: {memory_after_shadows:.1f} MB (delta: +{memory_after_shadows - memory_after_buildings:.1f} MB)")
        
        # Ensure memory_after_shadows is set even if precomputed shadows were used but memory wasn't tracked
        if memory_after_shadows is None:
            memory_after_shadows = get_memory_usage_mb()
            memory_log.append(("After project_shadows", memory_after_shadows))
            logger.info(f"[MEMORY] After project_shadows: {memory_after_shadows:.1f} MB (delta: +{memory_after_shadows - memory_after_buildings:.1f} MB)")
        
        if shadow_gdf is None or len(shadow_gdf) == 0:
            # 如果沒有陰影，創建空的 GeoDataFrame
            import geopandas as gpd
            shadow_gdf = gpd.GeoDataFrame(columns=["geometry"], crs="EPSG:4326")

        logger.debug("Adding samples to edges...")
        step_start = perf_counter()
        edges_samples = add_samples_to_edges(edges, spacing_m=self.settings.sample_spacing_m)
        timings["add_samples_to_edges_ms"] = (perf_counter() - step_start) * 1000
        logger.debug(f"Added samples to {len(edges_samples)} edges")
        memory_after_samples = get_memory_usage_mb()
        memory_log.append(("After add_samples_to_edges", memory_after_samples))
        logger.info(f"[MEMORY] After add_samples_to_edges: {memory_after_samples:.1f} MB (delta: +{memory_after_samples - memory_after_shadows:.1f} MB)")
        
        logger.debug("Computing shade weights...")
        step_start = perf_counter()
        edges_shade = compute_shade_weights(edges_samples, list(shadow_gdf.geometry))
        timings["compute_shade_weights_ms"] = (perf_counter() - step_start) * 1000
        memory_after_shade_weights = get_memory_usage_mb()
        memory_log.append(("After compute_shade_weights", memory_after_shade_weights))
        logger.info(f"[MEMORY] After compute_shade_weights: {memory_after_shade_weights:.1f} MB (delta: +{memory_after_shade_weights - memory_after_samples:.1f} MB)")
        
        logger.debug("Adding final weights...")
        step_start = perf_counter()
        edges_weighted = add_final_weights(edges_shade, alpha=alpha)
        timings["add_final_weights_ms"] = (perf_counter() - step_start) * 1000

        logger.debug("Computing route...")
        step_start = perf_counter()
        route_nodes = compute_route(G, edges_weighted, start_lat, start_lon, end_lat, end_lon)
        timings["compute_route_ms"] = (perf_counter() - step_start) * 1000
        logger.debug(f"Route computed: {len(route_nodes)} nodes")
        memory_after_route = get_memory_usage_mb()
        memory_log.append(("After compute_route", memory_after_route))
        logger.info(f"[MEMORY] After compute_route: {memory_after_route:.1f} MB (delta: +{memory_after_route - memory_after_shade_weights:.1f} MB)")
        
        logger.debug("Summarizing route...")
        step_start = perf_counter()
        summary = summarize_route(G, edges_weighted, route_nodes)
        timings["summarize_route_ms"] = (perf_counter() - step_start) * 1000
        memory_after_summarize = get_memory_usage_mb()
        memory_log.append(("After summarize_route", memory_after_summarize))
        logger.info(f"[MEMORY] After summarize_route: {memory_after_summarize:.1f} MB (delta: +{memory_after_summarize - memory_after_route:.1f} MB)")

        result = ShadowRouteResult(
            polyline=[[latlon[1], latlon[0]] for latlon in summary.coords],  # convert to [lat, lon]
            shadow_ratio=summary.shadow_ratio,
            shadow_segments=[
                {
                    "polyline": [[latlon[1], latlon[0]] for latlon in segment["coords"]],
                    "is_shaded": segment["is_shaded"],
                    "shade_fraction": segment["shade_fraction"],
                }
                for segment in summary.segments
            ],
            metadata={
                "total_length_m": summary.total_length_m,
                "buildings": len(buildings),
                "shadows": len(shadow_gdf),
                "route_nodes": len(route_nodes),
            },
        )

        compute_time = perf_counter() - compute_start
        timings["total_compute_ms"] = compute_time * 1000
        
        # 計算總時間（從請求開始）
        if request_start_time is not None:
            total_time = perf_counter() - request_start_time
            timings["total_request_ms"] = total_time * 1000
            logger.info(f"[TIMING] Total request time: {total_time:.2f}s (from request start)")
        
        logger.info(f"Route computation completed in {compute_time:.2f}s")
        timings_summary = {k: round(v, 2) for k, v in timings.items()}
        logger.info(f"[TIMING] Step timings (ms): {timings_summary}")
        print(f"[timings] {timings_summary}")
        
        self._set_cache(key, result, params)
        
        # Memory monitoring: before cleanup
        memory_before_cleanup = get_memory_usage_mb()
        memory_log.append(("Before cleanup", memory_before_cleanup))
        logger.info(f"[MEMORY] Before cleanup: {memory_before_cleanup:.1f} MB (peak delta: +{memory_before_cleanup - memory_before:.1f} MB)")
        
        # Explicitly clean up large intermediate variables to free memory immediately
        # This is critical for 512MB memory limit on Render
        del summary
        del route_nodes
        del edges_weighted
        del edges_shade
        del edges_samples
        del shadow_gdf
        del buildings
        # Only delete bbox_m, bbox_gdf, bbox_polygon if they were created (real-time shadow computation)
        if bbox_m is not None:
            del bbox_m
        if bbox_gdf is not None:
            del bbox_gdf
        if bbox_polygon is not None:
            del bbox_polygon
        del polygon
        del G
        del nodes
        del edges
        
        # Force garbage collection to free memory immediately
        gc.collect()
        
        # Memory monitoring: after cleanup
        memory_after_cleanup = get_memory_usage_mb()
        memory_log.append(("After cleanup", memory_after_cleanup))
        logger.info(f"[MEMORY] After cleanup: {memory_after_cleanup:.1f} MB (delta from start: {memory_after_cleanup - memory_before:.1f} MB, freed: {memory_before_cleanup - memory_after_cleanup:.1f} MB)")
        
        # Log memory summary
        logger.info(f"[MEMORY] Summary: {[(step, f'{mem:.1f}MB') for step, mem in memory_log]}")
        
        return result

    def shortest_route(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
    ) -> ShadowRouteResult:
        """
        Compute shortest route by distance only (no shadow consideration).
        Uses the same OSMnx street network for fair comparison.
        """
        import logging
        from time import perf_counter
        
        logger = logging.getLogger(__name__)
        timings: Dict[str, float] = {}
        
        compute_start = perf_counter()
        logger.info("Computing shortest route (distance only)")
        
        buffer_m = self.settings.bounding_box_buffer_m
        logger.debug("Creating bounding polygon...")
        step_start = perf_counter()
        polygon = make_bounding_polygon(start_lat, start_lon, end_lat, end_lon, buffer_m)
        timings["make_bounding_polygon_ms"] = (perf_counter() - step_start) * 1000
        
        logger.debug("Extracting street graph...")
        step_start = perf_counter()
        G, nodes, edges = extract_street_graph(polygon)
        timings["extract_street_graph_ms"] = (perf_counter() - step_start) * 1000
        logger.debug(f"Extracted graph: {len(nodes)} nodes, {len(edges)} edges")
        
        logger.debug("Computing shortest route...")
        step_start = perf_counter()
        route_nodes = compute_shortest_route(G, edges, start_lat, start_lon, end_lat, end_lon)
        timings["compute_route_ms"] = (perf_counter() - step_start) * 1000
        logger.debug(f"Shortest route computed: {len(route_nodes)} nodes")
        
        # For shortest route, we don't need shadow weights, but we still need to summarize
        # Create dummy shadow weights (all 0) for compatibility
        edges_dummy = edges.copy()
        edges_dummy["shade_weight"] = 0.0
        
        logger.debug("Summarizing route...")
        step_start = perf_counter()
        summary = summarize_route(G, edges_dummy, route_nodes)
        timings["summarize_route_ms"] = (perf_counter() - step_start) * 1000
        
        result = ShadowRouteResult(
            polyline=[[latlon[1], latlon[0]] for latlon in summary.coords],
            shadow_ratio=0.0,  # No shadow consideration for shortest route
            shadow_segments=[
                {
                    "polyline": [[latlon[1], latlon[0]] for latlon in segment["coords"]],
                    "is_shaded": False,  # Shortest route doesn't consider shadows
                    "shade_fraction": 0.0,
                }
                for segment in summary.segments
            ],
            metadata={
                "total_length_m": summary.total_length_m,
                "buildings": 0,  # Not computed for shortest route
                "shadows": 0,
                "route_nodes": len(route_nodes),
            },
        )
        
        compute_time = perf_counter() - compute_start
        timings["total_compute_ms"] = compute_time * 1000
        logger.info(f"Shortest route computation completed in {compute_time:.2f}s")
        
        return result

    def compute_shadows(
        self,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        timestamp: datetime,
        center_lat: float | None = None,
        center_lon: float | None = None,
    ) -> dict:
        """
        Compute shadows for buildings in a bounding box at a specific time.
        
        Parameters
        ----------
        min_lon, min_lat, max_lon, max_lat : float
            Bounding box coordinates
        timestamp : datetime
            Time for shadow calculation
        center_lat, center_lon : float, optional
            Center point for solar position calculation (defaults to bbox center)
        
        Returns
        -------
        dict
            GeoJSON FeatureCollection of shadow polygons
        """
        import logging
        from time import perf_counter
        import geopandas as gpd
        
        logger = logging.getLogger(__name__)
        
        compute_start = perf_counter()
        logger.info(f"Computing shadows for bbox: ({min_lat}, {min_lon}) to ({max_lat}, {max_lon})")
        
        # Convert timestamp to Asia/Taipei timezone
        if isinstance(timestamp, datetime):
            ts = pd.Timestamp(timestamp)
        else:
            ts = pd.Timestamp(timestamp)
        
        # Ensure timezone is Asia/Taipei
        if ts.tzinfo is None:
            ts = ts.tz_localize('Asia/Taipei')
        else:
            ts = ts.tz_convert('Asia/Taipei')
        
        # Extract date and hour from timestamp (Asia/Taipei timezone)
        query_date = ts.date()
        query_hour = ts.hour
        
        # Try to get precomputed shadows first
        if self.settings.shadow_precompute_enabled:
            try:
                from database.queries import get_precomputed_shadows
                precompute_start = perf_counter()
                precomputed = get_precomputed_shadows(
                    date=query_date,
                    hour=query_hour,
                    min_lon=min_lon,
                    min_lat=min_lat,
                    max_lon=max_lon,
                    max_lat=max_lat,
                )
                precompute_time = perf_counter() - precompute_start
                
                if precomputed and isinstance(precomputed, dict):
                    features = precomputed.get("features", [])
                    if len(features) > 0:
                        logger.info(f"Using precomputed shadows for date={query_date}, hour={query_hour} (query time: {precompute_time*1000:.2f}ms)")
                        return precomputed
                    else:
                        logger.debug(f"Precomputed shadows found but empty for date={query_date}, hour={query_hour}")
                else:
                    logger.debug(f"No precomputed shadows found for date={query_date}, hour={query_hour}")
            except Exception as e:
                logger.warning(f"Failed to get precomputed shadows: {e}, falling back to real-time computation", exc_info=True)
        
        # Fallback to real-time computation
        return self._compute_shadows_realtime(
            min_lon, min_lat, max_lon, max_lat, timestamp, center_lat, center_lon
        )
    
    def _compute_shadows_realtime(
        self,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        timestamp: datetime,
        center_lat: float | None = None,
        center_lon: float | None = None,
    ) -> dict:
        """
        Real-time shadow computation (fallback when precomputed shadows are not available).
        
        Parameters
        ----------
        min_lon, min_lat, max_lon, max_lat : float
            Bounding box coordinates
        timestamp : datetime
            Time for shadow calculation
        center_lat, center_lon : float, optional
            Center point for solar position calculation (defaults to bbox center)
        
        Returns
        -------
        dict
            GeoJSON FeatureCollection of shadow polygons
        """
        import logging
        from time import perf_counter
        import geopandas as gpd
        
        logger = logging.getLogger(__name__)
        timings = {}
        compute_start = perf_counter()
        
        # Use center of bbox for solar position if not provided
        if center_lat is None:
            center_lat = (min_lat + max_lat) / 2
        if center_lon is None:
            center_lon = (min_lon + max_lon) / 2
        
        # Create bounding polygon
        polygon = box(min_lon, min_lat, max_lon, max_lat)
        
        # Extract buildings in the bounding box
        logger.debug("Extracting buildings...")
        step_start = perf_counter()
        buildings = extract_buildings(polygon)
        timings["extract_buildings_ms"] = (perf_counter() - step_start) * 1000
        logger.info(f"Extracted {len(buildings)} buildings in bbox: ({min_lat:.6f}, {min_lon:.6f}) to ({max_lat:.6f}, {max_lon:.6f})")
        
        if len(buildings) == 0:
            logger.warning(f"No buildings found in bounding box: ({min_lat:.6f}, {min_lon:.6f}) to ({max_lat:.6f}, {max_lon:.6f})")
            return {
                "type": "FeatureCollection",
                "features": []
            }
        
        # Convert timestamp
        if isinstance(timestamp, datetime):
            ts = pd.Timestamp(timestamp)
        else:
            ts = pd.Timestamp(timestamp)
        
        # Ensure timezone
        if ts.tzinfo is None:
            ts = ts.tz_localize(self.settings.timezone)
        
        # Compute shadows with bounding box clipping to prevent infinite shadows
        logger.debug("Projecting shadows...")
        step_start = perf_counter()
        # Create bounding box polygon for clipping shadows
        bbox_polygon = box(min_lon, min_lat, max_lon, max_lat)
        # Calculate max shadow length based on bounding box diagonal (with some buffer)
        bbox_gdf = gpd.GeoDataFrame({"geometry": [bbox_polygon]}, crs="EPSG:4326")
        bbox_m = bbox_gdf.to_crs(epsg=3857)
        bbox_bounds = bbox_m.total_bounds
        bbox_width_m = bbox_bounds[2] - bbox_bounds[0]
        bbox_height_m = bbox_bounds[3] - bbox_bounds[1]
        max_shadow_length = max(bbox_width_m, bbox_height_m) * 1.5  # 1.5x diagonal for safety
        max_shadow_length = min(max_shadow_length, 1000.0)  # Cap at 1km
        
        shadow_gdf = project_shadows(
            buildings, 
            lat=center_lat, 
            lon=center_lon, 
            timestamp=ts,
            bounding_box=bbox_polygon,
            max_shadow_length_m=max_shadow_length
        )
        timings["project_shadows_ms"] = (perf_counter() - step_start) * 1000
        logger.info(f"Projected {len(shadow_gdf)} shadow polygons (clipped to bbox) for time {ts.isoformat()}")
        
        # Union overlapping shadows to create binary shadow regions
        if len(shadow_gdf) > 0:
            logger.debug("Unioning overlapping shadows...")
            union_start = perf_counter()
            try:
                from shapely.ops import unary_union
                # Union all shadow geometries into a single MultiPolygon
                shadow_union = unary_union(shadow_gdf.geometry.tolist())
                
                # Convert union result back to GeoDataFrame
                if shadow_union.is_empty:
                    shadow_gdf = gpd.GeoDataFrame(columns=["geometry"], crs=shadow_gdf.crs)
                elif isinstance(shadow_union, (Polygon, MultiPolygon)):
                    # Create a single feature from the union
                    shadow_gdf = gpd.GeoDataFrame(
                        {"geometry": [shadow_union]},
                        crs=shadow_gdf.crs
                    )
                else:
                    # Fallback: keep original if union fails
                    logger.warning(f"Union resulted in unexpected type: {type(shadow_union)}, keeping original shadows")
                
                timings["union_shadows_ms"] = (perf_counter() - union_start) * 1000
                logger.debug(f"Unioned shadows into {len(shadow_gdf)} feature(s)")
            except Exception as e:
                logger.warning(f"Failed to union shadows, using original: {e}")
                timings["union_shadows_ms"] = 0
                # Keep original shadow_gdf if union fails
        
        # Convert to GeoJSON
        if len(shadow_gdf) == 0:
            return {
                "type": "FeatureCollection",
                "features": []
            }
        
        # Convert GeoDataFrame to GeoJSON
        shadow_geojson = shadow_gdf.to_json()
        
        compute_time = perf_counter() - compute_start
        timings["total_compute_ms"] = compute_time * 1000
        logger.info(f"Shadow computation completed in {compute_time:.2f}s")
        
        # Parse JSON and return
        import json
        return json.loads(shadow_geojson)

