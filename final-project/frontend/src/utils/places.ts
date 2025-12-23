/**
 * Google Places API utilities
 * Uses Google Maps JavaScript API (no CORS issues)
 */

import { loadGoogleMapsAPI, waitForGoogleMaps, type GoogleMapsAutocompletePrediction, type GoogleMapsPlaceResult } from './googleMapsLoader';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lon: number;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  photos?: Array<{ photoReference: string; width: number; height: number }>;
  icon?: string;
  website?: string;
  phoneNumber?: string;
}

let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesService: google.maps.places.PlacesService | null = null;

/**
 * Initialize Google Maps services
 */
async function initGoogleMapsServices() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in .env'
    );
  }

  // Load API if not already loaded
  await loadGoogleMapsAPI(apiKey);
  const google = await waitForGoogleMaps();

  // Wait a bit more to ensure places library is fully initialized
  let retries = 0;
  while ((!google.maps || !google.maps.places) && retries < 10) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  // Check if places library is available
  if (!google.maps || !google.maps.places) {
    throw new Error('Google Maps Places library is not loaded. Make sure the API is loaded with libraries=places parameter and Places API is enabled in Google Cloud Console.');
  }

  if (!autocompleteService) {
    if (!google.maps.places.AutocompleteService) {
      throw new Error('AutocompleteService is not available. Make sure Places API is enabled in Google Cloud Console.');
    }
    autocompleteService = new google.maps.places.AutocompleteService();
  }

  if (!placesService) {
    if (!google.maps.places.PlacesService) {
      throw new Error('PlacesService is not available. Make sure Places API is enabled in Google Cloud Console.');
    }
    // Create a dummy div for PlacesService (it needs a map, but we don't use it)
    const dummyDiv = document.createElement('div');
    placesService = new google.maps.places.PlacesService(dummyDiv);
  }
}

/**
 * Get autocomplete suggestions as user types
 */
