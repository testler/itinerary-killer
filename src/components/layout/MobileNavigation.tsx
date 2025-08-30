import React from 'react';
import { MapPin, List, Filter, Settings, X } from 'lucide-react';
import { Button } from '../ui';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'map' | 'list';
  onViewChange: (view: 'map' | 'list') => void;
  onFilterToggle: () => void;
  showFilters: boolean;
}

export function MobileNavigation({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  onFilterToggle,
  showFilters
}: MobileNavigationProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-overlay z-modal-backdrop lg:hidden"
        onClick={onClose}
      />
      
      {/* Navigation Panel */}
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl z-modal lg:hidden transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 safe-top">
          <h2 className="text-lg font-semibold text-primary">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 rounded-full"
          >
            <X size={20} />
          </Button>
        </div>
        
        {/* Navigation Items */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => onViewChange('map')}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
              ${currentView === 'map' 
                ? 'bg-primary text-white' 
                : 'hover:bg-gray-100 text-gray-700'
              }
            `}
          >
            <MapPin size={20} />
            <span className="font-medium">Map View</span>
          </button>
          
          <button
            onClick={() => onViewChange('list')}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
              ${currentView === 'list' 
                ? 'bg-primary text-white' 
                : 'hover:bg-gray-100 text-gray-700'
              }
            `}
          >
            <List size={20} />
            <span className="font-medium">List View</span>
          </button>
          
          <button
            onClick={onFilterToggle}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
              ${showFilters 
                ? 'bg-primary text-white' 
                : 'hover:bg-gray-100 text-gray-700'
              }
            `}
          >
            <Filter size={20} />
            <span className="font-medium">Filters</span>
          </button>
          
          <div className="border-t border-gray-200 my-4" />
          
          <button className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-100 text-gray-700 transition-colors">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50 safe-bottom">
          <p className="text-xs text-secondary text-center">
            Plan your perfect Orlando adventure
          </p>
        </div>
      </div>
    </>
  );
}
