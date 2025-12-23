#!/usr/bin/env python3
"""
每日陰影預計算腳本

從 Supabase 取得所有建築物，計算指定日期 6-16 點（11 小時）的陰影，
合併成 MultiPolygon 並儲存到 shadow_maps 表。

執行方式：
    python scripts/precompute_daily_shadows.py [--date YYYY-MM-DD] [--retention-days N]

預設行為：
    - date: 今天（台灣時區）
    - retention_days: 7
"""
import sys
from pathlib import Path

# 添加項目根目錄到 Python 路徑
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import argparse
import logging
from datetime import date, datetime
from time import perf_counter

import pandas as pd
import pytz
from shapely.geometry import MultiPolygon
from shapely.ops import unary_union

from backend.shadow import project_shadows
from database.queries import (
    delete_old_shadow_maps,
    get_all_buildings,
    upsert_shadow_map,
)

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 台灣時區
TAIPEI_TZ = pytz.timezone('Asia/Taipei')


def get_supabase_client_from_config():
    """從配置取得 Supabase client（用於驗證連接）。"""
    from database.queries import get_supabase_client
    return get_supabase_client()


def compute_shadows_for_hour(
    hour: int,
    buildings,
    target_date: date,
    center_lat: float,
    center_lon: float,
) -> tuple[MultiPolygon | None, int, int]:
    """
    計算指定小時所有建築物的陰影，並合併成 MultiPolygon。
    
    Parameters
    ----------
    hour : int
        小時 (0-23)
    buildings : GeoDataFrame
        所有建築物
    target_date : date
        目標日期
    center_lat : float
        太陽位置計算的中心緯度
    center_lon : float
        太陽位置計算的中心經度
    
    Returns
    -------
    tuple[MultiPolygon | None, int, int]
        (合併後的 MultiPolygon, 建築物數量, 原始陰影數量)
    """
    # 建立台灣時區的時間戳（30分鐘過去，例如 6:30, 7:30）
    timestamp_str = f"{target_date.isoformat()} {hour:02d}:30:00"
    timestamp = pd.Timestamp(timestamp_str, tz='Asia/Taipei')
    
    logger.info(f"Computing shadows for hour {hour:02d} (at {timestamp.isoformat()})...")
    
    # 計算陰影（使用所有建築物，不限制 bbox）
    shadow_gdf = project_shadows(
        buildings,
        lat=center_lat,
        lon=center_lon,
        timestamp=timestamp,
        bounding_box=None,  # 不限制 bbox，計算所有陰影
        max_shadow_length_m=1000.0  # 最大陰影長度 1km
    )
    
    building_count = len(buildings)
    shadow_count = len(shadow_gdf)
    
    if shadow_count == 0:
        logger.warning(f"No shadows generated for hour {hour:02d}")
        return None, building_count, 0
    
    # 合併所有陰影成 MultiPolygon
    logger.info(f"Merging {shadow_count} shadow polygons into MultiPolygon...")
    try:
        shadow_union = unary_union(shadow_gdf.geometry.tolist())
        
        # 確保是 MultiPolygon
        if isinstance(shadow_union, MultiPolygon):
            merged_shadow = shadow_union
        elif hasattr(shadow_union, 'geom_type') and shadow_union.geom_type == 'Polygon':
            # 單個 Polygon，轉換為 MultiPolygon
            merged_shadow = MultiPolygon([shadow_union])
        else:
            logger.warning(f"Unexpected geometry type after union: {type(shadow_union)}")
            return None, building_count, shadow_count
        
        logger.info(f"Successfully merged shadows into MultiPolygon with {len(merged_shadow.geoms)} parts")
        return merged_shadow, building_count, shadow_count
        
    except Exception as e:
        logger.error(f"Failed to merge shadows: {e}", exc_info=True)
        return None, building_count, shadow_count


