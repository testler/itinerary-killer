// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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

// Format distance for display
export function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)} ft`;
  } else if (distance < 1) {
    return `${Math.round(distance * 5280 / 100) * 100} ft`;
  } else {
    return `${distance.toFixed(1)} mi`;
  }
}

// Fetch place details (including opening hours) from Google Places API
export async function fetchPlaceDetailsFromGoogle(name: string, address: string): Promise<any> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  // Step 1: Find place_id using Place Search
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name + ' ' + address)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
  const searchResp = await fetch(searchUrl);
  const searchData = await searchResp.json();
  if (!searchData.candidates || !searchData.candidates[0]?.place_id) {
    throw new Error('No place found');
  }
  const placeId = searchData.candidates[0].place_id;

  // Step 2: Get place details (including opening_hours)
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,opening_hours,formatted_address&key=${apiKey}`;
  const detailsResp = await fetch(detailsUrl);
  const detailsData = await detailsResp.json();
  if (detailsData.status !== 'OK') {
    throw new Error('Failed to fetch place details');
  }
  return detailsData.result;
}

export async function fetchPlaceAutocomplete(input: string): Promise<Array<{ description: string; place_id: string }>> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error('Autocomplete failed');
  }
  return (data.predictions || []).map((p: any) => ({ description: p.description, place_id: p.place_id }));
}

export async function fetchPlaceDetailsByPlaceId(placeId: string): Promise<any> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const fields = [
    'name',
    'formatted_address',
    'geometry/location',
    'opening_hours',
    'types',
    'editorial_summary'
  ].join(',');
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const detailsResp = await fetch(detailsUrl);
  const detailsData = await detailsResp.json();
  if (detailsData.status !== 'OK') {
    throw new Error('Failed to fetch place details');
  }
  return detailsData.result;
}