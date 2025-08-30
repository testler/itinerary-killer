import { useState } from 'react';
import { ItineraryItem, Location } from '../types';
import { geocodeAddress } from '../utils/location';

export function useGeolocationRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const refreshActivityLocation = async (activity: ItineraryItem): Promise<ItineraryItem | null> => {
    try {
      // Create a search query from activity details
      const searchQuery = `${activity.title}, ${activity.address || 'Orlando, FL'}`;
      
      // Try to geocode the activity
      const newLocation = await geocodeAddress(searchQuery);
      
      if (newLocation) {
        return {
          ...activity,
          location: newLocation,
          lastLocationUpdate: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to refresh location for ${activity.title}:`, error);
      return null;
    }
  };

  const refreshAllActivities = async (
    activities: ItineraryItem[],
    updateCallback: (updatedActivity: ItineraryItem) => void
  ): Promise<{ success: number; failed: number }> => {
    setRefreshing(true);
    let success = 0;
    let failed = 0;

    try {
      // Process activities in batches to avoid overwhelming the geocoding service
      const batchSize = 3;
      const batches = [];
      
      for (let i = 0; i < activities.length; i += batchSize) {
        batches.push(activities.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const promises = batch.map(async (activity) => {
          try {
            const updatedActivity = await refreshActivityLocation(activity);
            if (updatedActivity) {
              updateCallback(updatedActivity);
              success++;
            } else {
              failed++;
            }
          } catch (error) {
            console.error(`Failed to refresh ${activity.title}:`, error);
            failed++;
          }
        });

        await Promise.all(promises);
        
        // Small delay between batches to be respectful to the geocoding service
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return { success, failed };
    } finally {
      setRefreshing(false);
    }
  };

  const refreshSingleActivity = async (
    activity: ItineraryItem
  ): Promise<ItineraryItem | null> => {
    setRefreshing(true);
    try {
      return await refreshActivityLocation(activity);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refreshing,
    refreshAllActivities,
    refreshSingleActivity,
    refreshActivityLocation
  };
}
