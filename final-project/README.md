# NTU-COOL

**114-1 NTU Web Programming Final Project**

A shadow navigation web application that helps users find the shortest and coolest (most shaded) paths while walking on the streets of Taipei. The system calculates routes that maximize shade coverage from buildings to keep pedestrians cool during hot weather.

## 🌟 Features

- **Shadow-Aware Routing**: Calculates routes that prioritize shaded paths based on building shadows at specific times
- **Interactive 3D Map**: Real-time 3D building visualization with Mapbox GL JS
- **Real-time Shadow Calculation**: Uses solar position calculations to determine shadow coverage
- **Multiple Routing Options**: 
  - Shadow routing algorithm (backend - custom shadow-aware pathfinding using OSMnx)
  - Shortest route algorithm (backend - distance-only routing using OSMnx for comparison)
- **Place Search**: Google Places API integration for address autocomplete and place details
- **Database Integration**: Optional Supabase PostGIS database for efficient building data queries
- **Responsive UI**: Modern React frontend with Tailwind CSS and shadcn/ui components
- **Performance Optimizations**: Multi-level caching, viewport-based data loading, and debouncing

## 🏗️ Architecture Overview

### Component Breakdown

- **Frontend**: React + TypeScript + Vite + Mapbox GL JS
  - Google Maps API: Places API (search) 
  - Viewport-based building data tiling for performance
  - Debounced shadow fetching based on zoom level
- **Backend**: FastAPI (Python) with geospatial libraries
  - OSMnx: Street network extraction
  - Custom shadow-aware routing algorithm
  - Shortest route computation for comparison
  - Multi-level caching (memory + filesystem)
- **Database**: Supabase (PostgreSQL + PostGIS)
  - Spatial indexing with GiST for fast queries
  - Efficient bounding box queries

### External Services Integration

- **Mapbox GL JS**: 3D map rendering and visualization
- **Google Maps API**: Places API for search/autocomplete and Geocoding API for converting coordinates to addresses
- **OpenStreetMap**: Street network data via OSMnx library

## 📁 Project Structure

```
ntu-cool/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components (MapView, SearchBox, RoutePlanner, etc.)
│   │   ├── utils/         # Utility functions (places, directions, geocoding, etc.)
│   │   └── types/         # TypeScript type definitions
│   ├── public/data/       # Building data files (served by Vite)
│   └── package.json
│
├── backend/               # Backend service modules
│   ├── config.py         # Configuration settings (pydantic)
│   ├── data_access.py    # Data loading (Supabase or local files)
│   ├── routing.py         # Routing algorithms (Dijkstra, weighted pathfinding)
│   ├── shadow.py          # Shadow calculation logic (solar position, projection)
│   └── service.py         # Main routing service (orchestration, caching)
│
├── app/                   # FastAPI application
│   └── main.py           # API endpoints and server setup
│
├── database/              # Database integration module
│   ├── queries.py        # PostGIS query functions (with caching)
│   ├── queries_street_graph_pg.py  # Street graph PostGIS queries
│   ├── config.py         # Supabase configuration
│   ├── migrations/       # Database schema migrations
│   └── scripts/          # Database test and utility scripts
│
├── scripts/               # Project utility scripts
│   └── clear_cache.py    # Cache clearing utility
│
├── notebooks/             # Jupyter notebooks for development/analysis
│   └── street_map.ipynb   # Street network analysis notebook
│
├── tests/                 # Test suite
│   ├── test_api_endpoints.py
│   ├── test_cors.py
│   ├── test_database_integration.py
│   └── test_integration.py
│
├── data/                  # Shared data directory
│   └── *.json            # Building footprint GeoJSON files
│
├── cache/                 # Runtime cache directory (gitignored)
│   ├── route/            # Route calculation cache
│   └── street_graphs/    # Street network graph cache
│
└── requirements.txt       # Python dependencies
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11** (3.13 is NOT supported by pyproj/geopandas)
- **Node.js** 18+ and npm
- **Mapbox Access Token** ([Get one here](https://account.mapbox.com/access-tokens/))
- **Google Maps API Key** (optional, for place search) - Enable Geocoding API and Places API

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ntu-cool
```

