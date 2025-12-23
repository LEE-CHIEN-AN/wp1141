from __future__ import annotations

import copy
import gc
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from itertools import pairwise
from typing import Dict, Iterable, List, Tuple

import geopandas as gpd
import networkx as nx
import numpy as np
import osmnx as ox
import pandas as pd
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree

from .config import get_settings

# Try to import psutil for memory monitoring
try:
    import psutil
    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False

logger = logging.getLogger(__name__)


def _get_memory_usage_mb() -> float:
    """Get current process memory usage in MB."""
    if not _PSUTIL_AVAILABLE:
        return 0.0
    try:
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024
    except Exception:
        return 0.0

# Try to import utils_graph for OSMnx compatibility
try:
    from osmnx import utils_graph
except ImportError:
    # Fallback for older OSMnx versions
    utils_graph = None


def add_samples_to_edges(edges: gpd.GeoDataFrame, spacing_m: float) -> gpd.GeoDataFrame:
    """Sample points every `spacing_m` meters along each edge."""
    edges_m = edges.to_crs(epsg=3857)
    samples: List[List[Point]] = []

    for geom in edges_m.geometry:
        if geom is None or geom.is_empty:
            samples.append([])
            continue
        length = geom.length
        if length <= spacing_m:
            pts = [geom.interpolate(0.5, normalized=True)]
        else:
            num = max(1, int(length // spacing_m))
            pts = [geom.interpolate(i / num, normalized=True) for i in range(num + 1)]
        samples.append(pts)

    geoms = [pt for pts in samples for pt in pts]
    if geoms:
        reprojected = gpd.GeoSeries(geoms, crs=edges_m.crs).to_crs(edges.crs)
    else:
        reprojected = gpd.GeoSeries([], crs=edges.crs)

    rebuilt: List[List[Point]] = []
    idx = 0
    for pts in samples:
        count = len(pts)
        rebuilt.append(reprojected[idx : idx + count].tolist())
        idx += count

    edges_with_samples = edges.copy()
    edges_with_samples["samples"] = rebuilt
    return edges_with_samples


def compute_shade_weights(edges: gpd.GeoDataFrame, shadow_polygons: Iterable) -> gpd.GeoDataFrame:
    """Compute the fraction of sampled points that fall inside any shadow polygon."""
    polygons = [poly for poly in shadow_polygons if poly and not poly.is_empty]
    if not polygons:
        edges = edges.copy()
        edges["shade_weight"] = 0.0
        return edges

    tree = STRtree(polygons)

    def _resolve_candidates(candidates):
        if candidates is None:
            return []
        resolved = []
        for cand in candidates:
            if cand is None:
                continue
            if hasattr(cand, "geom_type"):
                resolved.append(cand)
            else:
                try:
                    idx = int(cand)
                    if 0 <= idx < len(polygons):
                        resolved.append(polygons[idx])
                except (ValueError, TypeError):
                    continue
        return resolved

    shade_weights = []
    for samples in edges["samples"]:
        if not samples:
            shade_weights.append(0.0)
            continue

        shaded = 0
        for pt in samples:
            if pt is None or getattr(pt, "is_empty", False):
                continue
            # 先用 STRtree 找出可能覆蓋此點的陰影多邊形，避免全量掃描
            candidates = _resolve_candidates(tree.query(pt))
            if any(pt.within(poly) for poly in candidates if poly is not None and not poly.is_empty):
                shaded += 1
        shade_weights.append(shaded / len(samples))

    edges = edges.copy()
    edges["shade_weight"] = shade_weights
    return edges


def add_final_weights(edges: gpd.GeoDataFrame, alpha: float) -> gpd.GeoDataFrame:
    """Blend shade preference and normalized distance into a single cost."""
    edges_m = edges.to_crs(epsg=3857)
    lengths = edges_m.geometry.length
    max_len = lengths.max() or 1.0

    dist_weights = lengths / max_len
    shade_cost = 1 - edges["shade_weight"]

    edges = edges.copy()
    edges["dist_weight"] = dist_weights
    
    # Check if there's any shadow variation in the graph
    shade_weights = edges["shade_weight"]
    has_shadow_variation = shade_weights.max() > 0.0 and (shade_weights.max() - shade_weights.min()) > 1e-6
    
    if not has_shadow_variation:
        # If no shadow variation, fall back to pure distance-based routing
        # This ensures we take the shortest path when there's no shadow benefit
        edges["final_weight"] = dist_weights
    else:
        # Normal case: blend shade preference and distance
        edges["final_weight"] = alpha * shade_cost + (1 - alpha) * dist_weights
    
    return edges


def compute_route(G: nx.MultiDiGraph, edges: gpd.GeoDataFrame, start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> List[int]:
    """Run Dijkstra on the graph with pre-computed edge weights."""
    # Memory monitoring: before copy
    memory_before = _get_memory_usage_mb()
    if memory_before > 0:
        logger.debug(f"[MEMORY] compute_route: Before copy: {memory_before:.1f} MB")
    
    # Create a shallow copy of the graph to avoid modifying the cached graph
    # Shallow copy only copies graph structure, not underlying data (~10x lighter than deepcopy)
    # Since we only modify edge weights (not structure), shallow copy is safe
    G = G.copy()
    
    # Memory monitoring: after copy
    memory_after_copy = _get_memory_usage_mb()
    if memory_after_copy > 0 and memory_before > 0:
        logger.debug(f"[MEMORY] compute_route: After copy: {memory_after_copy:.1f} MB (delta: +{memory_after_copy - memory_before:.1f} MB)")
    
    orig = ox.distance.nearest_nodes(G, start_lon, start_lat)
    dest = ox.distance.nearest_nodes(G, end_lon, end_lat)
    
    # Check if nodes are in the graph
    if orig not in G:
        raise ValueError(f"Start node {orig} not found in graph (graph has {len(G)} nodes)")
    if dest not in G:
        raise ValueError(f"End node {dest} not found in graph (graph has {len(G)} nodes)")
    
    # Check if nodes are in the same connected component
    if not nx.is_strongly_connected(G):
        # Find strongly connected components
        components = list(nx.strongly_connected_components(G))
        orig_component = None
        dest_component = None
        for i, comp in enumerate(components):
            if orig in comp:
                orig_component = i
            if dest in comp:
                dest_component = i
        
        if orig_component != dest_component:
            logger.warning(f"Start node {orig} and end node {dest} are in different connected components")
            logger.warning(f"Graph has {len(components)} strongly connected components")
            logger.warning(f"Start node in component {orig_component} (size: {len(components[orig_component]) if orig_component is not None else 0})")
            logger.warning(f"End node in component {dest_component} (size: {len(components[dest_component]) if dest_component is not None else 0})")

    # Create weight lookup from edges GeoDataFrame
    # Handle both MultiIndex and regular index formats
    weight_lookup = {}
    edges_index = edges.index
    
    # Check if index is MultiIndex (OSMnx format)
    if isinstance(edges_index, pd.MultiIndex):
        # MultiIndex: keys are tuples (u, v, key)
        for idx in edges_index:
            weight_lookup[idx] = edges.loc[idx, "final_weight"]
    else:
        # Regular index: use to_dict() which should work
        weight_lookup = edges["final_weight"].to_dict()
    
    # Apply weights to graph edges
    weights_found = 0
    weights_missing = 0
    for u, v, k, data in G.edges(keys=True, data=True):
        edge_key = (u, v, k)
        if edge_key in weight_lookup:
            data["weight"] = weight_lookup[edge_key]
            weights_found += 1
        else:
            # Try reverse direction
            reverse_key = (v, u, k)
            if reverse_key in weight_lookup:
                data["weight"] = weight_lookup[reverse_key]
                weights_found += 1
            else:
                # Default to 1.0 if not found
                data["weight"] = 1.0
                weights_missing += 1
    
    if weights_missing > 0:
        logger.warning(f"compute_route: {weights_missing} edges not found in weight_lookup out of {weights_found + weights_missing} total")
        logger.debug(f"compute_route: weight_lookup has {len(weight_lookup)} entries, edges index type={type(edges_index)}")
        if len(weight_lookup) > 0:
            sample_key = list(weight_lookup.keys())[0]
            logger.debug(f"compute_route: sample weight_lookup key={sample_key}, type={type(sample_key)}")

    path = nx.shortest_path(G, orig, dest, weight="weight")
    
    # Clean up the copied graph to free memory
    del G
    gc.collect()
    
    # Memory monitoring: after cleanup
    memory_after_cleanup = _get_memory_usage_mb()
    if memory_after_cleanup > 0 and memory_after_copy > 0:
        logger.debug(f"[MEMORY] compute_route: After cleanup: {memory_after_cleanup:.1f} MB (freed: {memory_after_copy - memory_after_cleanup:.1f} MB)")
    
    return path


def compute_shortest_route(G: nx.MultiDiGraph, edges: gpd.GeoDataFrame, start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> List[int]:
    """Compute shortest route by distance only (no shadow weights)."""
    # Memory monitoring: before copy
    memory_before = _get_memory_usage_mb()
    if memory_before > 0:
        logger.debug(f"[MEMORY] compute_shortest_route: Before copy: {memory_before:.1f} MB")
    
    # Create a shallow copy of the graph to avoid modifying the cached graph
    # Shallow copy only copies graph structure, not underlying data (~10x lighter than deepcopy)
    # Since we only modify edge weights (not structure), shallow copy is safe
    G = G.copy()
    
    # Memory monitoring: after copy
    memory_after_copy = _get_memory_usage_mb()
    if memory_after_copy > 0 and memory_before > 0:
        logger.debug(f"[MEMORY] compute_shortest_route: After copy: {memory_after_copy:.1f} MB (delta: +{memory_after_copy - memory_before:.1f} MB)")
    
    orig = ox.distance.nearest_nodes(G, start_lon, start_lat)
    dest = ox.distance.nearest_nodes(G, end_lon, end_lat)
    
    # Check if nodes are in the graph
    if orig not in G:
        raise ValueError(f"Start node {orig} not found in graph (graph has {len(G)} nodes)")
    if dest not in G:
        raise ValueError(f"End node {dest} not found in graph (graph has {len(G)} nodes)")
    
    # Check if nodes are in the same connected component
    if not nx.is_strongly_connected(G):
        # Find strongly connected components
        components = list(nx.strongly_connected_components(G))
        orig_component = None
        dest_component = None
        for i, comp in enumerate(components):
            if orig in comp:
                orig_component = i
            if dest in comp:
                dest_component = i
        
        if orig_component != dest_component:
            logger.warning(f"Start node {orig} and end node {dest} are in different connected components")
            logger.warning(f"Graph has {len(components)} strongly connected components")
            logger.warning(f"Start node in component {orig_component} (size: {len(components[orig_component]) if orig_component is not None else 0})")
            logger.warning(f"End node in component {dest_component} (size: {len(components[dest_component]) if dest_component is not None else 0})")
    
    # Use edge length as weight (convert to meters)
    edges_m = edges.to_crs(epsg=3857)
    length_lookup = {idx: geom.length for idx, geom in zip(edges_m.index, edges_m.geometry)}
    
    for u, v, k, data in G.edges(keys=True, data=True):
        edge_idx = (u, v, k)
        if edge_idx in length_lookup:
            data["weight"] = length_lookup[edge_idx]
        else:
            # Fallback: use straight-line distance
            u_node = G.nodes[u]
            v_node = G.nodes[v]
            from shapely.geometry import Point
            p1 = Point(u_node["x"], u_node["y"])
            p2 = Point(v_node["x"], v_node["y"])
            p1_m = gpd.GeoSeries([p1], crs="EPSG:4326").to_crs(epsg=3857).iloc[0]
            p2_m = gpd.GeoSeries([p2], crs="EPSG:4326").to_crs(epsg=3857).iloc[0]
            data["weight"] = p1_m.distance(p2_m)
    
    path = nx.shortest_path(G, orig, dest, weight="weight")
    
    # Clean up the copied graph to free memory
    del G
    gc.collect()
    
    # Memory monitoring: after cleanup
    memory_after_cleanup = _get_memory_usage_mb()
    if memory_after_cleanup > 0 and memory_after_copy > 0:
        logger.debug(f"[MEMORY] compute_shortest_route: After cleanup: {memory_after_cleanup:.1f} MB (freed: {memory_after_copy - memory_after_cleanup:.1f} MB)")
    
    return path


@dataclass
class RouteSummary:
    coords: List[Tuple[float, float]]
    total_length_m: float
    shadow_ratio: float
    segments: List[Dict]


def summarize_route(G: nx.MultiDiGraph, edges: gpd.GeoDataFrame, route_nodes: List[int]) -> RouteSummary:
    """Build coordinate polyline, shade ratio, and shaded segments metadata."""
    import logging
    logger = logging.getLogger(__name__)
    
    edges_index = edges.index
    # Log index type for debugging
    logger.debug(f"summarize_route: edges index type={type(edges_index)}, index length={len(edges_index)}, has shade_weight={('shade_weight' in edges.columns)}")
    if len(edges_index) > 0:
        logger.debug(f"summarize_route: first index entry={edges_index[0]}, type={type(edges_index[0])}")
    
    # Check if edges has shade_weight column
    if "shade_weight" not in edges.columns:
        logger.warning("edges GeoDataFrame missing 'shade_weight' column, defaulting to 0.0")
        edges = edges.copy()
        edges["shade_weight"] = 0.0
    else:
        # Log some shade_weight statistics
        shade_weights = edges["shade_weight"]
        logger.debug(f"summarize_route: shade_weight stats - min={shade_weights.min():.3f}, max={shade_weights.max():.3f}, mean={shade_weights.mean():.3f}, non-zero count={(shade_weights > 0).sum()}/{len(shade_weights)}")

    coords: List[Tuple[float, float]] = []
    total_length = 0.0
    shaded_length = 0.0
    segments: List[Dict] = []
    edges_found = 0
    edges_not_found = 0

    for (u, v) in pairwise(route_nodes):
        # Determine key (assume first key when multiple)
        data = G.get_edge_data(u, v)
        if not data:
            continue
        key = list(data.keys())[0]
        geom = data[key].get("geometry")
        if geom is None:
            geom = LineString(
                [
                    (G.nodes[u]["x"], G.nodes[u]["y"]),
                    (G.nodes[v]["x"], G.nodes[v]["y"]),
                ]
            )
        line = geom
        coords_segment = list(line.coords)

        if not coords:
            coords.extend(coords_segment)
        else:
            coords.extend(coords_segment[1:])

        edge_idx = (u, v, key)
        if edge_idx not in edges_index:
            # Mirror direction if needed
            reverse_idx = (v, u, key)
            if reverse_idx in edges_index:
                shade_weight = edges.loc[reverse_idx]["shade_weight"]
                edges_found += 1
            else:
                shade_weight = 0.0
                edges_not_found += 1
                logger.debug(f"Edge not found in edges index: {edge_idx}, reverse: {reverse_idx}")
            # Convert to meters for length calculation (line is in EPSG:4326)
            line_gdf = gpd.GeoDataFrame({"geometry": [line]}, crs="EPSG:4326")
            length = line_gdf.to_crs(epsg=3857).geometry.iloc[0].length
        else:
            shade_weight = edges.loc[edge_idx]["shade_weight"]
            edges_found += 1
            # Convert edge geometry to meters (edges are in EPSG:4326)
            edge_geom = edges.loc[edge_idx].geometry
            edge_gdf = gpd.GeoDataFrame({"geometry": [edge_geom]}, crs=edges.crs)
            length = edge_gdf.to_crs(epsg=3857).geometry.iloc[0].length

        total_length += length
        shaded_length += length * shade_weight

        segments.append(
            {
                "coords": coords_segment,
                "is_shaded": shade_weight >= 0.5,
                "shade_fraction": shade_weight,
            }
        )

    if edges_not_found > 0:
        logger.warning(f"summarize_route: {edges_not_found} edges not found in edges index out of {edges_found + edges_not_found} total")
    
    # Log average shade_weight for debugging
    if segments:
        avg_shade_weight = sum(s["shade_fraction"] for s in segments) / len(segments)
        logger.debug(f"summarize_route: average shade_weight={avg_shade_weight:.3f}, total_length={total_length:.1f}m, shaded_length={shaded_length:.1f}m")

    shadow_ratio = shaded_length / total_length if total_length else 0.0
    return RouteSummary(coords=coords, total_length_m=total_length, shadow_ratio=shadow_ratio, segments=segments)

