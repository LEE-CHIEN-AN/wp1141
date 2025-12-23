-- Migration: Create shadow_maps table for precomputed shadow data
-- This table stores merged shadow MultiPolygons for each (date, hour) combination
-- All timestamps use Asia/Taipei timezone (UTC+8)

-- Set timezone for this session (if not already set)
SET timezone = 'Asia/Taipei';

-- Create shadow_maps table
CREATE TABLE IF NOT EXISTS shadow_maps (
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    shadow_multipolygon GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    building_count INTEGER NOT NULL DEFAULT 0,
    shadow_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'),
    computation_time_ms DOUBLE PRECISION,
    PRIMARY KEY (date, hour),
    CONSTRAINT shadow_maps_date_hour_unique UNIQUE (date, hour)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS shadow_maps_date_idx ON shadow_maps (date);
CREATE INDEX IF NOT EXISTS shadow_maps_shadow_multipolygon_idx 
    ON shadow_maps USING GIST (shadow_multipolygon);

-- Add comments
COMMENT ON TABLE shadow_maps IS 'Precomputed shadow maps: merged MultiPolygon of all building shadows for each (date, hour)';
COMMENT ON COLUMN shadow_maps.date IS 'Date in Asia/Taipei timezone';
COMMENT ON COLUMN shadow_maps.hour IS 'Hour (0-23) in Asia/Taipei timezone';
COMMENT ON COLUMN shadow_maps.shadow_multipolygon IS 'Merged shadow MultiPolygon in EPSG:4326 (WGS84)';
COMMENT ON COLUMN shadow_maps."timestamp" IS 'Full timestamp with timezone (Asia/Taipei) for solar position calculation';
COMMENT ON COLUMN shadow_maps.building_count IS 'Number of buildings used in computation';
COMMENT ON COLUMN shadow_maps.shadow_count IS 'Number of individual shadow polygons before union';
COMMENT ON COLUMN shadow_maps.computation_time_ms IS 'Computation time in milliseconds';