### 2. Backend Setup

```bash
# Create virtual environment with Python 3.11
python3.11 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env
# Edit .env and add your credentials (Supabase, Mapbox, etc.)
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Environment variables are configured in the root .env file
# See step 2 above - no need to create frontend/.env
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### First Run Verification

1. Check backend health: Visit `http://localhost:8000/healthz`
2. Verify frontend loads: Check browser console for errors
3. Test place search: Enter a location in the search box
4. Test routing: Enter origin and destination, click "Compute Route"

## ⚙️ Configuration

### Environment Variables

**All environment variables are consolidated in a single `.env` file at the project root.**

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your values** in the root `.env` file.

See `.env.example` for all available configuration options with detailed descriptions.

## 📖 Usage Guide

### Basic Workflow

1. **Search for Places**: Use the search box to find locations (powered by Google Places API)
2. **Plan a Route**: 
   - Enter origin and destination
   - Select route time (for shadow calculation)
   - Click "Compute Route"
3. **View Results**:
   - Shadow route (green line) - optimized for maximum shade coverage
   - Shortest route (orange line) - distance-optimized route for comparison
   - Shadow ratio and statistics displayed in sidebar

### Route Planning

The system displays two types of routes:

1. **Shadow Route** (Backend): Custom algorithm that:
   - Extracts street network using OSMnx
   - Calculates building shadows at the specified time
   - Weighs route segments by shadow coverage
   - Uses weighted shortest path (Dijkstra) to optimize for maximum shade while minimizing distance
2. **Shortest Route** (Backend): Distance-only routing using the same OSMnx street network for fair comparison

**Important Note on Route Time:**
- The default route time is set to **7:00 AM**
- **Shadow data is only available for 7:00 AM and 5:00 PM**
- For other times, shadow calculations will not be available
- Users can manually change the time in the route planner, but shadows will only be calculated for 7:00 AM and 5:00 PM

### Shadow Calculation

The shadow routing algorithm:
- Calculates solar position for the given time and location using pvlib
- Projects building shadows onto the street network
- Samples shadow coverage at regular intervals along route segments
- Assigns shadow weights to route segments
- Uses weighted shortest path algorithm (Dijkstra) to find optimal route

### UI Features

- **Map Controls**: Zoom, pan, rotate, and tilt for 3D building visualization
- **Route Statistics**: Shadow ratio, total distance, and segment-by-segment breakdown
- **Shadow Visualization**: Real-time shadow polygons displayed on map (zoom level 16+)
- **Building Visualization**: 3D building extrusions with height data
- **Route Comparison**: Side-by-side comparison of different routing strategies

## 📡 API Documentation

### Endpoints Overview

