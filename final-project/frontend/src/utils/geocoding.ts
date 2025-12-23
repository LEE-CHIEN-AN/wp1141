/**
 * Google Geocoding API utility
 * Converts addresses/place names to coordinates
 */

export interface GeocodeResult {
  lat: number;
  lon: number;
  formattedAddress: string;
  placeId?: string;
}

export interface GeocodeError {
  message: string;
  code?: string;
}

/**
 * Geocode a query string using Google Geocoding API
 * @param query - Address or place name (e.g., "台大管理學院")
 * @param region - Optional region bias (e.g., "tw" for Taiwan)
 * @returns GeocodeResult with coordinates and formatted address
 */
export async function geocode(
  query: string,
  region?: string
): Promise<GeocodeResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in .env'
    );
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'zh-TW'); // Traditional Chinese

  // Region bias for better results in Taiwan
  if (region) {
    url.searchParams.set('region', region);
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw new Error(`找不到地點: "${query}"`);
    }

    if (data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || ''}`);
    }

    if (!data.results || data.results.length === 0) {
      throw new Error(`找不到地點: "${query}"`);
    }

    // Use the first result (most relevant)
    const result = data.results[0];
    const location = result.geometry.location;

    return {
      lat: location.lat,
      lon: location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Geocoding request failed');
  }
}

/**
 * Reverse geocode: convert coordinates to address
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Formatted address string
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in .env'
    );
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lon}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'zh-TW');
  // Request specific result types to avoid generic administrative results
  url.searchParams.set('result_type', 'street_address|premise|establishment|point_of_interest|subpremise|route');

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error('無法取得地址');
    }

    // Prefer more specific results (street_address, premise) over generic ones (locality, administrative_area_level_1)
    const specificResult = data.results.find((result: any) => 
      result.types?.some((type: string) => 
        ['street_address', 'premise', 'establishment', 'point_of_interest', 'subpremise', 'route'].includes(type)
      )
    ) || data.results[0];

    return specificResult.formatted_address;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Reverse geocoding request failed');
  }
}

