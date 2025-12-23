import type { FeatureCollection, LineString } from 'geojson';
import type { RouteResponse } from '@/types/route';

/**
 * Compute shadow ratio for a route polyline using shadow polygons.
 * 
 * This samples points along the route and checks which points intersect
 * with shadow polygons to calculate the shadow coverage ratio.
 * 
 * @param routePolyline - Array of [lat, lon] coordinates for the route
 * @param shadowData - GeoJSON FeatureCollection of shadow polygons
 * @param sampleSpacingMeters - Distance between sample points (default: 10m)
 * @returns Shadow ratio (0.0 to 1.0)
 */
export function computeRouteShadowRatio(
  routePolyline: [number, number][],
  shadowData: FeatureCollection | null,
  sampleSpacingMeters: number = 10
): number {
  if (!shadowData || shadowData.features.length === 0 || routePolyline.length < 2) {
    return 0.0;
  }

  // Convert route polyline to LineString
  // Note: routePolyline is [lat, lon] but GeoJSON uses [lon, lat]
  const coordinates = routePolyline.map(([lat, lon]) => [lon, lat]);
  
  // Sample points along the route
  const samples: number[][] = [];
  let totalLength = 0;
  
  for (let i = 0; i < routePolyline.length - 1; i++) {
    const [lat1, lon1] = routePolyline[i];
    const [lat2, lon2] = routePolyline[i + 1];
    
    // Calculate distance between points (Haversine formula, simplified)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = 6371000 * c; // Earth radius in meters
    
    totalLength += distanceMeters;
    
    // Sample points along this segment
    const numSamples = Math.max(1, Math.floor(distanceMeters / sampleSpacingMeters));
    for (let j = 0; j <= numSamples; j++) {
      const t = numSamples > 0 ? j / numSamples : 0.5;
      const lat = lat1 + (lat2 - lat1) * t;
      const lon = lon1 + (lon2 - lon1) * t;
      samples.push([lon, lat]); // GeoJSON format: [lon, lat]
    }
  }
  
  if (samples.length === 0) {
    return 0.0;
  }
  
  // Check which samples are in shadow polygons
  let shadedSamples = 0;
  
  for (const sample of samples) {
    const [lon, lat] = sample;
    
    // Check if this point is inside any shadow polygon
    for (const feature of shadowData.features) {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        if (isPointInPolygon([lon, lat], feature.geometry)) {
          shadedSamples++;
          break; // Point is shaded, no need to check other polygons
        }
      }
    }
  }
  
  return shadedSamples / samples.length;
}

/**
 * Check if a point is inside a polygon (using ray casting algorithm).
 * 
 * @param point - [lon, lat] coordinates
 * @param geometry - GeoJSON Polygon or MultiPolygon geometry
 * @returns true if point is inside polygon
 */
function isPointInPolygon(
  point: [number, number],
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
): boolean {
  const [lon, lat] = point;
  
  if (geometry.type === 'Polygon') {
    return isPointInPolygonCoordinates(lon, lat, geometry.coordinates as number[][][]);
  } else if (geometry.type === 'MultiPolygon') {
    // Check if point is in any polygon
    for (const polygon of geometry.coordinates as number[][][][]) {
      if (isPointInPolygonCoordinates(lon, lat, polygon)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Ray casting algorithm to check if point is inside polygon.
 */
function isPointInPolygonCoordinates(
  lon: number,
  lat: number,
  coordinates: number[][][]
): boolean {
  // Use the first ring (exterior ring)
  const ring = coordinates[0];
  if (!ring || ring.length < 3) {
    return false;
  }
  
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    
    const intersect = 
      ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) {
      inside = !inside;
    }
  }
  
  return inside;
}

