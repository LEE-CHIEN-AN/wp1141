#!/usr/bin/env python3
"""Test script for database integration."""
import sys
from pathlib import Path

# Add project root to path (tests/ is now a subdirectory)
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import get_settings
from backend.data_access import extract_buildings
from shapely.geometry import box

def test_configuration():
    """Test that configuration is loaded correctly."""
    print("=" * 60)
    print("TEST 1: Configuration Check")
    print("=" * 60)
    
    settings = get_settings()
    print(f"✓ USE_SUPABASE: {settings.use_supabase}")
    print(f"✓ BUILDING_DATASET: {settings.building_dataset}")
    print(f"✓ TIMEZONE: {settings.timezone}")
    
    if settings.use_supabase:
        print("\n✓ Database integration is ENABLED")
        return True
    else:
        print("\n⚠ Database integration is DISABLED (using local files)")
        print("  Set SHADOW_USE_SUPABASE=true in .env to enable")
        return False


def test_supabase_connection():
    """Test Supabase connection."""
    print("\n" + "=" * 60)
    print("TEST 2: Supabase Connection")
    print("=" * 60)
    
    try:
        from database.queries import get_supabase_client
        
        client = get_supabase_client()
        print("✓ Supabase client created successfully")
        
        # Test basic query
        result = client.table("buildings").select("id", count="exact").limit(1).execute()
        print(f"✓ Database connection successful")
        print(f"✓ Total buildings in database: {result.count}")
        return True
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        print("\n  Make sure:")
        print("  - SUPABASE_URL is set in .env")
        print("  - SUPABASE_KEY is set in .env")
        print("  - Database migrations have been run")
        return False


def test_building_extraction():
    """Test building extraction with database."""
    print("\n" + "=" * 60)
    print("TEST 3: Building Extraction")
    print("=" * 60)
    
    settings = get_settings()
    
    # Test with a small bounding box in Taipei
    test_bbox = box(121.53, 25.01, 121.54, 25.02)  # Small area in Taipei
    
    try:
        print(f"Testing with bbox: {test_bbox.bounds}")
        print(f"Using {'Supabase database' if settings.use_supabase else 'local files'}...")
        
        buildings = extract_buildings(test_bbox)
        
        print(f"✓ Successfully extracted {len(buildings)} buildings")
        if len(buildings) > 0:
            print(f"  Sample building columns: {list(buildings.columns)}")
            print(f"  CRS: {buildings.crs}")
            if 'height' in buildings.columns:
                avg_height = buildings['height'].mean()
                print(f"  Average height: {avg_height:.1f}m")
        
        return True
    except Exception as e:
        print(f"✗ Extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("DATABASE INTEGRATION TEST")
    print("=" * 60)
    print()
    
    results = []
    
    # Test 1: Configuration
    config_ok = test_configuration()
    results.append(("Configuration", config_ok))
    
    # Test 2: Supabase connection (only if enabled)
    if config_ok:
        connection_ok = test_supabase_connection()
        results.append(("Supabase Connection", connection_ok))
        
        # Test 3: Building extraction
        if connection_ok:
            extraction_ok = test_building_extraction()
            results.append(("Building Extraction", extraction_ok))
    else:
        # Test with local files
        extraction_ok = test_building_extraction()
        results.append(("Building Extraction (local)", extraction_ok))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✓ All tests passed!")
        if config_ok:
            print("✓ Database integration is working correctly")
        else:
            print("⚠ Using local files (database integration disabled)")
    else:
        print("\n✗ Some tests failed. Check the errors above.")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())

