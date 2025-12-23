# Data Directory

This directory contains shared data files used by both the frontend and backend.

## Structure

- `4342.json` - Building footprint data (GeoJSON) - used by backend for shadow calculations
- Other tile JSON files - Building data tiles used by frontend for map display
- `buildings.geojson` - Alternative building data format
- `shadows.geojson` - Shadow data (if available)

## Usage

- **Backend**: Reads from `data/4342.json` (configurable via `SHADOW_BUILDING_DATASET` env var)
- **Frontend**: Serves files from `frontend/public/data/` via Vite dev server (Vite automatically serves files in `public/`)

## Data Structure

- **Root `data/` directory**: Source of truth, used by backend
- **`frontend/public/data/`**: Copy for frontend (Vite needs files in `public/` to serve them)

## Future Migration

When moving to a database:
- Backend will read from DB instead of `data/4342.json`
- Frontend can continue serving static files from `frontend/public/data/` or fetch from backend API
- The `data/` directory can be kept as a backup or removed

