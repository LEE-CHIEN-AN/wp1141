"""
估算所有 Supabase 資料的總大小。

包括：
1. Buildings 表（建築物資料）
2. Street graph 表（路網圖）
3. 可能的 Route cache（如果存到 Supabase）
4. 可能的 Shadow data（如果存到 Supabase）
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# 台北市範圍
TAIPEI_BBOX = {
    "north": 25.15,
    "south": 25.0,
    "east": 121.65,
    "west": 121.45,
}


def calculate_area_km2(bbox):
    """計算 bounding box 的面積（平方公里）。"""
    from math import cos, radians
    
    lat_diff = bbox["north"] - bbox["south"]
    lon_diff = bbox["east"] - bbox["west"]
    avg_lat = (bbox["north"] + bbox["south"]) / 2
    
    lat_km = lat_diff * 111.0
    lon_km = lon_diff * 111.0 * cos(radians(avg_lat))
    
    return lat_km * lon_km


def estimate_buildings_size():
    """估算建築物資料大小。"""
    print("=" * 60)
    print("建築物資料 (buildings 表)")
    print("=" * 60)
    
    # 根據實際匯入的資料估算
    # 假設有 20 個 tile，每個 tile 約 1000-5000 個建築物
    estimated_buildings = 20 * 3000  # 約 60,000 個建築物
    
    # 每個建築物：id (8) + geometry (約 200 bytes，複雜多邊形) + height (8) + color (20) + roof_color (20) + tile_id (10) + created_at (8) ≈ 274 bytes
    # 加上索引：GiST 索引約增加 50%
    building_size_per_record = 274
    index_overhead = 1.5
    
    total_size_mb = (estimated_buildings * building_size_per_record * index_overhead) / (1024 * 1024)
    
    print(f"預估建築物數量: {estimated_buildings:,}")
    print(f"預估大小: {total_size_mb:.2f} MB")
    
    return total_size_mb


def estimate_street_graph_size():
    """估算路網圖資料大小。"""
    print("\n" + "=" * 60)
    print("路網圖資料 (street_graph_nodes + street_graph_edges 表)")
    print("=" * 60)
    
    total_area = calculate_area_km2(TAIPEI_BBOX)
    
    # 使用較保守的估算
    nodes_per_km2 = 1000
    edges_per_km2 = 2000
    
    estimated_nodes = int(nodes_per_km2 * total_area)
    estimated_edges = int(edges_per_km2 * total_area)
    
    node_size_per_record = 86
    edge_size_per_record = 224
    index_overhead = 1.5
    
    nodes_size_mb = (estimated_nodes * node_size_per_record * index_overhead) / (1024 * 1024)
    edges_size_mb = (estimated_edges * edge_size_per_record * index_overhead) / (1024 * 1024)
    total_size_mb = nodes_size_mb + edges_size_mb
    
    print(f"面積: {total_area:.2f} 平方公里")
    print(f"預估節點數: {estimated_nodes:,}")
    print(f"預估邊數: {estimated_edges:,}")
    print(f"預估大小: {total_size_mb:.2f} MB")
    
    return total_size_mb


def estimate_route_cache_size():
    """估算路徑快取大小（如果存到 Supabase）。"""
    print("\n" + "=" * 60)
    print("路徑快取 (route cache) - 目前存在本地檔案")
    print("=" * 60)
    
    # 假設最多快取 32 個路徑（根據 cache_size 設定）
    # 每個路徑快取檔案約 50-200 KB（包含 polyline、shadow_segments、metadata）
    max_cached_routes = 32
    avg_route_size_kb = 100  # 平均每個路徑快取 100 KB
    
    total_size_mb = (max_cached_routes * avg_route_size_kb) / 1024
    
    print(f"最大快取路徑數: {max_cached_routes}")
    print(f"平均每個路徑大小: {avg_route_size_kb} KB")
    print(f"預估總大小: {total_size_mb:.2f} MB")
    print("\n注意：目前路徑快取存在本地檔案系統，不建議存到 Supabase")
    print("     因為路徑快取是臨時性的，且會頻繁更新")
    
    return total_size_mb


def estimate_shadow_data_size():
    """估算陰影資料大小（如果預先計算並存儲）。"""
    print("\n" + "=" * 60)
    print("陰影資料 (shadow data) - 目前動態計算")
    print("=" * 60)
    
    print("注意：陰影資料目前是動態計算的，不建議預先存儲")
    print("     因為陰影會根據時間和太陽位置變化")
    print("     如果預先存儲，需要為每個時間點存儲，資料量會非常大")
    
    # 如果真的要存，假設：
    # - 每個建築物在不同時間的陰影
    # - 假設存 24 小時，每小時一個快照
    # - 每個陰影多邊形約 500 bytes
    # 這會非常大，不建議
    
    return 0


def main():
    """主函數。"""
    print("\n" + "=" * 60)
    print("Supabase 資料大小總估算")
    print("=" * 60)
    
    buildings_size = estimate_buildings_size()
    street_graph_size = estimate_street_graph_size()
    route_cache_size = estimate_route_cache_size()
    shadow_data_size = estimate_shadow_data_size()
    
    total_size_mb = buildings_size + street_graph_size + route_cache_size + shadow_data_size
    
    print("\n" + "=" * 60)
    print("總計")
    print("=" * 60)
    print(f"建築物資料: {buildings_size:.2f} MB")
    print(f"路網圖資料: {street_graph_size:.2f} MB")
    print(f"路徑快取（如果存）: {route_cache_size:.2f} MB")
    print(f"陰影資料（如果存）: {shadow_data_size:.2f} MB")
    print(f"\n總計: {total_size_mb:.2f} MB ({total_size_mb / 1024:.2f} GB)")
    
    print("\n" + "=" * 60)
    print("Supabase 限制")
    print("=" * 60)
    print("免費方案: 500 MB 資料庫空間")
    print("Pro 方案: 8 GB 資料庫空間 ($25/月)")
    
    print("\n" + "=" * 60)
    print("建議")
    print("=" * 60)
    
    if total_size_mb <= 500:
        print("✓ 預估總大小在 Supabase 免費方案範圍內")
        print("  建議：")
        print("  - 建築物資料：可以存（約 {:.0f} MB）".format(buildings_size))
        print("  - 路網圖資料：可以存（約 {:.0f} MB）".format(street_graph_size))
        print("  - 路徑快取：不建議存到 Supabase（存在本地即可）")
        print("  - 陰影資料：不建議存（動態計算）")
    elif total_size_mb <= 8192:
        print("⚠ 預估總大小超過免費方案，需要 Pro 方案")
        print("  建議：")
        print("  - 考慮縮小路網圖範圍")
        print("  - 或升級到 Pro 方案")
    else:
        print("✗ 預估總大小超過 Pro 方案")
        print("  建議：")
        print("  - 大幅縮小路網圖範圍")
        print("  - 或考慮其他儲存方案")


if __name__ == "__main__":
    main()

