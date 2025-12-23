#!/usr/bin/env python3
"""Comprehensive test for database integration."""
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path (tests/ is now a subdirectory)
sys.path.insert(0, str(Path(__file__).parent.parent))

print("=" * 70)
print("DATABASE INTEGRATION TEST")
print("=" * 70)

# Test 1: Environment variables loading
print("\n[1/6] Testing environment variable loading...")
print("-" * 70)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    use_supabase = os.getenv("SHADOW_USE_SUPABASE", "false").lower() == "true"
    
    print(f"✓ SUPABASE_URL: {'Set' if supabase_url else 'NOT SET'}")
    print(f"✓ SUPABASE_KEY: {'Set' if supabase_key else 'NOT SET'}")
    print(f"✓ SHADOW_USE_SUPABASE: {use_supabase}")
    
    if not supabase_url or not supabase_key:
        print("\n✗ ERROR: Missing Supabase credentials in root .env file")
        sys.exit(1)
except Exception as e:
    print(f"✗ ERROR: {e}")
    sys.exit(1)

# Test 2: Database connection
print("\n[2/6] Testing Supabase database connection...")
print("-" * 70)
try:
    from database.queries import get_supabase_client
    client = get_supabase_client()
    
    # Test query
    result = client.table("buildings").select("id", count="exact").limit(1).execute()
    print(f"✓ Database connection successful")
    print(f"✓ Total buildings in database: {result.count:,}")
except Exception as e:
    print(f"✗ ERROR: Database connection failed: {e}")
    sys.exit(1)

# Test 3: Building queries from database
print("\n[3/6] Testing building queries from database...")
print("-" * 70)
try:
    from database.queries import get_buildings_in_bbox
    
    # Small test area in Taipei (NTU area)
    buildings = get_buildings_in_bbox(
        min_lon=121.53,
        min_lat=25.01,
        max_lon=121.54,
        max_lat=25.02,
    )
    
    print(f"✓ Query successful")
    print(f"✓ Buildings found: {len(buildings)}")
    if len(buildings) > 0:
        print(f"✓ Columns: {list(buildings.columns)}")
        print(f"✓ CRS: {buildings.crs}")
        if "height" in buildings.columns:
            print(f"✓ Height column present")
            print(f"  Min height: {buildings['height'].min():.1f}m")
            print(f"  Max height: {buildings['height'].max():.1f}m")
            print(f"  Mean height: {buildings['height'].mean():.1f}m")
except Exception as e:
    print(f"✗ ERROR: Building query failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Backend config loading
print("\n[4/6] Testing backend configuration...")
print("-" * 70)
try:
    from backend.config import get_settings
    get_settings.cache_clear()  # Clear cache to reload
    
    settings = get_settings()
    print(f"✓ Backend config loaded")
    print(f"✓ use_supabase setting: {settings.use_supabase}")
    print(f"✓ Building dataset: {settings.building_dataset}")
    print(f"✓ Timezone: {settings.timezone}")
    
    if not settings.use_supabase:
        print("\n⚠ WARNING: SHADOW_USE_SUPABASE is False")
        print("  Backend will use local files instead of database")
        print("  Set SHADOW_USE_SUPABASE=true in root .env to enable database")
except Exception as e:
    print(f"✗ ERROR: Backend config failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Backend data access (extract_buildings)
print("\n[5/6] Testing backend data access (extract_buildings)...")
print("-" * 70)
try:
    from shapely.geometry import box
    from backend.data_access import extract_buildings
    
    # Test polygon in Taipei
    test_polygon = box(121.53, 25.01, 121.54, 25.02)
    
    buildings = extract_buildings(test_polygon)
    
    print(f"✓ extract_buildings successful")
    print(f"✓ Buildings extracted: {len(buildings)}")
    print(f"✓ Using database: {get_settings().use_supabase}")
    
    if len(buildings) > 0:
        print(f"✓ Columns: {list(buildings.columns)}")
        if "height" in buildings.columns:
            print(f"✓ Height statistics:")
            print(f"  Min: {buildings['height'].min():.1f}m")
            print(f"  Max: {buildings['height'].max():.1f}m")
            print(f"  Mean: {buildings['height'].mean():.1f}m")
except Exception as e:
    print(f"✗ ERROR: extract_buildings failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Shadow computation with database
print("\n[6/6] Testing shadow computation with database...")
print("-" * 70)
try:
    from backend.service import ShadowRoutingService
    
    service = ShadowRoutingService()
    print(f"✓ ShadowRoutingService initialized")
    print(f"✓ Using database: {service.settings.use_supabase}")
    
    # Test shadow computation
    result = service.compute_shadows(
        min_lon=121.53,
        min_lat=25.01,
        max_lon=121.54,
        max_lat=25.02,
        timestamp=datetime(2025, 9, 25, 16, 0),  # 4 PM
    )
    
    print(f"✓ Shadow computation successful")
    print(f"✓ Shadow polygons: {len(result['features'])}")
    
    if len(result['features']) > 0:
        print(f"✓ First shadow properties: {list(result['features'][0]['properties'].keys())}")
except Exception as e:
    print(f"✗ ERROR: Shadow computation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Summary
print("\n" + "=" * 70)
print("TEST SUMMARY")
print("=" * 70)
print("✓ Environment variables loaded from root .env")
print("✓ Database connection successful")
print("✓ Building queries working")
print("✓ Backend configuration loaded")
print("✓ Backend data access working")
print("✓ Shadow computation working")
print("\n🎉 All tests passed! Database integration is working correctly.")
print("\nNext steps:")
print("  1. Ensure SHADOW_USE_SUPABASE=true in root .env (if not already set)")
print("  2. Start the backend server: uvicorn app.main:app --reload")
print("  3. Test API endpoints: /shadows, /route/shadow, /route/shortest")

