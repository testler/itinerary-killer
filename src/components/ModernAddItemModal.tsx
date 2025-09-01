import React, { useState } from 'react';
import { X, MapPin, Clock, DollarSign, FileText, Tag, AlertCircle } from 'lucide-react';
import { ItineraryItem, UserLocation } from '../types';
import { Modal, Button, Input, Card } from './ui';
import { getCoordinatesFromAddress } from '../utils/location';

interface ModernAddItemModalProps {
  onClose: () => void;
  onAdd: (item: ItineraryItem) => void;
  userLocation?: UserLocation | null;
}

const CATEGORIES = [
  'Theme Parks',
  'Restaurants', 
  'Shopping',
  'Entertainment',
  'Outdoor',
  'Museums',
  'Hotels',
  'Transportation',
  'Other'
];

const PRIORITIES = [
  { value: 'high', label: 'High Priority', color: 'error' },
  { value: 'medium', label: 'Medium Priority', color: 'warning' },
  { value: 'low', label: 'Low Priority', color: 'success' }
];

export function ModernAddItemModal({ onClose, onAdd, userLocation }: ModernAddItemModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    category: 'Other',
    priority: 'medium',
    estimatedDuration: 60,
    cost: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Activity title is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Location address is required';
    }

    if (formData.estimatedDuration < 1) {
      newErrors.estimatedDuration = 'Duration must be at least 1 minute';
    }

    if (formData.cost < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Geocode the address
      const coordinates = await getCoordinatesFromAddress(formData.address);
      
      if (!coordinates) {
        setErrors({ address: 'Could not find location. Please check the address.' });
        setIsSubmitting(false);
        return;
      }

      const newItem: ItineraryItem = {
        id: Date.now().toString(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        location: coordinates,
        category: formData.category,
        priority: formData.priority as 'high' | 'medium' | 'low',
        estimatedDuration: formData.estimatedDuration,
        cost: formData.cost,
        completed: false,
        done: false,
        notes: '',
        isOpen: false,
        createdAt: new Date()
      };

      onAdd(newItem);
    } catch (error) {
      console.error('Error creating activity:', error);
      setErrors({ address: 'Failed to create activity. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="lg" title="Add New Activity">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <Input
          label="Activity Title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Enter activity name..."
          error={errors.title}
          icon={FileText}
          required
        />

        {/* Address */}
        <Input
          label="Location Address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Enter address or location..."
          error={errors.address}
          icon={MapPin}
          required
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the activity..."
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Category and Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              <Tag size={16} className="inline mr-1" />
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="input"
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              <AlertCircle size={16} className="inline mr-1" />
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="input"
            >
              {PRIORITIES.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration and Cost Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Duration (minutes)"
            type="number"
            value={formData.estimatedDuration}
            onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || 0)}
            min="1"
            error={errors.estimatedDuration}
            icon={Clock}
            required
          />

          <Input
            label="Estimated Cost ($)"
            type="number"
            value={formData.cost}
            onChange={(e) => handleInputChange('cost', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            error={errors.cost}
            icon={DollarSign}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Adding...' : 'Add Activity'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ModernAddItemModal;
