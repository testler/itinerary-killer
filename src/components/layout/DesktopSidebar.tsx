import React from 'react';
import { MapPin, List, Filter, Settings, Plus, Upload, Trash2 } from 'lucide-react';
import { Button } from '../ui';

interface DesktopSidebarProps {
  currentView: 'map' | 'list';
  onViewChange: (view: 'map' | 'list') => void;
  onFilterToggle: () => void;
  onAddActivity: () => void;
  onImportJson: () => void;
  onDeleteDuplicates: () => void;
  showFilters: boolean;
  totalActivities: number;
  children: React.ReactNode;
}

export function DesktopSidebar({
  currentView,
  onViewChange,
  onFilterToggle,
  onAddActivity,
  onImportJson,
  onDeleteDuplicates,
  showFilters,
  totalActivities,
  children
}: DesktopSidebarProps) {
  return (
    <div className="hidden lg:flex lg:w-96 xl:w-[28rem] 2xl:w-[32rem] bg-white border-r border-gray-200 flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <MapPin size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Itinerary Killer</h1>
            <p className="text-sm text-secondary">Plan your perfect Orlando adventure</p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={onAddActivity}
            icon={Plus}
            className="flex-1"
          >
            Add Activity
          </Button>
          <Button
            variant="secondary"
            onClick={onImportJson}
            icon={Upload}
            size="sm"
            className="px-3"
            title="Import JSON"
          >
          </Button>
          <Button
            variant="secondary"
            onClick={onDeleteDuplicates}
            icon={Trash2}
            size="sm"
            className="px-3"
            title="Delete Duplicates"
          >
          </Button>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewChange('map')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors
              ${currentView === 'map' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
              }
            `}
          >
            <MapPin size={16} />
            Map
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors
              ${currentView === 'list' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
              }
            `}
          >
            <List size={16} />
            List
          </button>
        </div>
        
        <Button
          variant="ghost"
          onClick={onFilterToggle}
          icon={Filter}
          className="w-full mt-2 justify-start"
        >
          Filters {showFilters && '(Active)'}
        </Button>
      </div>
      
      {/* Activity count */}
      {totalActivities > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-secondary">
            {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} planned
          </p>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <Button
          variant="ghost"
          icon={Settings}
          className="w-full justify-start text-sm"
        >
          Settings
        </Button>
      </div>
    </div>
  );
}
