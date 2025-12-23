-- Migration: Create RPC functions for shadow_maps table
-- These functions handle querying, upserting, and cleaning precomputed shadows

-- Function to get shadow map for a specific date and hour with bbox filtering
CREATE OR REPLACE FUNCTION get_shadow_map_for_date_hour(
    query_date DATE,
    query_hour INTEGER,
    min_lon DOUBLE PRECISION DEFAULT NULL,
    min_lat DOUBLE PRECISION DEFAULT NULL,
    max_lon DOUBLE PRECISION DEFAULT NULL,
    max_lat DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
    type TEXT,
    features JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    bbox_geom GEOMETRY;
    clipped_shadow GEOMETRY;
    shadow_geojson JSONB;
BEGIN
    -- Get the shadow MultiPolygon for the specified date and hour
    SELECT shadow_multipolygon INTO clipped_shadow
    FROM shadow_maps
    WHERE date = query_date AND hour = query_hour;
    
    -- If no shadow found, return empty FeatureCollection
    IF clipped_shadow IS NULL THEN
        RETURN QUERY SELECT 
            'FeatureCollection'::TEXT as type,
            '[]'::jsonb as features;
        RETURN;
    END IF;
    
    -- If bbox parameters are provided, clip the shadow to the bbox
    IF min_lon IS NOT NULL AND min_lat IS NOT NULL AND max_lon IS NOT NULL AND max_lat IS NOT NULL THEN
        bbox_geom := ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326);
        clipped_shadow := ST_Intersection(clipped_shadow, bbox_geom);
        
        -- If intersection is empty, return empty FeatureCollection
        IF clipped_shadow IS NULL OR ST_IsEmpty(clipped_shadow) THEN
            RETURN QUERY SELECT 
                'FeatureCollection'::TEXT as type,
                '[]'::jsonb as features;
            RETURN;
        END IF;
    END IF;
    
    -- Convert to GeoJSON
    shadow_geojson := ST_AsGeoJSON(clipped_shadow)::jsonb;
    
    -- Create FeatureCollection format
    RETURN QUERY SELECT 
        'FeatureCollection'::TEXT as type,
        jsonb_build_array(
            jsonb_build_object(
                'type', 'Feature',
                'geometry', shadow_geojson,
                'properties', jsonb_build_object()
            )
        ) as features;
END;
$$;

-- Function to upsert shadow map
-- FIXED: created_at now uses UTC time (CURRENT_TIMESTAMP) instead of Asia/Taipei time
CREATE OR REPLACE FUNCTION upsert_shadow_map(
    p_date DATE,
    p_hour INTEGER,
    p_shadow_multipolygon_geojson TEXT,
    p_timestamp TIMESTAMP WITH TIME ZONE,
    p_building_count INTEGER DEFAULT 0,
    p_shadow_count INTEGER DEFAULT 0,
    p_computation_time_ms DOUBLE PRECISION DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    shadow_geom GEOMETRY;
BEGIN
    -- Convert GeoJSON string to geometry
    shadow_geom := ST_GeomFromGeoJSON(p_shadow_multipolygon_geojson);
    
    -- Ensure it's a MultiPolygon
    IF ST_GeometryType(shadow_geom) != 'ST_MultiPolygon' THEN
        -- If it's a Polygon, convert to MultiPolygon
        IF ST_GeometryType(shadow_geom) = 'ST_Polygon' THEN
            shadow_geom := ST_Multi(shadow_geom);
        ELSE
            RAISE EXCEPTION 'Geometry must be Polygon or MultiPolygon, got %', ST_GeometryType(shadow_geom);
        END IF;
    END IF;
    
    -- Upsert using ON CONFLICT
    -- FIXED: created_at now uses CURRENT_TIMESTAMP (UTC) instead of CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
    INSERT INTO shadow_maps (
        date,
        hour,
        shadow_multipolygon,
        "timestamp",
        building_count,
        shadow_count,
        computation_time_ms,
        created_at
    ) VALUES (
        p_date,
        p_hour,
        shadow_geom,
        p_timestamp,  -- p_timestamp should already be in UTC
        p_building_count,
        p_shadow_count,
        p_computation_time_ms,
        CURRENT_TIMESTAMP  -- Use UTC time (PostgreSQL's CURRENT_TIMESTAMP is UTC)
    )
    ON CONFLICT (date, hour) DO UPDATE SET
        shadow_multipolygon = EXCLUDED.shadow_multipolygon,
        "timestamp" = EXCLUDED."timestamp",
        building_count = EXCLUDED.building_count,
        shadow_count = EXCLUDED.shadow_count,
        computation_time_ms = EXCLUDED.computation_time_ms,
        created_at = CURRENT_TIMESTAMP;  -- Use UTC time for updates too
END;
$$;

-- Function to delete old shadow maps (older than retention_days)
CREATE OR REPLACE FUNCTION delete_old_shadow_maps(
    retention_days INTEGER DEFAULT 7
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date DATE;
BEGIN
    -- Calculate cutoff date (current date in Asia/Taipei timezone minus retention_days)
    cutoff_date := (CURRENT_DATE AT TIME ZONE 'Asia/Taipei')::DATE - retention_days;
    
    -- Delete old records
    DELETE FROM shadow_maps
    WHERE date < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_shadow_map_for_date_hour TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_shadow_map TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_old_shadow_maps TO anon, authenticated;

-- Add comments
COMMENT ON FUNCTION get_shadow_map_for_date_hour IS 'Get precomputed shadow map for a specific date and hour, optionally filtered by bounding box';
COMMENT ON FUNCTION upsert_shadow_map IS 'Insert or update shadow map for a specific date and hour. Timestamp should be in UTC.';
COMMENT ON FUNCTION delete_old_shadow_maps IS 'Delete shadow maps older than retention_days (default: 7 days)';

