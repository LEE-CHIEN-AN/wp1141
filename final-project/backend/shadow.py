from __future__ import annotations

import numpy as np
import pandas as pd
import pvlib
from geopandas import GeoDataFrame
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.ops import unary_union

from .config import get_settings


def compute_solar_position(lat: float, lon: float, timestamp: pd.Timestamp):
    """Return solar azimuth and elevation for given location/time."""
    settings = get_settings()
    loc = pvlib.location.Location(lat, lon, tz=settings.timezone)

    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize(settings.timezone)

    solpos = loc.get_solarposition(timestamp)
    azimuth = float(solpos["azimuth"].iloc[0])
    altitude = float(solpos["apparent_elevation"].iloc[0])
    return azimuth, altitude


def _project_shadow_polygon(building, height: float, azimuth: float, altitude: float, max_shadow_length_m: float = 500.0):
    """
    Project a building geometry (Polygon or MultiPolygon) into a 2D ground shadow polygon.
    
    For MultiPolygon, projects each component polygon and unions the results.
    
    Parameters
    ----------
    building : Polygon or MultiPolygon
        Building footprint geometry
    height : float
        Building height in meters
    azimuth : float
        Solar azimuth angle in degrees
    altitude : float
        Solar altitude/elevation angle in degrees
    max_shadow_length_m : float
        Maximum shadow length in meters to prevent infinite shadows at low sun angles
    """
    # Dynamic minimum altitude threshold based on building height
    # Taller buildings need higher sun angle to avoid extremely long shadows
    # Lowered thresholds to allow more shadows during early morning/late afternoon
    MIN_ALTITUDE_DEGREES = max(1.0, min(5.0, 2.0 + height / 30.0))  # 1-5 degrees based on height (more lenient)
    if altitude <= 0:
        return None
    # Allow shadows even if slightly below threshold, but they'll be capped by max_shadow_length_m
    # if altitude < MIN_ALTITUDE_DEGREES:
    #     return None

    # Handle MultiPolygon by processing each component
    if isinstance(building, MultiPolygon):
        shadow_parts = []
        for poly in building.geoms:
            part_shadow = _project_shadow_polygon(poly, height, azimuth, altitude, max_shadow_length_m)
            if part_shadow is not None and not part_shadow.is_empty:
                shadow_parts.append(part_shadow)
        if not shadow_parts:
            return None
        return unary_union(shadow_parts)
    
    # Handle single Polygon
    if not isinstance(building, Polygon):
        return None
    
    # Calculate building area for filtering
    building_area = building.area
    
    # Calculate shadow length with more conservative limits at low angles
    # Use a more aggressive cap when altitude is very low
    shadow_len = height / np.tan(np.radians(altitude))
    
    # Progressive reduction of max shadow length at low angles
    if altitude < 10:
        # At very low angles, use a much smaller max shadow length
        max_len_at_angle = max_shadow_length_m * (altitude / 10.0) * 0.5
        shadow_len = min(shadow_len, max_len_at_angle)
    else:
        shadow_len = min(shadow_len, max_shadow_length_m)
    
    angle = np.radians(azimuth + 180)  # opposite of sun direction
    dx = shadow_len * np.sin(angle)
    dy = shadow_len * np.cos(angle)

    shadow_tip = Polygon([(x + dx, y + dy) for x, y in building.exterior.coords])
    shadow_poly = unary_union([building, shadow_tip]).convex_hull
    
    # Filter out shadows that are too large relative to building
    # Shadow should not be more than 20x the building area (reasonable limit)
    shadow_area = shadow_poly.area
    if building_area > 0 and shadow_area > building_area * 20:
        return None
    
    return shadow_poly


