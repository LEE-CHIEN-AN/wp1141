# Database Module

This module provides Supabase PostGIS database integration for storing and querying building data and street graphs.

## Features

- **PostGIS Database Integration**
  - Spatial queries with bounding box (using GiST index)
  - GeoJSON data import
  - High-performance spatial queries via Supabase RPC functions
  - Connection pooling and query caching for optimal performance
  - Street graph storage and querying (optional, see [README_STREET_GRAPH.md](./README_STREET_GRAPH.md))

## Quick Start

### 1. Environment Setup

Environment variables are configured in the **root `.env` file** (not in `database/.env`).

Copy the root `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables (add to root `.env`):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Service Role Key (from Supabase Dashboard → Settings → API)
- `SHADOW_USE_SUPABASE=true` - Enable Supabase database integration

See the root `.env.example` file for all available options with descriptions.

### 2. Database Setup

Run the migrations in Supabase SQL Editor:

1. Execute `migrations/001_create_buildings_table.sql` to create the buildings table
2. Execute `migrations/002_create_rpc_functions.sql` to create RPC functions for spatial queries

## Usage

### Query Buildings

```python
from database.queries import get_buildings_in_bbox, get_buildings_in_polygon
from shapely.geometry import box

# Method 1: Using bounding box coordinates
buildings = get_buildings_in_bbox(
    min_lon=121.53,  # West boundary
    min_lat=25.01,   # South boundary
    max_lon=121.55,  # East boundary
    max_lat=25.03    # North boundary
)

# Method 2: Using Polygon object
polygon = box(121.53, 25.01, 121.55, 25.03)  # (minx, miny, maxx, maxy)
buildings = get_buildings_in_polygon(polygon)

# Optional: Filter by tile_id
buildings = get_buildings_in_bbox(
    min_lon=121.53,
    min_lat=25.01,
    max_lon=121.55,
    max_lat=25.03,
    tile_id="4342"  # Only query buildings from specific tile
)
```

**Returns**: `geopandas.GeoDataFrame` with columns:
- `id` - Building ID
- `geometry` - Shapely Polygon (EPSG:4326)
- `height` - Building height
- `color` - Building color
- `roof_color` - Roof color
- `tile_id` - Source GeoJSON file ID
- `created_at` - Creation timestamp

## Backend Integration

The backend automatically uses Supabase when `SHADOW_USE_SUPABASE=true` is set:

```python
# backend/data_access.py automatically uses database/queries.py
from backend.data_access import extract_buildings, make_bounding_polygon

# Create bounding box from route start/end points
polygon = make_bounding_polygon(
    start_lat=25.0173,
    start_lon=121.5404,
    end_lat=25.0216,
    end_lon=121.5357,
    buffer_m=150.0  # 150m buffer
)

# Query buildings (automatically uses Supabase if enabled)
buildings = extract_buildings(polygon)
```

**Fallback**: If Supabase is unavailable, the backend automatically falls back to local GeoJSON files.

## Testing

### Test PostGIS Queries
```bash
python database/scripts/test_postgis_queries.py
```

### Test Supabase Connection
```bash
python database/scripts/test_supabase_queries.py
```


## Performance

- **With GiST Index + RPC Functions**: ~2-3 seconds (1000+ buildings)
- **Without Index (fallback)**: ~5-10 seconds (1000+ buildings)

The RPC functions (`get_buildings_in_bbox`) use PostGIS spatial indexes for optimal performance. If RPC functions are not available, the system automatically falls back to Python-side filtering (slower).

## File Structure

```
database/
├── config.py                    # Supabase configuration
├── queries.py                   # PostGIS query functions (with caching)
├── README.md                    # This file
├── migrations/                   # Database schema migrations
│   ├── 001_create_buildings_table.sql
│   └── 002_create_rpc_functions.sql
└── scripts/                      # Test and utility scripts
    ├── import_via_supabase_api.py  # Import GeoJSON to Supabase
    ├── test_supabase_queries.py    # Test Supabase connection
    └── test_postgis_queries.py     # Test PostGIS spatial queries
```

## Common Issues

### Q: How do I know if Supabase is being used?

A: Check that `SHADOW_USE_SUPABASE=true` is set and look for "falling back to local file" warnings in backend logs.

### Q: Why are queries slow?

A: 
1. Ensure migrations are executed (especially `002_create_rpc_functions.sql`)
2. Verify GiST index exists: `CREATE INDEX buildings_geometry_idx ON buildings USING GIST (geometry);`
3. Reduce bounding box size
4. Query results are cached - first query may be slower, subsequent queries are much faster

### Q: How do I import building data?

A: Use `database/scripts/import_via_supabase_api.py` to import GeoJSON files into Supabase.

## Notes

- All geometry data uses **EPSG:4326 (WGS84)** coordinate system
- Coordinates format: `[longitude, latitude]` (lon first, lat second)
- Service Role Key is required for RPC functions (not anon key)
- The system is backward compatible: falls back to local files if Supabase is unavailable
- Query caching: Building queries are cached using `@lru_cache` for better performance
- Connection pooling: Supabase client is reused across queries to reduce overhead
