import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
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
    if (addressDebounceTimer) clearTimeout(addressDebounceTimer);
    if (!value.trim()) {
      setAddressSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        if (isSlowConnection()) {
          setAddressSuggestions([]);
          return;
        }
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

  const handleSelectSuggestion = async (s: { description: string; place_id: string }) => {
    try {
      if (isSlowConnection()) return; // avoid fetching on slow networks
      setAddressLoading(true);
      const place = await fetchPlaceDetailsByPlaceId(s.place_id);
      // Populate fields
      const newTitle = place.name || formData.title;
      const newAddress = place.formatted_address || s.description;
      let newLocation = location;
      if (place.geometry && place.geometry.location) {
        newLocation = {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        };
      }
      let newDescription = formData.description;
      if (place.editorial_summary && place.editorial_summary.overview) {
        newDescription = place.editorial_summary.overview;
      } else if (place.types && place.types.length) {
        newDescription = place.types.map((t: string) => t.replace(/_/g, ' ')).join(', ');
      }
      type OpeningPeriod = { open: { day: number; time: string }; close?: { time?: string } };
      const newOpeningHours: Record<number, { open: string; close: string } | null> = {};
      const periods = (place.opening_hours && Array.isArray(place.opening_hours.periods)
        ? (place.opening_hours.periods as OpeningPeriod[])
        : ([] as OpeningPeriod[]));
      for (let i = 0; i < 7; i++) {
        const period = periods.find(p => p.open.day === i);
        if (period) {
          newOpeningHours[i] = {
            open: period.open.time.replace(/(\d{2})(\d{2})/, '$1:$2'),
            close: period.close?.time ? period.close.time.replace(/(\d{2})(\d{2})/, '$1:$2') : '',
          };
        } else {
          newOpeningHours[i] = null;
        }
      }
      setFormData(prev => ({ ...prev, title: newTitle, address: newAddress, description: newDescription }));
      setLocation(newLocation);
      setOpeningHours(newOpeningHours);
      setAddressSuggestions([]);
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

  // Fetch opening hours from Google Places API
  const handleFetchHours = async () => {
    setFetchingHours(true);
    setFetchHoursError(null);
    try {
      const { title, address } = formData;
      if (!title.trim() || !address.trim()) {
        setFetchHoursError('Please enter both a title and address first.');
        setFetchingHours(false);
        return;
      }
      const place = await fetchPlaceDetailsFromGoogle(title, address);
      if (place.opening_hours && place.opening_hours.periods) {
        // Google returns periods as array of {open: {day, time}, close: {day, time}}
        type OpeningPeriod = { open: { day: number; time: string }; close?: { time?: string } };
        const newHours: Record<number, { open: string; close: string } | null> = {};
        for (let i = 0; i < 7; i++) {
          const period = (place.opening_hours.periods as OpeningPeriod[]).find((p: OpeningPeriod) => p.open.day === i);
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
      } else {
        setFetchHoursError('No opening hours found for this place.');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setFetchHoursError('Failed to fetch hours: ' + message);
    } finally {
      setFetchingHours(false);
    }
  };

  // Fully auto-populate all fields using Google Places API
  const handleAutoPopulate = async () => {
    setAutoPopulating(true);
    setAutoPopulateError(null);
    try {
      const { title, address } = formData;
      if (!title.trim() && !address.trim()) {
        setAutoPopulateError('Please enter at least a title or address.');
        setAutoPopulating(false);
        return;
      }
      // Use whichever is filled, or both
      const place = await fetchPlaceDetailsFromGoogle(title, address);
      // Title
      const newTitle = place.name || formData.title;
      // Address
      const newAddress = place.formatted_address || formData.address;
      // Description (use Google editorial_summary or types if available)
      let newDescription = formData.description;
      if (place.editorial_summary && place.editorial_summary.overview) {
        newDescription = place.editorial_summary.overview;
      } else if (place.types && place.types.length) {
        newDescription = place.types.map((t: string) => t.replace(/_/g, ' ')).join(', ');
      }
      // Location
      let newLocation = location;
      if (place.geometry && place.geometry.location) {
        newLocation = {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        };
      } else if (newAddress && !location) {
        // fallback: geocode address
        const coords = await getCoordinatesFromAddress(newAddress);
        if (coords) newLocation = coords;
      }
      // Opening hours
      type OpeningPeriod = { open: { day: number; time: string }; close?: { time?: string } };
      const newOpeningHours: Record<number, { open: string; close: string } | null> = {};
      const periods = (place.opening_hours && Array.isArray(place.opening_hours.periods)
        ? (place.opening_hours.periods as OpeningPeriod[])
        : ([] as OpeningPeriod[]));
      for (let i = 0; i < 7; i++) {
        const period = periods.find(p => p.open.day === i);
        if (period) {
          newOpeningHours[i] = {
            open: period.open.time.replace(/(\d{2})(\d{2})/, '$1:$2'),
            close: period.close?.time ? period.close.time.replace(/(\d{2})(\d{2})/, '$1:$2') : '',
          };
        } else {
          newOpeningHours[i] = null;
        }
      }
      setFormData(prev => ({
        ...prev,
        title: newTitle,
        address: newAddress,
        description: newDescription,
      }));
      setLocation(newLocation);
      setOpeningHours(newOpeningHours);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setAutoPopulateError('Failed to auto-populate: ' + message);
    } finally {
      setAutoPopulating(false);
    }
  };

  const isSlowConnection = () => {
    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    const type = nav.connection?.effectiveType;
    return type === '2g' || type === 'slow-2g' || type === '3g';
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="add-activity-title" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="add-activity-title">Add New Activity</h2>
          <Button className="close-button" variant="ghost" aria-label="Close" onClick={onClose}>
            <X size={24} />
          </Button>
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
              onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className={`scroll-into-view ${errors.title ? 'error' : ''}`}
              placeholder="e.g., Visit Disney World"
              aria-label="Activity title"
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
              onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className={`scroll-into-view ${errors.description ? 'error' : ''}`}
              placeholder="Describe what you want to do..."
              rows={3}
              aria-label="Activity description"
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <FormField id="address" label="Address" required error={errors.address}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleAddressChange}
                onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className={`scroll-into-view`}
                placeholder="Enter address or search for location"
                style={{ flex: 1 }}
                aria-autocomplete="list"
                aria-expanded={addressSuggestions.length > 0}
              />
              <Button type="button" onClick={handleAddressSearch} disabled={searching} aria-label="Search for address" variant="primary" size="md">
                {searching ? '...' : <Search size={16} />}
              </Button>
            </div>
          </FormField>
          {addressLoading && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Searching...</p>
          )}
          {addressSuggestions.length > 0 && (
            <ul style={{
              listStyle: 'none',
              marginTop: '0.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              maxHeight: 200,
              overflowY: 'auto',
              background: 'white'
            }} role="listbox">
              {addressSuggestions.map(s => (
                <li key={s.place_id} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }}
                    onClick={() => handleSelectSuggestion(s)} role="option" aria-selected="false">
                  {s.description}
                </li>
              ))}
            </ul>
          )}
          {location && (
            <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
              📍 Location set: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="scroll-into-view"
                aria-label="Activity category"
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
                onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="scroll-into-view"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="estimatedDuration">Duration (minutes) *</label>
              <input
                type="number"
                id="estimatedDuration"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className={`scroll-into-view ${errors.estimatedDuration ? 'error' : ''}`}
                min="1"
                aria-label="Activity estimated duration"
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
                onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className={`scroll-into-view ${errors.cost ? 'error' : ''}`}
                min="0"
                step="0.01"
                aria-label="Activity estimated cost"
              />
              {errors.cost && <span className="error-text">{errors.cost}</span>}
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="isOpen"
                name="isOpen"
                checked={formData.isOpen}
                onChange={(e) => setFormData(prev => ({ ...prev, isOpen: e.target.checked }))}
                aria-label="Is activity currently open"
              />
              <span>🟢 This place is currently open</span>
            </label>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Uncheck if the place is closed or you want to mark it as unavailable
            </p>
          </div>

          <FormField id="notes" label="Additional Notes">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="scroll-into-view"
              placeholder="Any additional details..."
              rows={2}
            />
          </FormField>

          <div className="form-group">
            <label>Opening Hours</label>
            <Button type="button" onClick={handleFetchHours} disabled={fetchingHours} style={{marginLeft: 8}} aria-label="Fetch opening hours from Google" variant="neutral" size="sm">
              {fetchingHours ? 'Fetching...' : 'Auto-populate from Google'}
            </Button>
            {fetchHoursError && <span className="error-text">{fetchHoursError}</span>}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: 8}}>
              {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, i) => (
                <div key={day} style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
                  <span style={{fontWeight: 500}}>{day}</span>
                  <div style={{display: 'flex', gap: 4, alignItems: 'center'}}>
                    <input type="time" value={openingHours[i]?.open || ''} onChange={e => setOpeningHours(h => ({...h, [i]: {...(h[i]||{}), open: e.target.value}}))} aria-label={`Open time for ${day}`} />
                    <span>-</span>
                    <input type="time" value={openingHours[i]?.close || ''} onChange={e => setOpeningHours(h => ({...h, [i]: {...(h[i]||{}), close: e.target.value}}))} aria-label={`Close time for ${day}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <Button type="button" onClick={handleAutoPopulate} disabled={autoPopulating} style={{marginBottom: 8}} aria-label="Auto-populate all fields from Google" variant="neutral" size="sm">
              {autoPopulating ? 'Auto-populating...' : 'Auto-populate All Fields from Google'}
            </Button>
            {autoPopulateError && <span className="error-text">{autoPopulateError}</span>}
          </div>

          <SafeAreaFooter>
            <Button type="button" variant="neutral" onClick={onClose} aria-label="Cancel adding activity">Cancel</Button>
            <Button type="submit" variant="primary" aria-label="Add activity">Add Activity</Button>
          </SafeAreaFooter>
        </form>
      </div>
    </div>
  );
}
