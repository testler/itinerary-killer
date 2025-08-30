import { useState } from 'react';
import { Trash2, CheckCircle, Circle, MapPin, Clock, DollarSign, Search } from 'lucide-react';
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

  // Sort items based on selected criteria
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!a || !b) return 0;
    
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority] || 0;
        const priorityB = priorityOrder[b.priority] || 0;
        return priorityB - priorityA;
      
      case 'distance':
        if (!userLocation) return 0;
        const distanceA = getDistanceFromUser(a);
        const distanceB = getDistanceFromUser(b);
        if (!distanceA || !distanceB) return 0;
        
        try {
          const numA = parseFloat(distanceA);
          const numB = parseFloat(distanceB);
          if (isNaN(numA) || isNaN(numB)) return 0;
          return numA - numB;
        } catch (error) {
          return 0;
        }
      
      case 'createdAt':
      default:
        try {
          // Handle both Date objects and string dates
          const dateA = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          const dateB = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          
          if (!dateA || !dateB || isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          
          return dateA.getTime() - dateB.getTime();
        } catch (error) {
          return 0;
        }
    }
  });

  const handleToggleComplete = (id: string, completed: boolean) => {
    if (!id) return;
    onItemUpdate(id, { completed });
  };

  const handleDelete = (id: string) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this activity?')) {
      onItemUpdate(id, { completed: false }); // Reset completion status before deletion
      onItemDelete(id);
    }
  };

  const getPriorityColor = (priority: ItineraryItem['priority']) => {
    if (!priority) return '#6b7280';
    
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    if (!category) return '📍';
    
    switch (category) {
      case 'Theme Parks': return '🎢';
      case 'Restaurants': return '🍽️';
      case 'Shopping': return '🛍️';
      case 'Entertainment': return '🎭';
      case 'Outdoor Activities': return '🏃‍♂️';
      case 'Museums': return '🏛️';
      case 'Sports': return '⚽';
      case 'Nightlife': return '🌙';
      default: return '📍';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⏳</div>
        <p>Loading your itinerary...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
        <h3>No activities yet!</h3>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Start building your Orlando adventure by adding some activities.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Click the + button on the map to get started!
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div style={{ marginBottom: '1rem' }} className="filters-sticky">
        <FormField id="search" label="Search">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search activities, places, or categories..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                const sanitizedValue = value.replace(/[<>]/g, '');
                setSearchQuery(sanitizedValue);
              }}
              maxLength={100}
              style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', outline: 'none' }}
            />
            {searchQuery && (
              <Button onClick={() => setSearchQuery('')} variant="ghost" size="sm" aria-label="Clear search" style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)' }}>
                ×
              </Button>
            )}
          </div>
        </FormField>
        {searchQuery && (
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Found {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}
      </div>

      {/* Filters and Controls */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <FormField id="filter-category" label="Category">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', flex: 1 }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormField>
          <FormField id="filter-priority" label="Priority">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', flex: 1 }}
            >
              {PRIORITIES.map(priority => (
                <option key={priority} value={priority}>
                  {priority === 'All' ? 'All Priorities' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <FormField id="filter-open" label="Open status">
            <select
              value={selectedOpenStatus}
              onChange={(e) => setSelectedOpenStatus(e.target.value as 'all' | 'open' | 'closed')}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', flex: 1 }}
            >
              {OPEN_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="sort-by" label="Sort by">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', flex: 1 }}
            >
              <option value="createdAt">Date Added</option>
              <option value="priority">Priority</option>
              <option value="distance">Distance</option>
            </select>
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              aria-label="Show completed activities"
            />
            Show completed
          </label>
        </div>
      </div>

      {/* Items List */}
      <div>
        {sortedItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔎</div>
            <p>No activities match your filters.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Try clearing search or adjusting filters.</p>
          </div>
        ) : (
          sortedItems.map((item) => {
            if (!item || !item.id) return null;
            
            return (
              <div
                key={item.id}
                className={`itinerary-item ${item.completed ? 'completed' : ''}`}
                style={{
                  opacity: item.completed ? 0.6 : 1,
                  borderLeft: `4px solid ${getPriorityColor(item.priority)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      textDecoration: item.completed ? 'line-through' : 'none',
                      color: item.completed ? '#9ca3af' : '#1e293b'
                    }}>
                      {getCategoryIcon(item.category)} {item.title}
                    </h3>
                    <p 
                      style={{ 
                        color: item.completed ? '#9ca3af' : '#64748b',
                        marginBottom: '0.5rem'
                      }} 
                      className={expandedIds[item.id] ? '' : 'line-clamp-2'}
                    >
                      {item.description}
                    </p>
                    {item.description && item.description.length > 100 && (
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          padding: 0
                        }}
                        aria-label={expandedIds[item.id] ? 'Show less' : 'Show more'}
                      >
                        {expandedIds[item.id] ? 'Show less' : 'Show more'}
                      </button>
                    )}
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ color: getPriorityColor(item.priority), fontWeight: '500' }}>
                        {item.priority.toUpperCase()}
                      </span>
                      <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {item.estimatedDuration} min
                      </span>
                      <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <DollarSign size={12} />
                        ${item.cost}
                      </span>
                      <button
                        onClick={() => onItemUpdate(item.id, { isOpen: !item.isOpen })}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          color: item.isOpen ? '#10b981' : '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontWeight: '500',
                          fontSize: '0.75rem'
                        }}
                        title={item.isOpen ? 'Click to mark as closed' : 'Click to mark as open'}
                      >
                        {item.isOpen ? '🟢' : '🔴'}
                        {item.isOpen ? 'Open' : 'Closed'}
                      </button>
                    </div>

                    {userLocation && (
                      <p className="distance" style={{ marginTop: '0.5rem' }}>
                        📍 {getDistanceFromUser(item)}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                    <button
                      onClick={() => handleToggleComplete(item.id, !item.completed)}
                      aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: item.completed ? '#10b981' : '#9ca3af'
                      }}
                      title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {item.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                    </button>
                    
                    <button
                      onClick={() => onItemSelect(item)}
                      aria-label="Show activity on map"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: '#3b82f6'
                      }}
                      title="Show on map"
                    >
                      <MapPin size={16} />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(item.id)}
                      aria-label="Delete activity"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: '#ef4444'
                      }}
                      title="Delete activity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {item.notes && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.5rem', 
                    background: '#f8fafc', 
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#64748b'
                  }}>
                    <strong>Notes:</strong> {item.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {sortedItems.length > 0 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          background: '#f8fafc', 
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#64748b'
        }}>
          <strong>Summary:</strong> {sortedItems.length} activity{sortedItems.length !== 1 ? 'ies' : ''}
          {userLocation && (
            <span> • Total estimated cost: {'$'}{sortedItems.reduce((sum, item) => {
              const cost = typeof item.cost === 'number' && !isNaN(item.cost) ? item.cost : 0;
              return sum + cost;
            }, 0).toFixed(2)}</span>
          )}
        </div>
      )}
    </div>
  );
}
