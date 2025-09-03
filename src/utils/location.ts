// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  units: 'metric' | 'imperial' = 'imperial'
): number {
  const R = units === 'metric' ? 6371 : 3959; // Earth's radius in km or miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Format distance with appropriate units
export function formatDistance(distance: number, units: 'metric' | 'imperial' = 'imperial'): string {
  if (units === 'metric') {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  } else {
    if (distance < 1) {
      return `${Math.round(distance * 5280)}ft`;
    } else {
      return `${distance.toFixed(1)}mi`;
    }
  }
}

// Convert coordinates to address using reverse geocoding
export async function getAddressFromCoordinates(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Error getting address:', error);
    return 'Unknown location';
  }
}

// Get coordinates from address using geocoding
export async function getCoordinatesFromAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
}

// Alias for backwards compatibility
export const geocodeAddress = getCoordinatesFromAddress;

// Check if a location is within Orlando area
export function isInOrlandoArea(lat: number, lng: number): boolean {
  // Orlando area bounds (approximate)
  const orlandoBounds = {
    north: 28.8,
    south: 28.3,
    east: -81.0,
    west: -81.6
  };
  
  return lat >= orlandoBounds.south && 
         lat <= orlandoBounds.north && 
         lng >= orlandoBounds.west && 
         lng <= orlandoBounds.east;
}



// Fetch place details (including opening hours) from Google Places API via proxy
export async function fetchPlaceDetailsFromGoogle(name: string, address: string): Promise<any> {
  const proxyBase = (import.meta as any).env?.VITE_GOOGLE_PROXY_BASE || '';
  const endpoint = '/maps/api/place/findplacefromtext/json';
  const url = `${proxyBase}?endpoint=${encodeURIComponent(endpoint)}&input=${encodeURIComponent(
    name + ' ' + address
  )}&inputtype=textquery&fields=place_id`;
  const searchResp = await fetch(url);
  const searchData = await searchResp.json();
  if (!searchData.candidates || !searchData.candidates[0]?.place_id) {
    throw new Error('No place found');
  }
  const placeId = searchData.candidates[0].place_id;

  const detailsEndpoint = '/maps/api/place/details/json';
  const detailsUrl = `${proxyBase}?endpoint=${encodeURIComponent(
    detailsEndpoint
  )}&place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(
    'name,opening_hours,formatted_address,geometry/location,types,editorial_summary,rating,user_ratings_total,price_level,business_status'
  )}`;
  const detailsResp = await fetch(detailsUrl);
  const detailsData = await detailsResp.json();
  if (detailsData.status !== 'OK') {
    throw new Error('Failed to fetch place details');
  }
  return detailsData.result;
}

// Get nearby places using Google Places API
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  radius: number = 5000,
  type?: string
): Promise<Array<{
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  types: string[];
  geometry: { location: { lat: number; lng: number } };
}>> {
  const proxyBase = (import.meta as any).env?.VITE_GOOGLE_PROXY_BASE || '';
  const endpoint = '/maps/api/place/nearbysearch/json';
  
  let url = `${proxyBase}?endpoint=${encodeURIComponent(endpoint)}&location=${lat},${lng}&radius=${radius}`;
  
  if (type) {
    url += `&type=${encodeURIComponent(type)}`;
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error('Failed to fetch nearby places');
    }
    
    return (data.results || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      rating: place.rating,
      types: place.types || [],
      geometry: place.geometry
    }));
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
}

// Enhanced place search with better filtering
export async function searchPlaces(
  query: string,
  location?: { lat: number; lng: number },
  radius: number = 50000
): Promise<Array<{
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  types: string[];
  geometry: { location: { lat: number; lng: number } };
}>> {
  const proxyBase = (import.meta as any).env?.VITE_GOOGLE_PROXY_BASE || '';
  const endpoint = '/maps/api/place/textsearch/json';
  
  let url = `${proxyBase}?endpoint=${encodeURIComponent(endpoint)}&query=${encodeURIComponent(query)}`;
  
  if (location) {
    url += `&location=${location.lat},${location.lng}&radius=${radius}`;
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error('Failed to search places');
    }
    
    return (data.results || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      rating: place.rating,
      types: place.types || [],
      geometry: place.geometry
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

export async function fetchPlaceAutocomplete(input: string): Promise<Array<{ description: string; place_id: string }>> {
  const proxyBase = (import.meta as any).env?.VITE_GOOGLE_PROXY_BASE || '';
  const endpoint = '/maps/api/place/autocomplete/json';
  const url = `${proxyBase}?endpoint=${encodeURIComponent(endpoint)}&input=${encodeURIComponent(input)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error('Autocomplete failed');
  }
  return (data.predictions || []).map((p: any) => ({ description: p.description, place_id: p.place_id }));
}

export async function fetchPlaceDetailsByPlaceId(placeId: string): Promise<any> {
  const proxyBase = (import.meta as any).env?.VITE_GOOGLE_PROXY_BASE || '';
  const endpoint = '/maps/api/place/details/json';
  const fields = [
    'name',
    'formatted_address',
    'geometry/location',
    'opening_hours',
    'types',
    'editorial_summary',
    'rating',
    'user_ratings_total',
    'price_level',
    'website',
    'formatted_phone_number',
    'international_phone_number',
    'url',
    'photos',
    'reviews',
    'business_status',
    'wheelchair_accessible_entrance',
    'delivery',
    'dine_in',
    'takeout',
    'reservable',
    'serves_beer',
    'serves_wine',
    'outdoor_seating'
  ].join(',');
  const detailsUrl = `${proxyBase}?endpoint=${encodeURIComponent(endpoint)}&place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(fields)}`;
  const detailsResp = await fetch(detailsUrl);
  const detailsData = await detailsResp.json();
  if (detailsData.status !== 'OK') {
    throw new Error('Failed to fetch place details');
  }
  return detailsData.result;
}