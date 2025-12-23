import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { FeatureCollection } from 'geojson';

import MapView from './components/MapView';
import { SearchBox } from './components/SearchBox';
import { RoutePlanner } from './components/RoutePlanner';
import { PlaceDetailsCard } from './components/PlaceDetailsCard';
import { Sidebar, type SidebarRouteStats } from './components/Sidebar';
import type { RouteFormValues } from './types/forms';
import type { RouteResponse } from './types/route';
import { getPlaceAutocomplete, getPlaceDetails, type PlacePrediction, type PlaceDetails } from './utils/places';
import { computeRouteShadowRatio } from './utils/shadowRatio';
// Removed Google Directions import - now using backend shortest route
import { geocode } from './utils/geocoding';
import { expandBoundsAdaptive, type ViewportBounds } from './utils/viewportBuffer';

// Tile loading is now handled by MapView component based on viewport

// Backend API URL - use environment variable or fallback to localhost for local development
const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Helper function to get current time in datetime-local format
// Clamps time between 7:00 AM and 5:00 PM (shadows only available for these times)
const getCurrentDateTimeLocal = (): string => {
  const now = new Date();
  // Format: YYYY-MM-DDTHH:mm
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  let hours = now.getHours();
  let minutes = now.getMinutes();
  
  // Clamp time between 7:00 AM (07:00) and 5:00 PM (17:00)
  if (hours < 7) {
    hours = 7;
    minutes = 0;
  } else if (hours > 17 || (hours === 17 && minutes > 0)) {
    hours = 17;
    minutes = 0;
  }
  
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  return `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
};

const DEFAULT_FORM: RouteFormValues = {
  startLat: 25.0173,
  startLon: 121.5405,
  endLat: 25.0217,
  endLon: 121.5357,
  routeTime: getCurrentDateTimeLocal(),
  alpha: 0.5,
};

function App() {
  const [formValues, setFormValues] = useState<RouteFormValues>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  // buildingData is now managed internally by MapView component via tiling
  const [shadowData, setShadowData] = useState<FeatureCollection | null>(null); // Shadows for viewport visualization
  const [routeShadowData, setRouteShadowData] = useState<FeatureCollection | null>(null); // Shadows for route ratio computation
  const [isLoadingRouteShadows, setIsLoadingRouteShadows] = useState(false);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showShadows, setShowShadows] = useState(true);
  const [routeCardOpen, setRouteCardOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originQuery, setOriginQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlacePrediction[]>([]);
  const [originSuggestions, setOriginSuggestions] = useState<PlacePrediction[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlacePrediction[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [originSuggestionsLoading, setOriginSuggestionsLoading] = useState(false);
  const [destinationSuggestionsLoading, setDestinationSuggestionsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [shortestRoute, setShortestRoute] = useState<RouteResponse | null>(null);
  const [showShortestRoute, setShowShortestRoute] = useState(false);
  const [routeStart, setRouteStart] = useState<{ lat: number; lon: number } | null>(null);
  const [routeEnd, setRouteEnd] = useState<{ lat: number; lon: number } | null>(null);
  const [customPins, setCustomPins] = useState<Array<{ id: string; lat: number; lon: number; label?: string }>>([]);
  // Track which queries correspond to the pins - if queries change, we need to geocode again
  const pinOriginQueryRef = useRef<string | null>(null);
  const pinDestinationQueryRef = useRef<string | null>(null);
  const [showExampleHint, setShowExampleHint] = useState(false);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>配置錯誤</h1>
        <p style={{ color: '#6b7280', marginBottom: '8px' }}>
          VITE_MAPBOX_TOKEN 環境變數未設定
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          請在 Vercel Dashboard 的環境變數中設定 VITE_MAPBOX_TOKEN
        </p>
      </div>
    );
  }

  // Validate token format
  if (!mapboxToken.startsWith('pk.')) {
    console.error('[Mapbox Error] Token does not start with "pk." - this may be invalid');
  }

  // Building data is now loaded on-demand by MapView based on viewport (tiling)
  // This significantly reduces initial load time and memory usage

  // Shadow fetching with debouncing and zoom level check
  const shadowFetchTimeoutRef = useRef<number | null>(null);
  const currentViewportBoundsRef = useRef<{ minLon: number; minLat: number; maxLon: number; maxLat: number; zoom: number } | null>(null);
  const MIN_ZOOM_FOR_SHADOWS = 16; // Fetch shadows starting at zoom 16 (buildings are interpolating from zoom 15)
  
  // Preserve computed shortest route shadow ratio - don't recompute when viewport changes
  const preservedShortestShadowRatioRef = useRef<string | null>(null);
  const preservedShortestTotalLengthRef = useRef<string | null>(null);
  const isComputingShortestShadowRatioRef = useRef<boolean>(false);
  
  // AbortController for cancelling route computation
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  
  const fetchShadows = useCallback(async (bounds: ViewportBounds) => {
    // Clear existing timeout
    if (shadowFetchTimeoutRef.current) {
      clearTimeout(shadowFetchTimeoutRef.current);
    }
    
    // Check zoom level - only fetch if zoomed in enough (zoom 16+)
    if (bounds.zoom < MIN_ZOOM_FOR_SHADOWS) {
      console.log(`Skipping shadow fetch: zoom level ${bounds.zoom.toFixed(1)} is below minimum ${MIN_ZOOM_FOR_SHADOWS}`);
      // Keep existing shadows but don't fetch new ones
      return;
    }
    
    // Debounce: wait 1.5 seconds after user stops panning/zooming before fetching
    shadowFetchTimeoutRef.current = window.setTimeout(async () => {
      // Double-check zoom level (user might have zoomed out during debounce)
      if (bounds.zoom < MIN_ZOOM_FOR_SHADOWS) {
        console.log(`Skipping shadow fetch: zoom level changed to ${bounds.zoom.toFixed(1)} during debounce`);
        return;
      }
      
      // Shadow fetching doesn't require buildingData in App state anymore
      // MapView handles building data loading internally
      
      if (!formValues.routeTime) {
        console.log('Skipping shadow fetch: time not set');
        return;
      }
      
      try {
        // Expand bounds with buffer to preload surrounding areas
        // This prevents flickering when user pans and improves perceived performance
        const expandedBounds = expandBoundsAdaptive(bounds);
        
        const timeStr = formatTimeString(formValues.routeTime);
        const url = new URL(`${API_BASE_URL}/shadows`);
        url.searchParams.set('min_lon', String(expandedBounds.minLon));
        url.searchParams.set('min_lat', String(expandedBounds.minLat));
        url.searchParams.set('max_lon', String(expandedBounds.maxLon));
        url.searchParams.set('max_lat', String(expandedBounds.maxLat));
        url.searchParams.set('time', timeStr);
        
        console.log(
          `Fetching shadows from backend (zoom: ${bounds.zoom.toFixed(1)}, ` +
          `viewport: ${bounds.minLon.toFixed(4)}-${bounds.maxLon.toFixed(4)}, ` +
          `expanded: ${expandedBounds.minLon.toFixed(4)}-${expandedBounds.maxLon.toFixed(4)})...`,
          url.toString()
        );
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch shadows: ${response.statusText}`);
        }
        
        const data: FeatureCollection = await response.json();
        console.log(`Loaded ${data.features.length} shadow polygons`);
        setShadowData(data);
      } catch (err) {
        console.error('Failed to fetch shadows:', err);
        // Don't set error state - shadows are optional
      }
    }, 1500); // 1.5 second debounce - wait for user to stop panning/zooming
  }, [formValues.routeTime]);

  const handleFormChange = (name: keyof RouteFormValues, value: string) => {
    setFormValues((prev) => {
      const numericFields: Array<keyof RouteFormValues> = [
        'startLat',
        'startLon',
        'endLat',
        'endLon',
        'alpha',
      ];
      const nextValue = numericFields.includes(name) ? Number(value) : value;
      const updated = { ...prev, [name]: nextValue } as RouteFormValues;
      
      // If time changed, trigger shadow refetch
      if (name === 'routeTime') {
        // Shadow fetch will be triggered by viewport change callback
      }
      
      return updated;
    });
  };
  
  // Handle viewport changes - fetch shadows for new viewport (only if zoomed in enough)
  const handleViewportChange = useCallback((bounds: ViewportBounds) => {
    // Store current viewport bounds for time-based refetch
    currentViewportBoundsRef.current = bounds;
    fetchShadows(bounds);
  }, [fetchShadows]);
  
  // Re-fetch shadows when time changes
  useEffect(() => {
    if (!formValues.routeTime) return;
    
    // If we have current viewport bounds, refetch shadows with new time
    if (currentViewportBoundsRef.current) {
      console.log('Time changed, re-fetching shadows with new time...');
      fetchShadows(currentViewportBoundsRef.current);
    }
  }, [formValues.routeTime, fetchShadows]);

  // Example routes for users to try
  const examples = [
    {
      origin: '國立台灣大學圖書館',
      destination: '國立台灣大學社會科學院辜振甫先生紀念圖書館',
      time: '13:00', // 1:00 PM
      alpha: 0.5,
    },
    {
      origin: '台灣大學水源校區',
      destination: '國立台灣大學圖書館',
      time: '10:00', // 10:00 AM
      alpha: 0.5,
    },
    {
      origin: '國立台灣大學醫學院附設醫院',
      destination: '台北車站捷運站',
      time: '09:30', // 9:30 AM
      alpha: 0.5,
    },
    {
      origin: '台北101',
      destination: '臺北醫學大學附設醫院',
      time: '15:00', // 3:00 PM
      alpha: 0.3,
    },
  ];

  const handleExampleClick = async () => {
    // Get list of shown example indices from sessionStorage
    const shownIndicesStr = sessionStorage.getItem('shownExampleIndices');
    const shownIndices = shownIndicesStr ? JSON.parse(shownIndicesStr) : [];
    
    // Find unshown examples
    const allIndices = examples.map((_, index) => index);
    const unshownIndices = allIndices.filter(index => !shownIndices.includes(index));
    
    let selectedIndex: number;
    
    if (unshownIndices.length > 0) {
      // First round: show examples in order (pick the first unshown index)
      // After first round: pick randomly from unshown examples
      if (shownIndices.length === 0) {
        // First example - pick the first one (index 0)
        selectedIndex = 0;
      } else if (shownIndices.length < examples.length - 1) {
        // Still in first round - pick the next one in order
        // Find the smallest index that hasn't been shown
        selectedIndex = unshownIndices.sort((a, b) => a - b)[0];
      } else {
        // Last one in first round - pick the remaining unshown index
        selectedIndex = unshownIndices[0];
      }
      // Mark this example as shown
      const newShownIndices = [...shownIndices, selectedIndex];
      sessionStorage.setItem('shownExampleIndices', JSON.stringify(newShownIndices));
    } else {
      // All examples have been shown at least once, now pick randomly
      selectedIndex = Math.floor(Math.random() * examples.length);
      sessionStorage.setItem('shownExampleIndices', JSON.stringify([selectedIndex]));
    }
    
    const example = examples[selectedIndex];
    
    try {
      setLoading(true);
      setError(null);
      
      // Geocode both origin and destination
      const [originResult, destinationResult] = await Promise.all([
        geocode(example.origin, 'tw'),
        geocode(example.destination, 'tw'),
      ]);
      
      // Get current date for the time
      const now = new Date();
      const [hours, minutes] = example.time.split(':');
      const exampleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
      
      // Format as datetime-local string
      const year = exampleDate.getFullYear();
      const month = String(exampleDate.getMonth() + 1).padStart(2, '0');
      const day = String(exampleDate.getDate()).padStart(2, '0');
      const timeString = `${year}-${month}-${day}T${example.time}`;
      
      // Update form values
      setFormValues(prev => ({
        ...prev,
        startLat: originResult.lat,
        startLon: originResult.lon,
        endLat: destinationResult.lat,
        endLon: destinationResult.lon,
        routeTime: timeString,
        alpha: example.alpha,
      }));
      
      // Update queries - use original place names instead of formatted addresses
      setOriginQuery(example.origin);
      setDestinationQuery(example.destination);
      
      // Set route markers
      setRouteStart({ lat: originResult.lat, lon: originResult.lon });
      setRouteEnd({ lat: destinationResult.lat, lon: destinationResult.lon });
      
      // Track queries for pins - use original place names
      pinOriginQueryRef.current = example.origin;
      pinDestinationQueryRef.current = example.destination;
      
      // Open route planner and show hint
      setRouteCardOpen(true);
      setSelectedPlace(null);
      setShowExampleHint(true);
      
    } catch (err) {
      console.error('Failed to load example:', err);
      setError(err instanceof Error ? err.message : '載入範例失敗');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeString = (value: string) => {
    const date = new Date(value);
    const tzOffset = -date.getTimezoneOffset();
    const sign = tzOffset >= 0 ? '+' : '-';
    const hours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(tzOffset) % 60).padStart(2, '0');

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getDate()).padStart(2, '0')}T${String(
      date.getHours()
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(
      2,
      '0'
    )}:${String(date.getSeconds()).padStart(2, '0')}${sign}${hours}:${minutes}`;
  };

  // Helper function to calculate bounding box from route polyline
  const calculateRouteBoundingBox = (polyline: [number, number][]): { minLon: number; minLat: number; maxLon: number; maxLat: number } => {
    if (polyline.length === 0) {
      return { minLon: 0, minLat: 0, maxLon: 0, maxLat: 0 };
    }
    
    let minLon = polyline[0][1]; // lon
    let maxLon = polyline[0][1];
    let minLat = polyline[0][0]; // lat
    let maxLat = polyline[0][0];
    
    for (const [lat, lon] of polyline) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    
    // Add a larger buffer (about 100 meters) to ensure we get all shadows around the route
    // Shadows can extend beyond the route, especially from tall buildings
    const buffer = 0.001; // approximately 100 meters in degrees (increased from 50m)
    return {
      minLon: minLon - buffer,
      minLat: minLat - buffer,
      maxLon: maxLon + buffer,
      maxLat: maxLat + buffer,
    };
  };

  // Fetch shadows for route computation (separate from viewport shadows)
  const fetchShadowsForRoute = useCallback(async (polyline: [number, number][]) => {
    if (!formValues.routeTime) {
      console.log('Skipping route shadow fetch: time not set');
      setIsLoadingRouteShadows(false);
      return;
    }

    // Set loading state at the start to prevent premature computation
    setIsLoadingRouteShadows(true);

    try {
      const bounds = calculateRouteBoundingBox(polyline);
      const timeStr = formatTimeString(formValues.routeTime);
      
      const url = new URL(`${API_BASE_URL}/shadows`);
      url.searchParams.set('min_lon', String(bounds.minLon));
      url.searchParams.set('min_lat', String(bounds.minLat));
      url.searchParams.set('max_lon', String(bounds.maxLon));
      url.searchParams.set('max_lat', String(bounds.maxLat));
      url.searchParams.set('time', timeStr);
      
      console.log(`Fetching shadows for route computation (bbox: ${bounds.minLon.toFixed(4)}, ${bounds.minLat.toFixed(4)} - ${bounds.maxLon.toFixed(4)}, ${bounds.maxLat.toFixed(4)})...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch route shadows: ${response.statusText}`);
      }
      
      const data: FeatureCollection = await response.json();
      console.log(`Loaded ${data.features.length} shadow polygons for route computation`);
      
      // Only update state after data is fully loaded
      setRouteShadowData(data);
      setIsLoadingRouteShadows(false);
    } catch (err) {
      console.error('Failed to fetch shadows for route:', err);
      setIsLoadingRouteShadows(false);
      // Don't set error state - shadows are optional for computation
    }
  }, [formValues.routeTime]);

  // Debounced autocomplete for destination (search box)
  useEffect(() => {
    if (!destinationQuery.trim()) {
      setPlaceSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const suggestions = await getPlaceAutocomplete(destinationQuery.trim(), 'tw');
        setPlaceSuggestions(suggestions);
      } catch (err) {
        console.error('Autocomplete error:', err);
        setPlaceSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [destinationQuery]);

  // Debounced autocomplete for origin (route planner)
  useEffect(() => {
    if (!originQuery.trim()) {
      setOriginSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setOriginSuggestionsLoading(true);
      try {
        const suggestions = await getPlaceAutocomplete(originQuery.trim(), 'tw');
        setOriginSuggestions(suggestions);
      } catch (err) {
        console.error('Origin autocomplete error:', err);
        setOriginSuggestions([]);
      } finally {
        setOriginSuggestionsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [originQuery]);

  // Debounced autocomplete for destination (route planner)
  useEffect(() => {
    if (!destinationQuery.trim() || !routeCardOpen) {
      setDestinationSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setDestinationSuggestionsLoading(true);
      try {
        const suggestions = await getPlaceAutocomplete(destinationQuery.trim(), 'tw');
        setDestinationSuggestions(suggestions);
      } catch (err) {
        console.error('Destination autocomplete error:', err);
        setDestinationSuggestions([]);
      } finally {
        setDestinationSuggestionsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [destinationQuery, routeCardOpen]);

  const handlePlaceSelect = useCallback(async (prediction: PlacePrediction) => {
    setLoading(true);
    setError(null);
    setPlaceSuggestions([]);

    try {
      // Get place details
      const placeDetails = await getPlaceDetails(prediction.placeId);
      setSelectedPlace(placeDetails);

      // Update destination query to show the selected place
      setDestinationQuery(placeDetails.name);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '載入地點資訊失敗';
      setError(errorMessage);
      console.error('Place details error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRouteFromPlace = useCallback(() => {
    if (!selectedPlace) return;

    // Set destination from selected place
    setDestinationQuery(selectedPlace.name);

    // Close place details, open route planner
    setSelectedPlace(null);
    setRouteCardOpen(true);
  }, [selectedPlace]);

  const handleOriginSelect = useCallback(async (prediction: PlacePrediction) => {
    try {
      const placeDetails = await getPlaceDetails(prediction.placeId);
      setOriginQuery(placeDetails.name);
      setOriginSuggestions([]);
    } catch (err) {
      console.error('Origin place details error:', err);
    }
  }, []);

  const handleDestinationSelectInRoutePlanner = useCallback(async (prediction: PlacePrediction) => {
    try {
      const placeDetails = await getPlaceDetails(prediction.placeId);
      setDestinationQuery(placeDetails.name);
      setDestinationSuggestions([]);
    } catch (err) {
      console.error('Destination place details error:', err);
    }
  }, []);

  // Clear all route-related data when sidebar is closed
  const handleCloseRoutePlanner = useCallback(() => {
    console.log('Closing RoutePlanner - clearing all route data');
    setRouteCardOpen(false);
    // Clear queries
    setOriginQuery('');
    setDestinationQuery('');
    // Clear route data
    setRouteData(null);
    setShortestRoute(null);
    setRouteShadowData(null);
    setIsLoadingRouteShadows(false);
    // Clear markers
    setRouteStart(null);
    setRouteEnd(null);
    // Clear pin query tracking
    pinOriginQueryRef.current = null;
    pinDestinationQueryRef.current = null;
    // Clear selected place
    setSelectedPlace(null);
    // Clear suggestions
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setPlaceSuggestions([]);
    // Reset form values to default
    setFormValues(DEFAULT_FORM);
    // Clear preserved shadow ratio
    preservedShortestShadowRatioRef.current = null;
    preservedShortestTotalLengthRef.current = null;
    isComputingShortestShadowRatioRef.current = false;
    // Clear error
    setError(null);
  }, []);

  const handleSwap = useCallback(() => {
    const temp = originQuery;
    setOriginQuery(destinationQuery);
    setDestinationQuery(temp);
  }, [originQuery, destinationQuery]);

  const handleSearch = async () => {
    if (!destinationQuery.trim()) {
      setError('請輸入搜尋地點');
      return;
    }

    setLoading(true);
    setError(null);
    setPlaceSuggestions([]); // Clear suggestions when searching

    try {
      // Get autocomplete suggestions and use the first result
      const suggestions = await getPlaceAutocomplete(destinationQuery.trim(), 'tw');
      
      if (suggestions.length === 0) {
        setError('找不到符合的地點');
        setLoading(false);
        return;
      }

      // Get place details for the first (most relevant) suggestion
      const placeDetails = await getPlaceDetails(suggestions[0].placeId);
      setSelectedPlace(placeDetails);

      // Update destination query to show the selected place
      setDestinationQuery(placeDetails.name);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '搜尋地點失敗';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Note: Google route is now fetched explicitly in handleRouteSubmit
  // This allows us to fetch it first to verify routes can be displayed before fetching shadow route

  // Cancel route computation
  const handleCancelRoute = useCallback(() => {
    console.log('Cancelling route computation...');
    if (routeAbortControllerRef.current) {
      routeAbortControllerRef.current.abort();
      routeAbortControllerRef.current = null;
    }
    setLoading(false);
    setError('路線計算已取消');
    setIsLoadingRouteShadows(false);
  }, []);

  const handleRouteSubmit = async () => {
    if (!originQuery.trim() || !destinationQuery.trim()) {
      setError('請輸入起點和目的地');
        return;
      }

    // Cancel any existing route computation
    if (routeAbortControllerRef.current) {
      routeAbortControllerRef.current.abort();
    }
    
    // Create new AbortController for this route computation
    routeAbortControllerRef.current = new AbortController();
    const abortSignal = routeAbortControllerRef.current.signal;

    setLoading(true);
    setError(null);
    setShortestRoute(null); // Clear previous shortest route
    setRouteData(null); // Clear previous shadow route

    // Clear preserved shadow ratio and route shadows when starting new route calculation
    preservedShortestShadowRatioRef.current = null;
    preservedShortestTotalLengthRef.current = null;
    isComputingShortestShadowRatioRef.current = false;
    setRouteShadowData(null); // Clear previous route shadows
    setIsLoadingRouteShadows(true); // Mark that we're loading shadows for route

    try {
      // Check if we have valid coordinates from pin selection AND the queries match
      // Only use pin coordinates if the queries haven't changed since pins were set
      let originResult, destinationResult;
      
      // Store pin coordinates and check if queries match
      const pinStart = routeStart;
      const pinEnd = routeEnd;
      const currentOriginQuery = originQuery.trim();
      const currentDestinationQuery = destinationQuery.trim();
      
      // Only use pins if:
      // 1. Pins exist
      // 2. Current queries match the queries that were used when pins were set
      const canUsePins = pinStart && pinEnd && 
                         pinOriginQueryRef.current === currentOriginQuery &&
                         pinDestinationQueryRef.current === currentDestinationQuery;
      
      console.log('Pin query check:', {
        hasPins: !!(pinStart && pinEnd),
        originQueryMatch: pinOriginQueryRef.current === currentOriginQuery,
        destinationQueryMatch: pinDestinationQueryRef.current === currentDestinationQuery,
        storedOrigin: pinOriginQueryRef.current,
        currentOrigin: currentOriginQuery,
        storedDestination: pinDestinationQueryRef.current,
        currentDestination: currentDestinationQuery,
        canUsePins
      });
      
      if (canUsePins) {
        // Use coordinates from pin selection - no geocoding needed
        console.log('Using coordinates from pin selection (no geocoding):', {
          origin: { lat: pinStart.lat, lon: pinStart.lon },
          destination: { lat: pinEnd.lat, lon: pinEnd.lon }
        });
        
        originResult = {
          lat: pinStart.lat,
          lon: pinStart.lon,
          formattedAddress: originQuery, // Use the query text as address
        };
        
        destinationResult = {
          lat: pinEnd.lat,
          lon: pinEnd.lon,
          formattedAddress: destinationQuery, // Use the query text as address
        };
        
        // Keep the markers since we're using pin coordinates
        // Don't clear routeStart/routeEnd here
      } else {
        // Fallback to geocoding if pins weren't used or queries changed
        console.log('Geocoding origin and destination (pins not used or queries changed)...', { 
          origin: originQuery, 
          destination: destinationQuery,
          reason: !pinStart || !pinEnd ? 'no pins' : 'queries changed'
        });
        const [geocodedOrigin, geocodedDestination] = await Promise.all([
        geocode(originQuery.trim(), 'tw'),
        geocode(destinationQuery.trim(), 'tw'),
      ]);

        originResult = geocodedOrigin;
        destinationResult = geocodedDestination;
        
        console.log('Geocoding results:', {
          origin: { lat: originResult.lat, lon: originResult.lon, address: originResult.formattedAddress },
          destination: { lat: destinationResult.lat, lon: destinationResult.lon, address: destinationResult.formattedAddress }
        });
        
        // Update route markers from geocoding results
        setRouteStart({ lat: originResult.lat, lon: originResult.lon });
        setRouteEnd({ lat: destinationResult.lat, lon: destinationResult.lon });
        
        // Update the queries that correspond to these pins
        pinOriginQueryRef.current = currentOriginQuery;
        pinDestinationQueryRef.current = currentDestinationQuery;
      }

      // Update form values with coordinates
      const updatedFormValues = {
        ...formValues,
        startLat: originResult.lat,
        startLon: originResult.lon,
        endLat: destinationResult.lat,
        endLon: destinationResult.lon,
      };
      setFormValues(updatedFormValues);

      // Step 2: Fetch both routes from backend in parallel
      const timeStr = formatTimeString(updatedFormValues.routeTime);
      
      // Shadow route URL
      const shadowUrl = new URL(`${API_BASE_URL}/route`);
      shadowUrl.searchParams.set('start_lat', String(originResult.lat));
      shadowUrl.searchParams.set('start_lon', String(originResult.lon));
      shadowUrl.searchParams.set('end_lat', String(destinationResult.lat));
      shadowUrl.searchParams.set('end_lon', String(destinationResult.lon));
      shadowUrl.searchParams.set('time', timeStr);
      shadowUrl.searchParams.set('alpha', String(updatedFormValues.alpha));

      // Shortest route URL
      const shortestUrl = new URL(`${API_BASE_URL}/route/shortest`);
      shortestUrl.searchParams.set('start_lat', String(originResult.lat));
      shortestUrl.searchParams.set('start_lon', String(originResult.lon));
      shortestUrl.searchParams.set('end_lat', String(destinationResult.lat));
      shortestUrl.searchParams.set('end_lon', String(destinationResult.lon));

      console.log('Fetching routes from backend...');
      
      // Helper function to fetch with retry
      const fetchWithRetry = async (
        url: URL,
        maxRetries: number = 2,
        timeoutMs: number = 120000, // 120 seconds timeout (increased from 90s)
        routeType: string = 'route'
      ): Promise<Response> => {
        const requestStartTime = performance.now();
        console.log(`[TIMING] ${routeType} - Frontend request started at ${requestStartTime.toFixed(2)}ms`);
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          // Check if already aborted
          if (abortSignal.aborted) {
            throw new DOMException('Request aborted', 'AbortError');
          }
          
          try {
            // Set up timeout - abort the signal after timeout
            const timeoutId = setTimeout(() => {
              if (!abortSignal.aborted && routeAbortControllerRef.current) {
                routeAbortControllerRef.current.abort();
              }
            }, timeoutMs);
            
            const fetchStartTime = performance.now();
            const response = await fetch(url, { signal: abortSignal });
            clearTimeout(timeoutId);
            const fetchEndTime = performance.now();
            const fetchDuration = fetchEndTime - fetchStartTime;
            
            // 記錄網路請求時間
            console.log(`[TIMING] ${routeType} - Network request completed in ${fetchDuration.toFixed(2)}ms (status: ${response.status})`);
            
            // 從響應頭讀取後端時間資訊
            const processingTime = response.headers.get('X-Processing-Time-Ms');
            if (processingTime) {
              const backendProcessingMs = parseFloat(processingTime);
              // 前端到後端時間 = 總網路請求時間 - 後端處理時間
              // 這是一個近似值，因為網路延遲包括往返時間
              const frontendToBackendMs = Math.max(0, (fetchDuration - backendProcessingMs) / 2);
              const backendToFrontendMs = Math.max(0, fetchDuration - backendProcessingMs - frontendToBackendMs);
              
              console.log(`[TIMING] ${routeType} - Network total: ${fetchDuration.toFixed(2)}ms`);
              console.log(`[TIMING] ${routeType} - Frontend to Backend (approx): ${frontendToBackendMs.toFixed(2)}ms`);
              console.log(`[TIMING] ${routeType} - Backend Processing: ${backendProcessingMs}ms`);
              console.log(`[TIMING] ${routeType} - Backend to Frontend (approx): ${backendToFrontendMs.toFixed(2)}ms`);
            }
            
            if (response.ok) {
              return response;
            }
            
            // Don't retry 404 errors (no path found) - these are permanent failures
            if (response.status === 404) {
              return response;
            }
            
            // If not last attempt, retry (only for non-404 errors)
            if (attempt < maxRetries) {
              console.log(`Route fetch attempt ${attempt + 1} failed (${response.status}), retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
              continue;
            }
            
            return response; // Return even if not ok on last attempt
          } catch (err) {
            // Check if aborted
            if (abortSignal.aborted || (err instanceof Error && err.name === 'AbortError')) {
              throw new DOMException('Request aborted', 'AbortError');
            }
            
            if (attempt === maxRetries) {
              throw err; // Re-throw on last attempt
            }
            console.log(`Route fetch attempt ${attempt + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          }
        }
        throw new Error('All retry attempts failed');
      };

      // Track route fetch status using an object that can be shared across closures
      const routeStatus = { shadowFetched: false, shortestFetched: false };
      
      // Promise that resolves when shadow route is displayed
      let shadowDisplayedPromise: Promise<void> | null = null;
      let shadowDisplayedResolver: (() => void) | null = null;
      
      try {
        // Start both fetches in parallel
        const shadowPromise = fetchWithRetry(shadowUrl, 2, 120000, 'shadow')
          .then(async (response) => {
            const parseStartTime = performance.now();
            if (response.ok) {
              const shadowData: RouteResponse = await response.json();
              const parseEndTime = performance.now();
              const parseDuration = parseEndTime - parseStartTime;
              console.log(`[TIMING] shadow - JSON parsing completed in ${parseDuration.toFixed(2)}ms`);
              
              const renderStartTime = performance.now();
              console.log('Shadow route fetched successfully', shadowData);
              // Display shadow route immediately when it arrives
              // Note: shadow_ratio is already included in the backend response, so no need to fetch shadows
              setRouteData(shadowData);
              routeStatus.shadowFetched = true;
              
              // 使用 requestAnimationFrame 來測量實際渲染時間
              requestAnimationFrame(() => {
                const renderEndTime = performance.now();
                const renderDuration = renderEndTime - renderStartTime;
                console.log(`[TIMING] shadow - React render completed in ${renderDuration.toFixed(2)}ms`);
              });
              // Resolve the promise to signal that shadow route is displayed
              if (shadowDisplayedResolver) {
                shadowDisplayedResolver();
              }
              return shadowData;
            } else {
              const errorText = await response.text();
              // Check for 404 (no path found)
              if (response.status === 404) {
                try {
                  const errorData = JSON.parse(errorText);
                  throw new Error(errorData.detail || errorText);
                } catch (parseError) {
                  // Only catch JSON parsing errors, not the error we intentionally throw
                  if (parseError instanceof SyntaxError) {
                    throw new Error(errorText || '找不到起點和目的地之間的路徑。請嘗試不同的地點。');
                  }
                  // Re-throw if it's the error we intentionally threw
                  throw parseError;
                }
              }
              throw new Error(`Shadow route failed: ${response.status} ${errorText}`);
            }
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.error('Failed to fetch shadow route:', err);
            }
            return null;
          });

        // Create promise for shadow route display synchronization
        shadowDisplayedPromise = new Promise<void>((resolve) => {
          shadowDisplayedResolver = resolve;
        });

        const shortestPromise = fetchWithRetry(shortestUrl, 2, 120000, 'shortest')
          .then(async (response) => {
            const parseStartTime = performance.now();
            if (response.ok) {
              const shortestData: RouteResponse = await response.json();
              const parseEndTime = performance.now();
              const parseDuration = parseEndTime - parseStartTime;
              console.log(`[TIMING] shortest - JSON parsing completed in ${parseDuration.toFixed(2)}ms`);
              
              const renderStartTime = performance.now();
              console.log('Shortest route fetched successfully', shortestData);
              
              // Store total length immediately (doesn't depend on shadows)
              preservedShortestTotalLengthRef.current = `${(shortestData.metadata.total_length_m / 1000).toFixed(2)} 公里`;
              
              // Mark that we're computing shadow ratio (will be computed when shadows are available)
              isComputingShortestShadowRatioRef.current = true;
              
              // Fetch shadows for the shortest route for accurate ratio computation
              // This ensures we have all shadows before computing the ratio
              fetchShadowsForRoute(shortestData.polyline);
              
              // Wait for shadow route to be displayed first (if it hasn't failed)
              if (routeStatus.shadowFetched) {
                // Shadow route already displayed, safe to show shortest route
                setShortestRoute(shortestData);
                routeStatus.shortestFetched = true;
                
                requestAnimationFrame(() => {
                  const renderEndTime = performance.now();
                  const renderDuration = renderEndTime - renderStartTime;
                  console.log(`[TIMING] shortest - React render completed in ${renderDuration.toFixed(2)}ms`);
                });
              } else {
                // Wait for shadow route to be displayed (or timeout after 5 seconds)
                const timeoutPromise = new Promise<void>((resolve) => {
                  setTimeout(() => resolve(), 5000); // Max wait 5 seconds
                });
                
                await Promise.race([
                  shadowDisplayedPromise!,
                  timeoutPromise,
                ]);
                
                // Now display shortest route
                setShortestRoute(shortestData);
                routeStatus.shortestFetched = true;
                
                requestAnimationFrame(() => {
                  const renderEndTime = performance.now();
                  const renderDuration = renderEndTime - renderStartTime;
                  console.log(`[TIMING] shortest - React render completed in ${renderDuration.toFixed(2)}ms`);
                });
              }
              return shortestData;
            } else {
              const errorText = await response.text();
              // Check for 404 (no path found)
              if (response.status === 404) {
                try {
                  const errorData = JSON.parse(errorText);
                  throw new Error(errorData.detail || errorText);
                } catch (parseError) {
                  // Only catch JSON parsing errors, not the error we intentionally throw
                  if (parseError instanceof SyntaxError) {
                    throw new Error(errorText || '找不到起點和目的地之間的路徑。請嘗試不同的地點。');
                  }
                  // Re-throw if it's the error we intentionally threw
                  throw parseError;
                }
              }
              throw new Error(`Shortest route failed: ${response.status} ${errorText}`);
            }
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('Failed to fetch shortest route:', err);
            }
            return null;
          });

        // Wait for shadow route first (priority)
        const shadowResult = await shadowPromise;
        
        if (!shadowResult) {
          // Shadow route failed, wait for shortest route and retry shadow
          console.log('Shadow route failed, waiting for shortest route...');
          const shortestResult = await shortestPromise;
          
          if (shortestResult) {
            // Display shortest route first since shadow failed
            setShortestRoute(shortestResult);
            routeStatus.shortestFetched = true;
            
            // Retry shadow route in background (don't block UI)
            console.log('Retrying shadow route in background...');
            fetchWithRetry(shadowUrl, 2, 120000)
              .then(async (response) => {
                if (response.ok) {
                  const shadowData: RouteResponse = await response.json();
                  console.log('Shadow route retry successful', shadowData);
                  setRouteData(shadowData);
                  routeStatus.shadowFetched = true;
                } else {
                  console.error('Shadow route retry failed:', response.statusText);
                }
              })
              .catch((err) => {
                console.error('Shadow route retry failed:', err);
              });
          } else {
            // Both failed
            setError('無法規劃路線。請稍後再試或嘗試不同的起點和目的地。');
          }
        } else {
          // Shadow route succeeded, wait for shortest route (non-blocking)
          // Shortest route will be displayed when it arrives (handled in its promise)
          await shortestPromise;
        }
        
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Check if it was user cancellation or timeout
            if (abortSignal.aborted && routeAbortControllerRef.current === null) {
              // User cancelled - error already set in handleCancelRoute
              console.log('Route computation cancelled by user');
            } else {
            setError('路線計算超時（超過 120 秒）。請嘗試較短的路線或稍後再試。');
            }
          } else {
            setError(err.message || '發生未知錯誤');
          }
        } else {
          setError('發生未知錯誤');
        }
      }
    } catch (err) {
      console.error('Route submission error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled - error already set
        console.log('Route submission cancelled');
      } else {
      const errorMessage =
        err instanceof Error ? err.message : '發生未知錯誤';
      setError(errorMessage);
      }
        // Set loading to false regardless of route fetch results
    } finally {
      // Clear abort controller
      routeAbortControllerRef.current = null;
      setLoading(false);
      setIsLoadingRouteShadows(false);
      console.log('Route submission complete, loading set to false');
    }
  };

  const handleToggleChange = (key: 'buildings' | 'shadows', value: boolean) => {
    if (key === 'buildings') {
      setShowBuildings(value);
    } else if (key === 'shadows') {
      setShowShadows(value);
    }
  };

  const routeStats: SidebarRouteStats = useMemo(() => {
    if (!routeData) return null;
    
    // Compute shadow ratio for shortest route if available
    // Only compute once when both shortestRoute and shadowData are first available
    // After computation, preserve the value even if shadowData changes (viewport changes)
    let shortestShadowRatio: string | undefined;
    let shortestTotalLength: string | undefined;
    
    if (shortestRoute) {
      // Use preserved total length if available
      shortestTotalLength = preservedShortestTotalLengthRef.current || 
        `${(shortestRoute.metadata.total_length_m / 1000).toFixed(2)} 公里`;
      
      // If we already computed the shadow ratio, use the preserved value
      if (preservedShortestShadowRatioRef.current !== null) {
        shortestShadowRatio = preservedShortestShadowRatioRef.current;
      } else if (routeShadowData && !isLoadingRouteShadows && isComputingShortestShadowRatioRef.current) {
        // Compute shadow ratio only if:
        // 1. Route shadows are loaded (routeShadowData is available)
        // 2. We're not still loading route shadows (isLoadingRouteShadows is false)
        // 3. We haven't computed it yet (isComputingShortestShadowRatioRef.current is true)
      try {
          const ratio = computeRouteShadowRatio(shortestRoute.polyline, routeShadowData);
          const computedRatio = (ratio * 100).toFixed(1);
          
          // Store the computed value - this will persist even if shadowData changes
          preservedShortestShadowRatioRef.current = computedRatio;
          isComputingShortestShadowRatioRef.current = false; // Mark as computed
          
          shortestShadowRatio = computedRatio;
          console.log('Computed shortest route shadow ratio:', computedRatio, '%');
      } catch (error) {
        console.error('Failed to compute shortest route shadow ratio:', error);
          isComputingShortestShadowRatioRef.current = false; // Mark as failed
        }
      } else if (isComputingShortestShadowRatioRef.current || isLoadingRouteShadows) {
        // Shadows not available yet, but we're waiting - show loading state
        shortestShadowRatio = '計算中';
      }
    }
    
    return {
      shadowRatio: (routeData.shadow_ratio * 100).toFixed(1),
      totalLength: `${(routeData.metadata.total_length_m / 1000).toFixed(2)} 公里`,
      shortestShadowRatio,
      shortestTotalLength,
    };
  }, [routeData, shortestRoute, routeShadowData, isLoadingRouteShadows]);

  return (
    <div className="relative flex h-screen w-screen bg-background text-foreground">
      <Sidebar
        showBuildings={showBuildings}
        showShadows={showShadows}
        onToggleChange={handleToggleChange}
        showShortestRoute={showShortestRoute}
        onToggleShortestRoute={setShowShortestRoute}
        isOpen={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        routeTime={formValues.routeTime}
        onTimeChange={(time) => handleFormChange('routeTime', time)}
      />
      <div className="relative flex-1">
        {routeCardOpen ? (
          <RoutePlanner
            isOpen={routeCardOpen}
            onClose={handleCloseRoutePlanner}
            originQuery={originQuery}
            destinationQuery={destinationQuery}
            onOriginChange={setOriginQuery}
            onDestinationChange={setDestinationQuery}
            onOriginSelect={handleOriginSelect}
            onDestinationSelect={handleDestinationSelectInRoutePlanner}
            originSuggestions={originSuggestions}
            destinationSuggestions={destinationSuggestions}
            originSuggestionsLoading={originSuggestionsLoading}
            destinationSuggestionsLoading={destinationSuggestionsLoading}
            onSwap={handleSwap}
            onSubmit={() => {
              setShowExampleHint(false);
              handleRouteSubmit();
            }}
            loading={loading}
            onCancel={handleCancelRoute}
            showShortestRoute={showShortestRoute}
            onToggleShortestRoute={setShowShortestRoute}
            formValues={formValues}
            onFormChange={handleFormChange}
            routeStats={routeStats}
            error={error}
            showExampleHint={showExampleHint}
            onDismissExampleHint={() => setShowExampleHint(false)}
          />
        ) : selectedPlace ? (
          <PlaceDetailsCard
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onRoute={handleRouteFromPlace}
            isOpen={selectedPlace !== null}
            destinationQuery={destinationQuery}
            onDestinationChange={setDestinationQuery}
            onSearch={handleSearch}
            onRouteClick={() => setRouteCardOpen(true)}
            onOptionsClick={() => setOptionsOpen(prev => !prev)}
            onPlaceSelect={handlePlaceSelect}
            suggestions={placeSuggestions}
            suggestionsLoading={suggestionsLoading}
            loading={loading}
          />
        ) : (
          <div className="fixed left-6 top-3 z-[80] w-[350px]">
            <SearchBox
              destinationQuery={destinationQuery}
              onDestinationChange={setDestinationQuery}
              onSearch={handleSearch}
              onRouteClick={() => setRouteCardOpen(true)}
              onOptionsClick={() => setOptionsOpen(prev => !prev)}
              onPlaceSelect={handlePlaceSelect}
              suggestions={placeSuggestions}
              suggestionsLoading={suggestionsLoading}
              loading={loading}
            />
          </div>
        )}
        <div className="w-full h-full">
          <MapView
            mapboxToken={mapboxToken}
            buildingsEnabled={showBuildings}
            shadowsEnabled={showShadows}
            shadowData={shadowData}
            routeData={routeData}
            shortestRoute={showShortestRoute ? shortestRoute : null}
            layoutKey={`${routeCardOpen}-${optionsOpen}-${selectedPlace !== null}`}
            selectedPlace={selectedPlace ? { lat: selectedPlace.lat, lon: selectedPlace.lon, name: selectedPlace.name } : null}
            onViewportChange={handleViewportChange}
            routeTime={formValues.routeTime}
            routeStart={routeStart}
            routeEnd={routeEnd}
            customPins={customPins}
            onPinAdd={(pin) => setCustomPins(prev => [...prev, pin])}
            onPinRemove={(pinId) => setCustomPins(prev => prev.filter(p => p.id !== pinId))}
            onExampleClick={handleExampleClick}
            routeCardOpen={routeCardOpen}
            onOriginSelect={async (lat, lon, address, placeDetails) => {
              console.log('=== onOriginSelect called ===');
              console.log('Received:', { lat, lon, address, placeDetails });
              console.log('Address value:', address);
              console.log('Place details:', placeDetails);
              
              // Update origin query and form values
              setOriginQuery(address);
              setFormValues(prev => ({ ...prev, startLat: lat, startLon: lon }));
              
              // Set route start marker (blue pin)
              setRouteStart({ lat, lon });
              
              // Track that this query corresponds to this pin
              pinOriginQueryRef.current = address.trim();
              
              // Clear any selected place and open RoutePlanner instead
              setSelectedPlace(null);
              setRouteCardOpen(true);
              
              console.log('Origin selected - RoutePlanner opened, routeStart marker set');
            }}
            onDestinationSelect={async (lat, lon, address, placeDetails) => {
              console.log('=== onDestinationSelect called ===');
              console.log('Received:', { lat, lon, address, placeDetails });
              console.log('Address value:', address);
              console.log('Place details:', placeDetails);
              
              // Update destination query and form values
              setDestinationQuery(address);
              setFormValues(prev => ({ ...prev, endLat: lat, endLon: lon }));
              
              // Set route end marker (red pin)
              setRouteEnd({ lat, lon });
              
              // Track that this query corresponds to this pin
              pinDestinationQueryRef.current = address.trim();
              
              // Don't show place details - just autofill the destination field
              // Keep RoutePlanner open if it's already open
              setSelectedPlace(null);
              
              console.log('Destination selected - form values updated, routeEnd marker set');
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
