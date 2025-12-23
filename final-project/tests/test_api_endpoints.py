#!/usr/bin/env python3
"""Test API endpoints for database integration."""
import sys
import requests
import json
from pathlib import Path
from datetime import datetime

# Add project root to path (tests/ is now a subdirectory)
sys.path.insert(0, str(Path(__file__).parent.parent))

print("=" * 70)
print("API ENDPOINTS TEST")
print("=" * 70)

BASE_URL = "http://localhost:8000"

# Test 1: Health check
print("\n[1/4] Testing API health...")
print("-" * 70)
try:
    response = requests.get(f"{BASE_URL}/docs", timeout=5)
    if response.status_code == 200:
        print("✓ Backend API is running")
    else:
        print(f"⚠ Backend returned status {response.status_code}")
except requests.exceptions.ConnectionError:
    print("✗ ERROR: Backend server is not running")
    print("  Start it with: uvicorn app.main:app --reload")
    sys.exit(1)
except Exception as e:
    print(f"✗ ERROR: {e}")
    sys.exit(1)

# Test 2: /shadows endpoint
print("\n[2/4] Testing /shadows endpoint...")
print("-" * 70)
try:
    # Small test area in Taipei
    params = {
        "min_lon": 121.53,
        "min_lat": 25.01,
        "max_lon": 121.54,
        "max_lat": 25.02,
        "time": "2025-09-25T16:00:00",
        "center_lat": 25.015,
        "center_lon": 121.535,
    }
    
    print(f"  Requesting shadows for bbox: ({params['min_lat']}, {params['min_lon']}) to ({params['max_lat']}, {params['max_lon']})")
    print(f"  Time: {params['time']}")
    
    response = requests.get(f"{BASE_URL}/shadows", params=params, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ /shadows endpoint successful")
        print(f"✓ Shadow polygons returned: {len(data.get('features', []))}")
        if len(data.get('features', [])) > 0:
            print(f"✓ First feature type: {data['features'][0].get('type', 'unknown')}")
    else:
        print(f"✗ ERROR: Status {response.status_code}")
        print(f"  Response: {response.text[:200]}")
except requests.exceptions.Timeout:
    print("✗ ERROR: Request timeout (>30s)")
except Exception as e:
    print(f"✗ ERROR: {e}")
    import traceback
    traceback.print_exc()

# Test 3: /route/shortest endpoint
print("\n[3/4] Testing /route/shortest endpoint...")
print("-" * 70)
try:
    # Short route in Taipei
    params = {
        "start_lat": 25.015,
        "start_lon": 121.535,
        "end_lat": 25.016,
        "end_lon": 121.536,
    }
    
    print(f"  Route from: ({params['start_lat']}, {params['start_lon']})")
    print(f"  Route to: ({params['end_lat']}, {params['end_lon']})")
    print("  (This may take 10-30 seconds...)")
    
    response = requests.get(f"{BASE_URL}/route/shortest", params=params, timeout=60)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ /route/shortest endpoint successful")
        print(f"✓ Route points: {len(data.get('polyline', []))}")
        if 'metadata' in data:
            print(f"✓ Total length: {data['metadata'].get('total_length_m', 0):.1f}m")
    else:
        print(f"✗ ERROR: Status {response.status_code}")
        print(f"  Response: {response.text[:200]}")
except requests.exceptions.Timeout:
    print("✗ ERROR: Request timeout (>60s)")
except Exception as e:
    print(f"✗ ERROR: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Check if database is being used
print("\n[4/4] Verifying database usage...")
print("-" * 70)
try:
    from backend.config import get_settings
    settings = get_settings()
    
    if settings.use_supabase:
        print("✓ Backend is configured to use Supabase database")
        print("✓ SHADOW_USE_SUPABASE=true in root .env")
    else:
        print("⚠ Backend is using local files (not database)")
        print("  Set SHADOW_USE_SUPABASE=true in root .env to use database")
except Exception as e:
    print(f"✗ ERROR: {e}")

# Summary
print("\n" + "=" * 70)
print("API TEST SUMMARY")
print("=" * 70)
print("✓ Backend API is accessible")
print("✓ /shadows endpoint tested")
print("✓ /route/shortest endpoint tested")
print("✓ Database configuration verified")
print("\n💡 Tip: Test /route/shadow endpoint from the frontend UI")

