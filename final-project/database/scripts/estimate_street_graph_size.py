"""
估算路網圖資料大小。

這個腳本會下載一小部分路網圖來估算整個台北市的資料大小。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import osmnx as ox
import geopandas as gpd
import networkx as nx

# 台北市範圍
TAIPEI_BBOX = {
    "north": 25.15,
    "south": 25.0,
    "east": 121.65,
    "west": 121.45,
}

# 計算面積（平方公里）
def calculate_area_km2(bbox):
    """計算 bounding box 的面積（平方公里）。"""
    from math import cos, radians
    
    # 緯度差（度）
    lat_diff = bbox["north"] - bbox["south"]
    # 經度差（度）
    lon_diff = bbox["east"] - bbox["west"]
    
    # 平均緯度（用於計算經度距離）
    avg_lat = (bbox["north"] + bbox["south"]) / 2
    
    # 1 度緯度 ≈ 111 km
    # 1 度經度 ≈ 111 km × cos(緯度)
    lat_km = lat_diff * 111.0
    lon_km = lon_diff * 111.0 * cos(radians(avg_lat))
    
    area_km2 = lat_km * lon_km
    return area_km2


def estimate_size_from_sample():
    """從樣本估算整個區域的大小。"""
    print("=" * 60)
    print("路網圖資料大小估算")
    print("=" * 60)
    
    # 計算總面積
    total_area = calculate_area_km2(TAIPEI_BBOX)
    print(f"\n台北市範圍面積: {total_area:.2f} 平方公里")
    print(f"範圍: {TAIPEI_BBOX}")
    
    # 下載一小塊區域作為樣本（約 1 平方公里）
    sample_bbox = {
        "north": 25.01,
        "south": 25.00,
        "east": 121.54,
        "west": 121.53,
    }
    sample_area = calculate_area_km2(sample_bbox)
    
    print(f"\n下載樣本區域（約 {sample_area:.2f} 平方公里）...")
    print(f"樣本範圍: {sample_bbox}")
    
    try:
        G_sample = ox.graph_from_bbox(
            north=sample_bbox["north"],
            south=sample_bbox["south"],
            east=sample_bbox["east"],
            west=sample_bbox["west"],
            network_type="walk",
            simplify=True,
            retain_all=False,
        )
        
        nodes_sample, edges_sample = ox.graph_to_gdfs(G_sample)
        
        print(f"\n樣本統計:")
        print(f"  節點數: {len(nodes_sample)}")
        print(f"  邊數: {len(edges_sample)}")
        
        # 計算密度
        nodes_per_km2 = len(nodes_sample) / sample_area if sample_area > 0 else 0
        edges_per_km2 = len(edges_sample) / sample_area if sample_area > 0 else 0
        
        print(f"\n密度:")
        print(f"  節點密度: {nodes_per_km2:.0f} 個/平方公里")
        print(f"  邊密度: {edges_per_km2:.0f} 條/平方公里")
        
        # 估算整個區域
        estimated_nodes = int(nodes_per_km2 * total_area)
        estimated_edges = int(edges_per_km2 * total_area)
        
        print(f"\n整個台北市估算:")
        print(f"  預估節點數: {estimated_nodes:,}")
        print(f"  預估邊數: {estimated_edges:,}")
        
        # 估算資料大小
        # 每個 node: osmid (8) + geometry (約 50) + y (8) + x (8) + street_count (4) + created_at (8) ≈ 86 bytes
        # 每個 edge: id (8) + u (8) + v (8) + key (4) + geometry (約 150) + length (8) + name (20) + highway (10) + created_at (8) ≈ 224 bytes
        # 加上索引：GiST 索引通常增加 50-100% 空間
        
        node_size_per_record = 86  # bytes
        edge_size_per_record = 224  # bytes
        index_overhead = 1.5  # 索引增加 50% 空間
        
        nodes_size_mb = (estimated_nodes * node_size_per_record * index_overhead) / (1024 * 1024)
        edges_size_mb = (estimated_edges * edge_size_per_record * index_overhead) / (1024 * 1024)
        total_size_mb = nodes_size_mb + edges_size_mb
        
        print(f"\n資料大小估算:")
        print(f"  Nodes 表: {nodes_size_mb:.2f} MB")
        print(f"  Edges 表: {edges_size_mb:.2f} MB")
        print(f"  總計: {total_size_mb:.2f} MB")
        print(f"  總計: {total_size_mb / 1024:.2f} GB")
        
        # Supabase 限制
        print(f"\nSupabase 限制:")
        print(f"  免費方案: 500 MB 資料庫空間")
        print(f"  Pro 方案: 8 GB 資料庫空間（$25/月）")
        
        if total_size_mb <= 500:
            print(f"\n✓ 預估大小在 Supabase 免費方案範圍內")
        elif total_size_mb <= 8192:
            print(f"\n⚠ 預估大小超過免費方案，需要 Pro 方案")
        else:
            print(f"\n✗ 預估大小超過 Pro 方案，需要考慮其他方案")
        
        return estimated_nodes, estimated_edges, total_size_mb
        
    except Exception as e:
        print(f"\n錯誤: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None


if __name__ == "__main__":
    estimate_size_from_sample()

