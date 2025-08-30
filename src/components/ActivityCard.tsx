import React from 'react';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Star, 
  CheckCircle, 
  Circle,
  MoreVertical,
  Navigation,
  Trash2
} from 'lucide-react';
import { ItineraryItem } from '../types';
import { Card, Badge, Button } from './ui';

interface ActivityCardProps {
  activity: ItineraryItem;
  onToggleComplete: (id: string, completed: boolean) => void;
  onShowOnMap: (activity: ItineraryItem) => void;
  onDelete: (id: string) => void;
  distance?: string;
  isCompact?: boolean;
}

const categoryIcons: Record<string, string> = {
  'Theme Parks': '🎢',
  'Restaurants': '🍽️',
  'Shopping': '🛍️',
  'Entertainment': '🎭',
  'Outdoor': '🌳',
  'Museums': '🏛️',
  'Hotels': '🏨',
  'Transportation': '🚗',
  'Other': '📍'
};

const priorityColors = {
  high: 'error',
  medium: 'warning', 
  low: 'success'
} as const;

export function ActivityCard({
  activity,
  onToggleComplete,
  onShowOnMap,
  onDelete,
  distance,
  isCompact = false
}: ActivityCardProps) {
  const categoryIcon = categoryIcons[activity.category] || categoryIcons.Other;
  
  return (
    <Card 
      hover 
      className={`
        relative transition-all duration-200
        ${activity.completed ? 'opacity-75' : ''}
        ${isCompact ? 'p-4' : 'p-6'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-2xl flex-shrink-0">
            {categoryIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-primary mb-1 ${isCompact ? 'text-base' : 'text-lg'} ${activity.completed ? 'line-through' : ''}`}>
              {activity.title}
            </h3>
            <p className={`text-secondary ${isCompact ? 'text-sm' : 'text-base'} line-clamp-2`}>
              {activity.description}
            </p>
          </div>
        </div>
        
        {/* Actions dropdown */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleComplete(activity.id, !activity.completed)}
            className="p-2 rounded-full"
            aria-label={activity.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {activity.completed ? (
              <CheckCircle size={20} className="text-success-600" />
            ) : (
              <Circle size={20} className="text-gray-400" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant={priorityColors[activity.priority as keyof typeof priorityColors]}>
          {activity.priority} priority
        </Badge>
        <Badge variant="neutral">
          {activity.category}
        </Badge>
      </div>
      
      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2 text-secondary">
          <Clock size={16} />
          <span>{activity.estimatedDuration} min</span>
        </div>
        <div className="flex items-center gap-2 text-secondary">
          <DollarSign size={16} />
          <span>${activity.cost}</span>
        </div>
        {distance && (
          <div className="flex items-center gap-2 text-secondary">
            <Navigation size={16} />
            <span>{distance}</span>
          </div>
        )}
        {activity.rating && (
          <div className="flex items-center gap-2 text-secondary">
            <Star size={16} />
            <span>{activity.rating}/5</span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onShowOnMap(activity)}
          icon={MapPin}
          className="flex-1"
        >
          Show on Map
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(activity.id)}
          className="p-2 text-error hover:bg-error hover:text-white"
          aria-label="Delete activity"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
}
