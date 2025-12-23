"""
匯入整個台北的路網圖到 Supabase 資料庫。

這個腳本會：
1. 使用 OSMnx 下載整個台北的步行路網
2. 將 nodes 和 edges 轉換為 GeoDataFrame
3. 匯入到 Supabase 的 street_graph_nodes 和 street_graph_edges 表

台北市範圍（大約）：
- 緯度：25.0 到 25.15
- 經度：121.45 到 121.65
"""
import sys
import os
from pathlib import Path
import time

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import osmnx as ox
import geopandas as gpd
import pandas as pd
from shapely.geometry import box, Point, LineString
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent.parent / ".env")

# Taipei bounding box (approximate)
# 目前範圍：台北市主要區域
# 如果需要涵蓋更大範圍（如新北市），可以調整這些數值
TAIPEI_BBOX = {
    "north": 25.15,   # 緯度上限（可調整到 25.2+ 涵蓋更多區域）
    "south": 25.0,    # 緯度下限（可調整到 24.9- 涵蓋更多區域）
    "east": 121.65,   # 經度上限（可調整到 121.7+ 涵蓋更多區域）
    "west": 121.45,   # 經度下限（可調整到 121.3- 涵蓋更多區域）
}

# 大台北地區範圍範例（包含新北市）：
# TAIPEI_BBOX = {
#     "north": 25.3,   # 涵蓋到新北市北部
#     "south": 24.8,   # 涵蓋到新北市南部
#     "east": 121.8,   # 涵蓋到新北市東部
#     "west": 121.2,   # 涵蓋到新北市西部
# }

BATCH_SIZE = 1000  # Insert in batches to avoid memory issues


def get_supabase_client():
    """Get Supabase client."""
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_KEY", "")
    
    if not supabase_url or not supabase_key:
        raise ValueError(
            "請設定 SUPABASE_URL 和 SUPABASE_KEY 環境變數\n"
            "可以在 .env 檔案中設定，或使用環境變數"
        )
    
    return create_client(supabase_url, supabase_key)


def download_taipei_street_graph():
    """下載整個台北的步行路網圖。"""
    print("正在下載台北市步行路網圖...")
    print(f"範圍: {TAIPEI_BBOX}")
    
    start_time = time.time()
    
    # 使用 bounding box 建立 polygon，然後用 graph_from_polygon 下載
    # 因為新版本的 OSMnx graph_from_bbox API 可能已改變
    bbox_polygon = box(
        TAIPEI_BBOX["west"],
        TAIPEI_BBOX["south"],
        TAIPEI_BBOX["east"],
        TAIPEI_BBOX["north"]
    )
    
    G = ox.graph_from_polygon(
        bbox_polygon,
        network_type="walk",
        simplify=True,
        retain_all=False,
    )
    
    elapsed = time.time() - start_time
    print(f"✓ 下載完成，耗時 {elapsed:.2f} 秒")
    print(f"✓ 節點數: {len(G.nodes())}")
    print(f"✓ 邊數: {len(G.edges())}")
    
    return G


def convert_graph_to_gdfs(G):
    """將 NetworkX graph 轉換為 nodes 和 edges GeoDataFrame。"""
    print("\n正在轉換圖為 GeoDataFrame...")
    
    start_time = time.time()
    nodes, edges = ox.graph_to_gdfs(G)
    
    elapsed = time.time() - start_time
    print(f"✓ 轉換完成，耗時 {elapsed:.2f} 秒")
    
    return nodes, edges


def prepare_nodes_for_db(nodes_gdf):
    """準備 nodes 資料以便匯入資料庫。"""
    print("\n正在準備 nodes 資料...")
    
    # OSMnx graph_to_gdfs 返回的 nodes 使用 index 作為 osmid
    # 需要將 index 轉換為 osmid 欄位
    nodes_df = nodes_gdf.copy()
    
    # 如果 osmid 不在 columns 中，從 index 取得
    if "osmid" not in nodes_df.columns:
        nodes_df["osmid"] = nodes_df.index
    
    # 確保有 geometry, y, x 欄位
    if "geometry" not in nodes_df.columns:
        raise ValueError("Nodes GeoDataFrame 缺少 geometry 欄位")
    
    # 如果沒有 y, x 欄位，從 geometry 提取
    if "y" not in nodes_df.columns or "x" not in nodes_df.columns:
        nodes_df["y"] = nodes_df.geometry.y
        nodes_df["x"] = nodes_df.geometry.x
    
    # Select columns we need
    cols_to_keep = ["osmid", "geometry", "y", "x"]
    if "street_count" in nodes_df.columns:
        cols_to_keep.append("street_count")
    
    nodes_df = nodes_df[cols_to_keep].copy()
    
    # Ensure osmid is integer
    nodes_df["osmid"] = nodes_df["osmid"].astype(int)
    
    # Fill missing street_count with 0
    if "street_count" in nodes_df.columns:
        nodes_df["street_count"] = nodes_df["street_count"].fillna(0).astype(int)
    else:
        nodes_df["street_count"] = 0
    
    print(f"✓ 準備了 {len(nodes_df)} 個節點")
    print(f"  欄位: {list(nodes_df.columns)}")
    
    return nodes_df


