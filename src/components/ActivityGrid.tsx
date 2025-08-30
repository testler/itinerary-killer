import React from 'react';
import { ItineraryItem, UserLocation } from '../types';
import { ActivityCard } from './ActivityCard';
import { calculateDistance, formatDistance } from '../utils/location';

interface ActivityGridProps {
  activities: ItineraryItem[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onShowOnMap: (activity: ItineraryItem) => void;
  onDelete: (id: string) => void;
  userLocation?: UserLocation | null;
  loading?: boolean;
  isCompact?: boolean;
}

export function ActivityGrid({
  activities,
  onToggleComplete,
  onShowOnMap,
  onDelete,
  userLocation,
  loading = false,
  isCompact = false
}: ActivityGridProps) {
  const getDistanceFromUser = (activity: ItineraryItem): string | undefined => {
    if (!userLocation) return undefined;
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      activity.location.lat,
      activity.location.lng
    );
    
    return formatDistance(distance);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-xl h-48"></div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-primary mb-2">No activities yet</h3>
        <p className="text-secondary mb-6">Start planning your Orlando adventure by adding your first activity.</p>
      </div>
    );
  }

  return (
    <div className={`
      grid gap-4 
      ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'}
    `}>
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onToggleComplete={onToggleComplete}
          onShowOnMap={onShowOnMap}
          onDelete={onDelete}
          distance={getDistanceFromUser(activity)}
          isCompact={isCompact}
        />
      ))}
    </div>
  );
}
