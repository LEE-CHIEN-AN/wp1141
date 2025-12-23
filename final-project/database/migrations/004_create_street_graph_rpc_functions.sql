-- Migration: Create RPC functions for querying street graph from bounding box
-- These functions use GiST index for efficient spatial queries

-- Function to get street graph nodes within a bounding box
CREATE OR REPLACE FUNCTION get_street_nodes_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION
)
RETURNS TABLE (
    osmid BIGINT,
    geometry JSONB,
    y DOUBLE PRECISION,
    x DOUBLE PRECISION,
    street_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.osmid,
        ST_AsGeoJSON(n.geometry)::jsonb as geometry,
        n.y,
        n.x,
        n.street_count
    FROM street_graph_nodes n
    WHERE ST_Intersects(
        n.geometry,
        ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    );
END;
$$;

-- Function to get street graph edges within a bounding box
-- Returns edges where either endpoint is in the bounding box
CREATE OR REPLACE FUNCTION get_street_edges_in_bbox(
    min_lon DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lon DOUBLE PRECISION,
    max_lat DOUBLE PRECISION
)
RETURNS TABLE (
    u BIGINT,
    v BIGINT,
    key INTEGER,
    geometry JSONB,
    length DOUBLE PRECISION,
    name TEXT,
    highway TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.u,
        e.v,
        e.key,
        ST_AsGeoJSON(e.geometry)::jsonb as geometry,
        e.length,
        e.name,
        e.highway
    FROM street_graph_edges e
    WHERE ST_Intersects(
        e.geometry,
        ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    );
END;
$$;

-- Function to get all edges for given node IDs (for graph reconstruction)
-- This is useful when we have nodes and need to get all edges connecting them
-- Optimized: Uses UNION ALL instead of OR to allow efficient index usage
CREATE OR REPLACE FUNCTION get_street_edges_for_nodes(
    node_ids BIGINT[]
)
RETURNS TABLE (
    u BIGINT,
    v BIGINT,
    key INTEGER,
    geometry JSONB,
    length DOUBLE PRECISION,
    name TEXT,
    highway TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Query 1: Edges where source node (u) is in the list
    -- Uses street_graph_edges_u_idx efficiently
    SELECT 
        e.u,
        e.v,
        e.key,
        ST_AsGeoJSON(e.geometry)::jsonb as geometry,
        e.length,
        e.name,
        e.highway
    FROM street_graph_edges e
    WHERE e.u = ANY(node_ids)
    
    UNION ALL
    
    -- Query 2: Edges where target node (v) is in the list, but source (u) is NOT
    -- This avoids duplicates from Query 1 (edges where both u and v are in node_ids)
    -- Uses street_graph_edges_v_idx efficiently
    SELECT 
        e.u,
        e.v,
        e.key,
        ST_AsGeoJSON(e.geometry)::jsonb as geometry,
        e.length,
        e.name,
        e.highway
    FROM street_graph_edges e
    WHERE e.v = ANY(node_ids)
      AND NOT (e.u = ANY(node_ids));
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_street_nodes_in_bbox TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_street_edges_in_bbox TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_street_edges_for_nodes TO anon, authenticated;

-- Add comments
COMMENT ON FUNCTION get_street_nodes_in_bbox IS 'Get street network nodes within a bounding box using PostGIS GiST index';
COMMENT ON FUNCTION get_street_edges_in_bbox IS 'Get street network edges within a bounding box using PostGIS GiST index';
COMMENT ON FUNCTION get_street_edges_for_nodes IS 'Get all edges for given node IDs (for graph reconstruction). Optimized with UNION ALL for efficient index usage.';

