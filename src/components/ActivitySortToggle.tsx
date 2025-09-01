import React from 'react';
import { MapPin, Star, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui';
import { SortMode } from '../hooks/useActivitySorting';

interface ActivitySortToggleProps {
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  locationLoading?: boolean;
  locationError?: string | null;
  onRequestLocation?: () => void;
  className?: string;
}

export function ActivitySortToggle({
  sortMode,
  onSortModeChange,
  locationLoading = false,
  locationError = null,
  onRequestLocation,
  className = ''
}: ActivitySortToggleProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Sort Toggle Buttons */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <Button
          variant={sortMode === 'proximity' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onSortModeChange('proximity')}
          className="flex-1 text-xs sm:text-sm flex items-center gap-1 justify-center"
          disabled={locationLoading}
        >
          {locationLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          Proximity
        </Button>
        <Button
          variant={sortMode === 'priority' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onSortModeChange('priority')}
          className="flex-1 text-xs sm:text-sm flex items-center gap-1 justify-center"
        >
          <Star className="h-3 w-3" />
          Priority
        </Button>
      </div>

      {/* Location Error State */}
      {locationError && sortMode === 'proximity' && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-yellow-800 leading-tight">
              {locationError}
            </p>
          </div>
          {onRequestLocation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRequestLocation}
              className="text-xs px-2 py-1 h-auto text-yellow-700 hover:text-yellow-900"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Sort Mode Description */}
      <p className="text-xs text-gray-500 text-center">
        {sortMode === 'proximity' ? (
          locationError ? (
            'Sorted by priority (location unavailable)'
          ) : (
            'Sorted by distance from your location'
          )
        ) : (
          'Sorted by priority level'
        )}
      </p>
    </div>
  );
}
