-- Migration: Create street graph tables for storing OSMnx street network
-- This stores the walking network (nodes and edges) for Taipei city
-- PostGIS extension should already be enabled

-- Create street_graph_nodes table
CREATE TABLE IF NOT EXISTS street_graph_nodes (
    osmid BIGINT PRIMARY KEY,
    geometry GEOMETRY(POINT, 4326) NOT NULL,
    y DOUBLE PRECISION NOT NULL,  -- latitude
    x DOUBLE PRECISION NOT NULL,  -- longitude
    street_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create street_graph_edges table
CREATE TABLE IF NOT EXISTS street_graph_edges (
    id BIGSERIAL PRIMARY KEY,
    u BIGINT NOT NULL,  -- source node osmid
    v BIGINT NOT NULL,  -- target node osmid
    key INTEGER DEFAULT 0,  -- for MultiDiGraph
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    length DOUBLE PRECISION,  -- edge length in meters
    name TEXT,
    highway TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (u) REFERENCES street_graph_nodes(osmid),
    FOREIGN KEY (v) REFERENCES street_graph_nodes(osmid)
);

-- Create spatial indexes for efficient queries
CREATE INDEX IF NOT EXISTS street_graph_nodes_geometry_idx 
ON street_graph_nodes USING GIST (geometry);

CREATE INDEX IF NOT EXISTS street_graph_edges_geometry_idx 
ON street_graph_edges USING GIST (geometry);

-- Create indexes on node coordinates for faster lookups
CREATE INDEX IF NOT EXISTS street_graph_nodes_coords_idx 
ON street_graph_nodes (x, y);

-- Create index on edge endpoints for graph traversal
CREATE INDEX IF NOT EXISTS street_graph_edges_u_idx 
ON street_graph_edges (u);

CREATE INDEX IF NOT EXISTS street_graph_edges_v_idx 
ON street_graph_edges (v);

-- Create composite index for edge lookups
CREATE INDEX IF NOT EXISTS street_graph_edges_uv_key_idx 
ON street_graph_edges (u, v, key);

-- Add comments
COMMENT ON TABLE street_graph_nodes IS 'OSM street network nodes (intersections) for walking routes';
COMMENT ON TABLE street_graph_edges IS 'OSM street network edges (street segments) for walking routes';
COMMENT ON COLUMN street_graph_nodes.osmid IS 'OpenStreetMap node ID';
COMMENT ON COLUMN street_graph_edges.u IS 'Source node OSM ID';
COMMENT ON COLUMN street_graph_edges.v IS 'Target node OSM ID';
COMMENT ON COLUMN street_graph_edges.key IS 'Edge key for MultiDiGraph (default 0)';

