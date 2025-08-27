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
