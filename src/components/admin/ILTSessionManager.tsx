import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  UserCheck,
  Download,
  CheckCircle,
  XCircle,
  MoreVertical,
  Building,
} from 'lucide-react';

interface ILTSession {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description?: string;
  type: 'in_person' | 'virtual' | 'hybrid';
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: string;
  virtualMeetingUrl?: string;
  instructorId: string;
  instructorName: string;
  maxCapacity: number;
  enrolledCount: number;
  waitlistCount: number;
  attendedCount?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  registrations: SessionRegistration[];
  materials?: string[];
  notes?: string;
}

interface SessionRegistration {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'registered' | 'waitlist' | 'attended' | 'no_show' | 'cancelled';
  registeredAt: Date;
  attendanceMarkedAt?: Date;
}

interface ILTSessionManagerProps {
  sessions: ILTSession[];
  courses: { id: string; title: string }[];
  instructors: { id: string; name: string }[];
  onCreateSession: (session: Omit<ILTSession, 'id' | 'enrolledCount' | 'waitlistCount' | 'attendedCount' | 'registrations'>) => Promise<void>;
  onUpdateSession: (sessionId: string, updates: Partial<ILTSession>) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onMarkAttendance: (sessionId: string, userId: string, status: 'attended' | 'no_show') => Promise<void>;
  onSendReminder: (sessionId: string) => Promise<void>;
  onExportAttendance: (sessionId: string) => void;
  isDarkMode?: boolean;
}

type ViewMode = 'list' | 'calendar';