#### `GET /healthz`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timezone": "Asia/Taipei",
  "building_dataset": "data/4342.json"
}
```

#### `GET /route`

Calculate shadow-aware routing between two points.

**Query Parameters:**
- `start_lat` (float, required): Starting latitude
- `start_lon` (float, required): Starting longitude
- `end_lat` (float, required): Ending latitude
- `end_lon` (float, required): Ending longitude
- `time` (datetime, required): ISO timestamp for departure time (e.g., `2024-01-15T07:00:00`)
- `alpha` (float, optional): Shade preference weight (0.0 = maximize shade, 1.0 = minimize distance, default: 0.5)

**Response:**
```json
{
  "polyline": [[lon, lat], ...],
  "shadow_ratio": 0.75,
  "shadow_segments": [
    {
      "polyline": [[lon, lat], ...],
      "is_shaded": true,
      "shade_fraction": 0.8
    }
  ],
  "metadata": {
    "total_length_m": 1234.5,
    "computation_time_ms": 1234.5,
    ...
  }
}
```

**Performance:** This operation may take 10-120 seconds. Automatically times out after 120 seconds.

#### `GET /route/shortest`

Calculate shortest distance route (no shadow consideration).

**Query Parameters:**
- `start_lat` (float, required): Starting latitude
- `start_lon` (float, required): Starting longitude
- `end_lat` (float, required): Ending latitude
- `end_lon` (float, required): Ending longitude

**Response:** Same format as `/route` endpoint.

**Performance:** This operation may take 5-30 seconds.

#### `GET /shadows`

Calculate building shadows for a bounding box.

**Query Parameters:**
- `min_lon` (float, required): Minimum longitude (west)
- `min_lat` (float, required): Minimum latitude (south)
- `max_lon` (float, required): Maximum longitude (east)
- `max_lat` (float, required): Maximum latitude (north)
- `time` (datetime, required): ISO timestamp for shadow calculation
- `center_lat` (float, optional): Center latitude for solar position (defaults to bbox center)
- `center_lon` (float, optional): Center longitude for solar position (defaults to bbox center)

**Response:** GeoJSON FeatureCollection containing shadow polygons.

**Performance:** This operation may take 2-10 seconds.

### Error Handling

- **400 Bad Request**: Invalid parameters or validation errors
- **404 Not Found**: No path found between start and end points
- **500 Internal Server Error**: Server-side errors (full stack trace in dev mode)
- **504 Gateway Timeout**: Request exceeded timeout limit (120 seconds)

### Performance Considerations

- Routes are cached based on start/end points, time, and alpha parameter
- Fuzzy cache matching allows reuse of similar routes (within 5m distance, 20min time difference)
- Request timing information is included in response headers (`X-Processing-Time-Ms`)

## 🗄️ Database Integration

The project supports Supabase PostGIS database for efficient building data queries:

### Setup Steps

1. **Create Supabase Project**: Sign up at [supabase.com](https://supabase.com) and create a new project
2. **Run Migrations**: Execute SQL files in `database/migrations/` to create tables and indexes
3. **Import Data**: Use `database/scripts/import_via_supabase_api.py` to import building data
4. **Enable**: Set `SHADOW_USE_SUPABASE=true` in `.env`

### Benefits

- **Performance**: Faster queries with GiST spatial indexes
- **Scalability**: Handles large datasets efficiently (76,000+ buildings)
- **Efficient Queries**: Optimized bounding box queries using PostGIS spatial functions
- **Street Graph Caching**: Optional PostGIS storage for street network graphs

### Fallback Mechanism

If Supabase is not configured or `SHADOW_USE_SUPABASE=false`, the system automatically falls back to local GeoJSON files. No code changes required.

### Detailed Documentation

See `database/README.md` for detailed database setup instructions, migration guides, and query optimization tips.

## 🔬 Algorithm Details

### Shadow-Aware Routing

The shadow-aware routing algorithm follows these steps:

1. **Street Network Extraction** (OSMnx):
   - Extracts street network graph for the bounding box containing start and end points
   - Adds buffer around bounding box to ensure connectivity
   - Caches street graphs for reuse

2. **Shadow Calculation**:
   - Calculates solar position using pvlib library (azimuth, elevation)
   - Projects building shadows onto the ground plane
   - Samples shadow coverage at regular intervals (default: 15m spacing) along street segments

3. **Weighted Pathfinding**:
   - Assigns weights to edges based on shadow coverage and distance
   - Uses alpha parameter to balance shade preference vs distance:
     - `alpha = 0.0`: Maximize shade coverage
     - `alpha = 1.0`: Minimize distance
     - `alpha = 0.5`: Balanced approach (default)
   - Applies Dijkstra's algorithm to find optimal path

4. **Route Summarization**:
   - Calculates shadow ratio (fraction of route in shade)
   - Segments route into shaded/unshaded portions
   - Computes total distance and statistics

### Shadow Calculation Methodology

- **Solar Position**: Calculated using pvlib's solar position algorithm based on location, time, and timezone
- **Building Shadow Projection**: Projects building footprints along solar azimuth direction
- **Segment Shadow Coverage**: Samples shadow coverage at regular intervals and calculates fraction of segment in shade
- **Height Consideration**: Uses building height data (default: 20m if missing) to calculate shadow length

### Performance Optimizations

- **Multi-level Caching**:
  - Memory cache: Fast lookup for recently computed routes (LRU, max 32 entries)
  - Filesystem cache: Persistent cache with index for exact and fuzzy matching
  - Street graph cache: Cached OSMnx graphs to avoid repeated network extraction
  
- **Viewport-based Data Loading**:
  - Building data loaded only for visible viewport (tiling)
  - Shadows fetched only at zoom level 16+ (buildings visible at zoom 15+)
  - Debounced shadow fetching (1.5s delay after pan/zoom stops)
  
- **Fuzzy Cache Matching**:
  - Reuses routes within 5m distance threshold
  - Accepts routes within 20 minutes time difference
  - Significantly reduces computation for similar routes

## 🧪 Testing

### Backend Tests

```bash
# Run all backend tests
pytest tests/

