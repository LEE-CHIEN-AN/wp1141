"""PostGIS query functions for street graph data using Supabase."""
from functools import lru_cache
from typing import Tuple, cast
import logging

import geopandas as gpd
import networkx as nx
from shapely.geometry import Polygon
from supabase import Client

from .config import get_supabase_config

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Get Supabase client with connection pooling.
    
    Uses @lru_cache to reuse the same client instance across calls,
    reducing connection overhead.
    """
    from supabase import create_client
    from dotenv import load_dotenv
    from pathlib import Path
    import os
    
    load_dotenv(Path(__file__).parent.parent / ".env")
    
    config = get_supabase_config()
    supabase_url = os.getenv("SUPABASE_URL", config.supabase_url or "")
    supabase_key = os.getenv("SUPABASE_KEY", config.supabase_key or "")
    
    if not supabase_url:
        raise ValueError(
            "SUPABASE_URL environment variable is required.\n"
            "Set it in your .env file or as an environment variable.\n"
            "Get your project URL from Supabase Dashboard → Settings → API"
        )
    
    if not supabase_key:
        raise ValueError(
            "SUPABASE_KEY environment variable is required.\n"
            "Set it in your .env file or as an environment variable.\n"
            "Get your Service Role Key from Supabase Dashboard → Settings → API"
        )
    
    return create_client(supabase_url, supabase_key)


def get_street_graph_in_bbox(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
) -> Tuple[nx.MultiDiGraph, gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """
    從 Supabase 取得指定 bounding box 內的路網圖。
    
    這個函數使用 Supabase RPC 函數來執行 PostGIS 查詢，利用 GiST index 加速。
    然後重建 NetworkX graph。
    
    Parameters
    ----------
    min_lon : float
        最小經度（西邊界）
    min_lat : float
        最小緯度（南邊界）
    max_lon : float
        最大經度（東邊界）
    max_lat : float
        最大緯度（北邊界）
    
    Returns
    -------
    Tuple[nx.MultiDiGraph, gpd.GeoDataFrame, gpd.GeoDataFrame]
        (Graph, nodes, edges) 元組
    """
    import logging
    from shapely.geometry import shape
    
    logger = logging.getLogger(__name__)
    print("📊 [路網圖來源] 使用 Supabase REST API 查詢路網圖")
    logger.info("📊 使用 Supabase REST API 查詢路網圖")
    supabase = get_supabase_client()
    
    try:
        # Query nodes
        logger.debug(f"Querying street nodes in bbox: ({min_lon}, {min_lat}) to ({max_lon}, {max_lat})")
        nodes_result = supabase.rpc(
            "get_street_nodes_in_bbox",
            {
                "min_lon": min_lon,
                "min_lat": min_lat,
                "max_lon": max_lon,
                "max_lat": max_lat,
            }
        ).execute()
        
        # Validate that data is a list/iterable
        if not nodes_result.data or not isinstance(nodes_result.data, (list, tuple)):
            logger.warning(f"No street nodes found in bounding box (data type: {type(nodes_result.data)})")
            # Return empty graph
            G = nx.MultiDiGraph()
            G.graph["crs"] = "EPSG:4326"  # Set CRS for OSMnx compatibility
            nodes = gpd.GeoDataFrame(columns=["osmid", "y", "x", "street_count"], geometry=[], crs="EPSG:4326")
            edges = gpd.GeoDataFrame(columns=["u", "v", "key", "length", "name", "highway"], geometry=[], crs="EPSG:4326")
            return G, nodes, edges
        
        # Convert nodes to GeoDataFrame
        nodes_rows = []
        node_geometries = []
        node_osmids = []
        
        # Ensure we're iterating over a list of dictionaries
        nodes_data = nodes_result.data if isinstance(nodes_result.data, list) else []
        for row in nodes_data:
            # Validate row is a dictionary
            if not isinstance(row, dict):
                logger.warning(f"Skipping invalid row type: {type(row)}")
                continue
            geom_data = row.get("geometry")
            if isinstance(geom_data, dict):
                geom = shape(geom_data)
            else:
                continue
            
            nodes_rows.append({
                "osmid": row["osmid"],
                "y": row["y"],
                "x": row["x"],
                "street_count": row.get("street_count", 0),
            })
            node_geometries.append(geom)
            node_osmids.append(row["osmid"])
        
        nodes = gpd.GeoDataFrame(nodes_rows, geometry=node_geometries, crs="EPSG:4326")
        nodes.set_index("osmid", inplace=True)
        
        logger.debug(f"Found {len(nodes)} nodes in bbox")
        
        # Query edges for the nodes we found
        # This approach is more reliable than bbox query because:
        # 1. It ensures we get all edges connecting the nodes
        # 2. It avoids Supabase's 1000 row limit on bbox queries
        # 3. We already have the nodes, so we can query their edges directly
        logger.debug(f"Querying street edges for {len(node_osmids)} nodes...")
        
        # Split into batches if too many nodes (to avoid query size limits)
        # Supabase RPC functions can handle large arrays, but we'll batch to be safe
        BATCH_SIZE = 5000  # Process nodes in batches
        all_edges_data = []
        
        for i in range(0, len(node_osmids), BATCH_SIZE):
            batch_node_ids = node_osmids[i:i+BATCH_SIZE]
            logger.debug(f"Querying edges for node batch {i//BATCH_SIZE + 1} ({len(batch_node_ids)} nodes)...")
            
            batch_result = supabase.rpc(
                "get_street_edges_for_nodes",
                {"node_ids": batch_node_ids}
            ).execute()
            
            if batch_result.data and isinstance(batch_result.data, (list, tuple)):
                all_edges_data.extend(batch_result.data)
            elif batch_result.data:
                logger.warning(f"Batch result data is not a list (type: {type(batch_result.data)}), skipping")
        
        # Create a mock result object with all edges
        class MockResult:
            def __init__(self, data):
                self.data = data
        edges_result = MockResult(all_edges_data)
        
        logger.debug(f"Total edges found: {len(all_edges_data)}")
        
        # Warn if we got a suspiciously round number (may indicate truncation)
        if len(all_edges_data) > 0 and len(all_edges_data) % 1000 == 0:
            logger.warning(
                f"Edge query returned {len(all_edges_data)} rows (multiple of 1000). "
                f"This may indicate truncation. Consider using a smaller query area."
            )
        
        # Also need to ensure we have all nodes referenced by these edges
        # (edges may extend outside the bbox, so their endpoints may not be in bbox)
        if edges_result.data and isinstance(edges_result.data, (list, tuple)):
            edge_node_ids = set()
            for row in edges_result.data:
                if isinstance(row, dict):
                    edge_node_ids.add(row["u"])
                    edge_node_ids.add(row["v"])
            
            # Query any missing nodes (nodes referenced by edges but outside bbox)
            missing_node_ids = edge_node_ids - set(node_osmids)
            if missing_node_ids:
                logger.debug(f"Found {len(missing_node_ids)} nodes referenced by edges but not in bbox, querying them...")
                missing_nodes_result = supabase.table("street_graph_nodes").select("*").in_("osmid", list(missing_node_ids)).execute()
                if missing_nodes_result.data and isinstance(missing_nodes_result.data, (list, tuple)):
                    # Add missing nodes to the lists
                    for row in missing_nodes_result.data:
                        if not isinstance(row, dict):
                            logger.warning(f"Skipping invalid missing node row type: {type(row)}")
                            continue
                        geom_data = row.get("geometry")
                        if isinstance(geom_data, dict):
                            geom = shape(geom_data)
                            nodes_rows.append({
                                "osmid": row["osmid"],
                                "y": row["y"],
                                "x": row["x"],
                                "street_count": row.get("street_count", 0),
                            })
                            node_geometries.append(geom)
                            node_osmids.append(row["osmid"])
                    # Rebuild nodes GeoDataFrame with all nodes
                    nodes = gpd.GeoDataFrame(nodes_rows, geometry=node_geometries, crs="EPSG:4326")
                    nodes.set_index("osmid", inplace=True)
                    logger.debug(f"Added {len(missing_node_ids)} missing nodes, total nodes: {len(nodes)}")
        
        if not edges_result.data or not isinstance(edges_result.data, (list, tuple)):
            logger.warning("No street edges found for nodes")
            G = nx.MultiDiGraph()
            G.graph["crs"] = "EPSG:4326"  # Set CRS for OSMnx compatibility
            edges = gpd.GeoDataFrame(columns=["u", "v", "key", "length", "name", "highway"], geometry=[], crs="EPSG:4326")
            # Set MultiIndex for edges to match OSMnx format
            if len(edges) > 0:
                edges.set_index(["u", "v", "key"], inplace=True)
            return G, nodes, edges
        
        # Convert edges to GeoDataFrame
        edges_rows = []
        edge_geometries = []
        
        # Ensure edges_result.data is a list
        edges_data = edges_result.data if isinstance(edges_result.data, (list, tuple)) else []
        for row in edges_data:
            # Validate row is a dictionary
            if not isinstance(row, dict):
                logger.warning(f"Skipping invalid edge row type: {type(row)}")
                continue
                
            geom_data = row.get("geometry")
            if isinstance(geom_data, dict):
                geom = shape(geom_data)
            else:
                continue
            
            edges_rows.append({
                "u": row["u"],
                "v": row["v"],
                "key": row.get("key", 0),
                "length": row.get("length", 0.0),
                "name": row.get("name"),
                "highway": row.get("highway"),
            })
            edge_geometries.append(geom)
        
        edges = gpd.GeoDataFrame(edges_rows, geometry=edge_geometries, crs="EPSG:4326")
        
        # Set MultiIndex (u, v, key) to match OSMnx format
        # This is required for weight lookup in routing functions
        edges.set_index(["u", "v", "key"], inplace=True)
        
        logger.debug(f"Found {len(edges)} edges")
        
        # Reconstruct NetworkX graph
        logger.debug("Reconstructing NetworkX graph...")
        G = nx.MultiDiGraph()
        
        # Set graph CRS attribute (required by OSMnx)
        G.graph["crs"] = "EPSG:4326"
        
        # Add nodes
        for osmid, row in nodes.iterrows():
            G.add_node(
                osmid,
                y=row["y"],
                x=row["x"],
                geometry=row.geometry,
                street_count=row.get("street_count", 0),
            )
        
        # Add edges
        # edges has MultiIndex (u, v, key), so we iterate and unpack the index
        for idx, row in edges.iterrows():
            # idx is a tuple (u, v, key) from MultiIndex
            try:
                u, v, key = idx  # type: ignore
            except (TypeError, ValueError) as e:
                logger.warning(f"Invalid edge index format: {idx}, skipping: {e}")
                continue
            G.add_edge(
                u,
                v,
                key=key,
                length=row.get("length", 0.0),
                name=row.get("name"),
                highway=row.get("highway"),
                geometry=row.geometry,
            )
        
        # Filter to largest connected component (like OSMnx retain_all=False)
        # This removes disconnected islands that cause routing failures
        if G.is_directed():
            components = list(nx.strongly_connected_components(G))
        else:
            components = list(nx.weakly_connected_components(G))
        
        if len(components) > 1:
            logger.info(f"Graph has {len(components)} connected components, keeping only the largest")
            component_sizes = [len(comp) for comp in components]
            largest_component = max(components, key=len)
            logger.info(f"Component sizes: {sorted(component_sizes, reverse=True)}, keeping largest ({len(largest_component)} nodes)")
            
            # Create subgraph with only the largest component
            G = G.subgraph(largest_component).copy()  # type: ignore[assignment]
            
            # Update nodes and edges GeoDataFrames to match
            nodes = nodes.loc[list(largest_component)]
            # Filter edges to only those in the largest component
            edges = edges[edges.index.get_level_values('u').isin(largest_component) & 
                          edges.index.get_level_values('v').isin(largest_component)]
        
        logger.debug(f"Graph reconstructed: {len(G.nodes)} nodes, {len(G.edges)} edges")
        
        # Type assertions for return value
        return cast(nx.MultiDiGraph, G), cast(gpd.GeoDataFrame, nodes), cast(gpd.GeoDataFrame, edges)
        
    except Exception as e:
        logger.error(f"Failed to query street graph from Supabase: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise


def get_street_graph_in_polygon(polygon: Polygon) -> Tuple[nx.MultiDiGraph, gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """
    從 Supabase 取得指定多邊形內的路網圖。
    
    Parameters
    ----------
    polygon : Polygon
        Shapely Polygon 物件（EPSG:4326）
    
    Returns
    -------
    Tuple[nx.MultiDiGraph, gpd.GeoDataFrame, gpd.GeoDataFrame]
        (Graph, nodes, edges) 元組
    """
    # Get bounding box of polygon
    bounds = polygon.bounds  # (minx, miny, maxx, maxy)
    min_lon, min_lat, max_lon, max_lat = bounds
    
    # Query by bounding box first (uses spatial index)
    # Don't filter to exact polygon - keep all edges from bbox to ensure connectivity
    # The polygon filtering is just for the initial query, but we need all connecting edges
    G, nodes, edges = get_street_graph_in_bbox(min_lon, min_lat, max_lon, max_lat)
    
    # Return the full graph from bbox (not filtered to polygon)
    # This ensures connectivity even if edges extend slightly outside the polygon
    # OSMnx's graph_from_polygon also includes edges that intersect the polygon, not just endpoints inside
    return G, nodes, edges

