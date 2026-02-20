import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  AlertTriangle,
  Award,
  Users,
  MapPin,
  Video,
  ExternalLink
} from 'lucide-react';
import { Course, Enrollment, LearningPath } from '../../types/lms';

interface TrainingEvent {
  id: string;
  type: 'deadline' | 'live_session' | 'certification_expiry' | 'scheduled_training';
  title: string;
  description?: string;
  date: number;
  endDate?: number;
  courseId?: string;
  learningPathId?: string;
  isAllDay: boolean;
  status?: 'upcoming' | 'overdue' | 'completed';
  location?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
  instructor?: string;
  attendees?: number;
}

interface TrainingCalendarProps {
  events: TrainingEvent[];
  enrollments: Enrollment[];
  courses: Course[];
  learningPaths: LearningPath[];
  onEventClick: (event: TrainingEvent) => void;
  onDateClick: (date: Date) => void;
  isDarkMode?: boolean;
}

type ViewMode = 'month' | 'week' | 'agenda';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_COLORS: Record<TrainingEvent['type'], { bg: string; darkBg: string; border: string; text: string }> = {
  deadline: { bg: 'bg-red-100', darkBg: 'bg-red-900/30', border: 'border-l-red-500', text: 'text-red-700' },
  live_session: { bg: 'bg-blue-100', darkBg: 'bg-blue-900/30', border: 'border-l-blue-500', text: 'text-blue-700' },
  certification_expiry: { bg: 'bg-orange-100', darkBg: 'bg-orange-900/30', border: 'border-l-orange-500', text: 'text-orange-700' },
  scheduled_training: { bg: 'bg-purple-100', darkBg: 'bg-purple-900/30', border: 'border-l-purple-500', text: 'text-purple-700' }
};

const EVENT_ICONS: Record<TrainingEvent['type'], React.ElementType> = {
  deadline: AlertTriangle,
  live_session: Video,
  certification_expiry: Award,
  scheduled_training: BookOpen
};

export function TrainingCalendar({
  events,
  enrollments: _enrollments,
  courses: _courses,
  learningPaths: _learningPaths,
  onEventClick,
  onDateClick,
  isDarkMode = false
}: TrainingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add days from previous month to fill the week
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to complete the grid
    const endPadding = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): TrainingEvent[] => {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= dateStart && eventDate <= dateEnd;
    });
  };

  // Get week days for week view
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  // Get upcoming events for agenda view
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return events
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => a.date - b.date)
      .slice(0, 20);
  }, [events]);

  // Navigation
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon size={24} className="text-indigo-500" />
            <h1 className="text-xl font-semibold">Training Calendar</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className={`flex rounded-lg overflow-hidden border ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {(['month', 'week', 'agenda'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize ${
                    viewMode === mode
                      ? 'bg-indigo-600 text-white'
                      : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50')
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrevious}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={navigateNext}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <ChevronRight size={20} />
            </button>
            <h2 className="text-lg font-semibold ml-2">
              {viewMode === 'month'
                ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : viewMode === 'week'
                  ? `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'Upcoming Events'}
            </h2>
          </div>

          <button
            onClick={goToToday}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Month View */}
        {viewMode === 'month' && (
          <div className="h-full flex flex-col">
            {/* Weekday Headers */}
            <div className={`grid grid-cols-7 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className={`py-2 text-center text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {calendarDays.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isSelected = selectedDate?.toDateString() === date.toDateString();

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedDate(date);
                      onDateClick(date);
                    }}
                    className={`min-h-[100px] p-1 border-b border-r cursor-pointer transition-colors ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    } ${
                      isSelected
                        ? (isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50')
                        : (isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50')
                    } ${
                      !isCurrentMonth(date) ? (isDarkMode ? 'bg-gray-850' : 'bg-gray-50') : ''
                    }`}
                  >
                    <div className={`text-sm mb-1 ${
                      isToday(date)
                        ? 'w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                        : !isCurrentMonth(date)
                          ? (isDarkMode ? 'text-gray-600' : 'text-gray-400')
                          : ''
                    }`}>
                      {date.getDate()}
                    </div>

                    {/* Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => {
                        const colors = EVENT_COLORS[event.type];
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            className={`px-1.5 py-0.5 rounded text-xs truncate border-l-2 ${
                              isDarkMode ? colors.darkBg : colors.bg
                            } ${colors.border}`}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map(date => {
                const dayEvents = getEventsForDate(date);

                return (
                  <div
                    key={date.toISOString()}
                    className={`rounded-xl border ${
                      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    } ${isToday(date) ? 'ring-2 ring-indigo-500' : ''}`}
                  >
                    <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {WEEKDAYS[date.getDay()]}
                      </div>
                      <div className={`text-xl font-bold ${
                        isToday(date) ? 'text-indigo-500' : ''
                      }`}>
                        {date.getDate()}
                      </div>
                    </div>

                    <div className="p-2 space-y-2 min-h-[200px]">
                      {dayEvents.length === 0 ? (
                        <p className={`text-sm text-center py-4 ${
                          isDarkMode ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          No events
                        </p>
                      ) : (
                        dayEvents.map(event => {
                          const colors = EVENT_COLORS[event.type];
                          const Icon = EVENT_ICONS[event.type];

                          return (
                            <div
                              key={event.id}
                              onClick={() => onEventClick(event)}
                              className={`p-2 rounded-lg cursor-pointer border-l-2 ${
                                isDarkMode ? colors.darkBg : colors.bg
                              } ${colors.border}`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon size={14} className={colors.text} />
                                <span className="text-sm font-medium truncate">{event.title}</span>
                              </div>
                              {!event.isAllDay && (
                                <div className={`text-xs mt-1 ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {formatTime(event.date)}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agenda View */}
        {viewMode === 'agenda' && (
          <div className="p-4 max-w-2xl mx-auto">
            {upcomingEvents.length === 0 ? (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No upcoming events</p>
                <p className="text-sm">Your calendar is clear!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map(event => {
                  const colors = EVENT_COLORS[event.type];
                  const Icon = EVENT_ICONS[event.type];
                  const eventDate = new Date(event.date);

                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Date Column */}
                        <div className="text-center w-16 flex-shrink-0">
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {MONTHS[eventDate.getMonth()].substring(0, 3)}
                          </div>
                          <div className="text-2xl font-bold">{eventDate.getDate()}</div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {WEEKDAYS[eventDate.getDay()]}
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isDarkMode ? colors.darkBg : colors.bg
                                }`}>
                                  <Icon size={16} className={colors.text} />
                                </div>
                                <h3 className="font-semibold">{event.title}</h3>
                              </div>
                              {event.description && (
                                <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className={`flex flex-wrap items-center gap-4 text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {!event.isAllDay && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {formatTime(event.date)}
                                {event.endDate && ` - ${formatTime(event.endDate)}`}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1">
                                {event.isVirtual ? <Video size={14} /> : <MapPin size={14} />}
                                {event.location}
                              </span>
                            )}
                            {event.instructor && (
                              <span className="flex items-center gap-1">
                                <Users size={14} />
                                {event.instructor}
                              </span>
                            )}
                          </div>

                          {event.meetingUrl && (
                            <a
                              href={event.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-500 hover:text-indigo-600"
                            >
                              <ExternalLink size={14} />
                              Join Meeting
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainingCalendar;
