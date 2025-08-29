export interface Location {
  lat: number;
  lng: number;
}

export interface ItineraryItem {
  id: string;
  title: string;
  description: string;
  location: Location;
  address: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in minutes
  cost: number;
  notes: string;
  isOpen: boolean; // whether the place is currently open
  openingHours?: {
    [day: string]: { open: string; close: string } | null;
  };
  createdAt: Date;
  completed: boolean;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: Date;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
