import React, { useState } from 'react';
import { RefreshCw, MapPin, AlertCircle } from 'lucide-react';
import { Button, Badge } from './ui';

interface LocationRefreshButtonProps {
  onRefreshLocation: () => Promise<void>;
  onRefreshAllActivities: () => Promise<void>;
  hasLocation: boolean;
  isLoading?: boolean;
}

export function LocationRefreshButton({
  onRefreshLocation,
  onRefreshAllActivities,
  hasLocation,
  isLoading = false
}: LocationRefreshButtonProps) {
  const [refreshing, setRefreshing] = useState<'location' | 'activities' | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleRefreshLocation = async () => {
    setRefreshing('location');
    try {
      await onRefreshLocation();
    } finally {
      setRefreshing(null);
      setShowOptions(false);
    }
  };

  const handleRefreshActivities = async () => {
    setRefreshing('activities');
    try {
      await onRefreshAllActivities();
    } finally {
      setRefreshing(null);
      setShowOptions(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant={hasLocation ? "secondary" : "primary"}
        size="sm"
        onClick={() => setShowOptions(!showOptions)}
        icon={hasLocation ? RefreshCw : MapPin}
        loading={isLoading}
        className="relative"
      >
        {hasLocation ? 'Refresh' : 'Get Location'}
        {!hasLocation && (
          <Badge variant="error" className="absolute -top-1 -right-1 w-3 h-3 p-0 text-xs">
            !
          </Badge>
        )}
      </Button>

      {showOptions && hasLocation && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-dropdown">
          <div className="p-2">
            <button
              onClick={handleRefreshLocation}
              disabled={refreshing === 'location'}
              className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <MapPin size={18} className="text-primary flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">Refresh My Location</div>
                <div className="text-xs text-secondary">Update your current position</div>
              </div>
              {refreshing === 'location' && (
                <RefreshCw size={16} className="animate-spin text-primary ml-auto" />
              )}
            </button>
            
            <button
              onClick={handleRefreshActivities}
              disabled={refreshing === 'activities'}
              className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className="text-primary flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">Refresh All Activities</div>
                <div className="text-xs text-secondary">Update location data for all activities</div>
              </div>
              {refreshing === 'activities' && (
                <RefreshCw size={16} className="animate-spin text-primary ml-auto" />
              )}
            </button>
          </div>
          
          <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-warning-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-secondary">
                Refreshing activities will update their coordinates and may affect distances and map positions.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {showOptions && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}
