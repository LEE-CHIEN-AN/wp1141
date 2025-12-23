/**
 * Google Maps JavaScript API loader
 * Handles loading the API and provides typed access to services
 */

/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google: typeof google;
  }
}

export interface GoogleMapsAutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GoogleMapsPlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat(): number;
      lng(): number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: Array<{
    getUrl(opts?: { maxWidth?: number; maxHeight?: number }): string;
    width: number;
    height: number;
  }>;
  icon?: string;
  website?: string;
  formatted_phone_number?: string;
}

/**
 * Wait for Google Maps API to load
 */
export function waitForGoogleMaps(): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkInterval);
        resolve(window.google);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Google Maps API failed to load'));
    }, 10000);
  });
}

/**
 * Load Google Maps API script dynamically
 */
export function loadGoogleMapsAPI(apiKey: string): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      waitForGoogleMaps().then(resolve).catch(reject);
      return;
    }

    // Create and load script
    // Note: DirectionsService is part of the core Maps JavaScript API, no separate library needed
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=zh-TW&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => waitForGoogleMaps().then(resolve).catch(reject);
    script.onerror = () => reject(new Error('Failed to load Google Maps API. Make sure Maps JavaScript API is enabled in Google Cloud Console.'));
    document.head.appendChild(script);
  });
}

