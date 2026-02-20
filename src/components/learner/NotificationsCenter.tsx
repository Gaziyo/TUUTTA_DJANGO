import React, { useState, useMemo } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Settings,
  BookOpen,
  Award,
  Clock,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  X,
  Filter
} from 'lucide-react';
import { LMSNotification, NotificationType } from '../../types/lms';

interface NotificationsCenterProps {
  notifications: LMSNotification[];
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onNotificationClick: (notification: LMSNotification) => void;
  onSettingsClick: () => void;
  isDarkMode?: boolean;
}

type FilterType = 'all' | 'unread' | NotificationType;

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  enrollment_new: BookOpen,
  enrollment_reminder: Clock,
  enrollment_overdue: AlertTriangle,
  course_completed: Award,
  certificate_issued: Award,
  certificate_expiring: Clock,
  announcement: Bell,
  feedback_received: MessageSquare
};

const NOTIFICATION_COLORS: Record<NotificationType, { bg: string; darkBg: string; icon: string }> = {
  enrollment_new: { bg: 'bg-blue-50', darkBg: 'bg-blue-900/30', icon: 'text-blue-500' },
  enrollment_reminder: { bg: 'bg-yellow-50', darkBg: 'bg-yellow-900/30', icon: 'text-yellow-500' },
  enrollment_overdue: { bg: 'bg-red-50', darkBg: 'bg-red-900/30', icon: 'text-red-500' },
  course_completed: { bg: 'bg-green-50', darkBg: 'bg-green-900/30', icon: 'text-green-500' },
  certificate_issued: { bg: 'bg-purple-50', darkBg: 'bg-purple-900/30', icon: 'text-purple-500' },
  certificate_expiring: { bg: 'bg-orange-50', darkBg: 'bg-orange-900/30', icon: 'text-orange-500' },
  announcement: { bg: 'bg-indigo-50', darkBg: 'bg-indigo-900/30', icon: 'text-indigo-500' },
  feedback_received: { bg: 'bg-teal-50', darkBg: 'bg-teal-900/30', icon: 'text-teal-500' }
};

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  enrollment_new: 'New Assignment',
  enrollment_reminder: 'Reminder',
  enrollment_overdue: 'Overdue',
  course_completed: 'Completed',
  certificate_issued: 'Certificate',
  certificate_expiring: 'Expiring',
  announcement: 'Announcement',
  feedback_received: 'Feedback'
};

export function NotificationsCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onNotificationClick,
  onSettingsClick,
  isDarkMode = false
}: NotificationsCenterProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  const unreadCount = notifications.filter(n => n.status !== 'read').length;

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    switch (filter) {
      case 'unread':
        result = result.filter(n => n.status !== 'read');
        break;
      case 'all':
        break;
      default:
        result = result.filter(n => n.type === filter);
    }

    // Sort by date, newest first
    result.sort((a, b) => b.createdAt - a.createdAt);

    return result;
  }, [notifications, filter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: LMSNotification[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    filteredNotifications.forEach(notification => {
      const notifDate = new Date(notification.createdAt);
      notifDate.setHours(0, 0, 0, 0);

      let groupKey: string;
      if (notifDate.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else if (notifDate > thisWeek) {
        groupKey = 'This Week';
      } else {
        groupKey = 'Earlier';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={24} className="text-indigo-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold">Notifications</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {unreadCount} unread
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <Filter size={20} />
            </button>
            <button
              onClick={onSettingsClick}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-indigo-600 text-white'
                  : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
              }`}
            >
              Unread
            </button>
            {(Object.keys(NOTIFICATION_LABELS) as NotificationType[]).map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === type
                    ? 'bg-indigo-600 text-white'
                    : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                }`}
              >
                {NOTIFICATION_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <BellOff size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No notifications</p>
            <p className="text-sm">
              {filter === 'all' ? "You're all caught up!" : 'No notifications match this filter'}
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
              <div key={group}>
                <div className={`sticky top-0 px-4 py-2 text-sm font-medium ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                }`}>
                  {group}
                </div>

                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {groupNotifications.map(notification => {
                    const Icon = NOTIFICATION_ICONS[notification.type];
                    const colors = NOTIFICATION_COLORS[notification.type];
                    const isUnread = notification.status !== 'read';

                    return (
                      <div
                        key={notification.id}
                        className={`relative flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                          isUnread
                            ? (isDarkMode ? 'bg-gray-800/50' : 'bg-blue-50/50')
                            : ''
                        } ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                        onClick={() => {
                          if (isUnread) onMarkAsRead(notification.id);
                          onNotificationClick(notification);
                        }}
                      >
                        {/* Unread Indicator */}
                        {isUnread && (
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                        )}

                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDarkMode ? colors.darkBg : colors.bg
                        }`}>
                          <Icon size={20} className={colors.icon} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-medium ${isUnread ? '' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                                {notification.title}
                              </p>
                              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {formatTime(notification.createdAt)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(notification.id);
                                }}
                                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                                }`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isDarkMode ? colors.darkBg : colors.bg
                            } ${colors.icon}`}>
                              {NOTIFICATION_LABELS[notification.type]}
                            </span>
                            {notification.data?.courseName && (
                              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {notification.data.courseName}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight size={16} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Clear All */}
            {notifications.length > 0 && (
              <div className="p-4 text-center">
                <button
                  onClick={onClearAll}
                  className={`text-sm ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Notification Settings Component
interface NotificationSettingsProps {
  settings: {
    email: Record<NotificationType, boolean>;
    push: Record<NotificationType, boolean>;
    inApp: Record<NotificationType, boolean>;
  };
  onSave: (settings: NotificationSettingsProps['settings']) => Promise<void>;
  onClose: () => void;
  isDarkMode?: boolean;
}

export function NotificationSettings({
  settings,
  onSave,
  onClose,
  isDarkMode = false
}: NotificationSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const toggleSetting = (channel: 'email' | 'push' | 'inApp', type: NotificationType) => {
    setLocalSettings({
      ...localSettings,
      [channel]: {
        ...localSettings[channel],
        [type]: !localSettings[channel][type]
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localSettings);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60`}>
      <div className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${
            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}>
            <X size={20} />
          </button>
        </div>

        {/* Settings Grid */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          <table className="w-full">
            <thead>
              <tr className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <th className="text-left py-2">Notification Type</th>
                <th className="text-center py-2 w-20">Email</th>
                <th className="text-center py-2 w-20">Push</th>
                <th className="text-center py-2 w-20">In-App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(Object.keys(NOTIFICATION_LABELS) as NotificationType[]).map(type => (
                <tr key={type}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {React.createElement(NOTIFICATION_ICONS[type], {
                        size: 18,
                        className: NOTIFICATION_COLORS[type].icon
                      })}
                      <span>{NOTIFICATION_LABELS[type]}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={localSettings.email[type]}
                      onChange={() => toggleSetting('email', type)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={localSettings.push[type]}
                      onChange={() => toggleSetting('push', type)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={localSettings.inApp[type]}
                      onChange={() => toggleSetting('inApp', type)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-4 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationsCenter;
