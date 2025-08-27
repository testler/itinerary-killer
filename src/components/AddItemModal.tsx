import React, { useState, useEffect } from 'react';
import { X, MapPin, Search } from 'lucide-react';
import { ItineraryItem, UserLocation } from '../types';
import { getCoordinatesFromAddress } from '../utils/location';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Omit<ItineraryItem, 'id' | 'createdAt' | 'completed'>) => void;
  userLocation: UserLocation | null;
}

const CATEGORIES = [
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

const PRIORITIES = ['low', 'medium', 'high'] as const;

export default function AddItemModal({ onClose, onAdd, userLocation }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    category: 'Other',
    priority: 'medium' as const,
    estimatedDuration: 60,
    cost: 0,
    notes: ''
  });
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set default location to user's location if available
  useEffect(() => {
    if (userLocation) {
      setLocation({ lat: userLocation.lat, lng: userLocation.lng });
    }
  }, [userLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedDuration' || name === 'cost' ? Number(value) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddressSearch = async () => {
    if (!formData.address.trim()) {
      setErrors(prev => ({ ...prev, address: 'Please enter an address' }));
      return;
    }

    setSearching(true);
    try {
      const coords = await getCoordinatesFromAddress(formData.address);
      if (coords) {
        setLocation(coords);
        setErrors(prev => ({ ...prev, address: '' }));
      } else {
        setErrors(prev => ({ ...prev, address: 'Address not found. Please try a different address.' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, address: 'Error searching for address. Please try again.' }));
    } finally {
      setSearching(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!location) {
      newErrors.address = 'Please select a valid location';
    }
    
    if (formData.estimatedDuration <= 0) {
      newErrors.estimatedDuration = 'Duration must be greater than 0';
    }
    
    if (formData.cost < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!location) {
      setErrors(prev => ({ ...prev, address: 'Please select a valid location' }));
      return;
    }

    const newItem: Omit<ItineraryItem, 'id' | 'createdAt' | 'completed'> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      location,
      address: formData.address.trim(),
      category: formData.category,
      priority: formData.priority,
      estimatedDuration: formData.estimatedDuration,
      cost: formData.cost,
      notes: formData.notes.trim()
    };

    onAdd(newItem);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Activity</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Visit Disney World"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what you want to do..."
              rows={3}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address">Address *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter address or search for location"
                className={errors.address ? 'error' : ''}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddressSearch}
                disabled={searching}
                style={{
                  padding: '0.75rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {searching ? '...' : <Search size={16} />}
              </button>
            </div>
            {errors.address && <span className="error-text">{errors.address}</span>}
            {location && (
              <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
                📍 Location set: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="estimatedDuration">Duration (minutes) *</label>
              <input
                type="number"
                id="estimatedDuration"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                min="1"
                className={errors.estimatedDuration ? 'error' : ''}
              />
              {errors.estimatedDuration && <span className="error-text">{errors.estimatedDuration}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cost">Estimated Cost ($)</label>
              <input
                type="number"
                id="cost"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={errors.cost ? 'error' : ''}
              />
              {errors.cost && <span className="error-text">{errors.cost}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Additional Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any additional details..."
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Add Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
