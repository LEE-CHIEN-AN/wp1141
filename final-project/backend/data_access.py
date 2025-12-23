from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Tuple
import logging
import sys
import threading
import gc

import pandas as pd
import geopandas as gpd
import networkx as nx
import osmnx as ox
from shapely.geometry import Polygon, box

from .config import get_settings

logger = logging.getLogger(__name__)


def _estimate_graph_size_mb(graph_data: Tuple) -> float:
    """Estimate memory size of a graph (G, nodes, edges) in MB."""
    G, nodes, edges = graph_data
    size = 0
    
    # Estimate NetworkX graph size
    # Rough estimate: nodes + edges + attributes
    size += sys.getsizeof(G)
    if hasattr(G, 'nodes'):
        size += sum(sys.getsizeof(node) for node in G.nodes())
    if hasattr(G, 'edges'):
        size += sum(sys.getsizeof(edge) for edge in G.edges())
    
    # Estimate GeoDataFrames size
    if nodes is not None:
        size += nodes.memory_usage(deep=True).sum()
    if edges is not None:
        size += edges.memory_usage(deep=True).sum()
    
    return size / 1024 / 1024


def _rounded_bounds(polygon: Polygon, resolution_m: float = 50.0) -> Tuple[float, float, float, float]:
    """
    Return polygon bounds snapped to a grid (default ≈50m) to stabilize cache keys.
    """
    west, south, east, north = polygon.bounds
    deg_step = resolution_m / 111_111  # 1 degree ≈ 111 km

    def _snap(value: float) -> float:
        if deg_step == 0:
            return value
        return round(value / deg_step) * deg_step

    return (
        _snap(west),
        _snap(south),
        _snap(east),
        _snap(north),
    )


def make_bounding_polygon(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    buffer_m: float,
) -> Polygon:
    """
    Create a rectangular polygon enclosing start/end points with a buffer.

    Parameters
    ----------
    buffer_m : float
        Buffer distance in meters converted to degrees (roughly valid for Taipei latitude).
    """
    deg_buffer = buffer_m / 111_111  # 1 deg ≈ 111 km
    north = max(start_lat, end_lat) + deg_buffer
    south = min(start_lat, end_lat) - deg_buffer
    east = max(start_lon, end_lon) + deg_buffer
    west = min(start_lon, end_lon) - deg_buffer
    return box(west, south, east, north)


def extract_street_graph(polygon: Polygon):
    """
    Fetch the walking network inside the polygon.
    
    Uses Supabase database if enabled, otherwise falls back to OSMnx with local caching.
    Cache entries are reused when the requested polygon is fully contained.
    All results (Supabase or OSMnx) are cached in memory and on disk.
    """
    from .config import get_settings
    settings = get_settings()
    
    # Check if we should use Supabase for street graph
    use_supabase_graph = getattr(settings, 'use_supabase_street_graph', False)
    
    if use_supabase_graph:
        # 先檢查快取（Supabase 和 OSMnx 共用同一個快取）
        for idx, (poly, data) in enumerate(_graph_cache.entries):
            if poly.contains(polygon):
                # Move to end to indicate recent use
                _graph_cache.entries.append(_graph_cache.entries.pop(idx))
                print("📦 [路網圖來源] 從本地快取載入路網圖（Supabase）")
                logger.info("📦 從本地快取載入路網圖（Supabase）")
                return data
        
        # 快取未命中，從 Supabase 查詢
        try:
            # Try PostgreSQL direct connection first (no row limit)
            try:
                from database.queries_street_graph_pg import get_street_graph_in_polygon_pg
                data = get_street_graph_in_polygon_pg(polygon)
            except (ImportError, ValueError, Exception) as pg_error:
                # Log the actual error for debugging
                logger.warning(f"PostgreSQL direct connection failed: {pg_error}", exc_info=True)
                # Fallback to REST API (has 1000 row limit)
                try:
                    logger.debug(f"Trying REST API fallback...")
                    from database.queries_street_graph import get_street_graph_in_polygon
                    data = get_street_graph_in_polygon(polygon)
                except Exception as rest_error:
                    logger.error(f"REST API also failed: {rest_error}", exc_info=True)
                    raise
            
            # 將 Supabase 查詢結果存入快取
            _graph_cache.entries.append((polygon, data))
            _graph_cache._save_entry(polygon, data)
            
            # Enforce capacity
            if len(_graph_cache.entries) > _graph_cache.max_size:
                _graph_cache.entries.pop(0)
            
            return data
        except Exception as e:
            logger.error(f"Failed to fetch street graph from Supabase: {e}", exc_info=True)
            # Fall through to local OSMnx caching
    
    # Fallback to OSMnx with local caching
    return _graph_cache.get(polygon)


