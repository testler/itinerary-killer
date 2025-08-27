import React, { useState } from 'react';
import { Trash2, Edit, CheckCircle, Circle, MapPin, Clock, DollarSign } from 'lucide-react';
import { ItineraryItem, UserLocation } from '../types';

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
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'distance'>('createdAt');
  const [showCompleted, setShowCompleted] = useState(false);

  // Filter items based on selected category and priority
  const filteredItems = items.filter(item => {
    const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
    const priorityMatch = selectedPriority === 'All' || item.priority === selectedPriority;
    const completedMatch = showCompleted ? true : !item.completed;
    
    return categoryMatch && priorityMatch && completedMatch;
  });

  // Sort items based on selected criteria
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      
      case 'distance':
        if (!userLocation) return 0;
        const distanceA = getDistanceFromUser(a);
        const distanceB = getDistanceFromUser(b);
        if (!distanceA || !distanceB) return 0;
        return parseFloat(distanceA) - parseFloat(distanceB);
      
      case 'createdAt':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleToggleComplete = (id: string, completed: boolean) => {
    onItemUpdate(id, { completed });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      onItemDelete(id);
    }
  };

  const getPriorityColor = (priority: ItineraryItem['priority']) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
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
      {/* Filters and Controls */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.875rem',
              flex: 1
            }}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.875rem',
              flex: 1
            }}
          >
            {PRIORITIES.map(priority => (
              <option key={priority} value={priority}>
                {priority === 'All' ? 'All Priorities' : priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.875rem',
              flex: 1
            }}
          >
            <option value="createdAt">Sort by Date Added</option>
            <option value="priority">Sort by Priority</option>
            <option value="distance">Sort by Distance</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Show completed
          </label>
        </div>
      </div>

      {/* Items List */}
      <div>
        {sortedItems.map((item) => (
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
                <p style={{ 
                  color: item.completed ? '#9ca3af' : '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  {item.description}
                </p>
                
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
        ))}
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
            <span> • Total estimated cost: ${sortedItems.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}</span>
          )}
        </div>
      )}
    </div>
  );
}
