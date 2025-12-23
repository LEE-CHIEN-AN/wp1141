# Data Directory

This directory contains shared data files used by both the frontend and backend.

## Structure

- `4342.json` - Building footprint data (GeoJSON) - used by backend for shadow calculations
- Other tile JSON files - Building data tiles used by frontend for map display
- `buildings.geojson` - Alternative building data format
- `shadows.geojson` - Shadow data (if available)

## Usage

- **Backend**: Reads from `data/4342.json` (configurable via `SHADOW_BUILDING_DATASET` env var)
- **Frontend**: Serves files from `frontend/public/data/` via Vite dev server

## Data Synchronization

Both directories contain the same data:
- Root `data/` - Source of truth, used by backend
- `frontend/public/data/` - Copy for frontend (Vite needs files in `public/` to serve them)

**Note**: When updating data files, make sure to update both locations, or use a script to sync them:
```bash
# Sync data from root to frontend
cp -r data/* frontend/public/data/
```

