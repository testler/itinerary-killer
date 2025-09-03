import React, { useState, useEffect } from 'react';
import { ItineraryItem } from '../types';
import { findDuplicates, getDuplicateStats, DuplicateGroup } from '../utils/duplicates';
import { Modal, Button, Card } from './ui';
import { AlertTriangle, Trash2, Shield, MapPin, Clock, Tag } from 'lucide-react';

interface DuplicateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ItineraryItem[];
  onDeleteActivities: (ids: string[]) => Promise<void>;
}

export function DuplicateManagementModal({
  isOpen,
  onClose,
  activities,
  onDeleteActivities
}: DuplicateManagementModalProps) {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState<'scan' | 'review' | 'confirm'>('scan');

  useEffect(() => {
    if (isOpen) {
      const groups = findDuplicates(activities);
      setDuplicateGroups(groups);
      
      // Auto-select duplicates to delete (keep the first item in each group)
      const toDelete = new Set<string>();
      groups.forEach(group => {
        // Keep the most recently created item, delete the rest
        const sortedByDate = [...group.items].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        
        sortedByDate.slice(1).forEach(item => {
          toDelete.add(item.id);
        });
      });
      
      setSelectedToDelete(toDelete);
      setStep(groups.length > 0 ? 'review' : 'scan');
    }
  }, [isOpen, activities]);

  const stats = getDuplicateStats(activities);

  const handleToggleSelection = (itemId: string, groupItems: ItineraryItem[]) => {
    const newSelection = new Set(selectedToDelete);
    
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    
    // Ensure at least one item in the group is kept
    const groupIds = groupItems.map(item => item.id);
    const selectedInGroup = groupIds.filter(id => newSelection.has(id));
    
    if (selectedInGroup.length === groupItems.length) {
      // If all items in group are selected for deletion, unselect the most recent one
      const mostRecent = groupItems.reduce((latest, item) => 
        new Date(item.createdAt || 0) > new Date(latest.createdAt || 0) ? item : latest
      );
      newSelection.delete(mostRecent.id);
    }
    
    setSelectedToDelete(newSelection);
  };

  const handleDeleteSelected = async () => {
    if (selectedToDelete.size === 0) return;
    
    setIsDeleting(true);
    try {
      await onDeleteActivities(Array.from(selectedToDelete));
      onClose();
    } catch (error) {
      console.error('Failed to delete duplicates:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAllDuplicates = () => {
    const toDelete = new Set<string>();
    duplicateGroups.forEach(group => {
      // Keep the most recent, delete the rest
      const sortedByDate = [...group.items].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      sortedByDate.slice(1).forEach(item => {
        toDelete.add(item.id);
      });
    });
    setSelectedToDelete(toDelete);
  };

  const handleClearSelection = () => {
    setSelectedToDelete(new Set());
  };

  if (step === 'scan' && stats.groupCount === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="No Duplicates Found" size="md">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Duplicates Detected
          </h3>
          <p className="text-gray-600 mb-6">
            Your activities list looks clean! No duplicate activities were found.
          </p>
          <Button onClick={onClose} variant="primary">
            Great!
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Duplicate Activities" size="xl">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">
                Found {stats.groupCount} duplicate group{stats.groupCount !== 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-yellow-700">
                {stats.duplicatesToRemove} activities can be removed, keeping {stats.totalDuplicates - stats.duplicatesToRemove} unique activities.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleSelectAllDuplicates}
            variant="secondary"
            size="sm"
          >
            Select Recommended
          </Button>
          <Button 
            onClick={handleClearSelection}
            variant="ghost"
            size="sm"
          >
            Clear Selection
          </Button>
        </div>

        {/* Duplicate Groups */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {duplicateGroups.map((group, groupIndex) => (
            <Card key={groupIndex} className="p-4">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900 mb-1">
                  Duplicate Group {groupIndex + 1}
                </h4>
                <p className="text-sm text-gray-600">
                  Detected: {group.reasons.join(', ')}
                </p>
              </div>
              
              <div className="space-y-3">
                {group.items.map((item) => {
                  const isSelected = selectedToDelete.has(item.id);
                  const isRecommendedKeep = !selectedToDelete.has(item.id) && 
                    group.items.filter(i => !selectedToDelete.has(i.id)).length === 1;
                  
                  return (
                    <div 
                      key={item.id}
                      className={`
                        border rounded-lg p-3 transition-colors cursor-pointer
                        ${isSelected 
                          ? 'border-red-200 bg-red-50' 
                          : isRecommendedKeep
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                      `}
                      onClick={() => handleToggleSelection(item.id, group.items)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-gray-900 truncate">
                              {item.title}
                            </h5>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </span>
                            )}
                            {isRecommendedKeep && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                <Shield className="h-3 w-3" />
                                Keep
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{item.address}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                <span>{item.category}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{item.estimatedDuration}min</span>
                              </div>
                            </div>
                            {item.createdAt && (
                              <div className="text-xs text-gray-500">
                                Created: {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedToDelete.size} activities selected for deletion
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSelected}
              variant="primary"
              loading={isDeleting}
              disabled={selectedToDelete.size === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedToDelete.size} Activities`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
