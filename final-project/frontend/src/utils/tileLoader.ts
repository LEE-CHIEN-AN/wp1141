import type { FeatureCollection } from 'geojson';
import type { LngLatBounds } from 'mapbox-gl';
import tileMetadata from './tileMetadata.json';

/**
 * Tile metadata type
 */
type TileMetadata = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  featureCount: number;
};

/**
 * Available tile IDs based on metadata
 */
const AVAILABLE_TILES = Object.keys(tileMetadata) as string[];

/**
 * Get metadata for a tile
 */
function getTileMetadata(tileId: string): TileMetadata | null {
  return (tileMetadata as Record<string, TileMetadata>)[tileId] || null;
}

/**
 * Check if two bounding boxes intersect
 */
function boundsIntersect(
  bounds1: { minLon: number; minLat: number; maxLon: number; maxLat: number },
  bounds2: { minLon: number; minLat: number; maxLon: number; maxLat: number },
  buffer: number = 0
): boolean {
  return (
    bounds1.minLon - buffer <= bounds2.maxLon + buffer &&
    bounds1.maxLon + buffer >= bounds2.minLon - buffer &&
    bounds1.minLat - buffer <= bounds2.maxLat + buffer &&
    bounds1.maxLat + buffer >= bounds2.minLat - buffer
  );
}

/**
 * Check if a tile's bounds intersect with the map viewport
 */
function shouldLoadTile(
  tileId: string,
  bounds: LngLatBounds,
  loadedTiles: Set<string>,
  zoom: number = 16
): boolean {
  // Don't reload already loaded tiles
  if (loadedTiles.has(tileId)) return false;

  const tileMeta = getTileMetadata(tileId);
  if (!tileMeta) return false;

  const viewportBounds = {
    minLon: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLon: bounds.getEast(),
    maxLat: bounds.getNorth(),
  };

  const tileBounds = {
    minLon: tileMeta.minLon,
    minLat: tileMeta.minLat,
    maxLon: tileMeta.maxLon,
    maxLat: tileMeta.maxLat,
  };

  // Add a buffer to preload nearby tiles
  // Buffer decreases with zoom level: higher zoom = smaller buffer (more precise)
  // At zoom 16: ~0.005 degrees ≈ 500m
  // At zoom 18: ~0.002 degrees ≈ 200m
  const buffer = zoom >= 18 ? 0.002 : zoom >= 16 ? 0.005 : 0.01;
  return boundsIntersect(viewportBounds, tileBounds, buffer);
}

/**
 * Check if a tile should be unloaded (no longer in viewport)
 */
export function shouldUnloadTile(
  tileId: string,
  bounds: LngLatBounds,
  zoom: number = 16,
  buffer?: number // If undefined, uses adaptive buffer based on zoom
): boolean {
  const tileMeta = getTileMetadata(tileId);
  if (!tileMeta) return false;

  const viewportBounds = {
    minLon: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLon: bounds.getEast(),
    maxLat: bounds.getNorth(),
  };

  const tileBounds = {
    minLon: tileMeta.minLon,
    minLat: tileMeta.minLat,
    maxLon: tileMeta.maxLon,
    maxLat: tileMeta.maxLat,
  };

  // Use adaptive buffer if not specified
  // Larger buffer for unloading prevents flickering when user pans back
  const unloadBuffer = buffer ?? (zoom >= 18 ? 0.005 : zoom >= 16 ? 0.015 : 0.02);

  // Unload if tile doesn't intersect with viewport (even with buffer)
  return !boundsIntersect(viewportBounds, tileBounds, unloadBuffer);
}

/**
 * Load a single tile's GeoJSON data
 */
async function loadTile(tileId: string): Promise<FeatureCollection | null> {
  try {
    const response = await fetch(`/data/${tileId}.json`);
    if (!response.ok) {
      console.warn(`Failed to load tile ${tileId}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Error loading tile ${tileId}:`, error);
    return null;
  }
}

/**
 * Merge multiple FeatureCollections into one
 */
function mergeFeatureCollections(
  collections: FeatureCollection[]
): FeatureCollection {
  const allFeatures = collections.flatMap((fc) => fc.features);
  return {
    type: 'FeatureCollection',
    features: allFeatures,
  };
}

/**
 * Load tiles that intersect with the current map bounds
 */
export async function loadTilesForBounds(
  bounds: LngLatBounds,
  loadedTiles: Set<string>,
  zoom: number = 16
): Promise<{
  data: FeatureCollection | null;
  newTiles: string[];
}> {
  const tilesToLoad: string[] = [];

  // Determine which tiles to load
  for (const tileId of AVAILABLE_TILES) {
    if (shouldLoadTile(tileId, bounds, loadedTiles, zoom)) {
      tilesToLoad.push(tileId);
    }
  }

  if (tilesToLoad.length === 0) {
    return { data: null, newTiles: [] };
  }

  console.log(`Loading ${tilesToLoad.length} tiles: ${tilesToLoad.join(', ')}`);

  // Load all tiles in parallel
  const tileData = await Promise.all(
    tilesToLoad.map((tileId) => loadTile(tileId))
  );

  // Filter out null results and merge
  const validCollections = tileData.filter(
    (fc): fc is FeatureCollection => fc !== null
  );

  if (validCollections.length === 0) {
    return { data: null, newTiles: [] };
  }

  const merged = mergeFeatureCollections(validCollections);
  console.log(`Loaded ${merged.features.length} building features from ${validCollections.length} tiles`);
  return { data: merged, newTiles: tilesToLoad };
}

/**
 * Get tile IDs that should be unloaded based on current viewport
 */
export function getTilesToUnload(
  bounds: LngLatBounds,
  loadedTiles: Set<string>,
  zoom: number = 16
): string[] {
  const tilesToUnload: string[] = [];
  
  for (const tileId of loadedTiles) {
    if (shouldUnloadTile(tileId, bounds, zoom)) {
      tilesToUnload.push(tileId);
    }
  }
  
  return tilesToUnload;
}

