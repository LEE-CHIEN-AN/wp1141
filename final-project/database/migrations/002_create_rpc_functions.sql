-- Migration: Create RPC functions for PostGIS queries
-- These functions use GiST index for efficient spatial queries

-- Function to get buildings within a bounding box
CREATE OR REPLACE FUNCTION get_buildings_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    tile_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    geometry JSONB,
    height DOUBLE PRECISION,
    color TEXT,
    roof_color TEXT,
    tile_id TEXT,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        ST_AsGeoJSON(b.geometry)::jsonb as geometry,
        b.height,
        b.color,
        b.roof_color,
        b.tile_id,
        b.created_at
    FROM buildings b
    WHERE ST_Intersects(
        b.geometry,
        ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    )
    AND (tile_id_filter IS NULL OR b.tile_id = tile_id_filter);
END;
$$;

-- Function to count buildings in bounding box
CREATE OR REPLACE FUNCTION count_buildings_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION
)
RETURNS TABLE (count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT as count
    FROM buildings
    WHERE ST_Intersects(
        geometry,
        ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_buildings_in_bbox TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_buildings_in_bbox TO anon, authenticated;

-- Add comments
COMMENT ON FUNCTION get_buildings_in_bbox IS 'Get buildings within a bounding box using PostGIS GiST index';
COMMENT ON FUNCTION count_buildings_in_bbox IS 'Count buildings within a bounding box using PostGIS GiST index';

