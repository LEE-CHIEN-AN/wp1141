import { useEffect, useRef, useState, useCallback } from 'react';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Info, MapPin, AlertTriangle } from 'lucide-react';

import type { RouteResponse } from '@/types/route';
import { loadTilesForBounds, getTilesToUnload } from '@/utils/tileLoader';
import { haversineDistance } from '@/utils/navigation';
import './MapView.css';

const DEFAULT_CENTER: [number, number] = [121.5383267, 25.0179291];

type MapPin = {
  id: string;
  lat: number;
  lon: number;
  label?: string;
};

type MapViewProps = {
  mapboxToken: string;
  buildingsEnabled: boolean;
  shadowsEnabled: boolean;
  // buildingData is now managed internally via tiling
  shadowData: FeatureCollection | null;
  routeData: RouteResponse | null;
  shortestRoute: RouteResponse | null;
  layoutKey?: string;
  selectedPlace?: { lat: number; lon: number; name: string } | null;
  onViewportChange?: (bounds: { minLon: number; minLat: number; maxLon: number; maxLat: number; zoom: number }) => void;
  routeTime?: string;
  routeStart?: { lat: number; lon: number } | null;
  routeEnd?: { lat: number; lon: number } | null;
  customPins?: MapPin[];
  onPinAdd?: (pin: MapPin) => void;
  onPinRemove?: (pinId: string) => void;
  onOriginSelect?: (lat: number, lon: number, address: string, placeDetails?: any) => void;
  onDestinationSelect?: (lat: number, lon: number, address: string, placeDetails?: any) => void;
  onExampleClick?: () => void;
  routeCardOpen?: boolean;
};

// Helper function to determine light preset based on time
const getLightPreset = (routeTime: string | undefined): 'day' | 'night' | 'dawn' | 'dusk' => {
  if (!routeTime) return 'day';
  
  const date = new Date(routeTime);
  const hour = date.getHours();
  
  // Determine time of day based on hour
  // Dawn: 5-7 AM
  // Day: 7 AM - 6 PM
  // Dusk: 6-8 PM
  // Night: 8 PM - 5 AM
  if (hour >= 5 && hour < 7) {
    return 'dawn';
  } else if (hour >= 7 && hour < 18) {
    return 'day';
  } else if (hour >= 18 && hour < 20) {
    return 'dusk';
  } else {
    return 'night';
  }
};

