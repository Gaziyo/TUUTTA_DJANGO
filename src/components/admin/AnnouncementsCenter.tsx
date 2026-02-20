import React, { useState, useMemo } from 'react';
import type { Announcement, AnnouncementPriority, TargetAudience } from '../../types/lms';
import {
  Megaphone,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Clock,
  Users,
  Send,
  Calendar,
  Pin,
  AlertCircle,
  Info,
  X,
  Save,
} from 'lucide-react';

interface AnnouncementsCenterProps {
  announcements: Announcement[];
  courses: { id: string; title: string }[];
  teams: { id: string; name: string }[];
  onCreateAnnouncement: (announcement: Omit<Announcement, 'id' | 'viewCount' | 'createdAt' | 'updatedAt' | 'orgId'>) => Promise<void>;
  onUpdateAnnouncement: (announcementId: string, updates: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement: (announcementId: string) => Promise<void>;
  onPublishAnnouncement: (announcementId: string) => Promise<void>;
  currentUserId: string;
  isDarkMode?: boolean;
}

export const AnnouncementsCenter: React.FC<AnnouncementsCenterProps> = ({
  announcements = [],
  courses = [],
  teams = [],
  onCreateAnnouncement = async () => {},
  onUpdateAnnouncement = async () => {},
  onDeleteAnnouncement = async () => {},
  onPublishAnnouncement = async () => {},
  currentUserId = '',
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as AnnouncementPriority,
    targetAudience: 'all' as TargetAudience,
    targetIds: [] as string[],
    isPinned: false,
    publishAt: '',
    expiresAt: '',
  });

  const filteredAnnouncements = useMemo(() => {
    let filtered = [...announcements];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(a => a.priority === selectedPriority);
    }

    // Sort: pinned first, then by date
    filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [announcements, searchQuery, selectedStatus, selectedPriority]);

