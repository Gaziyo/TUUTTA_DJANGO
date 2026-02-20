import React, { useState } from 'react';
import {
  Clock,
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Bell,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Search,
  MoreVertical,
  BookOpen,
  Settings,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Send
} from 'lucide-react';

interface WaitlistEntry {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  learnerAvatar?: string;
  courseId: string;
  courseName: string;
  sessionId?: string;
  sessionName?: string;
  position: number;
  joinedAt: Date;
  priority: 'normal' | 'high' | 'urgent';
  status: 'waiting' | 'notified' | 'expired' | 'enrolled';
  notifiedAt?: Date;
  expiresAt?: Date;
  notes?: string;
}

interface WaitlistSettings {
  autoPromoteEnabled: boolean;
  notificationLeadTime: number; // hours
  expirationTime: number; // hours after notification
  maxWaitlistSize: number;
  priorityRules: {
    id: string;
    name: string;
    condition: string;
    priorityLevel: 'high' | 'urgent';
    enabled: boolean;
  }[];
}

interface WaitlistManagementProps {
  isDarkMode?: boolean;
}

export const WaitlistManagement: React.FC<WaitlistManagementProps> = ({ isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<'waitlists' | 'settings'>('waitlists');
  const tabs: Array<{ id: 'waitlists' | 'settings'; label: string; icon: React.ElementType }> = [
    { id: 'waitlists', label: 'Waitlists', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set(['course-1', 'course-2']));
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

  // Mock data
  const [waitlistEntries] = useState<WaitlistEntry[]>([
    {
      id: 'wl-1',
      learnerId: 'user-1',
      learnerName: 'Alice Johnson',
      learnerEmail: 'alice@company.com',
      courseId: 'course-1',
      courseName: 'Advanced Leadership Training',
      sessionId: 'session-1',
      sessionName: 'January 2024 Cohort',
      position: 1,
      joinedAt: new Date('2024-01-10'),
      priority: 'urgent',
      status: 'waiting',
      notes: 'Manager requested priority enrollment'
    },
    {
      id: 'wl-2',
      learnerId: 'user-2',
      learnerName: 'Bob Smith',
      learnerEmail: 'bob@company.com',
      courseId: 'course-1',
      courseName: 'Advanced Leadership Training',
      sessionId: 'session-1',
      sessionName: 'January 2024 Cohort',
      position: 2,
      joinedAt: new Date('2024-01-11'),
      priority: 'normal',
      status: 'waiting'
    },
    {
      id: 'wl-3',
      learnerId: 'user-3',
      learnerName: 'Carol Williams',
      learnerEmail: 'carol@company.com',
      courseId: 'course-1',
      courseName: 'Advanced Leadership Training',
      sessionId: 'session-1',
      sessionName: 'January 2024 Cohort',
      position: 3,
      joinedAt: new Date('2024-01-12'),
      priority: 'high',
      status: 'notified',
      notifiedAt: new Date('2024-01-18'),
      expiresAt: new Date('2024-01-20')
    },
    {
      id: 'wl-4',
      learnerId: 'user-4',
      learnerName: 'David Brown',
      learnerEmail: 'david@company.com',
      courseId: 'course-2',
      courseName: 'Data Analytics Certification',
      position: 1,
      joinedAt: new Date('2024-01-08'),
      priority: 'normal',
      status: 'waiting'
    },
    {
      id: 'wl-5',
      learnerId: 'user-5',
      learnerName: 'Eva Martinez',
      learnerEmail: 'eva@company.com',
      courseId: 'course-2',
      courseName: 'Data Analytics Certification',
      position: 2,
      joinedAt: new Date('2024-01-09'),
      priority: 'normal',
      status: 'enrolled'
    }
  ]);

  const [settings, setSettings] = useState<WaitlistSettings>({
    autoPromoteEnabled: true,
    notificationLeadTime: 24,
    expirationTime: 48,
    maxWaitlistSize: 50,
    priorityRules: [
      {
        id: 'rule-1',
        name: 'Manager Override',
        condition: 'Manager requests priority',
        priorityLevel: 'urgent',
        enabled: true
      },
      {
        id: 'rule-2',
        name: 'Compliance Deadline',
        condition: 'Learner has compliance deadline within 30 days',
        priorityLevel: 'high',
        enabled: true
      }
    ]
  });

  // Group entries by course
  const groupedEntries = waitlistEntries.reduce((acc, entry) => {
    const key = entry.courseId;
    if (!acc[key]) {
      acc[key] = {
        courseId: entry.courseId,
        courseName: entry.courseName,
        entries: []
      };
    }
    acc[key].entries.push(entry);
    return acc;
  }, {} as Record<string, { courseId: string; courseName: string; entries: WaitlistEntry[] }>);

  const courses = Object.values(groupedEntries);

  const toggleCourseExpand = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const toggleEntrySelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'notified': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'enrolled': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="w-3 h-3" />;
      case 'notified': return <Bell className="w-3 h-3" />;
      case 'enrolled': return <CheckCircle className="w-3 h-3" />;
      case 'expired': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const totalWaiting = waitlistEntries.filter(e => e.status === 'waiting').length;
  const totalNotified = waitlistEntries.filter(e => e.status === 'notified').length;
  const urgentCount = waitlistEntries.filter(e => e.priority === 'urgent' && e.status === 'waiting').length;

  const renderWaitlistsTab = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
              <Users className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalWaiting}</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Waiting</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-yellow-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-yellow-900/50' : 'bg-yellow-100'}`}>
              <Bell className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalNotified}</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Notified</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-red-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{urgentCount}</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Urgent</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-900/50' : 'bg-green-100'}`}>
              <BookOpen className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{courses.length}</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Courses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search learners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="notified">Notified</option>
            <option value="enrolled">Enrolled</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course.courseId} value={course.courseId}>{course.courseName}</option>
            ))}
          </select>
        </div>
        {selectedEntries.size > 0 && (
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedEntries.size} selected
            </span>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <MoreVertical className="w-4 h-4" />
              Bulk Actions
            </button>
          </div>
        )}
      </div>

      {/* Waitlist by Course */}
      <div className="space-y-4">
        {courses.map(course => (
          <div
            key={course.courseId}
            className={`rounded-lg border overflow-hidden ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            {/* Course Header */}
            <div
              className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => toggleCourseExpand(course.courseId)}
            >
              <div className="flex items-center gap-3">
                {expandedCourses.has(course.courseId) ? (
                  <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
                <BookOpen className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {course.courseName}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {course.entries.filter(e => e.status === 'waiting').length} waiting
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Notify all waiting
                  }}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                  }`}
                  title="Notify all waiting"
                >
                  <Send className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Promote top
                  }}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                  }`}
                  title="Promote top waitlisted"
                >
                  <UserPlus className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>
            </div>

            {/* Entries */}
            {expandedCourses.has(course.courseId) && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {course.entries
                  .filter(entry => {
                    if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
                    if (searchQuery && !entry.learnerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    return true;
                  })
                  .sort((a, b) => a.position - b.position)
                  .map(entry => (
                    <div
                      key={entry.id}
                      className={`px-4 py-3 flex items-center gap-4 ${
                        selectedEntries.has(entry.id)
                          ? isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() => toggleEntrySelection(entry.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        entry.position === 1
                          ? 'bg-yellow-100 text-yellow-700'
                          : entry.position === 2
                          ? 'bg-gray-200 text-gray-700'
                          : entry.position === 3
                          ? 'bg-orange-100 text-orange-700'
                          : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        #{entry.position}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                        {entry.learnerName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {entry.learnerName}
                          </p>
                          <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${getPriorityColor(entry.priority)}`}>
                            {entry.priority}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${getStatusColor(entry.status)}`}>
                            {getStatusIcon(entry.status)}
                            {entry.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {entry.learnerEmail}
                          </p>
                          {entry.sessionName && (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              • {entry.sessionName}
                            </span>
                          )}
                          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            • Joined {entry.joinedAt.toLocaleDateString()}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className={`text-sm mt-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            Note: {entry.notes}
                          </p>
                        )}
                        {entry.status === 'notified' && entry.expiresAt && (
                          <p className={`text-sm mt-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                            Expires: {entry.expiresAt.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          title="Move up"
                          disabled={entry.position === 1}
                        >
                          <ArrowUp className={`w-4 h-4 ${
                            entry.position === 1
                              ? isDarkMode ? 'text-gray-600' : 'text-gray-300'
                              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                        </button>
                        <button
                          className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          title="Move down"
                        >
                          <ArrowDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                        <button
                          className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          title="Send notification"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setShowNotifyModal(true);
                          }}
                        >
                          <Mail className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        </button>
                        <button
                          className="p-2 rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50"
                          title="Enroll now"
                        >
                          <UserPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                        <button
                          className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                          title="Remove from waitlist"
                        >
                          <UserMinus className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Auto-Promotion Settings */}
      <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RefreshCw className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Auto-Promotion
            </h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoPromoteEnabled}
              onChange={(e) => setSettings({ ...settings, autoPromoteEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Automatically promote learners from waitlist when spots become available
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Notification Lead Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.notificationLeadTime}
                onChange={(e) => setSettings({ ...settings, notificationLeadTime: parseInt(e.target.value) })}
                className={`w-20 px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>hours</span>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              How early to notify learners before enrollment deadline
            </p>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Expiration Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.expirationTime}
                onChange={(e) => setSettings({ ...settings, expirationTime: parseInt(e.target.value) })}
                className={`w-20 px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>hours</span>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Time until notification expires and next person is promoted
            </p>
          </div>
        </div>
      </div>

      {/* Waitlist Limits */}
      <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Users className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Waitlist Limits
          </h3>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Maximum Waitlist Size (per course)
          </label>
          <input
            type="number"
            value={settings.maxWaitlistSize}
            onChange={(e) => setSettings({ ...settings, maxWaitlistSize: parseInt(e.target.value) })}
            className={`w-32 px-3 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Set to 0 for unlimited waitlist size
          </p>
        </div>
      </div>

      {/* Priority Rules */}
      <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Priority Rules
            </h3>
          </div>
          <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            Add Rule
          </button>
        </div>
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Automatically assign priority levels based on conditions
        </p>
        <div className="space-y-3">
          {settings.priorityRules.map(rule => (
            <div
              key={rule.id}
              className={`p-4 rounded-lg border flex items-center justify-between ${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => {
                      const newRules = settings.priorityRules.map(r =>
                        r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                      );
                      setSettings({ ...settings, priorityRules: newRules });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rule.name}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{rule.condition}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(rule.priorityLevel)}`}>
                  {rule.priorityLevel}
                </span>
                <button className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}>
                  <Settings className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Waitlist Management
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage course waitlists and promotion settings
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'waitlists' && renderWaitlistsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>

      {/* Notify Modal */}
      {showNotifyModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Send Notification
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Send a notification to:
                </p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedEntry.learnerName} ({selectedEntry.learnerEmail})
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Message Template
                </label>
                <select
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option>Spot Available - Action Required</option>
                  <option>Position Update</option>
                  <option>Custom Message</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Custom Message (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Add a personal message..."
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowNotifyModal(false);
                  setSelectedEntry(null);
                }}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNotifyModal(false);
                  setSelectedEntry(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
