import React from 'react';
import { ItineraryItem } from '../types';
import { ActivityCard } from './ActivityCard';
import { CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from './ui';

interface DoneActivitiesViewProps {
  doneActivities: ItineraryItem[];
  onRestoreActivity: (id: string) => void;
  onShowOnMap: (activity: ItineraryItem) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  className?: string;
}

export function DoneActivitiesView({
  doneActivities,
  onRestoreActivity,
  onShowOnMap,
  onDelete,
  loading = false,
  className = ''
}: DoneActivitiesViewProps) {
  // Sort done activities by completion date (newest first)
  const sortedDoneActivities = [...doneActivities].sort((a, b) => {
    if (!a.completedAt && !b.completedAt) return 0;
    if (!a.completedAt) return 1;
    if (!b.completedAt) return -1;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });

  const handleToggleComplete = (id: string, completed: boolean) => {
    // In the done view, "completing" means restoring (undoing the done status)
    if (!completed) {
      onRestoreActivity(id);
    }
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedDoneActivities.length === 0) {
    return (
      <div className={`${className} text-center py-12`}>
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-primary mb-2">No completed activities</h3>
        <p className="text-secondary mb-6">
          Activities you mark as done will appear here. You can restore them anytime.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <div>
          <h2 className="text-xl font-semibold text-primary">Done Activities</h2>
          <p className="text-sm text-secondary">
            {sortedDoneActivities.length} completed • Most recent first
          </p>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
        {sortedDoneActivities.map((activity) => (
          <div key={activity.id} className="relative">
            <ActivityCard
              activity={activity}
              onToggleComplete={handleToggleComplete}
              onShowOnMap={onShowOnMap}
              onDelete={onDelete}
              isCompact
            />
            
            {/* Restore Button Overlay */}
            <div className="absolute top-2 right-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestoreActivity(activity.id)}
                className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm hover:bg-white p-2 rounded-full"
                title="Restore activity"
              >
                <RotateCcw className="h-4 w-4 text-blue-600" />
              </Button>
            </div>

            {/* Completion timestamp */}
            {activity.completedAt && (
              <div className="absolute bottom-2 right-2">
                <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Completed {new Date(activity.completedAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      {sortedDoneActivities.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-secondary">
              Completed activities are kept for your records
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (confirm(`Restore all ${sortedDoneActivities.length} completed activities?`)) {
                  sortedDoneActivities.forEach(activity => {
                    onRestoreActivity(activity.id);
                  });
                }
              }}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restore All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
