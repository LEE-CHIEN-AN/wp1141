/**
 * Utility functions for expanding viewport bounds with buffers
 * to improve loading smoothness and prevent flickering
 */

export type ViewportBounds = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  zoom: number;
};

/**
 * Expand viewport bounds by a percentage buffer
 * 
 * @param bounds - Original viewport bounds
 * @param bufferPercent - Buffer percentage (0.1 = 10% expansion on each side)
 * @returns Expanded bounds
 */
export function expandBounds(
  bounds: ViewportBounds,
  bufferPercent: number = 0.2
): ViewportBounds {
  const lonRange = bounds.maxLon - bounds.minLon;
  const latRange = bounds.maxLat - bounds.minLat;
  
  const lonBuffer = lonRange * bufferPercent;
  const latBuffer = latRange * bufferPercent;
  
  return {
    minLon: bounds.minLon - lonBuffer,
    minLat: bounds.minLat - latBuffer,
    maxLon: bounds.maxLon + lonBuffer,
    maxLat: bounds.maxLat + latBuffer,
    zoom: bounds.zoom,
  };
}

/**
 * Expand viewport bounds by a fixed degree buffer
 * 
 * @param bounds - Original viewport bounds
 * @param bufferDegrees - Buffer in degrees (approximately 0.01 degrees ≈ 1km at equator)
 * @returns Expanded bounds
 */
export function expandBoundsByDegrees(
  bounds: ViewportBounds,
  bufferDegrees: number = 0.01
): ViewportBounds {
  return {
    minLon: bounds.minLon - bufferDegrees,
    minLat: bounds.minLat - bufferDegrees,
    maxLon: bounds.maxLon + bufferDegrees,
    maxLat: bounds.maxLat + bufferDegrees,
    zoom: bounds.zoom,
  };
}

/**
 * Get buffer size based on zoom level
 * Higher zoom = smaller buffer (more precise)
 * Lower zoom = larger buffer (more area covered)
 */
export function getAdaptiveBuffer(zoom: number): number {
  if (zoom >= 18) return 0.1; // 10% at high zoom
  if (zoom >= 16) return 0.2; // 20% at medium zoom
  if (zoom >= 14) return 0.3; // 30% at low zoom
  return 0.4; // 40% at very low zoom
}

/**
 * Expand bounds with adaptive buffer based on zoom level
 */
export function expandBoundsAdaptive(bounds: ViewportBounds): ViewportBounds {
  const bufferPercent = getAdaptiveBuffer(bounds.zoom);
  return expandBounds(bounds, bufferPercent);
}

