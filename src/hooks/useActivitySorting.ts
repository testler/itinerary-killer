import { useState, useEffect, useMemo } from 'react';
import { ItineraryItem, UserLocation } from '../types';
import { calculateDistance } from '../utils/location';

export type SortMode = 'proximity' | 'priority';

interface UseActivitySortingProps {
  activities: ItineraryItem[];
  userLocation: UserLocation | null;
  defaultSortMode?: SortMode;
  units?: 'metric' | 'imperial';
}

interface UseActivitySortingReturn {
  sortedActivities: ItineraryItem[];
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  locationLoading: boolean;
  locationError: string | null;
  requestLocation: () => void;
}

export function useActivitySorting({ 
  activities, 
  userLocation: providedUserLocation,
  defaultSortMode = 'proximity',
  units = 'imperial'
}: UseActivitySortingProps): UseActivitySortingReturn {
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem('activity-sort-mode');
      return (saved as SortMode) || defaultSortMode;
    } catch {
      return defaultSortMode;
    }
  });
  
  const [userLocation, setUserLocation] = useState<UserLocation | null>(providedUserLocation);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Update user location when provided location changes
  useEffect(() => {
    setUserLocation(providedUserLocation);
  }, [providedUserLocation]);

  // Save sort mode to localStorage
  const handleSetSortMode = (mode: SortMode) => {
    setSortMode(mode);
    try {
      localStorage.setItem('activity-sort-mode', mode);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Request user location for proximity sorting
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        };
        
        setUserLocation(newLocation);
        setLocationLoading(false);
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Enable location permissions to sort by proximity.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        setLocationError(errorMessage);
        setLocationLoading(false);
        
        // If proximity sorting fails, don't automatically switch to priority
        // Let user manually switch if they want
      },
      {
        enableHighAccuracy: false, // Use network location for faster results
        timeout: 10000, // 10 second timeout
        maximumAge: 300000 // Accept 5-minute old position
      }
    );
  };

  // Auto-request location on mount if proximity mode is selected and no location is available
  useEffect(() => {
    if (sortMode === 'proximity' && !userLocation && !locationLoading && !locationError) {
      requestLocation();
    }
  }, [sortMode, userLocation, locationLoading, locationError]);

  // Memoized sorted activities
  const sortedActivities = useMemo(() => {
    if (activities.length === 0) return [];

    if (sortMode === 'proximity' && userLocation) {
      // Calculate distances and sort by proximity
      const activitiesWithDistance = activities.map(activity => {
        let distance = Infinity;
        let hasValidCoords = false;
        
        if (activity.location?.lat && activity.location?.lng) {
          try {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              activity.location.lat,
              activity.location.lng,
              units
            );
            hasValidCoords = true;
          } catch {
            // Distance calculation failed, keep as Infinity
          }
        }
        
        return {
          ...activity,
          distance,
          hasValidCoords
        };
      });

      // Sort: valid coordinates first (by distance), then invalid coordinates (by priority)
      return activitiesWithDistance.sort((a, b) => {
        // Both have valid coordinates - sort by distance
        if (a.hasValidCoords && b.hasValidCoords) {
          return a.distance - b.distance;
        }
        
        // Only one has valid coordinates - prioritize the valid one
        if (a.hasValidCoords && !b.hasValidCoords) return -1;
        if (!a.hasValidCoords && b.hasValidCoords) return 1;
        
        // Neither has valid coordinates - sort by priority then creation date
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // Same priority - sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Sort by priority (fallback or when priority mode is selected)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return [...activities].sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Same priority - sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activities, sortMode, userLocation]);

  return {
    sortedActivities,
    sortMode,
    setSortMode: handleSetSortMode,
    locationLoading,
    locationError,
    requestLocation
  };
}
