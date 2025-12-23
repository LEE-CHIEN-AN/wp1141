"""使用 Supabase REST API 匯入 GeoJSON 資料（不需要直接連接 PostgreSQL）。"""
import json
import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load .env
load_dotenv(Path(__file__).parent.parent.parent / ".env")


def get_supabase_client() -> Client:
    """建立 Supabase client."""
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
    
    if not supabase_url:
        raise ValueError(
            "SUPABASE_URL environment variable is required.\n"
            "Set it in your .env file or as an environment variable.\n"
            "Get your project URL from Supabase Dashboard → Settings → API"
        )
    
    if not supabase_key:
        raise ValueError(
            "SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required.\n"
            "Set it in your .env file or as an environment variable.\n"
            "Get your Service Role Key from Supabase Dashboard → Settings → API"
        )
    
    return create_client(supabase_url, supabase_key)


def import_geojson_file(file_path: Path, supabase: Client, batch_size: int = 100) -> int:
    """匯入單一 GeoJSON 檔案到 Supabase。"""
    tile_id = file_path.stem
    print(f"處理 {file_path.name} (tile_id: {tile_id})...")
    
    # 讀取 GeoJSON
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"  錯誤：無法讀取檔案: {e}")
        return 0
    
    if data.get("type") != "FeatureCollection":
        print(f"  錯誤：不是有效的 FeatureCollection")
        return 0
    
    features = data.get("features", [])
    if not features:
        print(f"  沒有找到 features")
        return 0
    
    # 準備資料
    buildings_data = []
    
    for feature in features:
        if feature.get("type") != "Feature":
            continue
        
        geometry = feature.get("geometry")
        properties = feature.get("properties", {})
        
        if geometry.get("type") != "Polygon":
            continue
        
        # 轉換 GeoJSON geometry 為 PostGIS 格式
        # Supabase 會自動處理 GeoJSON 格式
        building = {
            "geometry": geometry,  # 直接使用 GeoJSON 格式
            "height": properties.get("height"),
            "color": properties.get("color"),
            "roof_color": properties.get("roofColor") or properties.get("roof_color"),
            "tile_id": tile_id,
        }
        
        buildings_data.append(building)
    
    if not buildings_data:
        print(f"  沒有有效的建築物資料")
        return 0
    
    # 批次插入
    total_inserted = 0
    for i in range(0, len(buildings_data), batch_size):
        batch = buildings_data[i:i + batch_size]
        
        try:
            # 使用 Supabase REST API 插入
            response = supabase.table("buildings").insert(batch).execute()
            inserted_count = len(response.data) if response.data else len(batch)
            total_inserted += inserted_count
            print(f"  已插入 {total_inserted}/{len(buildings_data)} 筆資料...", end="\r")
            
            # 避免 API 限制
            time.sleep(0.1)
            
        except Exception as e:
            print(f"\n  錯誤：插入失敗: {e}")
            # 嘗試逐筆插入
            for building in batch:
                try:
                    supabase.table("buildings").insert(building).execute()
                    total_inserted += 1
                except Exception as e2:
                    print(f"    跳過一筆資料: {e2}")
    
    print(f"\n  ✓ 完成：從 {file_path.name} 匯入 {total_inserted} 筆建築物")
    return total_inserted


def main():
    """主函數。"""
    # 取得 GeoJSON 目錄
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent.parent
    geojson_dir = project_root / "tpe3d" / "geojsons"
    
    if not geojson_dir.exists():
        print(f"錯誤：找不到 GeoJSON 目錄: {geojson_dir}")
        sys.exit(1)
    
    # 取得所有 GeoJSON 檔案
    geojson_files = sorted(geojson_dir.glob("*.json"))
    
    if not geojson_files:
        print(f"錯誤：在 {geojson_dir} 找不到 GeoJSON 檔案")
        sys.exit(1)
    
    print(f"找到 {len(geojson_files)} 個 GeoJSON 檔案")
    print("連接 Supabase...")
    
    try:
        supabase = get_supabase_client()
    except Exception as e:
        print(f"錯誤：無法連接 Supabase: {e}")
        print("\n請確認 .env 檔案中有以下設定：")
        print("  SUPABASE_URL=你的_supabase_project_url")
        print("  SUPABASE_KEY=你的_service_role_key")
        print("\n可以在 Supabase Dashboard → Settings → API 中找到這些資訊")
        sys.exit(1)
    
    # 檢查表格是否存在
    try:
        result = supabase.table("buildings").select("id", count="exact").limit(1).execute()
        print("✓ 成功連接到 Supabase")
    except Exception as e:
        print(f"錯誤：無法存取 buildings 表格: {e}")
        print("請確認：")
        print("1. 已在 Supabase SQL Editor 執行 migration 建立表格")
        print("2. 使用的是 Service Role Key（不是 anon key）")
        sys.exit(1)
    
    # 匯入每個檔案
    total_imported = 0
    for geojson_file in geojson_files:
        count = import_geojson_file(geojson_file, supabase)
        total_imported += count
    
    print(f"\n{'='*60}")
    print(f"匯入完成！總共匯入 {total_imported} 筆建築物資料")
    print(f"{'='*60}")
    
    # 顯示統計
    try:
        result = supabase.table("buildings").select("tile_id", count="exact").execute()
        print(f"\n資料庫中總共有 {result.count} 筆建築物")
        
        # 統計各 tile_id
        stats = supabase.table("buildings").select("tile_id").execute()
        tile_counts = {}
        for row in stats.data:
            tile_id = row.get("tile_id")
            tile_counts[tile_id] = tile_counts.get(tile_id, 0) + 1
        
        print("\n各 tile_id 的資料筆數：")
        for tile_id in sorted(tile_counts.keys()):
            print(f"  {tile_id}: {tile_counts[tile_id]}")
    except Exception as e:
        print(f"無法取得統計資訊: {e}")


if __name__ == "__main__":
    main()