export const ILTSessionManager: React.FC<ILTSessionManagerProps> = ({
  sessions,
  courses,
  instructors,
  onCreateSession,
  onUpdateSession: _onUpdateSession,
  onDeleteSession: _onDeleteSession,
  onMarkAttendance,
  onSendReminder,
  onExportAttendance,
  isDarkMode = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ILTSession | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newSession, setNewSession] = useState({
    courseId: '',
    courseName: '',
    title: '',
    description: '',
    type: 'in_person' as ILTSession['type'],
    startTime: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: '',
    virtualMeetingUrl: '',
    instructorId: '',
    instructorName: '',
    maxCapacity: 20,
    status: 'scheduled' as ILTSession['status'],
    notes: '',
  });

  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.courseName.toLowerCase().includes(query) ||
        s.instructorName.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.status === selectedStatus);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(s => s.type === selectedType);
    }

    return filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions, searchQuery, selectedStatus, selectedType]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  const getSessionsForDate = (date: Date) => {
    return filteredSessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate.toDateString() === date.toDateString();
    });
  };

  const handleCreateSession = async () => {
    if (!newSession.courseId || !newSession.title || !newSession.startTime) return;

    setIsSaving(true);
    try {
      await onCreateSession({
        ...newSession,
        startTime: new Date(newSession.startTime),
        endTime: new Date(newSession.endTime),
      });
      setShowCreateModal(false);
      setNewSession({
        courseId: '',
        courseName: '',
        title: '',
        description: '',
        type: 'in_person',
        startTime: '',
        endTime: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: '',
        virtualMeetingUrl: '',
        instructorId: '',
        instructorName: '',
        maxCapacity: 20,
        status: 'scheduled',
        notes: '',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  };

  const getStatusColor = (status: ILTSession['status']) => {
    switch (status) {
      case 'scheduled': return isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'in_progress': return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      case 'completed': return isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
      case 'cancelled': return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
    }
  };

  const getTypeIcon = (type: ILTSession['type']) => {
    switch (type) {
      case 'in_person': return Building;
      case 'virtual': return Video;
      case 'hybrid': return Users;
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">ILT Session Manager</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Schedule and manage instructor-led training sessions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create Session
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-600'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-600'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Types</option>
            <option value="in_person">In Person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>

          <div className={`flex rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : ''
              } rounded-l-lg`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 ${
                viewMode === 'calendar' ? 'bg-indigo-600 text-white' : ''
              } rounded-r-lg`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <div className={`p-12 text-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <Calendar className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Create a new session to get started
                </p>
              </div>
            ) : (
              filteredSessions.map(session => {
                const TypeIcon = getTypeIcon(session.type);
                const isFull = session.enrolledCount >= session.maxCapacity;

                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Block */}
                      <div className={`w-20 text-center p-3 rounded-lg ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <div className="text-sm font-medium">
                          {new Date(session.startTime).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div className="text-2xl font-bold">
                          {new Date(session.startTime).getDate()}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(session.startTime).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{session.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(session.status)}`}>
                                {session.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {session.courseName}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedSession(session);
                                setShowAttendanceModal(true);
                              }}
                              className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                              title="Manage Attendance"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onSendReminder(session.id)}
                              className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                              title="Send Reminder"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onExportAttendance(session.id)}
                              className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                              title="Export Attendance"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mt-3 text-sm">
                          <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Clock className="w-4 h-4" />
                            {formatTime(session.startTime)} - {formatTime(session.endTime)}
                          </div>
                          <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <TypeIcon className="w-4 h-4" />
                            {session.type === 'in_person' ? 'In Person' :
                             session.type === 'virtual' ? 'Virtual' : 'Hybrid'}
                          </div>
                          {session.location && (
                            <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <MapPin className="w-4 h-4" />
                              {session.location}
                            </div>
                          )}
                          <div className={`flex items-center gap-1 ${
                            isFull ? 'text-red-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <Users className="w-4 h-4" />
                            {session.enrolledCount}/{session.maxCapacity}
                            {session.waitlistCount > 0 && ` (+${session.waitlistCount} waitlist)`}
                          </div>
                        </div>

                        <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Instructor: {session.instructorName}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Calendar View */
          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Month Navigation */}
            <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className={`p-3 text-center text-sm font-medium border-b ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((date, index) => {
                const daySessions = date ? getSessionsForDate(date) : [];
                const isToday = date?.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
                    className={`min-h-32 p-2 border-b border-r ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    } ${!date ? isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50' : ''}`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm mb-1 ${
                          isToday
                            ? 'w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                            : ''
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {daySessions.slice(0, 3).map(session => (
                            <button
                              key={session.id}
                              onClick={() => setSelectedSession(session)}
                              className={`w-full text-left text-xs p-1 rounded truncate ${
                                session.type === 'virtual'
                                  ? isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                                  : session.type === 'in_person'
                                    ? isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                    : isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {formatTime(session.startTime)} {session.title}
                            </button>
                          ))}
                          {daySessions.length > 3 && (
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              +{daySessions.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } p-6`}>
            <h2 className="text-lg font-semibold mb-4">Create Training Session</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Course *</label>
                  <select
                    value={newSession.courseId}
                    onChange={(e) => {
                      const course = courses.find(c => c.id === e.target.value);
                      setNewSession({
                        ...newSession,
                        courseId: e.target.value,
                        courseName: course?.title || '',
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">Select course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Session Title *</label>
                  <input
                    type="text"
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="e.g., Morning Session"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newSession.type}
                    onChange={(e) => setNewSession({ ...newSession, type: e.target.value as ILTSession['type'] })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="in_person">In Person</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={newSession.startTime}
                    onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {(newSession.type === 'in_person' || newSession.type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={newSession.location}
                    onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="Building, Room, Address"
                  />
                </div>
              )}

              {(newSession.type === 'virtual' || newSession.type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Virtual Meeting URL</label>
                  <input
                    type="url"
                    value={newSession.virtualMeetingUrl}
                    onChange={(e) => setNewSession({ ...newSession, virtualMeetingUrl: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Instructor</label>
                  <select
                    value={newSession.instructorId}
                    onChange={(e) => {
                      const instructor = instructors.find(i => i.id === e.target.value);
                      setNewSession({
                        ...newSession,
                        instructorId: e.target.value,
                        instructorName: instructor?.name || '',
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">Select instructor</option>
                    {instructors.map(instructor => (
                      <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Capacity</label>
                  <input
                    type="number"
                    value={newSession.maxCapacity}
                    onChange={(e) => setNewSession({ ...newSession, maxCapacity: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    min={1}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!newSession.courseId || !newSession.title || !newSession.startTime || isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSaving ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedSession.title}</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatDate(selectedSession.startTime)} • {formatTime(selectedSession.startTime)}
                </p>
              </div>
              <button onClick={() => setShowAttendanceModal(false)}>
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-4">
              <div className={`flex-1 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="text-2xl font-bold">{selectedSession.enrolledCount}</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Registered</div>
              </div>
              <div className={`flex-1 p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <div className="text-2xl font-bold text-green-600">{selectedSession.attendedCount || 0}</div>
                <div className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>Attended</div>
              </div>
              <div className={`flex-1 p-3 rounded-lg ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                <div className="text-2xl font-bold text-red-600">
                  {selectedSession.registrations.filter(r => r.status === 'no_show').length}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>No Show</div>
              </div>
            </div>

            <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <table className="w-full">
                <thead>
                  <tr className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <th className="px-4 py-3 text-left text-sm font-medium">Attendee</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {selectedSession.registrations.map(reg => (
                    <tr key={reg.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{reg.userName}</div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {reg.userEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          reg.status === 'attended'
                            ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                            : reg.status === 'no_show'
                              ? isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                              : reg.status === 'waitlist'
                                ? isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {reg.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {reg.status === 'registered' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onMarkAttendance(selectedSession.id, reg.userId, 'attended')}
                              className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Present
                            </button>
                            <button
                              onClick={() => onMarkAttendance(selectedSession.id, reg.userId, 'no_show')}
                              className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                            >
                              <XCircle className="w-3 h-3" />
                              No Show
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