# Test API endpoints
python -m pytest tests/test_api_endpoints.py

# Test CORS configuration
python -m pytest tests/test_cors.py

# Test database integration (requires Supabase)
python -m pytest tests/test_database_integration.py

# Test PostGIS queries (requires Supabase)
python database/scripts/test_postgis_queries.py

# Test Supabase connection
python database/scripts/test_supabase_queries.py
```

### Frontend Testing

The frontend uses Vite's hot module replacement for development. Changes are automatically reflected in the browser.

```bash
cd frontend
npm run dev  # Starts dev server with HMR
npm run build  # Production build
npm run preview  # Preview production build
npm run lint  # Run ESLint
```

### Test Data Requirements

- Building data files in `data/` directory
- For database tests: Configured Supabase instance with imported data
- For integration tests: Both frontend and backend servers running

## 🛠️ Technologies & Dependencies

### Frontend Technologies

- **React 18** - UI framework with hooks and concurrent features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server with HMR
- **Mapbox GL JS 3.16** - 3D map rendering and visualization
- **Tailwind CSS 3** - Utility-first CSS framework
- **shadcn/ui** - Accessible UI component library
- **Google Maps API** - Places API (search/autocomplete) and Geocoding API (converting coordinates to addresses)
- **Turf.js** - Geospatial analysis library

### Backend Technologies

- **FastAPI** - Modern web framework with automatic API documentation
- **GeoPandas** - Geospatial data processing and manipulation
- **OSMnx** - Street network extraction and routing from OpenStreetMap
- **PyProj** - Coordinate transformations and projections
- **Shapely** - Geometric operations and spatial analysis
- **NetworkX** - Graph algorithms for routing (Dijkstra)
- **pvlib** - Solar position calculations
- **Supabase** - PostgreSQL database client (optional)
- **Pydantic** - Data validation and settings management
- **Psycopg2** - PostgreSQL adapter for Python

### Database Technologies

- **PostgreSQL** - Relational database
- **PostGIS** - Spatial extensions for PostgreSQL
- **GiST Index** - Generalized Search Tree for spatial indexing

## ⚡ Performance & Optimization

### Caching Mechanisms

- **Route Calculation Cache**:
  - Memory cache: LRU cache with 32 entry limit
  - Filesystem cache: Persistent JSON files with index
  - Cache TTL: 3600 seconds (1 hour)
  - Fuzzy matching: Routes within 5m distance and 20min time difference
  
- **Street Graph Cache**:
  - Cached OSMnx graphs on disk (GraphML format)
  - Polygon-based containment checking for cache hits
  - Max 16 cached graphs with LRU eviction

### Data Loading Strategies

- **Viewport-based Tiling**: Building data loaded only for visible map area
- **Lazy Loading**: Data fetched on-demand as user pans/zooms
- **Debouncing**: Shadow fetches debounced by 1.5 seconds after user interaction stops
- **Zoom-based Fetching**: Shadows only fetched at zoom level 16+ (buildings visible at 15+)

### Performance Metrics

- **Request Timing**: Processing time tracked via middleware and included in response headers
- **Computation Times**: Detailed timing breakdown in route metadata
- **Cache Hit Rates**: Logged for monitoring cache effectiveness

### Optimization Tips

- Use Supabase for production deployments with large datasets
- Adjust `SHADOW_SAMPLE_SPACING_M` to balance accuracy vs performance
- Increase cache size for frequently accessed areas
- Use fuzzy cache matching for similar routes

## 🔧 Troubleshooting

### Common Issues

#### Python Version Compatibility

**Problem**: Errors related to pyproj or geopandas

**Solution**: Use Python 3.11. Python 3.13 is not supported due to dependency compatibility issues.

```bash
python3.11 --version  # Verify version
python3.11 -m venv .venv
```

#### API Key Configuration

**Problem**: Mapbox map not loading or Google Places not working

**Solution**: 
- Verify `VITE_MAPBOX_TOKEN` is set in root `.env` file
- Check token starts with `pk.` (Mapbox public token)
- For Google Maps, enable Places API and Geocoding API in Google Cloud Console
- Ensure `.env` file is in project root (not `frontend/.env`)

#### Database Connection Issues

**Problem**: Supabase queries failing

**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Check `SHADOW_USE_SUPABASE=true` is set
- Ensure migrations have been run
- Test connection with `python database/scripts/test_supabase_queries.py`

#### Route Calculation Timeouts

**Problem**: Routes taking too long or timing out

**Solution**:
- Check `SHADOW_REQUEST_TIMEOUT_SECONDS` (default: 120s)
- Verify street network connectivity (start/end points may be disconnected)
- Check cache is working (look for cache hit logs)
- Consider using Supabase for faster building queries

#### Cache Issues

**Problem**: Stale cache or cache not working

**Solution**:
- Clear cache: `python scripts/clear_cache.py`
- Check cache directory permissions
- Verify `SHADOW_CACHE_TTL_SECONDS` setting
- Check disk space for cache directory

### Debugging Tips

- **Backend Logging**: Check console output for detailed timing and error information
- **Frontend Console**: Open browser DevTools to see API errors and warnings
- **Network Tab**: Inspect API requests and responses in browser DevTools
- **Health Check**: Visit `/healthz` endpoint to verify backend is running

### Logging Information

Backend logs include:
- Request timing (middleware to endpoint, computation time, response preparation)
- Cache hits/misses (exact and fuzzy)
- Route computation details
- Error stack traces (in development mode)

## 📚 Documentation References

- **Frontend**: See `frontend/README.md` for frontend-specific documentation
- **Backend Configuration**: See `backend/config.py` for all configuration options with descriptions
- **Database**: See `database/README.md` for database setup and usage
- **Data**: See `data/README.md` for data structure and format
- **Street Graph Database**: See `database/README_STREET_GRAPH.md` for PostGIS street graph integration

## 🙏 Acknowledgments

- **Mapbox** - Map rendering and visualization platform
- **Google Maps** - Places API and Geocoding API
- **Supabase** - Database hosting and PostGIS support
- **OpenStreetMap** - Open street network data
- **OSMnx** - Street network extraction library
- **pvlib** - Solar position calculations
- **Open source community** - All the amazing libraries that made this project possible

## 📝 License

See `LICENSE` file for details.

## ⚠️ Notes & Limitations

### Python Version Requirement

This project requires **Python 3.11** or earlier. Python 3.13 is not supported due to pyproj/geopandas compatibility issues.

### Shadow Data Availability

Shadow calculations are only available for **7:00 AM and 5:00 PM**. These times were chosen to represent morning and afternoon shadow patterns. For other times, shadow calculations will not be performed.

### Geographic Coverage

Currently optimized for **Taipei, Taiwan**. Building data and street networks are focused on this area. The system may work in other areas but performance and accuracy may vary.

### Performance Considerations

- **Long Routes**: Routes over 5km may take 60-120 seconds to compute
- **First Request**: Initial requests are slower due to street graph extraction
- **Cache Warming**: Consider pre-computing common routes for better user experience
- **Memory Usage**: Large datasets may require significant RAM (4GB+ recommended)

### Known Limitations

- Shadow calculations assume flat terrain (no elevation data)
- Building heights default to 20m if not available in dataset
- Street network depends on OpenStreetMap data quality
- Route optimization balances shade and distance but may not find globally optimal solution

---

**Note**: This project requires Python 3.11 or earlier. Python 3.13 is not supported due to pyproj/geopandas compatibility issues.
