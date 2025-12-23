-- Migration: Create buildings table with PostGIS support
-- Ensure PostGIS extension is enabled (should already be done)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
    id BIGSERIAL PRIMARY KEY,
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    height DOUBLE PRECISION,
    color TEXT,
    roof_color TEXT,
    tile_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create GiST index on geometry column for spatial queries
CREATE INDEX IF NOT EXISTS buildings_geometry_idx 
ON buildings USING GIST (geometry);

-- Create index on tile_id for faster filtering by source file
CREATE INDEX IF NOT EXISTS buildings_tile_id_idx 
ON buildings (tile_id);

-- Add comment to table
COMMENT ON TABLE buildings IS 'Building footprints with PostGIS geometry for shadow navigation';
COMMENT ON COLUMN buildings.geometry IS 'Building polygon in EPSG:4326 (WGS84)';
COMMENT ON COLUMN buildings.tile_id IS 'Source GeoJSON file identifier (e.g., "4342")';