def prepare_edges_for_db(edges_gdf):
    """準備 edges 資料以便匯入資料庫。"""
    print("\n正在準備 edges 資料...")
    
    edges_df = edges_gdf.copy()
    
    # OSMnx graph_to_gdfs 返回的 edges 使用 MultiIndex (u, v, key) 作為 index
    # 需要將 index 轉換為 u, v, key 欄位
    if "u" not in edges_df.columns or "v" not in edges_df.columns:
        # 如果 index 是 MultiIndex
        if isinstance(edges_df.index, pd.MultiIndex):
            edges_df["u"] = edges_df.index.get_level_values(0)
            edges_df["v"] = edges_df.index.get_level_values(1)
            if len(edges_df.index.names) > 2 and edges_df.index.nlevels > 2:
                edges_df["key"] = edges_df.index.get_level_values(2)
            else:
                edges_df["key"] = 0
        else:
            raise ValueError("Edges GeoDataFrame 缺少 u, v 欄位，且 index 不是 MultiIndex")
    
    # Ensure we have geometry
    if "geometry" not in edges_df.columns:
        raise ValueError("Edges GeoDataFrame 缺少 geometry 欄位")
    
    # Select columns we need
    required_cols = ["u", "v", "geometry"]
    optional_cols = ["key", "length", "name", "highway"]
    cols_to_keep = required_cols + [col for col in optional_cols if col in edges_df.columns]
    edges_df = edges_df[cols_to_keep].copy()
    
    # Ensure u, v are integers
    edges_df["u"] = edges_df["u"].astype(int)
    edges_df["v"] = edges_df["v"].astype(int)
    
    # Handle key column
    if "key" in edges_df.columns:
        edges_df["key"] = edges_df["key"].fillna(0).astype(int)
    else:
        edges_df["key"] = 0
    
    # Fill missing length with 0
    if "length" in edges_df.columns:
        edges_df["length"] = edges_df["length"].fillna(0.0)
    else:
        edges_df["length"] = 0.0
    
    print(f"✓ 準備了 {len(edges_df)} 個邊")
    print(f"  欄位: {list(edges_df.columns)}")
    
    return edges_df


def convert_geometry_to_geojson(gdf):
    """將 GeoDataFrame 的 geometry 轉換為 GeoJSON 格式（Supabase 需要）。"""
    return gdf.to_json()


def insert_nodes_batch(supabase, nodes_batch):
    """批次插入 nodes 到 Supabase。"""
    records = []
    for _, row in nodes_batch.iterrows():
        geom = row.geometry
        records.append({
            "osmid": int(row["osmid"]),
            "geometry": {
                "type": "Point",
                "coordinates": [geom.x, geom.y]
            },
            "y": float(row["y"]),
            "x": float(row["x"]),
            "street_count": int(row["street_count"]) if pd.notna(row["street_count"]) else 0,
        })
    
    # Insert to Supabase (use upsert to handle duplicates)
    # on_conflict='osmid' means update if exists, insert if not
    result = supabase.table("street_graph_nodes").upsert(records, on_conflict="osmid").execute()
    return len(result.data) if result.data else len(records)


def insert_edges_batch(supabase, edges_batch):
    """批次插入 edges 到 Supabase。"""
    records = []
    for _, row in edges_batch.iterrows():
        geom = row.geometry
        # Handle LineString or MultiLineString
        if geom.geom_type == "LineString":
            coords = [[float(coord[0]), float(coord[1])] for coord in geom.coords]
        elif geom.geom_type == "MultiLineString":
            # Take first line string
            coords = [[float(coord[0]), float(coord[1])] for coord in geom.geoms[0].coords]
        else:
            print(f"警告: 跳過非 LineString 類型的邊: {geom.geom_type}")
            continue
        
        # Safely extract values, handling NaN and None
        # Convert to Python native types to avoid Series comparison issues
        key_val = row["key"]
        if isinstance(key_val, (pd.Series, list, tuple)):
            key_val = key_val.iloc[0] if isinstance(key_val, pd.Series) else key_val[0]
        key_val = int(key_val) if pd.notna(key_val) else 0
        
        length_val = row["length"]
        if isinstance(length_val, (pd.Series, list, tuple)):
            length_val = length_val.iloc[0] if isinstance(length_val, pd.Series) else length_val[0]
        length_val = float(length_val) if pd.notna(length_val) else 0.0
        
        name_val = None
        if "name" in row.index:
            name_val = row["name"]
            if isinstance(name_val, (pd.Series, list, tuple)):
                name_val = name_val.iloc[0] if isinstance(name_val, pd.Series) else name_val[0]
            name_val = str(name_val) if pd.notna(name_val) else None
        
        highway_val = None
        if "highway" in row.index:
            highway_val = row["highway"]
            if isinstance(highway_val, (pd.Series, list, tuple)):
                highway_val = highway_val.iloc[0] if isinstance(highway_val, pd.Series) else highway_val[0]
            highway_val = str(highway_val) if pd.notna(highway_val) else None
        
        records.append({
            "u": int(row["u"]),
            "v": int(row["v"]),
            "key": key_val,
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            "length": length_val,
            "name": name_val,
            "highway": highway_val,
        })
    
    # Insert to Supabase (use insert with ignore_duplicates for edges)
    # Edges don't have a unique constraint on (u, v, key), so we can use insert
    # But if there's a conflict, we'll catch it and continue
    if records:
        try:
            result = supabase.table("street_graph_edges").insert(records).execute()
            return len(result.data) if result.data else len(records)
        except Exception as e:
            # If duplicate error, try to insert one by one to skip duplicates
            error_str = str(e)
            if "duplicate" in error_str.lower() or "23505" in error_str:
                # Insert one by one, skipping duplicates
                inserted_count = 0
                for record in records:
                    try:
                        supabase.table("street_graph_edges").insert(record).execute()
                        inserted_count += 1
                    except Exception:
                        # Skip duplicate
                        continue
                return inserted_count
            else:
                raise
    return 0


