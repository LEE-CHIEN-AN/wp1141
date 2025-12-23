#!/usr/bin/env python3
"""Test CORS configuration and backend connectivity."""
import requests
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

print("=" * 70)
print("CORS & BACKEND CONNECTIVITY TEST")
print("=" * 70)

# Test backend URL - change this to your Render URL for production testing
BACKEND_URL = "https://ntu-cool.onrender.com"

print(f"\nTesting backend at: {BACKEND_URL}")
print("-" * 70)

# Test 1: Health check
print("\n[1/3] Testing health endpoint...")
try:
    response = requests.get(f"{BACKEND_URL}/healthz", timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Check CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
    }
    print(f"\nCORS Headers:")
    for key, value in cors_headers.items():
        print(f"  {key}: {value}")
    
    if cors_headers['Access-Control-Allow-Origin']:
        print("✓ CORS headers present")
    else:
        print("✗ WARNING: No CORS headers found!")
        
except requests.exceptions.RequestException as e:
    print(f"✗ ERROR: {e}")
    sys.exit(1)

# Test 2: OPTIONS request (preflight)
print("\n[2/3] Testing CORS preflight (OPTIONS request)...")
try:
    response = requests.options(
        f"{BACKEND_URL}/shadows",
        headers={
            'Origin': 'https://ntu-cooooooool.vercel.app',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type',
        },
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"CORS Headers:")
    for key, value in response.headers.items():
        if 'access-control' in key.lower():
            print(f"  {key}: {value}")
    
    if response.status_code in [200, 204]:
        print("✓ Preflight request successful")
    else:
        print(f"⚠ Preflight returned status {response.status_code}")
        
except requests.exceptions.RequestException as e:
    print(f"✗ ERROR: {e}")

# Test 3: Actual GET request with Origin header
print("\n[3/3] Testing GET request with Origin header...")
try:
    response = requests.get(
        f"{BACKEND_URL}/healthz",
        headers={
            'Origin': 'https://ntu-cooooooool.vercel.app',
        },
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
    
    if response.headers.get('Access-Control-Allow-Origin'):
        print("✓ CORS is working correctly")
    else:
        print("✗ CORS headers missing!")
        
except requests.exceptions.RequestException as e:
    print(f"✗ ERROR: {e}")

print("\n" + "=" * 70)
print("Test complete!")
print("=" * 70)

