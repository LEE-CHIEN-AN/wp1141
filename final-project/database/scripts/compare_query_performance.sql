-- Performance comparison script for street graph queries
-- Run this in Supabase SQL Editor to compare old OR vs new UNION ALL approach

-- Step 1: Create the old OR-based function for comparison
CREATE OR REPLACE FUNCTION get_street_edges_for_nodes_old(
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
    SELECT 
        e.u,
        e.v,
        e.key,
        ST_AsGeoJSON(e.geometry)::jsonb as geometry,
        e.length,
        e.name,
        e.highway
    FROM street_graph_edges e
    WHERE e.u = ANY(node_ids) OR e.v = ANY(node_ids);
END;
$$;

-- Step 2: Get a sample of node IDs for testing
-- Adjust the bounding box to match your data
DO $$
DECLARE
    test_node_ids BIGINT[];
    test_size INTEGER := 1000;  -- Change this to test different sizes
BEGIN
    -- Get sample node IDs
    SELECT array_agg(osmid) INTO test_node_ids
    FROM (
        SELECT osmid 
        FROM street_graph_nodes
        WHERE ST_Intersects(
            geometry,
            ST_MakeEnvelope(121.5, 25.0, 121.6, 25.1, 4326)
        )
        LIMIT test_size
    ) subq;
    
    RAISE NOTICE 'Testing with % nodes', array_length(test_node_ids, 1);
    
    -- Step 3: Test OLD query (OR approach)
    RAISE NOTICE 'Testing OLD query (OR approach)...';
    PERFORM * FROM get_street_edges_for_nodes_old(test_node_ids);
    
    -- Step 4: Test NEW query (UNION ALL approach)
    RAISE NOTICE 'Testing NEW query (UNION ALL approach)...';
    PERFORM * FROM get_street_edges_for_nodes(test_node_ids);
END $$;

-- Step 5: Use EXPLAIN ANALYZE for detailed comparison
-- Replace {node_ids_array} with actual array from above query

-- Example with EXPLAIN ANALYZE (run separately with actual node IDs):
/*
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(*) 
FROM get_street_edges_for_nodes_old(
    ARRAY[123, 456, 789, ...]::BIGINT[]  -- Replace with actual node IDs
);

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(*) 
FROM get_street_edges_for_nodes(
    ARRAY[123, 456, 789, ...]::BIGINT[]  -- Same node IDs
);
*/

-- Step 6: Compare execution times with timing
-- Enable timing in psql: \timing on
-- Or use this DO block:

DO $$
DECLARE
    test_node_ids BIGINT[];
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    old_count INTEGER;
    new_count INTEGER;
    old_time INTERVAL;
    new_time INTERVAL;
BEGIN
    -- Get test node IDs
    SELECT array_agg(osmid) INTO test_node_ids
    FROM (
        SELECT osmid 
        FROM street_graph_nodes
        WHERE ST_Intersects(
            geometry,
            ST_MakeEnvelope(121.5, 25.0, 121.6, 25.1, 4326)
        )
        LIMIT 1000
    ) subq;
    
    RAISE NOTICE 'Testing with % nodes', array_length(test_node_ids, 1);
    
    -- Test OLD query
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO old_count FROM get_street_edges_for_nodes_old(test_node_ids);
    end_time := clock_timestamp();
    old_time := end_time - start_time;
    
    -- Test NEW query
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO new_count FROM get_street_edges_for_nodes(test_node_ids);
    end_time := clock_timestamp();
    new_time := end_time - start_time;
    
    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PERFORMANCE COMPARISON';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'OLD (OR):        % edges in %', old_count, old_time;
    RAISE NOTICE 'NEW (UNION ALL): % edges in %', new_count, new_time;
    
    IF new_time < old_time THEN
        RAISE NOTICE '✓ NEW is %.2fx faster', EXTRACT(EPOCH FROM old_time) / EXTRACT(EPOCH FROM new_time);
    ELSE
        RAISE NOTICE '⚠ OLD is %.2fx faster (unexpected)', EXTRACT(EPOCH FROM new_time) / EXTRACT(EPOCH FROM old_time);
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