def project_shadows(
    buildings: GeoDataFrame, 
    lat: float, 
    lon: float, 
    timestamp: pd.Timestamp,
    bounding_box: Polygon | None = None,
    max_shadow_length_m: float = 500.0
) -> GeoDataFrame:
    """
    Compute shadows for every building footprint.
    
    Parameters
    ----------
    buildings : GeoDataFrame
        Building footprints with height column
    lat : float
        Latitude for solar position calculation
    lon : float
        Longitude for solar position calculation
    timestamp : pd.Timestamp
        Time for shadow calculation
    bounding_box : Polygon, optional
        Bounding box to clip shadows to (in EPSG:4326). If provided, shadows will be clipped to this area.
    max_shadow_length_m : float
        Maximum shadow length in meters to prevent infinite shadows at low sun angles
    
    Returns
    -------
    GeoDataFrame
        Shadow polygons. Returns empty GeoDataFrame if sun is below horizon or too low.
    """
    settings = get_settings()

    import logging
    logger = logging.getLogger(__name__)
    
    azimuth, altitude = compute_solar_position(lat, lon, timestamp)
    
    # Log solar position for debugging
    logger.info(f"Solar position: altitude={altitude:.2f}°, azimuth={azimuth:.2f}° for lat={lat:.6f}, lon={lon:.6f}, time={timestamp.isoformat()}")
    
    # More conservative minimum altitude threshold
    # At dawn/dusk, shadows become unreliable and too long
    # Lowered to 2.0 degrees to allow shadows during early morning/late afternoon
    MIN_ALTITUDE_DEGREES = 2.0  # Allow shadows when sun is at least 2 degrees above horizon
    if altitude <= 0:
        logger.warning(f"Sun is below horizon (altitude={altitude:.2f}°) - returning empty shadows")
        return GeoDataFrame(columns=["geometry"], crs="EPSG:4326")
    elif altitude < MIN_ALTITUDE_DEGREES:
        logger.warning(f"Sun altitude {altitude:.2f}° is below minimum threshold {MIN_ALTITUDE_DEGREES}° - shadows may be unreliable, but computing anyway")
        # Continue processing but shadows will be very long and may be filtered

    bld_m = buildings.to_crs(epsg=3857)
    
    # Convert bounding box to meters if provided
    bbox_m = None
    if bounding_box is not None:
        bbox_gdf = GeoDataFrame({"geometry": [bounding_box]}, crs="EPSG:4326")
        bbox_m = bbox_gdf.to_crs(epsg=3857).geometry.iloc[0]
    
    geometries = []
    shadows_filtered = 0
    shadows_clipped = 0
    shadows_simplified = 0
    for _, row in bld_m.iterrows():
        shadow = _project_shadow_polygon(
            row.geometry, 
            row.get("height", settings.default_height_m), 
            azimuth, 
            altitude,
            max_shadow_length_m
        )
        if shadow and not shadow.is_empty:
            # Clip shadow to bounding box if provided
            if bbox_m is not None:
                try:
                    shadow = shadow.intersection(bbox_m)
                    if shadow.is_empty:
                        shadows_clipped += 1
                        continue
                except Exception:
                    # If intersection fails, skip this shadow
                    shadows_filtered += 1
                    continue
            
            # Simplify shadow polygon to reduce complexity (tolerance in meters)
            # This helps with rendering performance and reduces visual clutter
            try:
                # Simplify with a tolerance of 2 meters
                shadow = shadow.simplify(2.0, preserve_topology=True)
                if shadow.is_empty:
                    shadows_simplified += 1
                    continue
            except Exception:
                # If simplification fails, use original
                pass
            
            geometries.append(shadow)
    
    if not geometries:
        if len(bld_m) > 0:
            logger.warning(f"No valid shadows generated from {len(bld_m)} buildings. Filtered: {shadows_filtered}, clipped: {shadows_clipped}, simplified: {shadows_simplified}")
        return GeoDataFrame(columns=["geometry"], crs="EPSG:4326")
    
    shadow_gdf = GeoDataFrame({"geometry": geometries}, crs=bld_m.crs)
    logger.info(f"Generated {len(geometries)} shadow polygons from {len(bld_m)} buildings (filtered: {shadows_filtered}, clipped: {shadows_clipped}, simplified: {shadows_simplified})")
    return shadow_gdf.to_crs(epsg=4326)