def precompute_daily(target_date: date = None, retention_days: int = 7):
    """
    預計算指定日期的陰影。
    
    Parameters
    ----------
    target_date : date, optional
        目標日期（預設：今天，台灣時區）
    retention_days : int
        保留天數（預設：7）
    """
    # 確定目標日期（台灣時區的今天）
    if target_date is None:
        target_date = datetime.now(TAIPEI_TZ).date()
    
    logger.info(f"Starting daily shadow precomputation for {target_date.isoformat()}")
    logger.info(f"Retention policy: {retention_days} days")
    
    # 1. 刪除超過保留天數的舊資料
    logger.info("Deleting old shadow maps...")
    try:
        deleted_count = delete_old_shadow_maps(retention_days=retention_days)
        logger.info(f"Deleted {deleted_count} old shadow map records")
    except Exception as e:
        logger.error(f"Failed to delete old shadow maps: {e}", exc_info=True)
        # 繼續執行，不中斷
    
    # 2. 查詢所有建築物
    logger.info("Fetching all buildings from Supabase...")
    fetch_start = perf_counter()
    try:
        buildings = get_all_buildings()
        fetch_time = perf_counter() - fetch_start
        logger.info(f"Fetched {len(buildings)} buildings in {fetch_time:.2f}s")
    except Exception as e:
        logger.error(f"Failed to fetch buildings: {e}", exc_info=True)
        raise
    
    if len(buildings) == 0:
        logger.warning("No buildings found in database")
        return
    
    # 3. 計算所有建築物的幾何中心（用於太陽位置計算）
    logger.info("Calculating geometric center of all buildings...")
    center_geom = buildings.geometry.unary_union
    center_point = center_geom.centroid
    center_lon = center_point.x
    center_lat = center_point.y
    logger.info(f"Geometric center: ({center_lat:.6f}, {center_lon:.6f})")
    
    # 4. 對 7-16 點（10 小時）逐一計算
    hours_to_compute = list(range(7, 17))  # 7, 8, 9, ..., 16
    logger.info(f"Computing shadows for {len(hours_to_compute)} hours: {hours_to_compute}")
    
    success_count = 0
    fail_count = 0
    
    for hour in hours_to_compute:
        try:
            hour_start = perf_counter()
            
            # 計算該小時的陰影
            merged_shadow, building_count, shadow_count = compute_shadows_for_hour(
                hour=hour,
                buildings=buildings,
                target_date=target_date,
                center_lat=center_lat,
                center_lon=center_lon,
            )
            
            if merged_shadow is None:
                logger.warning(f"Skipping hour {hour:02d} (no shadows generated)")
                fail_count += 1
                continue
            
            # 建立時間戳（30分鐘過去）
            timestamp_str = f"{target_date.isoformat()} {hour:02d}:30:00"
            timestamp = pd.Timestamp(timestamp_str, tz='Asia/Taipei')
            
            # UPSERT 到資料庫
            computation_time_ms = (perf_counter() - hour_start) * 1000
            upsert_shadow_map(
                date=target_date,
                hour=hour,
                shadow_multipolygon=merged_shadow,
                timestamp=timestamp,
                building_count=building_count,
                shadow_count=shadow_count,
                computation_time_ms=computation_time_ms,
            )
            
            hour_time = perf_counter() - hour_start
            logger.info(
                f"✓ Hour {hour:02d} completed in {hour_time:.2f}s "
                f"(buildings: {building_count}, shadows: {shadow_count}, "
                f"computation: {computation_time_ms:.2f}ms)"
            )
            success_count += 1
            
        except Exception as e:
            logger.error(f"✗ Failed to compute shadows for hour {hour:02d}: {e}", exc_info=True)
            fail_count += 1
            # 繼續處理下一個小時
    
    # 總結
    total_time = perf_counter() - fetch_start
    logger.info("=" * 60)
    logger.info(f"Precomputation completed in {total_time:.2f}s")
    logger.info(f"Success: {success_count}/{len(hours_to_compute)}, Failed: {fail_count}/{len(hours_to_compute)}")
    logger.info("=" * 60)


def main():
    """主函數：解析命令列參數並執行預計算。"""
    parser = argparse.ArgumentParser(
        description="Precompute daily shadow maps for all buildings"
    )
    parser.add_argument(
        "--date",
        type=str,
        help="Target date (YYYY-MM-DD format). Default: today (Asia/Taipei timezone)",
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=7,
        help="Number of days to retain shadow maps (default: 7)",
    )
    
    args = parser.parse_args()
    
    # 解析日期
    target_date = None
    if args.date:
        try:
            target_date = datetime.strptime(args.date, "%Y-%m-%d").date()
        except ValueError:
            logger.error(f"Invalid date format: {args.date}. Use YYYY-MM-DD")
            sys.exit(1)
    
    # 驗證 Supabase 連接
    try:
        logger.info("Verifying Supabase connection...")
        get_supabase_client_from_config()
        logger.info("✓ Supabase connection verified")
    except Exception as e:
        logger.error(f"✗ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # 執行預計算
    try:
        precompute_daily(target_date=target_date, retention_days=args.retention_days)
        logger.info("✓ Precomputation completed successfully")
    except Exception as e:
        logger.error(f"✗ Precomputation failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