function MapView({
  mapboxToken,
  buildingsEnabled,
  shadowsEnabled,
  shadowData,
  routeData,
  shortestRoute,
  layoutKey,
  selectedPlace,
  onViewportChange,
  routeTime,
  routeStart,
  routeEnd,
  customPins = [],
  onPinAdd,
  onPinRemove,
  onOriginSelect,
  onDestinationSelect,
  onExampleClick,
  routeCardOpen = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [selectMode, setSelectMode] = useState<'none' | 'origin' | 'destination'>('none');
  const selectModeRef = useRef<'none' | 'origin' | 'destination'>('none');
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [showInfoHint, setShowInfoHint] = useState(false);
  const [hasSeenInfoHint, setHasSeenInfoHint] = useState(false);
  const [showWarningHint, setShowWarningHint] = useState(false);
  const [hasSeenWarningHint, setHasSeenWarningHint] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasSeenHint, setHasSeenHint] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exampleButtonClickedRef = useRef(false);
  const hintsShownOnLoadRef = useRef(false);
  const loadedTilesRef = useRef<Set<string>>(new Set());
  const tileDataCacheRef = useRef<Map<string, FeatureCollection>>(new Map()); // Cache tile data for unloading
  const buildingDataRef = useRef<FeatureCollection | null>(null);
  const placeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeStartMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeEndMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const customPinsMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const tempOriginMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const tempDestinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lastCenteredPlaceRef = useRef<{ lat: number; lon: number } | null>(null);
  const lastFittedBoundsRef = useRef<{ start: { lat: number; lon: number } | null; end: { lat: number; lon: number } | null }>({ start: null, end: null });

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Validate token before initializing map
    if (!mapboxToken || !mapboxToken.startsWith('pk.')) {
      console.error('[MapView] Invalid Mapbox token:', mapboxToken ? 'Token format incorrect' : 'Token missing');
      return;
    }
    
    mapboxgl.accessToken = mapboxToken;
    const lightPreset = getLightPreset(routeTime);
    
    // Add error handler for map initialization
    const handleError = (e: any) => {
      console.error('[MapView] Map error:', e);
      if (e.error?.message?.includes('token')) {
        console.error('[MapView] Token-related error detected. Check:');
        console.error('  1. Token is set in Vercel environment variables');
        console.error('  2. Token has no URL restrictions (or includes *.vercel.app)');
        console.error('  3. Token has correct scopes for Mapbox Standard style');
        console.error('  4. Application has been redeployed after setting token');
      }
    };
    
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          lightPreset: lightPreset,
          show3dObjects: false, // Hide Mapbox's 3D buildings since we're using our own data
          shadows: false, // Disable Mapbox's built-in shadows - we use our own shadow calculations
        },
      },
      center: DEFAULT_CENTER,
      zoom: 16, // Start at zoom level suitable for walking distance
      pitch: 45, // Slight angle to see 3D buildings better
      bearing: 0,
      antialias: true, // Enable antialiasing for smoother 3D rendering
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const handleStyleLoad = () => {
      setMapLoaded(true);
      setCurrentZoom(map.getZoom());
      console.log('[MapView] Map style loaded successfully');
      
      // Shadows are already disabled via config.shadows: false in map initialization
      // No need to configure light properties - castShadows is not a valid Mapbox GL JS property
      
      // Try to hide any shadow-related layers as a fallback
      const layers = map.getStyle().layers;
      if (layers) {
        for (const layer of layers) {
          const layerId = layer.id.toLowerCase();
          // Hide layers that might be related to shadows
          if (layerId.includes('shadow') || layerId.includes('shade')) {
            try {
              map.setLayoutProperty(layer.id, 'visibility', 'none');
              console.log(`[MapView] Hid shadow-related layer: ${layer.id}`);
            } catch (error) {
              // Layer might not support visibility property
            }
          }
        }
      }
    };

    const handleZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('style.load', handleStyleLoad);
    map.on('zoom', handleZoom);
    map.on('error', handleError);

    mapRef.current = map;
    return () => {
      map.off('style.load', handleStyleLoad);
      map.off('zoom', handleZoom);
      map.off('error', handleError);
      map.remove();
    };
  }, [mapboxToken]);

  // Update light preset when routeTime changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    
    const map = mapRef.current;
    const lightPreset = getLightPreset(routeTime);
    
    try {
      // Update the light preset configuration at runtime
      // Mapbox Standard uses 'basemap' as the import ID
      // @ts-ignore - Mapbox GL JS types may not include setConfig yet
      if (map.setConfig && typeof map.setConfig === 'function') {
        map.setConfig('basemap', {
          lightPreset: lightPreset,
          show3dObjects: false, // Keep Mapbox's 3D buildings hidden
          shadows: false, // Disable Mapbox's built-in shadows - we use our own shadow calculations
        });
        console.log(`Updated map lighting to: ${lightPreset}`);
      } else {
        // Fallback: try alternative API format
        // @ts-ignore
        if (map.setStyle && map.getStyle) {
          const style = map.getStyle();
          if (style.imports) {
            const basemapImport = style.imports.find((imp: any) => imp.id === 'basemap');
            if (basemapImport) {
              basemapImport.config = { ...basemapImport.config, lightPreset: lightPreset };
              // Note: This may require reloading the style, which is not ideal
              console.log(`Light preset updated to: ${lightPreset} (requires style reload)`);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to update light preset:', error);
    }
  }, [mapLoaded, routeTime]);

  // Function to update building data on the map
  const updateBuildingSource = useCallback(
    (data: FeatureCollection | null) => {
      if (!mapLoaded || !mapRef.current) return;
      const map = mapRef.current;

      if (!data || data.features.length === 0) {
        console.warn('No building data to display');
        return;
      }

      // Find a label layer to insert before (like Mapbox example)
      const layers = map.getStyle().layers;

      // Hide any 3D building layers that come from the base Mapbox style,
      // so only our own GeoJSON buildings control the 3D appearance.
      if (layers) {
        for (const layer of layers) {
          const anyLayer = layer as any;
          if (
            layer.type === 'fill-extrusion' &&
            anyLayer['source-layer'] === 'building'
          ) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
      }

      const labelLayer = layers?.find(
        (layer) => layer.type === 'symbol' && 'layout' in layer && layer.layout && 'text-field' in layer.layout
      );
      const beforeId = labelLayer?.id;

      if (!map.getSource('buildings')) {
        map.addSource('buildings', {
          type: 'geojson',
          data: data,
        });
        console.log(`Added buildings source with ${data.features.length} features`);
      } else {
        const source = map.getSource('buildings') as mapboxgl.GeoJSONSource;
        source.setData(data);
        console.log(`Updated buildings source with ${data.features.length} features`);
      }

      if (!map.getLayer('buildings-3d')) {
        try {
          map.addLayer(
            {
            id: 'buildings-3d',
            type: 'fill-extrusion',
            source: 'buildings',
            minzoom: 15,
            paint: {
              // Color buildings by height (meters) using warm palette:
              // E37347, FFA85D, FEC89A, FADFBB, F5F5DC
              'fill-extrusion-color': [
                'step',
                ['get', 'height'],
                '#F5F5DC',   // < 10m  - beige
                10,
                '#FADFBB',   // 10–20m - wheat
                20,
                '#FEC89A',   // 20–40m - peach
                40,
                '#FFA85D',   // 40–60m - sandy brown
                60,
                '#E37347',   // > 60m  - burnt sienna
              ],
              // Smooth building growth effect as user zooms in
              // Buildings grow from 0 at zoom 15 to full height at zoom 18
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.1,
                ['get', 'height'],
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.1,
                0,
              ],
              'fill-extrusion-opacity': 0.8,
            },
              layout: {
                visibility: buildingsEnabled ? 'visible' : 'none',
              },
            },
            beforeId
          );
          console.log('Added buildings-3d layer');
        } catch (error) {
          console.error('Error adding buildings layer:', error);
        }
      } else {
        // Layer already exists: keep data in sync and ensure style stays updated.
        if (map.getLayer('buildings-3d')) {
          // Update visibility
          map.setLayoutProperty(
            'buildings-3d',
            'visibility',
            buildingsEnabled ? 'visible' : 'none'
          );

          // Re-apply paint properties so tweaks to color/height take effect
          // Use the same warm palette as when the layer is first created.
          map.setPaintProperty('buildings-3d', 'fill-extrusion-color', [
            'step',
            ['get', 'height'],
            '#F5F5DC', // < 10m  - beige
            10,
            '#FADFBB', // 10–20m - wheat
            20,
            '#FEC89A', // 20–40m - peach
            40,
            '#FFA85D', // 40–60m - sandy brown
            60,
            '#E37347', // > 60m  - burnt sienna
          ]);

          map.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', 0.8);
        }
      }
    },
    [mapLoaded, buildingsEnabled]
  );

  // Helper function to rebuild building data from cached tiles
  const rebuildBuildingData = useCallback((): FeatureCollection => {
    const allFeatures: Feature[] = [];
    for (const tileData of tileDataCacheRef.current.values()) {
      allFeatures.push(...tileData.features);
    }
    return {
      type: 'FeatureCollection',
      features: allFeatures,
    };
  }, []);

  // Initial tile loading when map first loads
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !buildingsEnabled) return;
    const map = mapRef.current;
    const bounds = map.getBounds();
    if (!bounds) return;

    // Load initial tiles for current viewport
    const zoom = map.getZoom();
    loadTilesForBounds(bounds, loadedTilesRef.current, zoom)
      .then(async ({ data, newTiles }) => {
        if (data && newTiles.length > 0) {
          // Load and cache individual tiles
          const tilePromises = newTiles.map(async (tileId) => {
            try {
              const response = await fetch(`/data/${tileId}.json`);
              if (response.ok) {
                const tileData = await response.json() as FeatureCollection;
                tileDataCacheRef.current.set(tileId, tileData);
                return tileData;
              }
              return null;
            } catch (err) {
              console.warn(`Failed to load tile ${tileId} for caching:`, err);
              return null;
            }
          });
          
          await Promise.all(tilePromises);
          
          // Mark tiles as loaded
          newTiles.forEach((tile) => loadedTilesRef.current.add(tile));
          
          // Rebuild from cached tiles
          const mergedData = rebuildBuildingData();
          buildingDataRef.current = mergedData;
          updateBuildingSource(mergedData);
          
          // Notify parent that viewport is available
          if (onViewportChange) {
            const currentBounds = map.getBounds();
            const zoom = map.getZoom();
            if (currentBounds) {
              onViewportChange({
                minLon: currentBounds.getWest(),
                minLat: currentBounds.getSouth(),
                maxLon: currentBounds.getEast(),
                maxLat: currentBounds.getNorth(),
                zoom: zoom,
              });
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load initial tiles:', err);
      });
  }, [mapLoaded, buildingsEnabled, updateBuildingSource, onViewportChange, rebuildBuildingData]);

  // Notify parent of viewport changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !onViewportChange) return;
    const map = mapRef.current;
    
    let viewportTimeout: number;
    const handleViewportChange = () => {
      clearTimeout(viewportTimeout);
      viewportTimeout = window.setTimeout(() => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        if (bounds && onViewportChange) {
          onViewportChange({
            minLon: bounds.getWest(),
            minLat: bounds.getSouth(),
            maxLon: bounds.getEast(),
            maxLat: bounds.getNorth(),
            zoom: zoom,
          });
        }
      }, 300); // Debounce viewport changes
    };
    
    map.on('moveend', handleViewportChange);
    map.on('zoomend', handleViewportChange);
    
    return () => {
      clearTimeout(viewportTimeout);
      map.off('moveend', handleViewportChange);
      map.off('zoomend', handleViewportChange);
    };
  }, [mapLoaded, onViewportChange]);

  // Dynamic tile loading and unloading on map move/zoom
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !buildingsEnabled) return;
    const map = mapRef.current;

    let loadingTimeout: number;
    const handleMapMove = async () => {
      // Debounce tile loading/unloading
      clearTimeout(loadingTimeout);
      loadingTimeout = window.setTimeout(async () => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        if (!bounds) return;
        
        // Check for tiles to unload
        const tilesToUnload = getTilesToUnload(bounds, loadedTilesRef.current, zoom);
        if (tilesToUnload.length > 0) {
          console.log(`Unloading ${tilesToUnload.length} tiles: ${tilesToUnload.join(', ')}`);
          
          // Remove from loaded set
          tilesToUnload.forEach((tileId) => {
            loadedTilesRef.current.delete(tileId);
            tileDataCacheRef.current.delete(tileId);
          });
          
          // Rebuild building data from remaining cached tiles
          const remainingData = rebuildBuildingData();
          buildingDataRef.current = remainingData;
          updateBuildingSource(remainingData);
        }
        
        // Load new tiles
        const { data, newTiles } = await loadTilesForBounds(
          bounds,
          loadedTilesRef.current,
          zoom
        );

        if (data && newTiles.length > 0) {
          // Load individual tiles and cache them
          const tilePromises = newTiles.map(async (tileId) => {
            try {
              const response = await fetch(`/data/${tileId}.json`);
              if (response.ok) {
                const tileData = await response.json() as FeatureCollection;
                tileDataCacheRef.current.set(tileId, tileData);
                return tileData;
              }
              return null;
            } catch (err) {
              console.warn(`Failed to load tile ${tileId} for caching:`, err);
              return null;
            }
          });
          
          const loadedTileData = await Promise.all(tilePromises);
          const validTiles = loadedTileData.filter((tile): tile is FeatureCollection => tile !== null);
          
          // Mark tiles as loaded
          newTiles.forEach((tile) => loadedTilesRef.current.add(tile));
          
          // Rebuild from all cached tiles
          const mergedData = rebuildBuildingData();
          buildingDataRef.current = mergedData;
          updateBuildingSource(mergedData);
        }
      }, 500); // 500ms debounce
    };

    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);

    return () => {
      clearTimeout(loadingTimeout);
      map.off('moveend', handleMapMove);
      map.off('zoomend', handleMapMove);
    };
  }, [mapLoaded, buildingsEnabled, updateBuildingSource, rebuildBuildingData]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    
    // Only display shadows if buildings layer exists (buildings are loaded)
    if (!map.getLayer('buildings-3d')) {
      console.log('Waiting for buildings layer before displaying shadows');
      return;
    }
    
    if (!shadowData) {
      // Remove shadow layer if no data
      if (map.getLayer('shadows-layer')) {
        map.removeLayer('shadows-layer');
      }
      if (map.getSource('shadows')) {
        map.removeSource('shadows');
      }
      return;
    }

    // Add or update shadow source
    if (!map.getSource('shadows')) {
      map.addSource('shadows', {
        type: 'geojson',
        data: shadowData,
      });
    } else {
      const shadowSource = map.getSource('shadows') as mapboxgl.GeoJSONSource | undefined;
      shadowSource?.setData(shadowData);
    }

    // Add shadow layer before buildings layer (below buildings)
    if (!map.getLayer('shadows-layer')) {
      // Find a good insertion point - before buildings layer
      const buildingsLayerId = 'buildings-3d';
      
      map.addLayer(
        {
          id: 'shadows-layer',
          type: 'fill',
          source: 'shadows',
          paint: {
            'fill-color': '#000000',
            'fill-opacity': 0.15, // Binary: fully opaque (shadow or no shadow)
          },
        },
        buildingsLayerId // Insert before buildings layer (shadows render below)
      );
    } else {
      // Update opacity if layer already exists
      map.setPaintProperty('shadows-layer', 'fill-opacity', 0.15);
    }

    // Update visibility based on zoom level and toggle state
    // Hide shadows when zoom < 15, show when zoom >= 15 and shadowsEnabled
    if (map.getLayer('shadows-layer')) {
      const shouldShow = shadowsEnabled && currentZoom >= 15;
      map.setLayoutProperty(
        'shadows-layer',
        'visibility',
        shouldShow ? 'visible' : 'none'
      );
      // Ensure opacity is set correctly (binary: fully opaque)
      map.setPaintProperty('shadows-layer', 'fill-opacity', 0.15);
    }
  }, [mapLoaded, shadowData, shadowsEnabled, currentZoom]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    if (map.getLayer('route-outline-layer')) {
      map.removeLayer('route-outline-layer');
    }
    if (map.getLayer('route-layer')) {
      map.removeLayer('route-layer');
    }
    if (map.getSource('route')) {
      map.removeSource('route');
    }

    if (!routeData) return;

    const features: Feature<LineString>[] = routeData.shadow_segments.map((segment, idx) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: segment.polyline.map(([lat, lon]) => [lon, lat]),
      },
      properties: {
        is_shaded: segment.is_shaded,
        shade_fraction: segment.shade_fraction,
        id: idx,
      },
    }));

    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
    });

    // Add white outline layer first (renders underneath)
    map.addLayer({
      id: 'route-outline-layer',
      type: 'line',
      source: 'route',
      paint: {
        'line-width': 10, // Thicker outline for shadow route
        'line-opacity': 1,
        'line-color': '#ffffff', // White border
      },
      layout: {
        'line-cap': 'round', // Rounded line caps
        'line-join': 'round', // Rounded line joins
      },
    });

    // Add main route layer on top
    map.addLayer({
      id: 'route-layer',
      type: 'line',
      source: 'route',
      paint: {
        'line-width': 8, // Shadow route is thicker than shortest route (which is 5)
        'line-opacity': [
          'case',
          ['==', ['get', 'is_shaded'], true],
          0.9, // Blue sections: slightly transparent
          1.0, // Yellow sections: fully opaque (brighter)
        ],
        'line-color': [
          'case',
          ['==', ['get', 'is_shaded'], true],
          '#3b82f6', // Blue for shadow sections
          '#facc15', // Brighter yellow for no shadow sections
        ],
      },
      layout: {
        'line-cap': 'round', // Rounded line caps
        'line-join': 'round', // Rounded line joins
      },
    });
    
    // Ensure shadow route is above shortest route by moving layers if shortest route exists
    if (map.getLayer('shortest-route-outline-layer')) {
      try {
        map.moveLayer('route-outline-layer', 'shortest-route-outline-layer');
        map.moveLayer('route-layer', 'shortest-route-layer');
      } catch (e) {
        // Layers might not exist yet, that's okay
      }
    }

    // Fit bounds to route - polyline format is [lat, lon][] from backend
    const bounds = new mapboxgl.LngLatBounds();
    routeData.polyline.forEach(([lat, lon]) => bounds.extend([lon, lat]));
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 18 });
    }
  }, [mapLoaded, routeData]);

  // Fit map to route start and end points when both are set (e.g., from examples)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !routeStart || !routeEnd) return;
    
    // Check if we've already fitted to these exact points
    const lastBounds = lastFittedBoundsRef.current;
    if (lastBounds.start && lastBounds.end &&
        lastBounds.start.lat === routeStart.lat && lastBounds.start.lon === routeStart.lon &&
        lastBounds.end.lat === routeEnd.lat && lastBounds.end.lon === routeEnd.lon) {
      return; // Already fitted to these bounds
    }
    
    const map = mapRef.current;

    // Create bounds from start and end points
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([routeStart.lon, routeStart.lat]);
    bounds.extend([routeEnd.lon, routeEnd.lat]);
    
    if (!bounds.isEmpty()) {
      // Use fitBounds with animation for smooth transition
      map.fitBounds(bounds, { 
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        maxZoom: 16,
        duration: 1000 // Animation duration in milliseconds
      });
      
      // Remember these bounds
      lastFittedBoundsRef.current = {
        start: { lat: routeStart.lat, lon: routeStart.lon },
        end: { lat: routeEnd.lat, lon: routeEnd.lon }
      };
    }
  }, [mapLoaded, routeStart, routeEnd]);

  // Display shortest route (for comparison)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove existing shortest route layers
    if (map.getLayer('shortest-route-outline-layer')) {
      map.removeLayer('shortest-route-outline-layer');
    }
    if (map.getLayer('shortest-route-layer')) {
      map.removeLayer('shortest-route-layer');
    }
    if (map.getSource('shortest-route')) {
      map.removeSource('shortest-route');
    }

    if (!shortestRoute) return;

    try {
      // Convert shortest route polyline to GeoJSON LineString
      const routeFeature: Feature<LineString> = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: shortestRoute.polyline.map(([lat, lon]) => [lon, lat]), // Mapbox uses [lon, lat]
        },
        properties: {
          routeType: 'shortest',
        },
      };

      map.addSource('shortest-route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [routeFeature],
        },
      });

      // Add white outline layer first (renders underneath) - solid line for consistent border
      map.addLayer({
        id: 'shortest-route-outline-layer',
        type: 'line',
        source: 'shortest-route',
        paint: {
          'line-width': 7, // Thinner than shadow route outline (which is 10)
          'line-opacity': 1,
          'line-color': '#ffffff', // White border
          // No dash array - solid line for consistent border
        },
        layout: {
          'line-cap': 'round', // Rounded line caps
          'line-join': 'round', // Rounded line joins
        },
      });

      // Add layer with green dashed line to distinguish from shadow route
      map.addLayer({
        id: 'shortest-route-layer',
        type: 'line',
        source: 'shortest-route',
        paint: {
          'line-width': 5, // Thinner than shadow route (which is 8)
          'line-opacity': 1.0, // Fully opaque
          'line-color': '#22c55e', // Green color
          'line-dasharray': [2, 2], // Dashed line pattern
        },
        layout: {
          'line-cap': 'round', // Rounded line caps for segments
          'line-join': 'round', // Rounded line joins
        },
      });
      
      // Ensure shortest route stays below shadow route by moving shadow route layers above if they exist
      if (map.getLayer('route-outline-layer')) {
        try {
          map.moveLayer('route-outline-layer', 'shortest-route-outline-layer');
          map.moveLayer('route-layer', 'shortest-route-layer');
        } catch (e) {
          // Error moving layers, but that's okay
        }
      }

      console.log('Shortest route displayed');
    } catch (error) {
      console.error('Error displaying shortest route:', error);
    }
  }, [mapLoaded, shortestRoute]);

  // Add/update place marker
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove existing marker
    if (placeMarkerRef.current) {
      placeMarkerRef.current.remove();
      placeMarkerRef.current = null;
    }

    // Add new marker if place is selected
    if (selectedPlace) {
      // Create a custom marker element
      const el = document.createElement('div');
      el.className = 'place-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50% 50% 50% 0';
      el.style.transform = 'rotate(-45deg)';
      el.style.border = '3px solid #fff';
      el.style.backgroundColor = '#ea4335'; // Google Maps red
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      // Add inner dot
      const innerDot = document.createElement('div');
      innerDot.style.width = '12px';
      innerDot.style.height = '12px';
      innerDot.style.borderRadius = '50%';
      innerDot.style.backgroundColor = '#fff';
      innerDot.style.position = 'absolute';
      innerDot.style.top = '50%';
      innerDot.style.left = '50%';
      innerDot.style.transform = 'translate(-50%, -50%)';
      el.appendChild(innerDot);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([selectedPlace.lon, selectedPlace.lat])
        .addTo(map);

      placeMarkerRef.current = marker;

      // Only center map if this is a new place (not already centered)
      const isNewPlace = !lastCenteredPlaceRef.current || 
        Math.abs(lastCenteredPlaceRef.current.lat - selectedPlace.lat) > 0.0001 ||
        Math.abs(lastCenteredPlaceRef.current.lon - selectedPlace.lon) > 0.0001;
      
      if (isNewPlace) {
        // Center map on the place only when it's first selected
      map.flyTo({
        center: [selectedPlace.lon, selectedPlace.lat],
        zoom: 17,
        duration: 1000,
      });
        lastCenteredPlaceRef.current = { lat: selectedPlace.lat, lon: selectedPlace.lon };
      }
    } else {
      // Clear last centered place when no place is selected
      lastCenteredPlaceRef.current = null;
    }
  }, [mapLoaded, selectedPlace]);

  // Add/update route start marker
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove existing marker
    if (routeStartMarkerRef.current) {
      routeStartMarkerRef.current.remove();
      routeStartMarkerRef.current = null;
    }

    // Add new marker if route start is provided
    if (routeStart) {
      // Create container for marker and label
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.cursor = 'grab';
      
      // Create marker pin with location icon
      const el = document.createElement('div');
      el.className = 'route-start-marker';
      el.style.width = '36px';
      el.style.height = '36px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.position = 'relative';
      
      // Create SVG icon for location pin
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '36');
      svg.setAttribute('height', '36');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', '#ffffff');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
      
      // Pin shape path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z');
      path.setAttribute('fill', '#4285f4'); // Blue for start
      
      // Inner circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '10');
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', '#ffffff');
      
      svg.appendChild(path);
      svg.appendChild(circle);
      el.appendChild(svg);
      
      // Create label
      const label = document.createElement('div');
      label.textContent = 'Start';
      label.style.marginTop = '4px';
      label.style.padding = '2px 6px';
      label.style.backgroundColor = '#4285f4';
      label.style.color = '#fff';
      label.style.borderRadius = '4px';
      label.style.fontSize = '11px';
      label.style.fontWeight = '600';
      label.style.whiteSpace = 'nowrap';
      label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      label.style.pointerEvents = 'none';
      
      container.appendChild(el);
      container.appendChild(label);

      const marker = new mapboxgl.Marker({ element: container, draggable: true })
        .setLngLat([routeStart.lon, routeStart.lat])
        .addTo(map);

      // Handle drag end event
      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat();
        const lat = lngLat.lat;
        const lon = lngLat.lng;

        // Update cursor style
        container.style.cursor = 'grab';

        // Get address for new location
        if (onOriginSelect) {
          try {
            const { reverseGeocode } = await import('@/utils/geocoding');
            const placesUtils = await import('@/utils/places');
            
            let address = '';
            let placeDetails = null;

            // Try to get place details first
            if (placesUtils.getPlaceDetailsFromCoordinates) {
              try {
                placeDetails = await placesUtils.getPlaceDetailsFromCoordinates(lat, lon);
                if (placeDetails?.name) {
                  address = placeDetails.name;
                }
              } catch (error) {
                console.warn('Failed to get place details from coordinates:', error);
              }
            }

            // Fallback to reverse geocoding
            if (!address) {
              try {
                address = await reverseGeocode(lat, lon);
              } catch (error) {
                console.warn('Failed to reverse geocode:', error);
                address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
              }
            }

            onOriginSelect(lat, lon, address, placeDetails);
          } catch (error) {
            console.error('Error updating origin after drag:', error);
            // Still update with coordinates even if geocoding fails
            if (onOriginSelect) {
              onOriginSelect(lat, lon, `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
            }
          }
        }
      });

      // Handle drag start
      marker.on('dragstart', () => {
        container.style.cursor = 'grabbing';
      });

      routeStartMarkerRef.current = marker;
    }
  }, [mapLoaded, routeStart, onOriginSelect]);

  // Add/update route end marker
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove existing marker
    if (routeEndMarkerRef.current) {
      routeEndMarkerRef.current.remove();
      routeEndMarkerRef.current = null;
    }

    // Add new marker if route end is provided
    if (routeEnd) {
      // Create container for marker and label
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.cursor = 'grab';
      
      // Create marker pin with location icon
      const el = document.createElement('div');
      el.className = 'route-end-marker';
      el.style.width = '36px';
      el.style.height = '36px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.position = 'relative';
      
      // Create SVG icon for location pin
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '36');
      svg.setAttribute('height', '36');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', '#ffffff');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
      
      // Pin shape path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z');
      path.setAttribute('fill', '#ea4335'); // Red for end
      
      // Inner circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '10');
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', '#ffffff');
      
      svg.appendChild(path);
      svg.appendChild(circle);
      el.appendChild(svg);
      
      // Create label
      const label = document.createElement('div');
      label.textContent = 'End';
      label.style.marginTop = '4px';
      label.style.padding = '2px 6px';
      label.style.backgroundColor = '#ea4335';
      label.style.color = '#fff';
      label.style.borderRadius = '4px';
      label.style.fontSize = '11px';
      label.style.fontWeight = '600';
      label.style.whiteSpace = 'nowrap';
      label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      label.style.pointerEvents = 'none';
      
      container.appendChild(el);
      container.appendChild(label);

      const marker = new mapboxgl.Marker({ element: container, draggable: true })
        .setLngLat([routeEnd.lon, routeEnd.lat])
        .addTo(map);

      // Handle drag end event
      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat();
        const lat = lngLat.lat;
        const lon = lngLat.lng;

        // Update cursor style
        container.style.cursor = 'grab';

        // Get address for new location
        if (onDestinationSelect) {
          try {
            const { reverseGeocode } = await import('@/utils/geocoding');
            const placesUtils = await import('@/utils/places');
            
            let address = '';
            let placeDetails = null;

            // Try to get place details first
            if (placesUtils.getPlaceDetailsFromCoordinates) {
              try {
                placeDetails = await placesUtils.getPlaceDetailsFromCoordinates(lat, lon);
                if (placeDetails?.name) {
                  address = placeDetails.name;
                }
              } catch (error) {
                console.warn('Failed to get place details from coordinates:', error);
              }
            }

            // Fallback to reverse geocoding
            if (!address) {
              try {
                address = await reverseGeocode(lat, lon);
              } catch (error) {
                console.warn('Failed to reverse geocode:', error);
                address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
              }
            }

            onDestinationSelect(lat, lon, address, placeDetails);
          } catch (error) {
            console.error('Error updating destination after drag:', error);
            // Still update with coordinates even if geocoding fails
            if (onDestinationSelect) {
              onDestinationSelect(lat, lon, `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
            }
          }
        }
      });

      // Handle drag start
      marker.on('dragstart', () => {
        container.style.cursor = 'grabbing';
      });

      routeEndMarkerRef.current = marker;
    }
  }, [mapLoaded, routeEnd, onDestinationSelect]);

  // Add/update custom pins
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove markers that are no longer in customPins
    const currentPinIds = new Set(customPins.map(pin => pin.id));
    for (const [pinId, marker] of customPinsMarkersRef.current.entries()) {
      if (!currentPinIds.has(pinId)) {
        marker.remove();
        customPinsMarkersRef.current.delete(pinId);
      }
    }

    // Add/update markers for current pins
    for (const pin of customPins) {
      if (customPinsMarkersRef.current.has(pin.id)) {
        // Update existing marker position
        const marker = customPinsMarkersRef.current.get(pin.id);
        marker?.setLngLat([pin.lon, pin.lat]);
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'custom-pin-marker';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid #fff';
        el.style.backgroundColor = '#34a853'; // Google Maps green for custom pins
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.style.position = 'relative';

        // Add X button for removal
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '×';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '-8px';
        removeBtn.style.right = '-8px';
        removeBtn.style.width = '18px';
        removeBtn.style.height = '18px';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.backgroundColor = '#ea4335';
        removeBtn.style.color = '#fff';
        removeBtn.style.border = '2px solid #fff';
        removeBtn.style.fontSize = '14px';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.padding = '0';
        removeBtn.style.lineHeight = '1';
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          if (onPinRemove) {
            onPinRemove(pin.id);
          }
        };
        el.appendChild(removeBtn);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([pin.lon, pin.lat])
          .addTo(map);

        customPinsMarkersRef.current.set(pin.id, marker);
      }
    }
  }, [mapLoaded, customPins, onPinRemove]);

  // Handle map clicks for selecting origin/destination and update cursor
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const canvas = map.getCanvasContainer();
    
    // Update cursor
    if (selectMode !== 'none') {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = '';
    }

    // Handle map clicks for selecting origin/destination
    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
      // Use ref to get current mode (avoids stale closure issues)
      const currentMode = selectModeRef.current;
      console.log('=== Map Click Event ===');
      console.log('Click coordinates:', { lat: e.lngLat.lat, lon: e.lngLat.lng });
      console.log('Select mode (from state):', selectMode);
      console.log('Select mode (from ref):', currentMode);
      
      if (currentMode === 'none') {
        console.log('Ignoring click - selectMode is none');
        return;
      }
      
      const lat = e.lngLat.lat;
      const lon = e.lngLat.lng;
      
      // Create temporary marker immediately
      const createTempMarker = (color: string, markerRef: React.MutableRefObject<mapboxgl.Marker | null>) => {
        // Remove existing marker
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        
        const el = document.createElement('div');
        el.className = 'temp-selection-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid #fff';
        el.style.backgroundColor = color;
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat([lon, lat])
          .addTo(map);
        
        markerRef.current = marker;
        console.log('Temporary marker created at:', { lat, lon });
      };
      
      // Show marker immediately - use ref to get current mode
      console.log('Creating marker for mode:', currentMode);
      if (currentMode === 'origin') {
        createTempMarker('#4285f4', tempOriginMarkerRef); // Blue for origin (start)
      } else if (currentMode === 'destination') {
        createTempMarker('#ea4335', tempDestinationMarkerRef); // Red for destination (end)
      }
      
      try {
        console.log('Starting place details fetch for:', { lat, lon });
        
        // Import utilities dynamically to avoid circular dependencies
        const { reverseGeocode } = await import('@/utils/geocoding');
        const placesUtils = await import('@/utils/places');
        
        // Try to get place details first (more accurate)
        let placeDetails = null;
        let address = '';
        
        try {
          console.log('Attempting getPlaceDetailsFromCoordinates...');
          if (placesUtils.getPlaceDetailsFromCoordinates) {
            placeDetails = await placesUtils.getPlaceDetailsFromCoordinates(lat, lon);
            console.log('Place details fetched successfully:', {
              name: placeDetails.name,
              formattedAddress: placeDetails.formattedAddress,
              placeId: placeDetails.placeId,
              lat: placeDetails.lat,
              lon: placeDetails.lon
            });
            // Use the more specific name if available, otherwise use formattedAddress
            address = placeDetails.name || placeDetails.formattedAddress || '';
          } else {
            throw new Error('getPlaceDetailsFromCoordinates not available');
          }
        } catch (placeError) {
          console.warn('Could not get place details, trying reverse geocode:', placeError);
          // Fallback to reverse geocode
          try {
            console.log('Attempting reverse geocode for:', { lat, lon });
            address = await reverseGeocode(lat, lon);
            console.log('Reverse geocode result:', address);
          } catch (reverseError) {
            console.error('Both place details and reverse geocode failed:', reverseError);
            address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
          }
        }
        
        console.log('Final address to use:', address);
        console.log('Current mode before calling callbacks:', currentMode);
        console.log('Calling onOriginSelect/onDestinationSelect with:', { lat, lon, address, placeDetails });
        
        // Use ref value (already captured above) to avoid stale closure
        if (currentMode === 'origin' && onOriginSelect) {
          console.log('Calling onOriginSelect');
          // Remove temporary origin marker - permanent marker will be set by routeStart prop
          if (tempOriginMarkerRef.current) {
            tempOriginMarkerRef.current.remove();
            tempOriginMarkerRef.current = null;
          }
          onOriginSelect(lat, lon, address, placeDetails);
          selectModeRef.current = 'destination';
          setSelectMode('destination'); // Move to selecting destination
        } else if (currentMode === 'destination' && onDestinationSelect) {
          console.log('Calling onDestinationSelect');
          // Remove temporary destination marker - permanent marker will be set by routeEnd prop
          if (tempDestinationMarkerRef.current) {
            tempDestinationMarkerRef.current.remove();
            tempDestinationMarkerRef.current = null;
          }
          onDestinationSelect(lat, lon, address, placeDetails);
          selectModeRef.current = 'none';
          setSelectMode('none'); // Exit selection mode after both are selected
        } else {
          console.warn('Unexpected mode or missing callback:', { currentMode, hasOriginCallback: !!onOriginSelect, hasDestinationCallback: !!onDestinationSelect });
        }
      } catch (error) {
        console.error('Failed to get location info:', error);
        // Still set the coordinates even if geocoding fails
        // Re-read current mode from ref in case it changed
        const currentModeInError = selectModeRef.current;
        const fallbackAddress = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        console.log('Using fallback address, current mode:', currentModeInError);
        if (currentModeInError === 'origin' && onOriginSelect) {
          console.log('Calling onOriginSelect with fallback');
          // Remove temporary origin marker
          if (tempOriginMarkerRef.current) {
            tempOriginMarkerRef.current.remove();
            tempOriginMarkerRef.current = null;
          }
          onOriginSelect(lat, lon, fallbackAddress, null);
          selectModeRef.current = 'destination';
          setSelectMode('destination');
        } else if (currentModeInError === 'destination' && onDestinationSelect) {
          console.log('Calling onDestinationSelect with fallback');
          // Remove temporary destination marker
          if (tempDestinationMarkerRef.current) {
            tempDestinationMarkerRef.current.remove();
            tempDestinationMarkerRef.current = null;
          }
          onDestinationSelect(lat, lon, fallbackAddress, null);
          selectModeRef.current = 'none';
          setSelectMode('none');
        }
      }
    };

    if (selectMode !== 'none') {
      map.on('click', handleMapClick);
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapLoaded, selectMode, onOriginSelect, onDestinationSelect]);

  // Resize map when overlay layout changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    // Small delay to allow CSS transition to complete
    const timer = setTimeout(() => {
      mapRef.current?.resize();
    }, 300);
    return () => clearTimeout(timer);
  }, [mapLoaded, layoutKey]);

  // Update ref when selectMode changes
  useEffect(() => {
    selectModeRef.current = selectMode;
    console.log('selectMode changed to:', selectMode);
  }, [selectMode]);

  // Cleanup hover timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (infoHoverTimeoutRef.current) {
        clearTimeout(infoHoverTimeoutRef.current);
      }
      if (warningHoverTimeoutRef.current) {
        clearTimeout(warningHoverTimeoutRef.current);
      }
    };
  }, []);

  // Close hints when sidebar opens (except automatic warning hint which is managed by distance check)
  useEffect(() => {
    if (routeCardOpen) {
      // Close info and pins hints immediately when sidebar opens
      if (showInfoHint) {
        setShowInfoHint(false);
        setHasSeenInfoHint(true);
      }
      if (showFirstTimeHint) {
        setShowFirstTimeHint(false);
        setHasSeenHint(true);
      }
      // Don't close warning hint here - it's automatically managed by distance check
      // Clear any pending hover timeouts
      if (infoHoverTimeoutRef.current) {
        clearTimeout(infoHoverTimeoutRef.current);
        infoHoverTimeoutRef.current = null;
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (warningHoverTimeoutRef.current) {
        clearTimeout(warningHoverTimeoutRef.current);
        warningHoverTimeoutRef.current = null;
      }
    }
  }, [routeCardOpen, showInfoHint, showFirstTimeHint]);

  // Show hints once on page refresh (using ref to track, resets on each page load)
  useEffect(() => {
    if (!mapLoaded || routeCardOpen || hintsShownOnLoadRef.current) return;
    
    // Reset example button clicked ref on page load
    exampleButtonClickedRef.current = false;
    
    // Mark that hints have been shown on this page load
    hintsShownOnLoadRef.current = true;
    
    if (onExampleClick) {
      // Show info hint (examples hint) on page refresh after a short delay
      const timer = setTimeout(() => {
        // Don't show if sidebar is now open
        if (!routeCardOpen) {
          setShowInfoHint(true);
          // Auto-hide after 5 seconds, then show pins hint only if example button wasn't clicked
          setTimeout(() => {
            if (!routeCardOpen) {
              setShowInfoHint(false);
              setHasSeenInfoHint(true);
              // Show pins hint after info hint fades, only if example button wasn't clicked
              if (!exampleButtonClickedRef.current && !routeCardOpen) {
                setTimeout(() => {
                  if (!routeCardOpen) {
                    setShowFirstTimeHint(true);
                    // Auto-hide after 5 seconds, then show warning hint
                    setTimeout(() => {
                      if (!routeCardOpen) {
                        setShowFirstTimeHint(false);
                        setHasSeenHint(true);
                        // Show warning hint after pins hint fades
                        setTimeout(() => {
                          if (!routeCardOpen) {
                            setShowWarningHint(true);
                            // Auto-hide after 7 seconds (longer because text is longer)
                            setTimeout(() => {
                              setShowWarningHint(false);
                              setHasSeenWarningHint(true);
                            }, 7000);
                          }
                        }, 500); // Small delay for smooth transition
                      }
                    }, 5000);
                  }
                }, 500); // Small delay for smooth transition
              }
            }
          }, 5000);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!onExampleClick) {
      // If no example handler, show pins hint directly
      const timer = setTimeout(() => {
        if (!routeCardOpen) {
          setShowFirstTimeHint(true);
          // Auto-hide after 5 seconds, then show warning hint
          setTimeout(() => {
            if (!routeCardOpen) {
              setShowFirstTimeHint(false);
              setHasSeenHint(true);
              // Show warning hint after pins hint fades
              setTimeout(() => {
                if (!routeCardOpen) {
                  setShowWarningHint(true);
                  // Auto-hide after 7 seconds (longer because text is longer)
                  setTimeout(() => {
                    setShowWarningHint(false);
                    setHasSeenWarningHint(true);
                  }, 7000);
                }
              }, 500); // Small delay for smooth transition
            }
          }, 5000);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, onExampleClick, routeCardOpen]);

  // Clear temporary markers when selection mode changes
  useEffect(() => {
    if (selectMode === 'none') {
      // Clear temporary markers when exiting selection mode
      if (tempOriginMarkerRef.current) {
        tempOriginMarkerRef.current.remove();
        tempOriginMarkerRef.current = null;
      }
      if (tempDestinationMarkerRef.current) {
        tempDestinationMarkerRef.current.remove();
        tempDestinationMarkerRef.current = null;
      }
    }
  }, [selectMode]);

  // Automatically show warning hint if route distance exceeds 3.5 km
  // Only show when both points are set but before route is calculated (規劃路徑 clicked)
  useEffect(() => {
    // Don't show if both points aren't set, or if route has already been calculated
    if (!routeStart || !routeEnd || routeData) {
      console.log('[Warning Hint] Skipping check:', { 
        hasRouteStart: !!routeStart, 
        hasRouteEnd: !!routeEnd, 
        hasRouteData: !!routeData 
      });
      return;
    }
    
    // Calculate distance between start and end points
    const distance = haversineDistance(
      [routeStart.lat, routeStart.lon],
      [routeEnd.lat, routeEnd.lon]
    );
    
    console.log('[Warning Hint] Distance calculated:', distance, 'meters');
    
    // Show warning if distance exceeds 3.0 km (3000 meters)
    if (distance > 3000) {
      console.log('[Warning Hint] Showing warning - distance exceeds 3.5km');
      setShowWarningHint(true);
      // Auto-hide after 7 seconds
      const timer = setTimeout(() => {
        setShowWarningHint(false);
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      // Hide warning if distance is within acceptable range
      console.log('[Warning Hint] Distance is acceptable, hiding warning');
      setShowWarningHint(false);
    }
  }, [routeStart, routeEnd, routeData]);

  const handleToggleSelectMode = () => {
    // Hide first-time hint if it's showing
    if (showFirstTimeHint) {
      setShowFirstTimeHint(false);
      setHasSeenHint(true);
    }
    
    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    
    if (selectMode === 'none') {
      setSelectMode('origin');
    } else {
      setSelectMode('none');
    }
  };

  const getButtonText = () => {
    if (selectMode === 'origin') return '點選地圖以選擇起點';
    if (selectMode === 'destination') return '點選地圖以選擇終點';
    return '選擇起點';
  };

  return (
    <div className="relative w-full h-full">
      <div className="map-container" ref={containerRef} />
      {/* First-time Hint */}
      {showFirstTimeHint && (
        <div className="absolute bottom-28 right-20 z-20 animate-hint-expand">
          <div className="bg-white rounded-full shadow-2xl px-6 py-4 w-80 border-2 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                +
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  點擊按鈕在地圖上放置標記
                </p>
                <p className="text-xs text-gray-600">
                  選擇起點和終點來規劃路線
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFirstTimeHint(false);
                  setHasSeenHint(true);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Hint */}
      {showInfoHint && onExampleClick && (
        <div className="absolute bottom-48 right-20 z-20 animate-hint-expand">
          <div className="bg-white rounded-full shadow-2xl px-6 py-4 w-80 border-2 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Info className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  點擊查看範例路線
                </p>
                <p className="text-xs text-gray-600">
                  我們準備了一些範例路線供您參考
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInfoHint(false);
                  setHasSeenInfoHint(true);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Hint */}
      {showWarningHint && (
        <div className="absolute bottom-8 right-20 z-20 animate-hint-expand">
          <div className="bg-white rounded-full shadow-2xl px-6 py-4 w-80 border-2 border-red-500">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  選擇起點和終點時請注意距離
                </p>
                <p className="text-xs text-gray-600">
                  建議選擇步行距離內的位置（約3公里以內），避免部署資源記憶體不足
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWarningHint(false);
                  setHasSeenWarningHint(true);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Button */}
      {onExampleClick && (
        <button
          onClick={() => {
            // Close info hint immediately when example button is clicked
            if (showInfoHint) {
              setShowInfoHint(false);
              setHasSeenInfoHint(true);
            }
            // Mark that example button was clicked
            exampleButtonClickedRef.current = true;
            onExampleClick();
          }}
          onMouseEnter={() => {
            // Don't show hint if sidebar is open
            if (routeCardOpen) return;
            // Show hint after 1.5 seconds of hovering (even if already seen)
            if (infoHoverTimeoutRef.current) {
              clearTimeout(infoHoverTimeoutRef.current);
            }
            infoHoverTimeoutRef.current = setTimeout(() => {
              if (!showInfoHint && !routeCardOpen) {
                setShowInfoHint(true);
              }
            }, 1500);
          }}
          onMouseLeave={() => {
            // Clear timeout if user stops hovering
            if (infoHoverTimeoutRef.current) {
              clearTimeout(infoHoverTimeoutRef.current);
              infoHoverTimeoutRef.current = null;
            }
          }}
          className={`absolute bottom-48 right-6 z-20 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            showInfoHint ? 'w-16 h-16' : 'w-14 h-14'
          } bg-blue-500 hover:bg-blue-600 text-white`}
          title="查看範例路線"
        >
          <Info className={showInfoHint ? 'h-6 w-6' : 'h-5 w-5'} />
        </button>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleToggleSelectMode}
        onMouseEnter={() => {
          // Don't show hint if sidebar is open
          if (routeCardOpen) return;
          // Show hint after 1.5 seconds of hovering (even if already seen)
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          hoverTimeoutRef.current = setTimeout(() => {
            if (!showFirstTimeHint && !routeCardOpen) {
              setShowFirstTimeHint(true);
            }
          }, 1500);
        }}
        onMouseLeave={() => {
          // Clear timeout if user stops hovering
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
        }}
        className={`fab-button absolute bottom-28 right-6 z-20 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          showFirstTimeHint ? 'w-16 h-16 fab-large' : 'w-14 h-14'
        } ${
          isAnimating ? 'fab-pulse' : ''
        } ${
          selectMode === 'origin'
            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/50'
            : selectMode === 'destination'
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/50'
            : 'bg-white hover:bg-gray-100 text-gray-700 shadow-gray-500/30'
        }`}
        title={selectMode === 'none' ? '選擇起點' : '取消選擇'}
        style={{ fontSize: showFirstTimeHint ? '32px' : '28px', lineHeight: '1' }}
      >
        {selectMode === 'none' ? '+' : '×'}
      </button>

      {/* Warning Button */}
      <button
        onClick={() => {
          // Show warning hint immediately when button is clicked
          if (!showWarningHint && !routeCardOpen) {
            setShowWarningHint(true);
          }
        }}
        onMouseEnter={() => {
          // Don't show hint if sidebar is open
          if (routeCardOpen) return;
          // Show hint after 1.5 seconds of hovering (even if already seen)
          if (warningHoverTimeoutRef.current) {
            clearTimeout(warningHoverTimeoutRef.current);
          }
          warningHoverTimeoutRef.current = setTimeout(() => {
            if (!showWarningHint && !routeCardOpen) {
              setShowWarningHint(true);
            }
          }, 1500);
        }}
        onMouseLeave={() => {
          // Clear timeout if user stops hovering
          if (warningHoverTimeoutRef.current) {
            clearTimeout(warningHoverTimeoutRef.current);
            warningHoverTimeoutRef.current = null;
          }
        }}
        className={`absolute bottom-8 right-6 z-20 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          showWarningHint ? 'w-16 h-16' : 'w-14 h-14'
        } bg-red-500 hover:bg-red-600 text-white`}
        title="距離提醒"
      >
        <AlertTriangle className={showWarningHint ? 'h-6 w-6' : 'h-5 w-5'} />
      </button>
      
      {/* Ripple effect container */}
      {isAnimating && (
        <div 
          className={`fab-ripple absolute bottom-24 right-4 z-10 w-14 h-14 rounded-full pointer-events-none ${
            selectMode === 'origin' || (selectMode === 'none' && !hasSeenHint)
              ? 'fab-ripple-blue'
              : selectMode === 'destination'
              ? 'fab-ripple-red'
              : 'fab-ripple-gray'
          }`}
        ></div>
      )}

      {selectMode !== 'none' && (
        <div className="absolute bottom-28 right-20 z-10 bg-white rounded-full shadow-lg px-6 py-3 text-sm text-gray-700 max-w-xs animate-hint-expand">
          {getButtonText()}
        </div>
      )}
    </div>
  );
}

export default MapView;