class _StreetGraphCache:
    def __init__(self, max_size: int = 16, cache_dir: str = "cache/street_graphs", memory_limit_mb: float = 300.0):
        self.max_size = max_size
        self.entries: List[Tuple[Polygon, Tuple]] = []
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_limit_mb = memory_limit_mb  # This is now the combined limit (300 MB)
        self._cache_lock = threading.Lock()
        self._load_existing()

    def _estimate_cache_memory_mb(self) -> float:
        """Estimate total memory usage of the graph cache in MB."""
        total_mb = 0.0
        for poly, data in self.entries:
            total_mb += _estimate_graph_size_mb(data)
        return total_mb

    def _get_combined_cache_memory_mb(self) -> float:
        """Get combined memory of both route and graph caches."""
        graph_memory_mb = self._estimate_cache_memory_mb()
        
        # Try to get route cache memory from the service instance
        route_memory_mb = 0.0
        try:
            # Import at function level to avoid circular imports
            # The service is created as a module-level variable in app/main.py
            import sys
            if 'app.main' in sys.modules:
                service_module = sys.modules['app.main']
                if hasattr(service_module, 'service'):
                    route_memory_mb = service_module.service._estimate_cache_memory_mb()
        except (AttributeError, ImportError):
            # Service not initialized yet, just use graph cache
            pass
        
        return graph_memory_mb + route_memory_mb

    def _cleanup_combined_caches(self) -> None:
        """Trigger cleanup of both route and graph caches via the service."""
        try:
            # Import at function level to avoid circular imports
            import sys
            if 'app.main' in sys.modules:
                service_module = sys.modules['app.main']
                if hasattr(service_module, 'service'):
                    service_module.service._cleanup_combined_caches_by_memory()
                    return
        except (AttributeError, ImportError):
            pass
        
        # Fallback: Service not available, just clean graph cache
        self._cleanup_cache_by_memory()

    def _cleanup_cache_by_memory(self) -> None:
        """Clean up graph cache entries if memory exceeds limit (fallback method)."""
        with self._cache_lock:
            cache_memory_mb = self._estimate_cache_memory_mb()
            
            # This is a fallback - the combined cleanup should be used instead
            # But keep this for cases where service is not available
            if cache_memory_mb <= self._memory_limit_mb:
                return
            
            logger.info(f"Graph cache memory ({cache_memory_mb:.1f} MB) exceeds limit ({self._memory_limit_mb} MB), cleaning up...")
            
            # Remove oldest entries until under limit
            removed_count = 0
            while cache_memory_mb > self._memory_limit_mb and self.entries:
                oldest_entry = self.entries.pop(0)
                entry_size_mb = _estimate_graph_size_mb(oldest_entry[1])
                cache_memory_mb -= entry_size_mb
                removed_count += 1
            
            if removed_count > 0:
                logger.info(f"Cleaned up {removed_count} graph cache entries, new cache memory: {cache_memory_mb:.1f} MB")
            
            # Force garbage collection after cleanup
            gc.collect()

    def get(self, polygon: Polygon):
        with self._cache_lock:
            # Check if polygon is contained in any cached entry
            for idx, (poly, data) in enumerate(self.entries):
                if poly.contains(polygon):
                    # Move to end to indicate recent use
                    self.entries.append(self.entries.pop(idx))
                    print("📦 [路網圖來源] 從本地快取載入路網圖（OSMnx）")
                    logger.info("📦 從本地快取載入路網圖（OSMnx）")
                    return data

            # Not found; create new entry
            print("🌐 [路網圖來源] 使用 OSMnx 下載路網圖...")
            logger.info("🌐 使用 OSMnx 下載路網圖...")
            new_polygon = polygon
            data = self._load_graph(new_polygon)
            
            # Check combined memory limit (route + graph caches) before adding
            current_combined_memory_mb = self._get_combined_cache_memory_mb()
            graph_cache_mb = self._estimate_cache_memory_mb()
            new_entry_size_mb = _estimate_graph_size_mb(data)
            
            # Try to get route cache memory for logging
            route_cache_mb = 0.0
            try:
                import sys
                if 'app.main' in sys.modules:
                    service_module = sys.modules['app.main']
                    if hasattr(service_module, 'service'):
                        route_cache_mb = service_module.service._estimate_cache_memory_mb()
            except (AttributeError, ImportError):
                pass
            
            logger.info(f"[CACHE] Graph cache: {graph_cache_mb:.1f} MB, Route cache: {route_cache_mb:.1f} MB, Combined: {current_combined_memory_mb:.1f} MB, New graph entry: {new_entry_size_mb:.1f} MB, Limit: {self._memory_limit_mb} MB")
            
            # If adding this entry would exceed combined limit, clean up first
            if current_combined_memory_mb + new_entry_size_mb > self._memory_limit_mb:
                logger.warning(f"[CACHE] Combined cache memory ({current_combined_memory_mb:.1f} MB) + new graph entry ({new_entry_size_mb:.1f} MB) would exceed limit ({self._memory_limit_mb} MB), cleaning up...")
                self._cleanup_combined_caches()
                current_combined_memory_mb = self._get_combined_cache_memory_mb()
                graph_cache_mb = self._estimate_cache_memory_mb()
                try:
                    if 'app.main' in sys.modules:
                        service_module = sys.modules['app.main']
                        if hasattr(service_module, 'service'):
                            route_cache_mb = service_module.service._estimate_cache_memory_mb()
                except (AttributeError, ImportError):
                    pass
                logger.info(f"[CACHE] After cleanup - Route cache: {route_cache_mb:.1f} MB, Graph cache: {graph_cache_mb:.1f} MB, Combined: {current_combined_memory_mb:.1f} MB")
            
            self.entries.append((new_polygon, data))
            self._save_entry(new_polygon, data)

            # Also enforce count-based capacity (fallback)
            if len(self.entries) > self.max_size:
                self.entries.pop(0)
            
            print("✅ [路網圖來源] OSMnx 下載完成")
            logger.info("✅ OSMnx 下載完成")
            return data

    def _load_graph(self, polygon: Polygon):
        # Use retain_all=False to keep only the largest connected component
        # This removes disconnected islands that can cause routing failures
        G = ox.graph_from_polygon(polygon, network_type="walk", simplify=True, retain_all=False)
        
        # Log graph statistics
        logger.info(f"Extracted graph: {len(G.nodes())} nodes, {len(G.edges())} edges")
        
        nodes, edges = ox.graph_to_gdfs(G)
        return G, nodes, edges

    def _entry_filename(self, polygon: Polygon) -> str:
        west, south, east, north = polygon.bounds
        return f"{west:.6f}_{south:.6f}_{east:.6f}_{north:.6f}"

    def _save_entry(self, polygon: Polygon, data: Tuple):
        import tempfile
        import shutil
        import time
        
        G, nodes, edges = data
        filename = self._entry_filename(polygon)
        graph_path = self.cache_dir / f"{filename}.graphml"
        nodes_path = self.cache_dir / f"{filename}_nodes.gpkg"
        edges_path = self.cache_dir / f"{filename}_edges.gpkg"
        
        # 使用臨時檔案避免並發寫入衝突和檔案鎖定問題
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_graph = Path(tmpdir) / f"{filename}.graphml"
            tmp_nodes = Path(tmpdir) / f"{filename}_nodes.gpkg"
            tmp_edges = Path(tmpdir) / f"{filename}_edges.gpkg"
            
            try:
                # 先寫入臨時檔案
                ox.save_graphml(G, tmp_graph)
                
                # 保存 nodes：確保 osmid 在欄位中（如果 index 是 osmid）
                nodes_to_save = nodes.copy()
                if hasattr(nodes_to_save.index, 'name') and nodes_to_save.index.name == "osmid":
                    nodes_to_save = nodes_to_save.reset_index()
                nodes_to_save.to_file(tmp_nodes, driver="GPKG")
                
                # 保存 edges：確保 u, v, key 在欄位中（MultiIndex 會被轉為欄位）
                edges_to_save = edges.copy()
                if isinstance(edges_to_save.index, pd.MultiIndex):
                    # MultiIndex 會被自動轉為欄位，但我們需要確保欄位名稱正確
                    edges_to_save = edges_to_save.reset_index()
                    # 確保有 u, v, key 欄位
                    if "u" not in edges_to_save.columns or "v" not in edges_to_save.columns:
                        logger.warning(f"Edges missing u/v columns after reset_index, index names: {edges.index.names}")
                edges_to_save.to_file(tmp_edges, driver="GPKG")
                
                # 刪除舊檔案（如果存在）
                for path in [graph_path, nodes_path, edges_path]:
                    if path.exists():
                        try:
                            path.unlink()
                        except (OSError, PermissionError):
                            # Windows 上可能需要等待檔案釋放
                            time.sleep(0.1)
                            try:
                                path.unlink()
                            except Exception:
                                pass
                
                # 將臨時檔案複製到目標位置
                # 注意：這裡避免使用 shutil.move，以免在不同檔案系統（例如 /tmp -> 專案目錄）時觸發
                # "Invalid cross-device link" 錯誤（Render 等雲端環境常見）
                shutil.copyfile(str(tmp_graph), str(graph_path))
                shutil.copyfile(str(tmp_nodes), str(nodes_path))
                shutil.copyfile(str(tmp_edges), str(edges_path))
                
            except Exception as e:
                logger.warning(f"Failed to save cache entry {filename}: {e}", exc_info=True)
                # 清理目標檔案（如果部分寫入）
                for path in [graph_path, nodes_path, edges_path]:
                    if path.exists():
                        try:
                            path.unlink()
                        except Exception:
                            pass
                raise

    def _load_existing(self):
        import pandas as pd
        
        for graphml_file in sorted(self.cache_dir.glob("*.graphml")):
            try:
                base = graphml_file.stem
                bounds = tuple(map(float, base.split("_")))
                if len(bounds) != 4:
                    continue
                polygon = box(*bounds)
                graph_path = graphml_file
                nodes_path = self.cache_dir / f"{base}_nodes.gpkg"
                edges_path = self.cache_dir / f"{base}_edges.gpkg"
                if not nodes_path.exists() or not edges_path.exists():
                    continue
                
                G = ox.load_graphml(graph_path)
                nodes = gpd.read_file(nodes_path)
                edges = gpd.read_file(edges_path)
                
                # 修復：確保 nodes 和 edges 的 index 格式正確
                # nodes 應該以 osmid 為 index
                if "osmid" in nodes.columns and not isinstance(nodes.index, pd.Index) or nodes.index.name != "osmid":
                    if "osmid" in nodes.columns:
                        nodes.set_index("osmid", inplace=True)
                
                # edges 應該使用 MultiIndex (u, v, key)
                if not isinstance(edges.index, pd.MultiIndex):
                    # GeoPackage 保存時會將 MultiIndex 轉為普通欄位
                    if "u" in edges.columns and "v" in edges.columns:
                        if "key" in edges.columns:
                            edges.set_index(["u", "v", "key"], inplace=True)
                        else:
                            # 如果沒有 key 欄位，預設為 0
                            edges["key"] = 0
                            edges.set_index(["u", "v", "key"], inplace=True)
                    else:
                        logger.warning(f"Cache file {base} edges missing u/v columns, skipping")
                        continue
                
                self.entries.append((polygon, (G, nodes, edges)))
                logger.debug(f"Loaded cache entry: {base} ({len(nodes)} nodes, {len(edges)} edges)")
            except Exception as e:
                logger.warning(f"Failed to load cache entry {graphml_file.name}: {e}", exc_info=True)
                continue


