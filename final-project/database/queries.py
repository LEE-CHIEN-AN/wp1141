"""PostGIS query functions for building data using Supabase."""
from functools import lru_cache
from typing import Optional

import geopandas as gpd
from shapely.geometry import Polygon, box
from supabase import Client

from .config import get_supabase_config


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Get Supabase client with connection pooling.
    
    Uses @lru_cache to reuse the same client instance across calls,
    reducing connection overhead.
    """
    from supabase import create_client
    from dotenv import load_dotenv
    from pathlib import Path
    import os
    
    load_dotenv(Path(__file__).parent.parent / ".env")
    
    config = get_supabase_config()
    supabase_url = os.getenv("SUPABASE_URL", config.supabase_url or "")
    supabase_key = os.getenv("SUPABASE_KEY", config.supabase_key or "")
    
    if not supabase_url:
        raise ValueError(
            "SUPABASE_URL environment variable is required.\n"
            "Set it in your .env file or as an environment variable.\n"
            "Get your project URL from Supabase Dashboard → Settings → API"
        )
    
    if not supabase_key:
        raise ValueError(
            "SUPABASE_KEY environment variable is required.\n"
            "Set it in your .env file or as an environment variable.\n"
            "Get your Service Role Key from Supabase Dashboard → Settings → API"
        )
    
    return create_client(supabase_url, supabase_key)


def get_buildings_in_bbox(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    tile_id: Optional[str] = None,
) -> gpd.GeoDataFrame:
    """
    使用 PostGIS 查詢指定 bounding box 內的建築物。
    
    這個函數使用 Supabase RPC 函數來執行 PostGIS 查詢，利用 GiST index 加速。
    
    Parameters
    ----------
    min_lon : float
        最小經度（西邊界）
    min_lat : float
        最小緯度（南邊界）
    max_lon : float
        最大經度（東邊界）
    max_lat : float
        最大緯度（北邊界）
    tile_id : str, optional
        可選的 tile_id 篩選
    
    Returns
    -------
    gpd.GeoDataFrame
        包含建築物的 GeoDataFrame，使用 EPSG:4326 座標系統
    """
    import time
    import logging
    logger = logging.getLogger(__name__)
    
    supabase = get_supabase_client()
    
    # 記錄資料庫查詢開始時間
    db_start = time.perf_counter()
    logger.debug(f"[TIMING] Supabase query started for bbox: ({min_lon}, {min_lat}, {max_lon}, {max_lat})")
    
    # 使用 Supabase RPC 函數執行 PostGIS 查詢
    # 注意：需要在 Supabase 中先建立這個 RPC 函數
    try:
        # 嘗試使用 RPC 函數
        params = {
            "min_lon": min_lon,
            "min_lat": min_lat,
            "max_lon": max_lon,
            "max_lat": max_lat,
        }
        
        if tile_id:
            params["tile_id_filter"] = tile_id
        
        rpc_start = time.perf_counter()
        result = supabase.rpc("get_buildings_in_bbox", params).execute()
        rpc_ms = (time.perf_counter() - rpc_start) * 1000
        logger.debug(f"[TIMING] Supabase RPC call completed in {rpc_ms:.2f}ms")
        
        if not result.data:
            # 返回空的 GeoDataFrame，但仍記錄時間
            total_ms = (time.perf_counter() - db_start) * 1000
            logger.info(f"[TIMING] Supabase query total: {total_ms:.2f}ms (RPC: {rpc_ms:.2f}ms, Count: 0)")
            return gpd.GeoDataFrame(
                columns=["id", "height", "color", "roof_color", "tile_id", "created_at"],
                geometry=[],
                crs="EPSG:4326",
            )
        
        # 轉換為 GeoDataFrame
        convert_start = time.perf_counter()
        gdf = _convert_to_geodataframe(result.data)
        convert_ms = (time.perf_counter() - convert_start) * 1000
        total_ms = (time.perf_counter() - db_start) * 1000
        
        logger.info(f"[TIMING] Supabase query total: {total_ms:.2f}ms (RPC: {rpc_ms:.2f}ms, Convert: {convert_ms:.2f}ms, Count: {len(gdf)})")
        return gdf
        
    except Exception as e:
        # 如果 RPC 函數不存在，使用備用方法：直接查詢然後在 Python 中過濾
        # 注意：這不會使用 GiST index，效能較差
        import warnings
        warnings.warn(
            f"RPC 函數 'get_buildings_in_bbox' 不存在，使用備用查詢方法: {e}\n"
            "建議在 Supabase 中建立 RPC 函數以獲得最佳效能。"
        )
        
        fallback_start = time.perf_counter()
        result = _get_buildings_fallback(supabase, min_lon, min_lat, max_lon, max_lat, tile_id)
        fallback_ms = (time.perf_counter() - fallback_start) * 1000
        total_ms = (time.perf_counter() - db_start) * 1000
        
        logger.info(f"[TIMING] Supabase query (fallback) total: {total_ms:.2f}ms (Fallback: {fallback_ms:.2f}ms, Count: {len(result)})")
        return result


def _convert_to_geodataframe(data: list) -> gpd.GeoDataFrame:
    """將 Supabase 返回的資料轉換為 GeoDataFrame。"""
    import json
    from shapely.geometry import shape
    
    rows = []
    geometries = []
    
    for row in data:
        # 提取屬性
        rows.append({
            "id": row.get("id"),
            "height": row.get("height"),
            "color": row.get("color"),
            "roof_color": row.get("roof_color"),
            "tile_id": row.get("tile_id"),
            "created_at": row.get("created_at"),
        })
        
        # 轉換 geometry（可能是 GeoJSON 格式）
        geom_data = row.get("geometry")
        if isinstance(geom_data, dict):
            # 已經是 GeoJSON 格式
            geometries.append(shape(geom_data))
        elif isinstance(geom_data, str):
            # 是 JSON 字串
            geometries.append(shape(json.loads(geom_data)))
        else:
            # 嘗試直接使用
            geometries.append(shape(geom_data) if geom_data else None)
    
    return gpd.GeoDataFrame(rows, geometry=geometries, crs="EPSG:4326")


def _get_buildings_fallback(
    supabase: Client,
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    tile_id: Optional[str] = None,
) -> gpd.GeoDataFrame:
    """
    備用查詢方法：直接從 Supabase 取得所有資料，然後在 Python 中過濾。
    
    注意：這不會使用 GiST index，效能較差，僅用於測試。
    """
    # 取得所有建築物（或特定 tile_id）
    query = supabase.table("buildings").select("id, geometry, height, color, roof_color, tile_id, created_at")
    
    if tile_id:
        query = query.eq("tile_id", tile_id)
    
    # 限制查詢數量以避免記憶體問題
    result = query.limit(10000).execute()
    
    if not result.data:
        return gpd.GeoDataFrame(
            columns=["id", "height", "color", "roof_color", "tile_id", "created_at"],
            geometry=[],
            crs="EPSG:4326",
        )
    
    # 轉換為 GeoDataFrame
    gdf = _convert_to_geodataframe(result.data)
    
    # 在 Python 中過濾 bounding box
    bbox = box(min_lon, min_lat, max_lon, max_lat)
    filtered = gdf[gdf.geometry.intersects(bbox)]
    
    return filtered


def get_buildings_in_polygon(polygon: Polygon, tile_id: Optional[str] = None) -> gpd.GeoDataFrame:
    """
    查詢指定多邊形內的建築物。
    
    Parameters
    ----------
    polygon : Polygon
        Shapely Polygon 物件（EPSG:4326）
    tile_id : str, optional
        可選的 tile_id 篩選
    
    Returns
    -------
    gpd.GeoDataFrame
        包含建築物的 GeoDataFrame
    """
    # 取得多邊形的 bounding box
    bounds = polygon.bounds  # (minx, miny, maxx, maxy)
    min_lon, min_lat, max_lon, max_lat = bounds
    
    # 先使用 bounding box 查詢（利用 GiST index）
    gdf = get_buildings_in_bbox(min_lon, min_lat, max_lon, max_lat, tile_id)
    
    # 然後精確過濾到多邊形內
    filtered = gdf[gdf.geometry.within(polygon)]
    
    return filtered


def count_buildings_in_bbox(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
) -> int:
    """計算 bounding box 內的建築物數量（用於測試/統計）。"""
    supabase = get_supabase_client()
    
    try:
        # 使用 RPC 函數
        params = {
            "min_lon": min_lon,
            "min_lat": min_lat,
            "max_lon": max_lon,
            "max_lat": max_lat,
        }
        result = supabase.rpc("count_buildings_in_bbox", params).execute()
        return result.data[0].get("count", 0) if result.data else 0
    except Exception:
        # 備用方法
        gdf = get_buildings_in_bbox(min_lon, min_lat, max_lon, max_lat)
        return len(gdf)


def get_all_buildings() -> gpd.GeoDataFrame:
    """
    分頁查詢所有建築物（處理 Supabase 1000 筆限制）。
    
    Returns
    -------
    gpd.GeoDataFrame
        包含所有建築物的 GeoDataFrame
    """
    import logging
    logger = logging.getLogger(__name__)
    
    supabase = get_supabase_client()
    all_data = []
    page_size = 1000
    offset = 0
    
    logger.info(f"Fetching all buildings (paginated, {page_size} per page)...")
    
    while True:
        result = supabase.table("buildings").select(
            "id, geometry, height, color, roof_color, tile_id, created_at"
        ).range(offset, offset + page_size - 1).execute()
        
        if not result.data:
            break
        
        all_data.extend(result.data)
        logger.debug(f"Fetched page {offset // page_size + 1}: {len(result.data)} buildings (total: {len(all_data)})")
        
        # 如果返回的資料少於 page_size，表示已經是最後一頁
        if len(result.data) < page_size:
            break
        
        offset += page_size
    
    logger.info(f"Total buildings fetched: {len(all_data)}")
    
    if not all_data:
        return gpd.GeoDataFrame(
            columns=["id", "height", "color", "roof_color", "tile_id", "created_at"],
            geometry=[],
            crs="EPSG:4326",
        )
    
    return _convert_to_geodataframe(all_data)


def get_precomputed_shadows(
    date,
    hour: int,
    min_lon: float = None,
    min_lat: float = None,
    max_lon: float = None,
    max_lat: float = None,
) -> Optional[dict]:
    """
    查詢預計算陰影。
    
    Parameters
    ----------
    date : date or str
        日期（YYYY-MM-DD 格式或 date 物件）
    hour : int
        小時 (0-23)
    min_lon, min_lat, max_lon, max_lat : float, optional
        Bounding box 座標（可選）
    
    Returns
    -------
    dict or None
        GeoJSON FeatureCollection，如果沒有找到則返回 None
    """
    import logging
    from datetime import date as date_type
    
    logger = logging.getLogger(__name__)
    supabase = get_supabase_client()
    
    # 確保 date 是 date 物件
    if isinstance(date, str):
        from datetime import datetime
        date = datetime.strptime(date, "%Y-%m-%d").date()
    elif not isinstance(date, date_type):
        date = date.date() if hasattr(date, 'date') else date
    
    try:
        params = {
            "query_date": date.isoformat(),
            "query_hour": hour,
        }
        
        # 可選的 bbox 參數
        if min_lon is not None and min_lat is not None and max_lon is not None and max_lat is not None:
            params.update({
                "min_lon": min_lon,
                "min_lat": min_lat,
                "max_lon": max_lon,
                "max_lat": max_lat,
            })
        
        result = supabase.rpc("get_shadow_map_for_date_hour", params).execute()
        
        if result.data and len(result.data) > 0:
            # RPC 返回的格式是 [{"type": "FeatureCollection", "features": [...]}]
            # features 是一個 JSONB 陣列，包含一個或多個 Feature 物件
            row = result.data[0]
            features_array = row.get("features", [])
            
            # 如果 features 是空陣列，返回空 FeatureCollection
            if not features_array or len(features_array) == 0:
                return {
                    "type": "FeatureCollection",
                    "features": []
                }
            
            # 構建完整的 FeatureCollection
            return {
                "type": "FeatureCollection",
                "features": features_array if isinstance(features_array, list) else []
            }
        
        return None
        
    except Exception as e:
        logger.warning(f"Failed to get precomputed shadows: {e}")
        return None


def upsert_shadow_map(
    date,
    hour: int,
    shadow_multipolygon,
    timestamp,
    building_count: int = 0,
    shadow_count: int = 0,
    computation_time_ms: float = None,
) -> None:
    """
    插入或更新預計算陰影。
    
    Parameters
    ----------
    date : date or str
        日期（YYYY-MM-DD 格式或 date 物件）
    hour : int
        小時 (0-23)
    shadow_multipolygon : MultiPolygon
        Shapely MultiPolygon 物件
    timestamp : datetime or pd.Timestamp
        完整時間戳（必須包含時區資訊，建議使用 Asia/Taipei）
    building_count : int
        建築物數量
    shadow_count : int
        原始陰影多邊形數量（union 前）
    computation_time_ms : float
        計算耗時（毫秒）
    """
    import logging
    from datetime import date as date_type
    import json
    import pandas as pd
    
    logger = logging.getLogger(__name__)
    supabase = get_supabase_client()
    
    # 確保 date 是 date 物件
    if isinstance(date, str):
        from datetime import datetime
        date = datetime.strptime(date, "%Y-%m-%d").date()
    elif not isinstance(date, date_type):
        date = date.date() if hasattr(date, 'date') else date
    
    # 轉換 MultiPolygon 為 GeoJSON 字串
    # 使用 geopandas 轉換（最可靠的方法）
    import geopandas as gpd
    gdf = gpd.GeoDataFrame([1], geometry=[shadow_multipolygon], crs="EPSG:4326")
    # 轉換為 GeoJSON，然後提取 geometry
    geojson_dict = json.loads(gdf.to_json())
    if geojson_dict.get("type") == "FeatureCollection" and geojson_dict.get("features"):
        # 提取第一個 feature 的 geometry（因為只有一個 MultiPolygon）
        geojson_str = json.dumps(geojson_dict["features"][0]["geometry"])
    else:
        # Fallback: 使用 __geo_interface__
        if hasattr(shadow_multipolygon, '__geo_interface__'):
            geojson_str = json.dumps(shadow_multipolygon.__geo_interface__)
        else:
            raise ValueError(f"Cannot convert MultiPolygon to GeoJSON: {type(shadow_multipolygon)}")
    
    # 確保 timestamp 有時區資訊，然後轉換為 UTC 以便正確儲存到資料庫
    if isinstance(timestamp, pd.Timestamp):
        if timestamp.tzinfo is None:
            # 如果沒有時區，假設是 Asia/Taipei
            timestamp = timestamp.tz_localize('Asia/Taipei')
        # 轉換為 UTC（資料庫儲存 UTC 時間）
        timestamp_utc = timestamp.tz_convert('UTC')
    elif hasattr(timestamp, 'tzinfo'):
        import pytz
        if timestamp.tzinfo is None:
            # 如果沒有時區，假設是 Asia/Taipei
            timestamp = pytz.timezone('Asia/Taipei').localize(timestamp)
        # 轉換為 UTC
        timestamp_utc = timestamp.astimezone(pytz.UTC)
    else:
        raise ValueError(f"Invalid timestamp type: {type(timestamp)}")
    
    # 轉換為 ISO 格式字串（UTC 時區）
    if isinstance(timestamp_utc, pd.Timestamp):
        timestamp_str = timestamp_utc.isoformat()
    else:
        timestamp_str = timestamp_utc.isoformat()
    
    try:
        params = {
            "p_date": date.isoformat(),
            "p_hour": hour,
            "p_shadow_multipolygon_geojson": geojson_str,
            "p_timestamp": timestamp_str,
            "p_building_count": building_count,
            "p_shadow_count": shadow_count,
        }
        
        if computation_time_ms is not None:
            params["p_computation_time_ms"] = computation_time_ms
        
        supabase.rpc("upsert_shadow_map", params).execute()
        logger.info(f"Upserted shadow map for date={date}, hour={hour}")
        
    except Exception as e:
        logger.error(f"Failed to upsert shadow map: {e}", exc_info=True)
        raise


def delete_old_shadow_maps(retention_days: int = 7) -> int:
    """
    刪除超過保留天數的舊陰影資料。
    
    Parameters
    ----------
    retention_days : int
        保留天數（預設 7 天）
    
    Returns
    -------
    int
        刪除的記錄數量
    """
    import logging
    logger = logging.getLogger(__name__)
    supabase = get_supabase_client()
    
    try:
        result = supabase.rpc("delete_old_shadow_maps", {"retention_days": retention_days}).execute()
        deleted_count = result.data[0].get("delete_old_shadow_maps", 0) if result.data else 0
        logger.info(f"Deleted {deleted_count} old shadow maps (retention: {retention_days} days)")
        return deleted_count
    except Exception as e:
        logger.error(f"Failed to delete old shadow maps: {e}", exc_info=True)
        raise

