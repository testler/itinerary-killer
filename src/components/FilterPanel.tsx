import React from 'react';
import { ItineraryItem } from '../types';
import { Card, Button } from './ui';
import { X, Filter, Check } from 'lucide-react';

export interface FilterOptions {
  categories: string[];
  priorities: string[];
  completionStatus: 'all' | 'completed' | 'incomplete';
  showDone: boolean;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  durationRange: {
    min: number | null;
    max: number | null;
  };
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  activities: ItineraryItem[];
  className?: string;
}

export function FilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  activities,
  className = ''
}: FilterPanelProps) {
  // Get unique categories and priorities from activities
  const availableCategories = [...new Set(activities.map(a => a.category))].sort();
  const availablePriorities = ['high', 'medium', 'low'];

  const updateFilters = (updates: Partial<FilterOptions>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const togglePriority = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    updateFilters({ priorities: newPriorities });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      priorities: [],
      completionStatus: 'all',
      showDone: true,
      priceRange: { min: null, max: null },
      durationRange: { min: null, max: null }
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.completionStatus !== 'all') count++;
    if (!filters.showDone) count++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
    if (filters.durationRange.min !== null || filters.durationRange.max !== null) count++;
    return count;
  };

  if (!isOpen) return null;

  return (
    <div className={`${className}`}>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-primary">Filters</h3>
            {getActiveFilterCount() > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Categories */}
          {availableCategories.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`
                      px-3 py-1.5 text-xs rounded-full border transition-colors
                      ${filters.categories.includes(category)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }
                    `}
                  >
                    {filters.categories.includes(category) && (
                      <Check className="inline h-3 w-3 mr-1" />
                    )}
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Priorities */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Priority</h4>
            <div className="flex flex-wrap gap-2">
              {availablePriorities.map(priority => (
                <button
                  key={priority}
                  onClick={() => togglePriority(priority)}
                  className={`
                    px-3 py-1.5 text-xs rounded-full border transition-colors capitalize
                    ${filters.priorities.includes(priority)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                    }
                  `}
                >
                  {filters.priorities.includes(priority) && (
                    <Check className="inline h-3 w-3 mr-1" />
                  )}
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Completion Status */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Status</h4>
            <div className="flex gap-2">
              {(['all', 'completed', 'incomplete'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => updateFilters({ completionStatus: status })}
                  className={`
                    px-3 py-1.5 text-xs rounded-full border transition-colors capitalize
                    ${filters.completionStatus === status
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                    }
                  `}
                >
                  {filters.completionStatus === status && (
                    <Check className="inline h-3 w-3 mr-1" />
                  )}
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Show Done Activities */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showDone}
                onChange={(e) => updateFilters({ showDone: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Show completed activities</span>
            </label>
          </div>

          {/* Duration Range */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Duration (minutes)</h4>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.durationRange.min || ''}
                onChange={(e) => updateFilters({
                  durationRange: {
                    ...filters.durationRange,
                    min: e.target.value ? parseInt(e.target.value) : null
                  }
                })}
                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.durationRange.max || ''}
                onChange={(e) => updateFilters({
                  durationRange: {
                    ...filters.durationRange,
                    max: e.target.value ? parseInt(e.target.value) : null
                  }
                })}
                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Cost ($)</h4>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceRange.min || ''}
                onChange={(e) => updateFilters({
                  priceRange: {
                    ...filters.priceRange,
                    min: e.target.value ? parseInt(e.target.value) : null
                  }
                })}
                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceRange.max || ''}
                onChange={(e) => updateFilters({
                  priceRange: {
                    ...filters.priceRange,
                    max: e.target.value ? parseInt(e.target.value) : null
                  }
                })}
                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Utility function to apply filters
export function applyFilters(activities: ItineraryItem[], filters: FilterOptions): ItineraryItem[] {
  return activities.filter(activity => {
    // Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(activity.category)) {
      return false;
    }

    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(activity.priority)) {
      return false;
    }

    // Completion status filter
    if (filters.completionStatus === 'completed' && !activity.completed) {
      return false;
    }
    if (filters.completionStatus === 'incomplete' && activity.completed) {
      return false;
    }

    // Show done filter
    if (!filters.showDone && activity.done) {
      return false;
    }

    // Duration range filter
    if (filters.durationRange.min !== null && activity.estimatedDuration < filters.durationRange.min) {
      return false;
    }
    if (filters.durationRange.max !== null && activity.estimatedDuration > filters.durationRange.max) {
      return false;
    }

    // Price range filter
    if (filters.priceRange.min !== null && activity.cost < filters.priceRange.min) {
      return false;
    }
    if (filters.priceRange.max !== null && activity.cost > filters.priceRange.max) {
      return false;
    }

    return true;
  });
}
