/**
 * Google Directions API utility
 * Uses Google Maps JavaScript API (no CORS issues)
 */

import { loadGoogleMapsAPI, waitForGoogleMaps } from './googleMapsLoader';

export interface RouteLeg {
  distance: { text: string; value: number }; // meters
  duration: { text: string; value: number }; // seconds
  start_address: string;
  end_address: string;
  steps: RouteStep[];
}

export interface RouteStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  html_instructions: string;
  polyline: { points: string };
  travel_mode: string;
}

export interface DirectionsResult {
  routes: Array<{
    legs: RouteLeg[];
    overview_polyline: { points: string };
    summary: string;
    warnings: string[];
  }>;
  status: string;
}

/**
 * Get directions between two points using Google Directions Service
 */
export async function getDirections(
  origin: { lat: number; lon: number } | string,
  destination: { lat: number; lon: number } | string,
  mode: 'walking' | 'driving' | 'bicycling' | 'transit' = 'walking'
): Promise<DirectionsResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not found');
  }

  try {
    await loadGoogleMapsAPI(apiKey);
    const google = await waitForGoogleMaps();

    // Wait a bit more to ensure all services are fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));

    // Ensure DirectionsService is available
    if (!google?.maps?.DirectionsService) {
      throw new Error('DirectionsService is not available. Make sure Maps JavaScript API and Directions API are both enabled in Google Cloud Console.');
    }

    // Additional check to ensure the constructor exists
    if (typeof google.maps.DirectionsService !== 'function') {
      throw new Error('DirectionsService constructor is not available. Please refresh the page and ensure Directions API is enabled.');
    }

    return new Promise((resolve, reject) => {
      const directionsService = new google.maps.DirectionsService();

      // Format origin
      const originValue: google.maps.LatLng | string =
        typeof origin === 'string'
          ? origin
          : new google.maps.LatLng(origin.lat, origin.lon);

      // Format destination
      const destinationValue: google.maps.LatLng | string =
        typeof destination === 'string'
          ? destination
          : new google.maps.LatLng(destination.lat, destination.lon);

      const request: google.maps.DirectionsRequest = {
        origin: originValue,
        destination: destinationValue,
        travelMode: google.maps.TravelMode[mode.toUpperCase() as keyof typeof google.maps.TravelMode],
        language: 'zh-TW',
        provideRouteAlternatives: true,
      };

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          // Convert Google's result format to our interface
          const routes = result.routes.map((route, index) => {
            // Google's overview_polyline can be either:
            // 1. An object with an 'encoded' property (string) - standard case
            // 2. A string directly (the encoded polyline) - some API versions
            const overviewPoly = route.overview_polyline;
            
            // Handle both cases: object with .encoded or string directly
            let encodedPolyline = '';
            if (typeof overviewPoly === 'string') {
              // If it's already a string, use it directly
              encodedPolyline = overviewPoly;
            } else if (overviewPoly && typeof overviewPoly === 'object') {
              // If it's an object, try to get the encoded property
              // Google Maps API uses .encoded property (string)
              // Also check if it has a getEncodedPath method (Polyline object)
              const polyObj = overviewPoly as any;
              encodedPolyline = polyObj.encoded || 
                               (typeof polyObj.getEncodedPath === 'function' ? polyObj.getEncodedPath() : '') ||
                               '';
            }
            
            if (!encodedPolyline) {
              console.error(`Route ${index} missing encoded polyline:`, {
                hasOverviewPolyline: !!overviewPoly,
                overviewPolyline: overviewPoly,
                overviewPolyType: typeof overviewPoly,
                routeKeys: Object.keys(route)
              });
            } else {
              console.log(`Route ${index} has encoded polyline, length:`, encodedPolyline.length);
            }
            
            return {
            legs: route.legs.map((leg) => ({
              distance: {
                text: leg.distance?.text || '',
                value: leg.distance?.value || 0,
              },
              duration: {
                text: leg.duration?.text || '',
                value: leg.duration?.value || 0,
              },
              start_address: leg.start_address || '',
              end_address: leg.end_address || '',
              steps: leg.steps.map((step) => ({
                distance: {
                  text: step.distance?.text || '',
                  value: step.distance?.value || 0,
                },
                duration: {
                  text: step.duration?.text || '',
                  value: step.duration?.value || 0,
                },
                html_instructions: step.instructions || '',
                polyline: {
                  points: step.polyline?.encoded || '',
                },
                travel_mode: step.travel_mode || '',
              })),
            })),
            overview_polyline: {
                points: encodedPolyline,
            },
            summary: route.summary || '',
            warnings: route.warnings || [],
            };
          });

          resolve({
            routes,
            status: 'OK',
          });
        } else {
          reject(new Error(`Directions failed: ${status}`));
        }
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Directions request failed');
  }
}

/**
 * Decode Google's polyline string to coordinates
 * Returns array of [lat, lon] pairs
 */
export function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    // Decode longitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