export async function getPlaceAutocomplete(
  input: string,
  region?: string
): Promise<PlacePrediction[]> {
  if (!input.trim()) {
    return [];
  }

  try {
    await initGoogleMapsServices();

    if (!autocompleteService) {
      throw new Error('AutocompleteService not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        language: 'zh-TW',
        types: ['establishment', 'geocode'],
      };

      if (region) {
        request.componentRestrictions = { country: region };
      }

      autocompleteService!.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          resolve(
            predictions.map((pred) => ({
              placeId: pred.place_id,
              description: pred.description,
              mainText: pred.structured_formatting.main_text,
              secondaryText: pred.structured_formatting.secondary_text || '',
            }))
          );
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Autocomplete failed: ${status}`));
        }
      });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Autocomplete request failed'));
      }
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Autocomplete request failed');
  }
}

/**
 * Get detailed information about a place
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  try {
    await initGoogleMapsServices();

    if (!placesService) {
      throw new Error('PlacesService not initialized');
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'user_ratings_total',
          'types',
          'photos',
          'icon',
          'website',
          'formatted_phone_number',
        ],
      };

      placesService!.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const location = place.geometry!.location!;
          resolve({
            placeId: place.place_id!,
            name: place.name!,
            formattedAddress: place.formatted_address!,
            lat: location.lat(),
            lon: location.lng(),
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            types: place.types,
            photos: place.photos?.map((photo) => ({
              photoReference: photo.getUrl({ maxWidth: 800, maxHeight: 600 }),
              width: photo.width,
              height: photo.height,
            })),
            icon: place.icon,
            website: place.website,
            phoneNumber: place.formatted_phone_number,
          });
        } else {
          reject(new Error(`Place details failed: ${status}`));
        }
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Place details request failed');
  }
}

/**
 * Get place details from coordinates using reverse geocoding and nearby place search
 */
export async function getPlaceDetailsFromCoordinates(
  lat: number,
  lon: number
): Promise<PlaceDetails> {
  try {
    await initGoogleMapsServices();
    
    if (!placesService) {
      throw new Error('PlacesService not initialized');
    }

    // First, try to find a nearby place using PlacesService nearbySearch
    return new Promise((resolve, reject) => {
      const google = window.google;
      if (!google || !google.maps) {
        reject(new Error('Google Maps API not loaded'));
        return;
      }
      
      const location = new google.maps.LatLng(lat, lon);
      
      const request: google.maps.places.PlaceSearchRequest = {
        location: location,
        radius: 100, // Search within 100 meters for better results
        language: 'zh-TW',
      };

      console.log('PlacesService nearbySearch called with:', { lat, lon, radius: 100 });
      placesService!.nearbySearch(request, async (results, status) => {
        console.log('nearbySearch callback:', { status, resultsCount: results?.length || 0 });
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          // Filter out generic administrative results (locality, administrative_area_level_1, etc.)
          const genericTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'political'];
          const specificPlaces = results.filter(place => 
            place.types && !place.types.some(type => genericTypes.includes(type))
          );
          
          console.log('Filtered places:', {
            total: results.length,
            specific: specificPlaces.length,
            genericTypes: results.filter(p => p.types?.some(t => genericTypes.includes(t))).map(p => ({ name: p.name, types: p.types }))
          });
          
          // Use a specific place if available, otherwise skip to reverse geocoding
          if (specificPlaces.length > 0) {
            const place = specificPlaces[0];
            console.log('Found specific nearby place:', { name: place.name, place_id: place.place_id, vicinity: place.vicinity, types: place.types });
            try {
              const details = await getPlaceDetails(place.place_id!);
              console.log('Got place details:', details);
              resolve(details);
              return;
            } catch (detailsError) {
              console.warn('Failed to get place details, using nearby search result:', detailsError);
              // If getting details fails, create a basic PlaceDetails from the nearby search result
              const location = place.geometry!.location!;
              const result = {
                placeId: place.place_id || '',
                name: place.name || '未知地點',
                formattedAddress: place.vicinity || '',
                lat: location.lat(),
                lon: location.lng(),
                rating: place.rating,
                userRatingsTotal: place.user_ratings_total,
                types: place.types,
                icon: place.icon,
              };
              console.log('Resolving with nearby search result:', result);
              resolve(result);
              return;
            }
          } else {
            console.log('Only generic administrative results found, skipping to reverse geocoding');
          }
        } else {
          console.log('No nearby places found, status:', status);
          // If no nearby place found or only generic results, use reverse geocoding
          console.log('Trying reverse geocoding for:', { lat, lon });
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ 
            location: location,
            language: 'zh-TW'
          }, (results, status) => {
            console.log('Geocoder callback:', { status, resultsCount: results?.length || 0 });
            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
              console.log('All geocoding results:', results.map(r => ({
                formatted_address: r.formatted_address,
                types: r.types
              })));
              
              // Filter out generic administrative results
              const genericTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'administrative_area_level_3', 'country', 'political'];
              const specificResults = results.filter(r => 
                r.types && !r.types.some(t => genericTypes.includes(t))
              );
              
              console.log('Filtered specific results:', {
                total: results.length,
                specific: specificResults.length,
                specificResults: specificResults.map(r => ({
                  formatted_address: r.formatted_address,
                  types: r.types
                }))
              });
              
              // Prefer most specific results (street_address > premise > route > establishment)
              const priorityOrder = ['street_address', 'premise', 'route', 'establishment', 'point_of_interest', 'subpremise'];
              let selectedResult = specificResults.length > 0 ? specificResults[0] : results[0];
              
              // Find the most specific result based on priority
              for (const priorityType of priorityOrder) {
                const found = specificResults.find(r => r.types?.includes(priorityType));
                if (found) {
                  selectedResult = found;
                  break;
                }
              }
              
              console.log('Selected result:', {
                formatted_address: selectedResult.formatted_address,
                types: selectedResult.types
              });
              
              const address = selectedResult.formatted_address || '';
              // Extract a more specific name from address components
              const streetNumber = selectedResult.address_components?.find(c => c.types.includes('street_number'))?.long_name;
              const route = selectedResult.address_components?.find(c => c.types.includes('route'))?.long_name;
              const sublocality = selectedResult.address_components?.find(c => c.types.includes('sublocality'))?.long_name;
              const name = selectedResult.address_components?.find(c => 
                c.types.some(t => ['establishment', 'point_of_interest', 'premise'].includes(t))
              )?.long_name;
              
              console.log('Address components:', {
                streetNumber,
                route,
                sublocality,
                name,
                allComponents: selectedResult.address_components?.map(c => ({
                  long_name: c.long_name,
                  short_name: c.short_name,
                  types: c.types
                }))
              });
              
              // Build display name: prefer establishment name, then street number + route, then first part of address
              let displayName = name;
              if (!displayName && streetNumber && route) {
                displayName = `${streetNumber} ${route}`;
              }
              if (!displayName && route) {
                displayName = route;
              }
              if (!displayName && sublocality) {
                displayName = sublocality;
              }
              if (!displayName) {
                // Use first meaningful part of address (skip generic parts like "Taipei")
                const addressParts = address.split(',').map(s => s.trim());
                displayName = addressParts.find(part => 
                  !part.includes('臺北') && !part.includes('台灣') && part.length > 0
                ) || addressParts[0] || address;
              }
              
              const result = {
                placeId: '',
                name: displayName,
                formattedAddress: address,
                lat: lat,
                lon: lon,
              };
              console.log('Resolving with geocoding result:', result);
              resolve(result);
            } else {
              console.error('Geocoding failed:', status);
              reject(new Error('Could not find place details for coordinates'));
            }
          });
        }
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get place details from coordinates');
  }
}

