import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, MapPin, Clock, DollarSign, Tag, FileText, Star, Loader2 } from 'lucide-react';
import { ItineraryItem, UserLocation } from '../types';
import { fetchPlaceDetailsFromGoogle, getCoordinatesFromAddress, fetchPlaceAutocomplete, fetchPlaceDetailsByPlaceId } from '../utils/location';
import { Button, FormField, SafeAreaFooter } from '../ui';

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
    notes: '',
    isOpen: true
  });
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openingHours, setOpeningHours] = useState<{ [day: string]: { open: string; close: string } | null }>({});
  const [fetchingHours, setFetchingHours] = useState(false);
  const [fetchHoursError, setFetchHoursError] = useState<string | null>(null);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [autoPopulateError, setAutoPopulateError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    } catch {
      setErrors(prev => ({ ...prev, address: 'Error searching for address. Please try again.' }));
    } finally {
      setSearching(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e);
    const value = e.target.value;
    setShowSuggestions(true);
    
    if (addressDebounceTimer) clearTimeout(addressDebounceTimer);
    if (!value.trim()) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        setAddressLoading(true);
        const results = await fetchPlaceAutocomplete(value);
        setAddressSuggestions(results);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 300);
    setAddressDebounceTimer(timer);
  };

  const handleSelectSuggestion = async (suggestion: { description: string; place_id: string }) => {
    try {
      setAddressLoading(true);
      setShowSuggestions(false);
      setFormData(prev => ({ ...prev, address: suggestion.description }));
      
      const place = await fetchPlaceDetailsByPlaceId(suggestion.place_id);
      
      // Auto-populate fields from Google Places data
      if (place.name) {
        setFormData(prev => ({ ...prev, title: place.name }));
      }
      
      if (place.formatted_address) {
        setFormData(prev => ({ ...prev, address: place.formatted_address }));
      }
      
      if (place.geometry?.location) {
        setLocation({
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        });
      }
      
      // Auto-populate description from Google data
      let description = '';
      if (place.editorial_summary?.overview) {
        description = place.editorial_summary.overview;
      } else if (place.types && place.types.length) {
        description = place.types
          .map((type: string) => type.replace(/_/g, ' '))
          .join(', ');
      }
      
      if (description) {
        setFormData(prev => ({ ...prev, description }));
      }
      
      // Auto-populate opening hours if available
      if (place.opening_hours?.periods) {
        const newHours: Record<number, { open: string; close: string } | null> = {};
        const periods = place.opening_hours.periods;
        
        for (let i = 0; i < 7; i++) {
          const period = periods.find((p: any) => p.open.day === i);
          if (period) {
            newHours[i] = {
              open: period.open.time.replace(/(\d{2})(\d{2})/, '$1:$2'),
              close: period.close?.time ? period.close.time.replace(/(\d{2})(\d{2})/, '$1:$2') : '',
            };
          } else {
            newHours[i] = null;
          }
        }
        setOpeningHours(newHours);
      }
      
      setAddressSuggestions([]);
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setAddressLoading(false);
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
      notes: formData.notes.trim(),
      isOpen: formData.isOpen,
      openingHours: openingHours,
    };

    onAdd(newItem);
  };

  const handleAutoPopulate = async () => {
    if (!formData.title.trim() && !formData.address.trim()) {
      setAutoPopulateError('Please enter at least a title or address first.');
      return;
    }

    setAutoPopulating(true);
    setAutoPopulateError(null);
    
    try {
      const place = await fetchPlaceDetailsFromGoogle(formData.title, formData.address);
      
      // Auto-populate all available fields
      if (place.name) {
        setFormData(prev => ({ ...prev, title: place.name }));
      }
      
      if (place.formatted_address) {
        setFormData(prev => ({ ...prev, address: place.formatted_address }));
      }
      
      if (place.geometry?.location) {
        setLocation({
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        });
      }
      
      // Auto-populate description
      let description = '';
      if (place.editorial_summary?.overview) {
        description = place.editorial_summary.overview;
      } else if (place.types && place.types.length) {
        description = place.types
          .map((type: string) => type.replace(/_/g, ' '))
          .join(', ');
      }
      
      if (description) {
        setFormData(prev => ({ ...prev, description }));
      }
      
      // Auto-populate opening hours
      if (place.opening_hours?.periods) {
        const newHours: Record<number, { open: string; close: string } | null> = {};
        const periods = place.opening_hours.periods;
        
        for (let i = 0; i < 7; i++) {
          const period = periods.find((p: any) => p.open.day === i);
          if (period) {
            newHours[i] = {
              open: period.open.time.replace(/(\d{2})(\d{2})/, '$1:$2'),
              close: period.close?.time ? period.close.time.replace(/(\d{2})(\d{2})/, '$1:$2') : '',
            };
          } else {
            newHours[i] = null;
          }
        }
        setOpeningHours(newHours);
      }
      
    } catch (error) {
      setAutoPopulateError('Failed to auto-populate. Please check your internet connection and try again.');
    } finally {
      setAutoPopulating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modern-modal">
        <div className="modal-header">
          <h2>🗺️ Add New Activity</h2>
          <button 
            onClick={onClose}
            className="close-button"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modern-form">
          {/* Title Field */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              <Star size={16} className="label-icon" />
              Activity Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="Enter activity name..."
              aria-label="Activity title"
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          {/* Address Field with Google Places Autocomplete */}
          <div className="form-group">
            <label htmlFor="address" className="form-label">
              <MapPin size={16} className="label-icon" />
              Location Address *
            </label>
            <div className="address-input-container">
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleAddressChange}
                className={`form-input ${errors.address ? 'error' : ''}`}
                placeholder="Start typing to search locations..."
                aria-label="Location address"
                autoComplete="off"
              />
              {addressLoading && (
                <div className="address-loading">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
            </div>
            
            {/* Address Suggestions Dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="address-suggestions">
                {addressSuggestions.map(suggestion => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    className="suggestion-item"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <MapPin size={14} />
                    <span>{suggestion.description}</span>
                  </button>
                ))}
              </div>
            )}
            
            {errors.address && <span className="error-text">{errors.address}</span>}
            
            {location && (
              <div className="location-confirmation">
                <MapPin size={14} />
                <span>📍 Location confirmed: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
              </div>
            )}
          </div>

          {/* Description Field */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              <FileText size={16} className="label-icon" />
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`form-input ${errors.description ? 'error' : ''}`}
              placeholder="Describe the activity..."
              rows={3}
              aria-label="Activity description"
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          {/* Category and Priority Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category" className="form-label">
                <Tag size={16} className="label-icon" />
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="form-select"
                aria-label="Activity category"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority" className="form-label">
                <Star size={16} className="label-icon" />
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="form-select"
                aria-label="Activity priority"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration and Cost Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="estimatedDuration" className="form-label">
                <Clock size={16} className="label-icon" />
                Duration (minutes) *
              </label>
              <input
                type="number"
                id="estimatedDuration"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                className={`form-input ${errors.estimatedDuration ? 'error' : ''}`}
                min="1"
                placeholder="60"
                aria-label="Activity estimated duration"
              />
              {errors.estimatedDuration && <span className="error-text">{errors.estimatedDuration}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cost" className="form-label">
                <DollarSign size={16} className="label-icon" />
                Estimated Cost ($)
              </label>
              <input
                type="number"
                id="cost"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                className={`form-input ${errors.cost ? 'error' : ''}`}
                min="0"
                step="0.01"
                placeholder="0.00"
                aria-label="Activity estimated cost"
              />
              {errors.cost && <span className="error-text">{errors.cost}</span>}
            </div>
          </div>

          {/* Auto-populate Button */}
          <div className="auto-populate-section">
            <Button
              type="button"
              onClick={handleAutoPopulate}
              disabled={autoPopulating}
              variant="neutral"
              size="sm"
              className="auto-populate-btn"
            >
              {autoPopulating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Auto-populating...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Auto-populate from Google
                </>
              )}
            </Button>
            {autoPopulateError && <span className="error-text">{autoPopulateError}</span>}
          </div>

          {/* Opening Hours Section */}
          <div className="form-group">
            <label className="form-label">
              <Clock size={16} className="label-icon" />
              Opening Hours
            </label>
            <div className="opening-hours-grid">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                <div key={day} className="day-row">
                  <span className="day-label">{day.slice(0, 3)}</span>
                  <div className="time-inputs">
                    <input
                      type="time"
                      value={openingHours[i]?.open || ''}
                      onChange={e => setOpeningHours(h => ({...h, [i]: {...(h[i]||{}), open: e.target.value}}))}
                      className="time-input"
                      aria-label={`Open time for ${day}`}
                    />
                    <span className="time-separator">-</span>
                    <input
                      type="time"
                      value={openingHours[i]?.close || ''}
                      onChange={e => setOpeningHours(h => ({...h, [i]: {...(h[i]||{}), close: e.target.value}}))}
                      className="time-input"
                      aria-label={`Close time for ${day}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open/Closed Status */}
          <div className="form-group">
            <label className="form-label checkbox-label">
              <input
                type="checkbox"
                id="isOpen"
                name="isOpen"
                checked={formData.isOpen}
                onChange={(e) => setFormData(prev => ({ ...prev, isOpen: e.target.checked }))}
                className="form-checkbox"
                aria-label="Is activity currently open"
              />
              <span className="checkbox-text">
                🟢 This place is currently open
              </span>
            </label>
            <p className="help-text">
              Uncheck if the place is closed or you want to mark it as unavailable
            </p>
          </div>

          {/* Additional Notes */}
          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              <FileText size={16} className="label-icon" />
              Additional Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Any additional details, tips, or special requirements..."
              rows={2}
              aria-label="Additional notes"
            />
          </div>

          {/* Form Actions */}
          <SafeAreaFooter>
            <Button 
              type="button" 
              variant="neutral" 
              onClick={onClose}
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              className="submit-btn"
            >
              Add Activity
            </Button>
          </SafeAreaFooter>
        </form>
      </div>
    </div>
  );
}