_graph_cache = _StreetGraphCache(memory_limit_mb=300.0)  # Combined limit for route + graph caches


@lru_cache()
def _load_buildings(dataset_path: str) -> gpd.GeoDataFrame:
    """Load the full building dataset once. Expect EPSG:4326 coordinates."""
    buildings = gpd.read_file(dataset_path)
    if buildings.crs is None:
        buildings.set_crs(epsg=4326, inplace=True)
    return buildings


def extract_buildings(polygon: Polygon, dataset_path: str | None = None, timing_dict: dict | None = None) -> gpd.GeoDataFrame:
    """
    Extract buildings within the polygon.
    
    Uses Supabase database if enabled, otherwise falls back to local files.
    Caches database queries using rounded bounds for better cache hits.
    """
    settings = get_settings()
    
    # Use Supabase if enabled
    if settings.use_supabase:
        try:
            from database.queries import get_buildings_in_bbox
            from time import perf_counter
            
            # Round bounds to ~50m grid for better cache hits (same as local files)
            bounds = _rounded_bounds(polygon)
            west, south, east, north = bounds
            
            # Query buildings from database (with caching)
            db_query_start = perf_counter()
            buildings = _extract_buildings_from_db_cached(west, south, east, north)
            db_query_ms = (perf_counter() - db_query_start) * 1000
            if timing_dict is not None:
                timing_dict["supabase_query_ms"] = db_query_ms
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[TIMING] Supabase query completed in {db_query_ms:.2f}ms")
            
            # Clip to exact polygon (database returns bbox, we need polygon)
            if len(buildings) > 0:
                clipped = gpd.clip(buildings, gpd.GeoSeries([polygon], crs="EPSG:4326"))
            else:
                clipped = buildings
            
            # Ensure height column exists
            if "height" not in clipped.columns:
                clipped["height"] = settings.default_height_m
            
            return clipped
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to fetch buildings from Supabase: {e}, falling back to local files")
            # Fall through to local file loading
    
    # Fallback to local files
    from time import perf_counter
    import logging
    logger = logging.getLogger(__name__)
    
    path = dataset_path or settings.building_dataset
    bounds = _rounded_bounds(polygon)
    
    file_load_start = perf_counter()
    buildings = _extract_buildings_cached(bounds, path)
    file_load_ms = (perf_counter() - file_load_start) * 1000
    
    if timing_dict is not None:
        timing_dict["local_file_load_ms"] = file_load_ms
    
    logger.info(f"[TIMING] Local file load completed in {file_load_ms:.2f}ms (Count: {len(buildings)})")
    return buildings


@lru_cache(maxsize=64)
def _extract_buildings_from_db_cached(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> gpd.GeoDataFrame:
    """
    Cached database query for buildings.
    
    Uses rounded bounds (from _rounded_bounds) to maximize cache hits
    for overlapping bounding boxes.
    """
    from database.queries import get_buildings_in_bbox
    
    return get_buildings_in_bbox(
        min_lon=min_lon,
        min_lat=min_lat,
        max_lon=max_lon,
        max_lat=max_lat,
    )


@lru_cache(maxsize=64)
def _extract_buildings_cached(bounds: Tuple[float, float, float, float], dataset_path: str) -> gpd.GeoDataFrame:
    west, south, east, north = bounds
    polygon = box(west, south, east, north)
    buildings = _load_buildings(dataset_path)
    clipped = gpd.clip(buildings, gpd.GeoSeries([polygon], crs="EPSG:4326"))

    if "height" not in clipped.columns:
        clipped["height"] = get_settings().default_height_m
    return clipped

