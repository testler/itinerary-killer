import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { ItineraryItem } from '../types';
import { Button } from './ui';
import { Card, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';

interface CalendarViewProps {
  activities: ItineraryItem[];
  onActivityClick: (activity: ItineraryItem) => void;
  onAddActivity: (date?: Date) => void;
  onUpdateActivity: (id: string, updates: Partial<ItineraryItem>) => Promise<void>;
  userLocation?: { lat: number; lng: number } | null;
  loading?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  activities: ItineraryItem[];
}

export function CalendarView({
  activities,
  onActivityClick,
  onAddActivity,
  onUpdateActivity,
  userLocation,
  loading = false
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Get activities for a specific date
  const getActivitiesForDate = (date: Date): ItineraryItem[] => {
    return activities.filter(activity => 
      activity.scheduledDate && isSameDay(activity.scheduledDate, date)
    );
  };

  // Get unscheduled activities
  const unscheduledActivities = useMemo(() => {
    return activities.filter(activity => !activity.scheduledDate && !activity.done);
  }, [activities]);

  // Calendar grid for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(date => ({
      date,
      isCurrentMonth: isSameMonth(date, currentDate),
      activities: getActivitiesForDate(date)
    }));
  }, [currentDate, activities]);

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Schedule an activity for a specific date
  const scheduleActivity = async (activity: ItineraryItem, date: Date, isAllDay: boolean = true) => {
    try {
      await onUpdateActivity(activity.id, {
        scheduledDate: date,
        allDay: isAllDay,
        startTime: isAllDay ? undefined : '09:00',
        endTime: isAllDay ? undefined : undefined
      });
    } catch (error) {
      console.error('Failed to schedule activity:', error);
    }
  };

  // Remove scheduling from an activity
  const unscheduleActivity = async (activity: ItineraryItem) => {
    try {
      await onUpdateActivity(activity.id, {
        scheduledDate: undefined,
        allDay: undefined,
        startTime: undefined,
        endTime: undefined
      });
    } catch (error) {
      console.error('Failed to unschedule activity:', error);
    }
  };

  // Handle day click
  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setViewMode('day');
  };

  // Handle drag and drop (simplified - basic implementation)
  const handleDrop = (event: React.DragEvent, date: Date) => {
    event.preventDefault();
    const activityId = event.dataTransfer.getData('text/plain');
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      scheduleActivity(activity, date);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDragStart = (event: React.DragEvent, activity: ItineraryItem) => {
    event.dataTransfer.setData('text/plain', activity.id);
  };

  // Format time for display
  const formatTime = (activity: ItineraryItem) => {
    if (activity.allDay) return 'All day';
    if (activity.startTime) {
      const endTime = activity.endTime ? ` - ${activity.endTime}` : '';
      return `${activity.startTime}${endTime}`;
    }
    return '';
  };

  // Get priority color
  const getPriorityColor = (priority: ItineraryItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white" role="main" aria-label="Calendar view">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                icon={ChevronLeft}
                className="p-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                icon={ChevronRight}
                className="p-1"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAddActivity(selectedDate || new Date())}
              icon={Plus}
            >
              Add
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
          {(['month', 'week', 'day'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                px-3 py-1 text-sm rounded-md transition-colors capitalize
                ${viewMode === mode 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Calendar */}
        <div className="flex-1 p-4">
          {viewMode === 'month' && (
            <div className="h-full">
              {/* Month View */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 h-full">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      border border-gray-200 p-2 cursor-pointer transition-colors
                      hover:bg-gray-50 min-h-[120px] flex flex-col focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                      ${isToday(day.date) ? 'bg-blue-50 border-blue-200' : ''}
                      ${selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-blue-500' : ''}
                    `}
                    onClick={() => handleDayClick(day)}
                    onDrop={(e) => handleDrop(e, day.date)}
                    onDragOver={handleDragOver}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDayClick(day);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${format(day.date, 'EEEE, MMMM d, yyyy')}${day.activities.length > 0 ? ` - ${day.activities.length} activities scheduled` : ' - No activities scheduled'}`}
                  >
                    <div className={`text-sm ${isToday(day.date) ? 'font-bold text-blue-600' : ''}`}>
                      {format(day.date, 'd')}
                    </div>
                    
                    <div className="flex-1 mt-1 space-y-1">
                      {day.activities.slice(0, 3).map(activity => (
                        <div
                          key={activity.id}
                          className={`
                            text-xs p-1 rounded border cursor-pointer
                            ${getPriorityColor(activity.priority)}
                            hover:shadow-sm transition-shadow focus:outline-none focus:ring-1 focus:ring-blue-500
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onActivityClick(activity);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onActivityClick(activity);
                            }
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, activity)}
                          tabIndex={0}
                          role="button"
                          aria-label={`${activity.title} - ${activity.priority} priority${!activity.allDay && activity.startTime ? ` at ${activity.startTime}` : ''}`}
                        >
                          <div className="truncate font-medium">{activity.title}</div>
                          {!activity.allDay && activity.startTime && (
                            <div className="text-xs opacity-75">{activity.startTime}</div>
                          )}
                        </div>
                      ))}
                      {day.activities.length > 3 && (
                        <div className="text-xs text-gray-500 p-1">
                          +{day.activities.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'day' && selectedDate && (
            <div className="h-full">
              {/* Day View */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              
              <div className="space-y-2">
                {getActivitiesForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No activities scheduled for this day</p>
                    <Button
                      variant="primary"
                      onClick={() => onAddActivity(selectedDate)}
                      icon={Plus}
                      className="mt-2"
                    >
                      Add Activity
                    </Button>
                  </div>
                ) : (
                  getActivitiesForDate(selectedDate).map(activity => (
                    <Card key={activity.id} className="hover:shadow-md transition-shadow">
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{activity.title}</h4>
                              <Badge className={getPriorityColor(activity.priority)}>
                                {activity.priority}
                              </Badge>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                {formatTime(activity)}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin size={14} />
                                {activity.address}
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unscheduleActivity(activity)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            Unschedule
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Unscheduled Activities Sidebar */}
        <div className="w-80 border-l border-gray-200 bg-gray-50 p-4" role="complementary" aria-label="Unscheduled activities">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900" id="unscheduled-heading">Unscheduled</h3>
            <Badge className="bg-gray-200 text-gray-700">
              {unscheduledActivities.length}
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-full overflow-y-auto" aria-labelledby="unscheduled-heading">
            {unscheduledActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500" role="status" aria-live="polite">
                <Filter size={32} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">All activities are scheduled!</p>
              </div>
            ) : (
              unscheduledActivities.map(activity => (
                <Card
                  key={activity.id}
                  className="cursor-move hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                  draggable
                  onDragStart={(e) => handleDragStart(e, activity)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Drag ${activity.title} to schedule it`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      // Could implement keyboard scheduling here
                    }
                  }}
                >
                  <CardBody className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{activity.title}</h4>
                        <p className="text-xs text-gray-600 truncate">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${getPriorityColor(activity.priority)}`}>
                            {activity.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {activity.estimatedDuration}min
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
