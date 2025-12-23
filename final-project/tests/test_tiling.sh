#!/bin/bash
# Quick script to test tiling performance

echo "=== Tiling Performance Test ==="
echo ""
echo "1. Starting dev server..."
echo "   Open http://localhost:5173 in your browser"
echo ""
echo "2. Open DevTools (F12) and:"
echo "   - Go to Network tab"
echo "   - Filter by 'JSON'"
echo "   - Watch for tile loading"
echo ""
echo "3. Check Console for:"
echo "   - 'Loading X tiles: [list]' messages"
echo "   - 'Unloading X tiles: [list]' messages"
echo "   - 'Loaded X building features from Y tiles'"
echo ""
echo "4. Test by:"
echo "   - Panning the map (should load new tiles)"
echo "   - Zooming in/out (should load/unload tiles)"
echo "   - Checking Network tab (should see only visible tiles)"
echo ""
echo "Expected: Only 2-5 tiles load initially (not all 24)"
echo ""
echo "Starting dev server..."
cd ../frontend && npm run dev

