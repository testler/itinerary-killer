import React from 'react';
import { ItineraryItem, UserLocation } from '../types';
import { ActivityCard } from './ActivityCard';
import { calculateDistance, formatDistance } from '../utils/location';

interface ActivityGridProps {
  activities: ItineraryItem[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onShowOnMap: (activity: ItineraryItem) => void;
  onDelete: (id: string) => void;
  onMarkDone?: (id: string) => void;
  userLocation?: UserLocation | null;
  loading?: boolean;
  isCompact?: boolean;
  hideDone?: boolean;
}

export function ActivityGrid({
  activities,
  onToggleComplete,
  onShowOnMap,
  onDelete,
  onMarkDone,
  userLocation,
  loading = false,
  isCompact = false,
  hideDone = true
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

  // Filter activities based on hideDone setting
  const visibleActivities = hideDone ? activities.filter(activity => !activity.done) : activities;

  if (visibleActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-primary mb-2">
          {activities.length === 0 ? 'No activities yet' : 'No activities to show'}
        </h3>
        <p className="text-secondary mb-6">
          {activities.length === 0 
            ? 'Start planning your Orlando adventure by adding your first activity.'
            : hideDone 
              ? 'All activities are marked as done. Toggle the filter to see completed activities.'
              : 'No activities match the current filters.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={`
      grid gap-4 
      ${isCompact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'}
    `}>
      {visibleActivities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onToggleComplete={onToggleComplete}
          onShowOnMap={onShowOnMap}
          onDelete={onDelete}
          onMarkDone={onMarkDone}
          distance={getDistanceFromUser(activity)}
          isCompact={isCompact}
        />
      ))}
    </div>
  );
}
