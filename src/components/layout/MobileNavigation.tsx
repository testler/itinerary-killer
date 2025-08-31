import React, { useEffect } from 'react';
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
  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
        onClick={onClose}
        style={{ 
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      />
      
      {/* Navigation Panel */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-xl z-50 lg:hidden transform transition-transform duration-300 flex flex-col"
           style={{ 
             touchAction: 'auto',
             overscrollBehavior: 'contain'
           }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0" 
             style={{ paddingTop: `calc(1rem + env(safe-area-inset-top))` }}>
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-target"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        
        {/* Navigation Items - Scrollable */}
        <div className="flex-1 overflow-y-auto" 
             style={{ 
               WebkitOverflowScrolling: 'touch',
               overscrollBehavior: 'contain'
             }}>
          <div className="p-4 space-y-2">
            <button
              onClick={() => {
                onViewChange('map');
                onClose();
              }}
              className={`
                w-full flex items-center gap-3 p-4 rounded-lg text-left transition-colors touch-target
                ${currentView === 'map' 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'hover:bg-gray-100 text-gray-700 active:bg-gray-200'
                }
              `}
              style={{ minHeight: '56px' }}
            >
              <MapPin size={20} className="flex-shrink-0" />
              <span className="font-medium text-base">Map View</span>
            </button>
            
            <button
              onClick={() => {
                onViewChange('list');
                onClose();
              }}
              className={`
                w-full flex items-center gap-3 p-4 rounded-lg text-left transition-colors touch-target
                ${currentView === 'list' 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'hover:bg-gray-100 text-gray-700 active:bg-gray-200'
                }
              `}
              style={{ minHeight: '56px' }}
            >
              <List size={20} className="flex-shrink-0" />
              <span className="font-medium text-base">List View</span>
            </button>
            
            <button
              onClick={() => {
                onFilterToggle();
                onClose();
              }}
              className={`
                w-full flex items-center gap-3 p-4 rounded-lg text-left transition-colors touch-target
                ${showFilters 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'hover:bg-gray-100 text-gray-700 active:bg-gray-200'
                }
              `}
              style={{ minHeight: '56px' }}
            >
              <Filter size={20} className="flex-shrink-0" />
              <span className="font-medium text-base">Filters</span>
            </button>
            
            <div className="border-t border-gray-200 my-4" />
            
            <button 
              className="w-full flex items-center gap-3 p-4 rounded-lg text-left hover:bg-gray-100 text-gray-700 transition-colors touch-target active:bg-gray-200"
              style={{ minHeight: '56px' }}
            >
              <Settings size={20} className="flex-shrink-0" />
              <span className="font-medium text-base">Settings</span>
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50" 
             style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}>
          <p className="text-xs text-gray-500 text-center">
            Plan your perfect Orlando adventure
          </p>
        </div>
      </div>
    </>
  );
}
