#!/usr/bin/env python3
"""Performance test for optimized street graph query."""
import sys
import time
import statistics
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.queries_street_graph import get_supabase_client


def create_old_function(supabase):
    """Create the old OR-based function for comparison."""
    old_function_sql = """
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
    """
    
    try:
        # Execute via raw SQL (Supabase doesn't have direct SQL execution, so we'll skip this)
        # Instead, we'll just test the new function
        print("Note: Testing optimized version only (old function would require direct SQL access)")
        return False
    except Exception as e:
        print(f"Could not create old function: {e}")
        return False


def get_sample_node_ids(supabase, min_lon=121.5, min_lat=25.0, max_lon=121.6, max_lat=25.1, limit=None):
    """Get sample node IDs from a bounding box."""
    print(f"Fetching sample nodes from bbox: ({min_lon}, {min_lat}) to ({max_lon}, {max_lat})...")
    
    result = supabase.rpc(
        "get_street_nodes_in_bbox",
        {
            "min_lon": min_lon,
            "min_lat": min_lat,
            "max_lon": max_lon,
            "max_lat": max_lat,
        }
    ).execute()
    
    if not result.data:
        raise ValueError("No nodes found in the specified bounding box")
    
    node_ids = [node["osmid"] for node in result.data]
    
    if limit:
        node_ids = node_ids[:limit]
    
    print(f"✓ Found {len(node_ids)} nodes")
    return node_ids


def test_query_performance(supabase, node_ids, function_name="get_street_edges_for_nodes", iterations=10):
    """Test query performance with timing."""
    print(f"\nTesting {function_name} with {len(node_ids)} nodes ({iterations} iterations)...")
    
    times = []
    edge_counts = []
    
    for i in range(iterations):
        start = time.perf_counter()
        
        try:
            result = supabase.rpc(
                function_name,
                {"node_ids": node_ids}
            ).execute()
            
            elapsed = (time.perf_counter() - start) * 1000  # Convert to ms
            edge_count = len(result.data) if result.data else 0
            
            times.append(elapsed)
            edge_counts.append(edge_count)
            
            print(f"  Iteration {i+1:2d}: {elapsed:6.2f}ms ({edge_count:5d} edges)")
            
        except Exception as e:
            print(f"  Iteration {i+1:2d}: ERROR - {e}")
            return None
    
    if not times:
        return None
    
    # Calculate statistics
    avg_time = statistics.mean(times)
    median_time = statistics.median(times)
    min_time = min(times)
    max_time = max(times)
    std_dev = statistics.stdev(times) if len(times) > 1 else 0
    
    avg_edges = statistics.mean(edge_counts) if edge_counts else 0
    
    print(f"\n  Performance Summary:")
    print(f"    Average: {avg_time:6.2f}ms")
    print(f"    Median:  {median_time:6.2f}ms")
    print(f"    Min:     {min_time:6.2f}ms")
    print(f"    Max:     {max_time:6.2f}ms")
    print(f"    Std Dev: {std_dev:6.2f}ms")
    print(f"    Avg Edges Returned: {avg_edges:.0f}")
    
    return {
        "avg": avg_time,
        "median": median_time,
        "min": min_time,
        "max": max_time,
        "std_dev": std_dev,
        "avg_edges": avg_edges,
        "iterations": iterations,
        "node_count": len(node_ids)
    }


def test_different_sizes(supabase):
    """Test performance with different node list sizes."""
    print("\n" + "=" * 70)
    print("PERFORMANCE TEST: Different Node List Sizes")
    print("=" * 70)
    
    # Get a large sample first
    print("\nStep 1: Fetching large sample of nodes...")
    all_node_ids = get_sample_node_ids(supabase, limit=5000)
    
    # Test with different sizes
    test_sizes = [
        {"name": "Small", "count": 100},
        {"name": "Medium", "count": 500},
        {"name": "Large", "count": 1000},
        {"name": "Very Large", "count": 2500},
    ]
    
    results = []
    
    for test_case in test_sizes:
        if test_case["count"] > len(all_node_ids):
            print(f"\n⚠ Skipping {test_case['name']} ({test_case['count']} nodes): "
                  f"Only {len(all_node_ids)} nodes available")
            continue
        
        test_node_ids = all_node_ids[:test_case["count"]]
        
        print(f"\n{'='*70}")
        print(f"Testing: {test_case['name']} ({len(test_node_ids)} nodes)")
        print(f"{'='*70}")
        
        result = test_query_performance(
            supabase, 
            test_node_ids, 
            iterations=5  # Fewer iterations for faster testing
        )
        
        if result:
            result["test_name"] = test_case["name"]
            results.append(result)
    
    # Summary table
    print("\n" + "=" * 70)
    print("PERFORMANCE SUMMARY")
    print("=" * 70)
    print(f"{'Test Size':<15} {'Nodes':<8} {'Avg (ms)':<12} {'Median (ms)':<14} {'Min (ms)':<10} {'Max (ms)':<10} {'Edges':<8}")
    print("-" * 70)
    
    for result in results:
        print(f"{result['test_name']:<15} "
              f"{result['node_count']:<8} "
              f"{result['avg']:<12.2f} "
              f"{result['median']:<14.2f} "
              f"{result['min']:<10.2f} "
              f"{result['max']:<10.2f} "
              f"{result['avg_edges']:<8.0f}")
    
    return results


def test_single_query(supabase):
    """Test a single query with detailed output."""
    print("\n" + "=" * 70)
    print("SINGLE QUERY TEST")
    print("=" * 70)
    
    # Get sample nodes
    node_ids = get_sample_node_ids(supabase, limit=1000)
    
    print(f"\nTesting with {len(node_ids)} nodes...")
    
    result = test_query_performance(supabase, node_ids, iterations=10)
    
    if result:
        print(f"\n✓ Test completed successfully")
        print(f"  Query returned {result['avg_edges']:.0f} edges on average")
        print(f"  Average query time: {result['avg']:.2f}ms")
    
    return result


def main():
    """Run performance tests."""
    print("\n" + "=" * 70)
    print("STREET GRAPH QUERY PERFORMANCE TEST")
    print("=" * 70)
    print("\nTesting optimized UNION ALL query performance")
    
    try:
        # Get Supabase client
        print("\nConnecting to Supabase...")
        supabase = get_supabase_client()
        print("✓ Connected to Supabase")
        
        # Check if street graph tables exist
        try:
            test_result = supabase.table("street_graph_nodes").select("osmid", count="exact").limit(1).execute()
            print(f"✓ Street graph tables found ({test_result.count} nodes in database)")
        except Exception as e:
            print(f"✗ Error accessing street graph tables: {e}")
            print("\n  Make sure:")
            print("  - Street graph data has been imported to Supabase")
            print("  - Migration 003_create_street_graph_tables.sql has been run")
            return 1
        
        # Run tests
        import argparse
        parser = argparse.ArgumentParser(description="Test street graph query performance")
        parser.add_argument("--quick", action="store_true", help="Run quick single test")
        parser.add_argument("--sizes", action="store_true", help="Test different node list sizes")
        args = parser.parse_args()
        
        if args.quick:
            test_single_query(supabase)
        elif args.sizes:
            test_different_sizes(supabase)
        else:
            # Run both by default
            test_single_query(supabase)
            test_different_sizes(supabase)
        
        print("\n" + "=" * 70)
        print("✓ All tests completed!")
        print("=" * 70)
        print("\nNote: To compare with old OR query, you would need to:")
        print("  1. Create the old function in Supabase SQL Editor")
        print("  2. Modify this script to test both functions")
        
        return 0
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

