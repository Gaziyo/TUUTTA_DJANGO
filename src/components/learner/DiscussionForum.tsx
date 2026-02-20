import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  ThumbsUp,
  Reply,
  Pin,
  MoreVertical,
  Search,
  User,
  CheckCircle,
  Flag,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DiscussionPost {
  id: string;
  courseId: string;
  lessonId?: string;
  authorId: string;
  authorName: string;
  authorRole: 'learner' | 'instructor' | 'admin';
  content: string;
  createdAt: number;
  updatedAt?: number;
  isPinned: boolean;
  isResolved: boolean;
  likes: string[];
  replies: DiscussionReply[];
}

interface DiscussionReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'learner' | 'instructor' | 'admin';
  content: string;
  createdAt: number;
  updatedAt?: number;
  isAnswer: boolean;
  likes: string[];
}

interface DiscussionForumProps {
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  posts?: DiscussionPost[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: 'learner' | 'instructor' | 'admin';
  onCreatePost?: (content: string, lessonId?: string) => Promise<void>;
  onReply?: (postId: string, content: string) => Promise<void>;
  onLikePost?: (postId: string) => Promise<void>;
  onLikeReply?: (postId: string, replyId: string) => Promise<void>;
  onMarkAsAnswer?: (postId: string, replyId: string) => Promise<void>;
  onPinPost?: (postId: string) => Promise<void>;
  onDeletePost?: (postId: string) => Promise<void>;
  onDeleteReply?: (postId: string, replyId: string) => Promise<void>;
  onReportPost?: (postId: string) => Promise<void>;
  isDarkMode?: boolean;
}

type SortOption = 'recent' | 'popular' | 'unanswered';
type FilterOption = 'all' | 'questions' | 'resolved' | 'mine';

export function DiscussionForum({
  courseId: _courseId = 'course-1',
  courseTitle = 'Course Discussion',
  lessonId,
  lessonTitle,
  posts = [],
  currentUserId = 'user-1',
  currentUserName: _currentUserName = 'Learner',
  currentUserRole = 'learner',
  onCreatePost = async () => {},
  onReply = async () => {},
  onLikePost = async () => {},
  onLikeReply = async () => {},
  onMarkAsAnswer = async () => {},
  onPinPost = async () => {},
  onDeletePost = async () => {},
  onDeleteReply = async () => {},
  onReportPost = async () => {},
  isDarkMode = false
}: DiscussionForumProps) {
  const [newPostContent, setNewPostContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [submitting, setSubmitting] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);

  const isInstructor = currentUserRole === 'instructor' || currentUserRole === 'admin';

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Filter by lesson if provided
    if (lessonId) {
      result = result.filter(p => p.lessonId === lessonId);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.content.toLowerCase().includes(query) ||
        p.authorName.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (filterBy) {
      case 'questions':
        result = result.filter(p => !p.isResolved);
        break;
      case 'resolved':
        result = result.filter(p => p.isResolved);
        break;
      case 'mine':
        result = result.filter(p => p.authorId === currentUserId);
        break;
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'popular':
        result.sort((a, b) => (b.likes.length + b.replies.length) - (a.likes.length + a.replies.length));
        break;
      case 'unanswered':
        result.sort((a, b) => {
          const aAnswered = a.replies.some(r => r.isAnswer);
          const bAnswered = b.replies.some(r => r.isAnswer);
          if (aAnswered === bAnswered) return b.createdAt - a.createdAt;
          return aAnswered ? 1 : -1;
        });
        break;
    }

    // Pin posts go first
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return result;
  }, [posts, lessonId, searchQuery, sortBy, filterBy, currentUserId]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onCreatePost(newPostContent.trim(), lessonId);
      setNewPostContent('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onReply(postId, replyContent.trim());
      setReplyContent('');
      setReplyingTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpanded = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  const formatDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getRoleBadge = (role: 'learner' | 'instructor' | 'admin') => {
    switch (role) {
      case 'instructor':
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
          }`}>
            Instructor
          </span>
        );
      case 'admin':
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'
          }`}>
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageSquare size={24} className="text-indigo-500" />
            <div>
              <h2 className="font-semibold">{lessonTitle ? `Discussion: ${lessonTitle}` : 'Course Discussion'}</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {courseTitle}
              </p>
            </div>
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredPosts.length} discussions
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
              } focus:ring-2 focus:ring-indigo-500 outline-none`}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
            } outline-none`}
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="unanswered">Unanswered</option>
          </select>

          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
            } outline-none`}
          >
            <option value="all">All Posts</option>
            <option value="questions">Open Questions</option>
            <option value="resolved">Resolved</option>
            <option value="mine">My Posts</option>
          </select>
        </div>
      </div>

      {/* New Post */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <User size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
          </div>
          <div className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Ask a question or start a discussion..."
              rows={3}
              className={`w-full px-4 py-3 rounded-lg border resize-none ${
                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
              } focus:ring-2 focus:ring-indigo-500 outline-none`}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={16} />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPosts.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No discussions yet</p>
            <p className="text-sm">Be the first to start a conversation!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPosts.map(post => {
              const isExpanded = expandedPosts.has(post.id);
              const hasAnswer = post.replies.some(r => r.isAnswer);
              const userLiked = post.likes.includes(currentUserId);

              return (
                <div key={post.id} className={`${
                  post.isPinned ? (isDarkMode ? 'bg-indigo-900/10' : 'bg-indigo-50/50') : ''
                }`}>
                  {/* Post */}
                  <div className="p-4">
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        post.authorRole === 'instructor' || post.authorRole === 'admin'
                          ? (isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100')
                          : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')
                      }`}>
                        <User size={20} className={
                          post.authorRole === 'instructor' || post.authorRole === 'admin'
                            ? 'text-indigo-500'
                            : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                        } />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{post.authorName}</span>
                          {getRoleBadge(post.authorRole)}
                          {post.isPinned && (
                            <Pin size={14} className="text-indigo-500" />
                          )}
                          {post.isResolved && (
                            <CheckCircle size={14} className="text-green-500" />
                          )}
                          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {formatDate(post.createdAt)}
                          </span>
                        </div>

                        <p className={`whitespace-pre-wrap ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {post.content}
                        </p>

                        {/* Post Actions */}
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            onClick={() => onLikePost(post.id)}
                            className={`flex items-center gap-1 text-sm ${
                              userLiked
                                ? 'text-indigo-500'
                                : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                            }`}
                          >
                            <ThumbsUp size={16} fill={userLiked ? 'currentColor' : 'none'} />
                            {post.likes.length > 0 && post.likes.length}
                          </button>

                          <button
                            onClick={() => {
                              setReplyingTo(post.id);
                              toggleExpanded(post.id);
                            }}
                            className={`flex items-center gap-1 text-sm ${
                              isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <Reply size={16} />
                            Reply
                          </button>

                          {post.replies.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(post.id)}
                              className={`flex items-center gap-1 text-sm ${
                                isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                              {hasAnswer && (
                                <CheckCircle size={14} className="text-green-500 ml-1" />
                              )}
                            </button>
                          )}

                          {/* More Menu */}
                          <div className="relative ml-auto">
                            <button
                              onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                              className={`p-1 rounded ${
                                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                              }`}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {showPostMenu === post.id && (
                              <div className={`absolute right-0 top-8 w-40 rounded-lg shadow-lg py-1 z-10 ${
                                isDarkMode ? 'bg-gray-800' : 'bg-white'
                              }`}>
                                {isInstructor && (
                                  <button
                                    onClick={() => {
                                      onPinPost(post.id);
                                      setShowPostMenu(null);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <Pin size={14} />
                                    {post.isPinned ? 'Unpin' : 'Pin'}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    onReportPost(post.id);
                                    setShowPostMenu(null);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                  }`}
                                >
                                  <Flag size={14} />
                                  Report
                                </button>
                                {(post.authorId === currentUserId || isInstructor) && (
                                  <button
                                    onClick={() => {
                                      onDeletePost(post.id);
                                      setShowPostMenu(null);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-red-500 ${
                                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {isExpanded && (
                    <div className={`pl-16 pr-4 pb-4 ${
                      isDarkMode ? 'border-l-2 border-gray-700 ml-6' : 'border-l-2 border-gray-200 ml-6'
                    }`}>
                      {post.replies.map(reply => {
                        const replyUserLiked = reply.likes.includes(currentUserId);

                        return (
                          <div
                            key={reply.id}
                            className={`py-3 ${
                              reply.isAnswer
                                ? (isDarkMode ? 'bg-green-900/20 -mx-4 px-4 rounded-lg' : 'bg-green-50 -mx-4 px-4 rounded-lg')
                                : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                reply.authorRole !== 'learner'
                                  ? (isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100')
                                  : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')
                              }`}>
                                <User size={16} className={
                                  reply.authorRole !== 'learner'
                                    ? 'text-indigo-500'
                                    : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                                } />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{reply.authorName}</span>
                                  {getRoleBadge(reply.authorRole)}
                                  {reply.isAnswer && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500 text-white flex items-center gap-1">
                                      <CheckCircle size={12} />
                                      Answer
                                    </span>
                                  )}
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>

                                <p className={`text-sm whitespace-pre-wrap ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  {reply.content}
                                </p>

                                <div className="flex items-center gap-4 mt-2">
                                  <button
                                    onClick={() => onLikeReply(post.id, reply.id)}
                                    className={`flex items-center gap-1 text-xs ${
                                      replyUserLiked
                                        ? 'text-indigo-500'
                                        : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                                    }`}
                                  >
                                    <ThumbsUp size={14} fill={replyUserLiked ? 'currentColor' : 'none'} />
                                    {reply.likes.length > 0 && reply.likes.length}
                                  </button>

                                  {isInstructor && !reply.isAnswer && !post.isResolved && (
                                    <button
                                      onClick={() => onMarkAsAnswer(post.id, reply.id)}
                                      className={`flex items-center gap-1 text-xs ${
                                        isDarkMode ? 'text-green-400' : 'text-green-600'
                                      }`}
                                    >
                                      <CheckCircle size={14} />
                                      Mark as Answer
                                    </button>
                                  )}

                                  {(reply.authorId === currentUserId || isInstructor) && (
                                    <button
                                      onClick={() => onDeleteReply(post.id, reply.id)}
                                      className="text-xs text-red-500"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Reply Input */}
                      {replyingTo === post.id && (
                        <div className="mt-4 flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            <User size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write a reply..."
                              rows={2}
                              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                              } focus:ring-2 focus:ring-indigo-500 outline-none`}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                }}
                                className={`px-3 py-1.5 rounded text-sm ${
                                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                }`}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleReply(post.id)}
                                disabled={!replyContent.trim() || submitting}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscussionForum;