  const stats = useMemo(() => ({
    total: announcements.length,
    published: announcements.filter(a => a.status === 'published').length,
    scheduled: announcements.filter(a => a.status === 'scheduled').length,
    draft: announcements.filter(a => a.status === 'draft').length,
  }), [announcements]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      targetAudience: 'all',
      targetIds: [],
      isPinned: false,
      publishAt: '',
      expiresAt: '',
    });
    setEditingAnnouncement(null);
    setPreviewMode(false);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.content) return;

    setIsSaving(true);
    try {
      await onCreateAnnouncement({
        ...formData,
        status: formData.publishAt ? 'scheduled' : 'draft',
        publishAt: formData.publishAt ? new Date(formData.publishAt) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
        createdBy: currentUserId,
      });
      setShowCreateModal(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement || !formData.title || !formData.content) return;

    setIsSaving(true);
    try {
      await onUpdateAnnouncement(editingAnnouncement.id, {
        ...formData,
        publishAt: formData.publishAt ? new Date(formData.publishAt) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
      });
      setShowCreateModal(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      targetIds: announcement.targetIds || [],
      isPinned: announcement.isPinned,
      publishAt: announcement.publishAt ? new Date(announcement.publishAt).toISOString().slice(0, 16) : '',
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : '',
    });
    setShowCreateModal(true);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getPriorityColor = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'low': return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600';
      case 'normal': return isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'high': return isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
      case 'urgent': return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
    }
  };

  const getStatusColor = (status: AnnouncementStatus) => {
    switch (status) {
      case 'draft': return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600';
      case 'scheduled': return isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700';
      case 'published': return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      case 'expired': return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
    }
  };

  const getPriorityIcon = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'urgent': return AlertCircle;
      case 'high': return AlertCircle;
      default: return Info;
    }
  };

  const getAudienceLabel = (audience: TargetAudience, targetIds?: string[]) => {
    switch (audience) {
      case 'all': return 'All Users';
      case 'learners': return 'Learners';
      case 'instructors': return 'Instructors';
      case 'admins': return 'Administrators';
      case 'specific_courses': return `${targetIds?.length || 0} Courses`;
      case 'specific_teams': return `${targetIds?.length || 0} Teams`;
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Create and manage system-wide announcements
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create Announcement
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-indigo-500' },
            { label: 'Published', value: stats.published, color: 'text-green-500' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-purple-500' },
            { label: 'Drafts', value: stats.draft, color: 'text-gray-500' },
          ].map((stat, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search announcements..."
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
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-600'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredAnnouncements.length === 0 ? (
          <div className={`p-12 text-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Megaphone className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className="text-lg font-medium mb-2">No announcements found</h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Create your first announcement to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map(announcement => {
              const PriorityIcon = getPriorityIcon(announcement.priority);

              return (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${
                    announcement.isPinned ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Priority Indicator */}
                    <div className={`p-2 rounded-lg ${getPriorityColor(announcement.priority)}`}>
                      <PriorityIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-indigo-500" />
                        )}
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(announcement.status)}`}>
                          {announcement.status}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                      </div>

                      <p className={`text-sm mb-2 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {announcement.content}
                      </p>

                      <div className={`flex items-center gap-4 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {getAudienceLabel(announcement.targetAudience, announcement.targetIds)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {announcement.viewCount} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(announcement.createdAt)}
                        </span>
                        {announcement.publishAt && announcement.status === 'scheduled' && (
                          <span className="flex items-center gap-1 text-purple-500">
                            <Clock className="w-3 h-3" />
                            Scheduled: {formatDate(announcement.publishAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {announcement.status === 'draft' && (
                        <button
                          onClick={() => onPublishAnnouncement(announcement.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded"
                        >
                          <Send className="w-3 h-3" />
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => onUpdateAnnouncement(announcement.id, { isPinned: !announcement.isPinned })}
                        className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${
                          announcement.isPinned ? 'text-indigo-500' : ''
                        }`}
                        title={announcement.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(announcement)}
                        className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteAnnouncement(announcement.id)}
                        className={`p-2 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded ${
                    previewMode
                      ? 'bg-indigo-600 text-white'
                      : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button onClick={() => { setShowCreateModal(false); resetForm(); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {previewMode ? (
              /* Preview Mode */
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {formData.isPinned && <Pin className="w-4 h-4 text-indigo-500" />}
                  <h3 className="font-semibold text-lg">{formData.title || 'Untitled'}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPriorityColor(formData.priority)}`}>
                    {formData.priority}
                  </span>
                </div>
                <div className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}>
                  {formData.content || 'No content'}
                </div>
                <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Target: {getAudienceLabel(formData.targetAudience, formData.targetIds)}
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="Announcement title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    rows={6}
                    placeholder="Write your announcement..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as AnnouncementPriority })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Target Audience</label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as TargetAudience, targetIds: [] })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="all">All Users</option>
                      <option value="learners">Learners Only</option>
                      <option value="instructors">Instructors Only</option>
                      <option value="admins">Administrators Only</option>
                      <option value="specific_courses">Specific Courses</option>
                      <option value="specific_teams">Specific Teams</option>
                    </select>
                  </div>
                </div>

                {formData.targetAudience === 'specific_courses' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Courses</label>
                    <div className={`max-h-40 overflow-y-auto p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
                    }`}>
                      {courses.map(course => (
                        <label key={course.id} className="flex items-center gap-2 p-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.targetIds.includes(course.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, targetIds: [...formData.targetIds, course.id] });
                              } else {
                                setFormData({ ...formData, targetIds: formData.targetIds.filter(id => id !== course.id) });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{course.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.targetAudience === 'specific_teams' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Teams</label>
                    <div className={`max-h-40 overflow-y-auto p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
                    }`}>
                      {teams.map(team => (
                        <label key={team.id} className="flex items-center gap-2 p-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.targetIds.includes(team.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, targetIds: [...formData.targetIds, team.id] });
                              } else {
                                setFormData({ ...formData, targetIds: formData.targetIds.filter(id => id !== team.id) });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{team.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Schedule Publish (optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.publishAt}
                      onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isPinned" className="text-sm">Pin this announcement</label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={editingAnnouncement ? handleUpdate : handleCreate}
                disabled={!formData.title || !formData.content || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
