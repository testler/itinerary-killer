import { useState } from 'react';
import { Trash2, CheckCircle, Circle, MapPin, Clock, DollarSign, Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ItineraryItem, UserLocation } from '../types';
import { FormField, Button } from '../ui';
import dayjs from 'dayjs';

interface ItineraryListProps {
  items: ItineraryItem[];
  onItemSelect: (item: ItineraryItem) => void;
  onItemUpdate: (id: string, updates: Partial<ItineraryItem>) => void;
  onItemDelete: (id: string) => void;
  userLocation: UserLocation | null;
  getDistanceFromUser: (item: ItineraryItem) => string | null;
  loading: boolean;
}

const CATEGORIES = [
  'All',
  'Theme Parks',
  'Restaurants',
  'Shopping',
  'Entertainment',
  'Outdoor Activities',
  'Museums',
  'Sports',
  'Nightlife',
  'Other'
];

const PRIORITIES = ['All', 'low', 'medium', 'high'] as const;

const OPEN_STATUS_OPTIONS = [
  { value: 'all', label: 'All Places', icon: '🏪' },
  { value: 'open', label: 'Open Now', icon: '🟢' },
  { value: 'closed', label: 'Closed', icon: '🔴' }
] as const;

export default function ItineraryList({
  items,
  onItemSelect,
  onItemUpdate,
  onItemDelete,
  userLocation,
  getDistanceFromUser,
  loading
}: ItineraryListProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedOpenStatus, setSelectedOpenStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'distance'>('createdAt');
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const toggleExpanded = (id: string) => {
    if (!id) return;
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to check if a place is open now
  const isOpenNow = (item: ItineraryItem) => {
    if (item.openingHours) {
      const now = dayjs();
      const day = now.day(); // 0 (Sunday) - 6 (Saturday)
      const hours = item.openingHours[day];
      if (!hours || !hours.open || !hours.close) return false;
      
      try {
        const open = dayjs(now.format('YYYY-MM-DD') + 'T' + hours.open);
        const close = dayjs(now.format('YYYY-MM-DD') + 'T' + hours.close);
        
        if (!open.isValid() || !close.isValid()) return false;
        
        if (close.isBefore(open)) {
          // Overnight (e.g., 22:00-02:00)
          return now.isAfter(open) || now.isBefore(close);
        }
        return now.isAfter(open) && now.isBefore(close);
      } catch (error) {
        // If there's an error parsing the time, fall back to the isOpen property
        return item.isOpen;
      }
    }
    return item.isOpen;
  };

  // Filter items based on selected filters and search query
  const filteredItems = items.filter(item => {
    if (!item) return false;
    
    const categoryMatch = selectedCategory === 'All' || (item.category && item.category === selectedCategory);
    const priorityMatch = selectedPriority === 'All' || (item.priority && item.priority === selectedPriority);
    const completedMatch = showCompleted ? true : !item.completed;
    const openStatusMatch = selectedOpenStatus === 'all' || 
      (selectedOpenStatus === 'open' && isOpenNow(item)) || 
      (selectedOpenStatus === 'closed' && !isOpenNow(item));
    
    // Search query matching (title, description, category, address)
    const searchMatch = searchQuery === '' || 
      (item.title && item.title.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1) ||
      (item.description && item.description.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1) ||
      (item.category && item.category.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1) ||
      (item.address && item.address.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1);
    
    return categoryMatch && priorityMatch && completedMatch && openStatusMatch && searchMatch;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'distance':
        if (!userLocation) return 0;
        const distA = getDistanceFromUser(a);
        const distB = getDistanceFromUser(b);
        if (!distA || !distB) return 0;
        return parseFloat(distA) - parseFloat(distB);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Theme Parks': '🎢',
      'Restaurants': '🍽️',
      'Shopping': '🛍️',
      'Entertainment': '🎭',
      'Outdoor Activities': '🏃‍♂️',
      'Museums': '🏛️',
      'Sports': '⚽',
      'Nightlife': '🌙',
      'Other': '📍'
    };
    return icons[category] || '📍';
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
    onItemUpdate(id, { completed });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      onItemDelete(id);
    }
  };

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner"></div>
        <p>Loading activities...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mobile-empty-state">
        <div className="empty-icon">🗺️</div>
        <h3>No activities yet!</h3>
        <p>Start building your Orlando adventure by adding some activities.</p>
        <p className="empty-hint">Click the + button on the map to get started!</p>
      </div>
    );
  }

  return (
    <div className="mobile-itinerary-list">
      {/* Mobile Search Header */}
      <div className="mobile-search-header">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              const sanitizedValue = value.replace(/[<>]/g, '');
              setSearchQuery(sanitizedValue);
            }}
            maxLength={100}
            className="mobile-search-input"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="clear-search-btn"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
          aria-label="Toggle filters"
        >
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      {/* Mobile Filters Panel */}
      {showFilters && (
        <div className="mobile-filters-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mobile-filter-select"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="mobile-filter-select"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>
                    {priority === 'All' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <select
                value={selectedOpenStatus}
                onChange={(e) => setSelectedOpenStatus(e.target.value as 'all' | 'open' | 'closed')}
                className="mobile-filter-select"
              >
                {OPEN_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="mobile-filter-select"
              >
                <option value="createdAt">Date Added</option>
                <option value="priority">Priority</option>
                <option value="distance">Distance</option>
              </select>
            </div>
          </div>
          
          <div className="filter-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                aria-label="Show completed activities"
              />
              <span>Show completed</span>
            </label>
          </div>
          
          {searchQuery && (
            <div className="search-results-info">
              Found {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Mobile Items List */}
      <div className="mobile-items-container">
        {sortedItems.length === 0 ? (
          <div className="mobile-no-results">
            <div className="no-results-icon">🔎</div>
            <p>No activities match your filters.</p>
            <p className="no-results-hint">Try clearing search or adjusting filters.</p>
          </div>
        ) : (
          sortedItems.map((item) => {
            if (!item || !item.id) return null;
            
            return (
              <div
                key={item.id}
                className={`mobile-item-card ${item.completed ? 'completed' : ''}`}
                style={{
                  borderLeftColor: getPriorityColor(item.priority)
                }}
              >
                {/* Item Header */}
                <div className="item-header">
                  <div className="item-title-section">
                    <div className="item-category-icon">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="item-title-content">
                      <h3 className={`item-title ${item.completed ? 'completed' : ''}`}>
                        {item.title}
                      </h3>
                      <div className="item-meta">
                        <span className="item-priority" style={{ color: getPriorityColor(item.priority) }}>
                          {item.priority.toUpperCase()}
                        </span>
                        <span className="item-category">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="item-actions">
                    <button
                      onClick={() => handleToggleComplete(item.id, !item.completed)}
                      className={`action-btn complete-btn ${item.completed ? 'completed' : ''}`}
                      aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {item.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                    </button>
                    
                    <button
                      onClick={() => onItemSelect(item)}
                      className="action-btn map-btn"
                      aria-label="Show activity on map"
                    >
                      <MapPin size={18} />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="action-btn delete-btn"
                      aria-label="Delete activity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Item Description */}
                <div className="item-description">
                  <p className={`description-text ${expandedIds[item.id] ? '' : 'truncated'}`}>
                    {item.description}
                  </p>
                  {item.description && item.description.length > 100 && (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="expand-btn"
                      aria-label={expandedIds[item.id] ? 'Show less' : 'Show more'}
                    >
                      {expandedIds[item.id] ? 'Show less' : 'Show more'}
                      {expandedIds[item.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {/* Item Details */}
                <div className="item-details">
                  <div className="detail-row">
                    <div className="detail-item">
                      <Clock size={16} />
                      <span>{item.estimatedDuration} min</span>
                    </div>
                    <div className="detail-item">
                      <DollarSign size={16} />
                      <span>${item.cost}</span>
                    </div>
                    <div className="detail-item">
                      <span className={`status-indicator ${item.isOpen ? 'open' : 'closed'}`}>
                        {item.isOpen ? '🟢' : '🔴'}
                      </span>
                      <span>{item.isOpen ? 'Open' : 'Closed'}</span>
                    </div>
                  </div>
                  
                  {userLocation && (
                    <div className="distance-info">
                      <MapPin size={14} />
                      <span>{getDistanceFromUser(item)}</span>
                    </div>
                  )}
                </div>

                {/* Item Notes */}
                {item.notes && (
                  <div className="item-notes">
                    <strong>Notes:</strong> {item.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Summary */}
      {sortedItems.length > 0 && (
        <div className="mobile-summary">
          <div className="summary-content">
            <span className="summary-count">
              {sortedItems.length} activity{sortedItems.length !== 1 ? 'ies' : ''}
            </span>
            {userLocation && (
              <span className="summary-cost">
                Total: ${sortedItems.reduce((sum, item) => {
                  const cost = typeof item.cost === 'number' && !isNaN(item.cost) ? item.cost : 0;
                  return sum + cost;
                }, 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