def import_to_supabase(supabase, nodes_df, edges_df):
    """匯入 nodes 和 edges 到 Supabase。"""
    print("\n開始匯入到 Supabase...")
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    print("清除現有資料...")
    try:
        # Delete all edges first (due to foreign key constraint)
        edges_result = supabase.table("street_graph_edges").delete().neq("id", -1).execute()
        print(f"  已清除 {len(edges_result.data) if edges_result.data else 0} 個邊")
        
        # Then delete all nodes
        nodes_result = supabase.table("street_graph_nodes").delete().neq("osmid", -1).execute()
        print(f"  已清除 {len(nodes_result.data) if nodes_result.data else 0} 個節點")
        
        print("✓ 已清除現有資料")
    except Exception as e:
        print(f"警告: 清除資料時發生錯誤（可能表是空的）: {e}")
    
    # Insert nodes in batches
    print(f"\n正在匯入 {len(nodes_df)} 個節點...")
    start_time = time.time()
    total_inserted = 0
    
    for i in range(0, len(nodes_df), BATCH_SIZE):
        batch = nodes_df.iloc[i:i+BATCH_SIZE]
        max_retries = 3
        retry_count = 0
        inserted = 0
        
        while retry_count < max_retries:
            try:
                inserted = insert_nodes_batch(supabase, batch)
                total_inserted += inserted
                print(f"  已匯入 {total_inserted}/{len(nodes_df)} 個節點...", end="\r")
                time.sleep(0.1)  # Avoid rate limiting
                break  # Success, exit retry loop
            except Exception as e:
                retry_count += 1
                if retry_count < max_retries:
                    wait_time = retry_count * 2  # Exponential backoff
                    print(f"\n  錯誤：批次插入失敗，{wait_time} 秒後重試 ({retry_count}/{max_retries}): {e}")
                    time.sleep(wait_time)
                else:
                    print(f"\n  錯誤：批次插入失敗（已重試 {max_retries} 次）: {e}")
                    # Continue with next batch
    
    elapsed = time.time() - start_time
    print(f"\n✓ 節點匯入完成，耗時 {elapsed:.2f} 秒")
    
    # Insert edges in batches
    print(f"\n正在匯入 {len(edges_df)} 個邊...")
    start_time = time.time()
    total_inserted = 0
    
    for i in range(0, len(edges_df), BATCH_SIZE):
        batch = edges_df.iloc[i:i+BATCH_SIZE]
        max_retries = 3
        retry_count = 0
        inserted = 0
        
        while retry_count < max_retries:
            try:
                inserted = insert_edges_batch(supabase, batch)
                total_inserted += inserted
                print(f"  已匯入 {total_inserted}/{len(edges_df)} 個邊...", end="\r")
                time.sleep(0.1)  # Avoid rate limiting
                break  # Success, exit retry loop
            except Exception as e:
                retry_count += 1
                if retry_count < max_retries:
                    wait_time = retry_count * 2  # Exponential backoff
                    print(f"\n  錯誤：批次插入失敗，{wait_time} 秒後重試 ({retry_count}/{max_retries}): {e}")
                    time.sleep(wait_time)
                else:
                    print(f"\n  錯誤：批次插入失敗（已重試 {max_retries} 次）: {e}")
                    # Continue with next batch
    
    elapsed = time.time() - start_time
    print(f"\n✓ 邊匯入完成，耗時 {elapsed:.2f} 秒")


def main():
    """主函數。"""
    print("=" * 60)
    print("台北市路網圖匯入工具")
    print("=" * 60)
    
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        print("✓ 已連接到 Supabase\n")
        
        # Download street graph
        G = download_taipei_street_graph()
        
        # Convert to GeoDataFrames
        nodes_gdf, edges_gdf = convert_graph_to_gdfs(G)
        
        # Prepare data for database
        nodes_df = prepare_nodes_for_db(nodes_gdf)
        edges_df = prepare_edges_for_db(edges_gdf)
        
        # Import to Supabase
        import_to_supabase(supabase, nodes_df, edges_df)
        
        print("\n" + "=" * 60)
        print("✓ 匯入完成！")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

