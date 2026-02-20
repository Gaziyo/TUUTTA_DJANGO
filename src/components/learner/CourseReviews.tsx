import React, { useState, useMemo } from 'react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Flag,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';

interface Review {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  helpful: number;
  notHelpful: number;
  isVerified: boolean;
  completionPercentage: number;
  createdAt: Date;
  updatedAt?: Date;
  instructorResponse?: {
    content: string;
    respondedAt: Date;
  };
}

interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface CourseReviewsProps {
  courseId: string;
  courseName: string;
  reviews: Review[];
  ratingBreakdown: RatingBreakdown;
  averageRating: number;
  totalReviews: number;
  currentUserId: string;
  userHasReviewed: boolean;
  userCanReview: boolean;
  onSubmitReview: (review: { rating: number; title: string; content: string; pros?: string[]; cons?: string[] }) => Promise<void>;
  onUpdateReview: (reviewId: string, updates: Partial<Review>) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
  onMarkHelpful: (reviewId: string, helpful: boolean) => Promise<void>;
  onReportReview: (reviewId: string, reason: string) => Promise<void>;
  isDarkMode?: boolean;
}

type SortOption = 'recent' | 'helpful' | 'rating_high' | 'rating_low';
type FilterOption = 'all' | '5' | '4' | '3' | '2' | '1' | 'verified';

export const CourseReviews: React.FC<CourseReviewsProps> = ({
  courseId: _courseId,
  courseName: _courseName,
  reviews,
  ratingBreakdown,
  averageRating,
  totalReviews,
  currentUserId,
  userHasReviewed,
  userCanReview,
  onSubmitReview,
  onUpdateReview: _onUpdateReview,
  onDeleteReview,
  onMarkHelpful,
  onReportReview,
  isDarkMode = false,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('helpful');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [_editingReview, _setEditingReview] = useState<Review | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportingReview, setReportingReview] = useState<string | null>(null);

  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    content: '',
    pros: [''],
    cons: [''],
  });

  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.content.toLowerCase().includes(query) ||
        r.userName.toLowerCase().includes(query)
      );
    }

    if (filterBy !== 'all') {
      if (filterBy === 'verified') {
        filtered = filtered.filter(r => r.isVerified);
      } else {
        filtered = filtered.filter(r => r.rating === parseInt(filterBy));
      }
    }

    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'helpful':
        filtered.sort((a, b) => b.helpful - a.helpful);
        break;
      case 'rating_high':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_low':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
    }

    return filtered;
  }, [reviews, searchQuery, filterBy, sortBy]);

  const handleSubmitReview = async () => {
    if (!newReview.title || !newReview.content) return;

    setIsSubmitting(true);
    try {
      await onSubmitReview({
        rating: newReview.rating,
        title: newReview.title,
        content: newReview.content,
        pros: newReview.pros.filter(p => p.trim()),
        cons: newReview.cons.filter(c => c.trim()),
      });
      setShowWriteReview(false);
      setNewReview({ rating: 5, title: '', content: '', pros: [''], cons: [''] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              className={`w-5 h-5 ${
                star <= rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : isDarkMode ? 'text-gray-600' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getRatingPercentage = (stars: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((ratingBreakdown[stars as keyof RatingBreakdown] / totalReviews) * 100);
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header with Rating Summary */}
      <div className={`p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg mb-6`}>
        <h2 className="text-xl font-bold mb-6">Course Reviews</h2>

        <div className="flex gap-8">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
            {renderStars(Math.round(averageRating))}
            <div className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="flex-1 max-w-md">
            {[5, 4, 3, 2, 1].map(stars => (
              <button
                key={stars}
                onClick={() => setFilterBy(filterBy === stars.toString() ? 'all' : stars.toString() as FilterOption)}
                className={`w-full flex items-center gap-3 py-1 ${
                  filterBy === stars.toString() ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="w-12 text-sm">{stars} stars</span>
                <div className={`flex-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${getRatingPercentage(stars)}%` }}
                  />
                </div>
                <span className={`w-12 text-sm text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getRatingPercentage(stars)}%
                </span>
              </button>
            ))}
          </div>

          {/* Write Review Button */}
          <div className="flex flex-col justify-center">
            {userCanReview && !userHasReviewed ? (
              <button
                onClick={() => setShowWriteReview(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                Write a Review
              </button>
            ) : userHasReviewed ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <span>You've reviewed this course</span>
              </div>
            ) : (
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Complete the course to leave a review
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg mb-4`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className={`px-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
            <option value="verified">Verified Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={`px-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="helpful">Most Helpful</option>
            <option value="recent">Most Recent</option>
            <option value="rating_high">Highest Rated</option>
            <option value="rating_low">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className={`p-12 text-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Be the first to review this course
            </p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div
              key={review.id}
              className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {review.userAvatar ? (
                    <img src={review.userAvatar} alt={review.userName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    review.userName.charAt(0)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.userName}</span>
                        {review.isVerified && (
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                          }`}>
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(review.createdAt)}
                          {review.updatedAt && ' (edited)'}
                        </span>
                      </div>
                    </div>

                    {review.userId === currentUserId && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingReview(review)}
                          className={`p-1.5 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteReview(review.id)}
                          className={`p-1.5 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Content */}
                  <h4 className="font-medium mb-2">{review.title}</h4>
                  <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {review.content}
                  </p>

                  {/* Pros & Cons */}
                  {(review.pros?.length || review.cons?.length) && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {review.pros && review.pros.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-500 mb-1">Pros</h5>
                          <ul className="space-y-1">
                            {review.pros.map((pro, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {review.cons && review.cons.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-red-500 mb-1">Cons</h5>
                          <ul className="space-y-1">
                            {review.cons.map((con, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm">
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructor Response */}
                  {review.instructorResponse && (
                    <div className={`p-4 rounded-lg mt-4 ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Instructor Response</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(review.instructorResponse.respondedAt)}
                        </span>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {review.instructorResponse.content}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-4">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Was this review helpful?
                    </span>
                    <button
                      onClick={() => onMarkHelpful(review.id, true)}
                      className={`flex items-center gap-1 text-sm px-3 py-1 rounded ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Yes ({review.helpful})
                    </button>
                    <button
                      onClick={() => onMarkHelpful(review.id, false)}
                      className={`flex items-center gap-1 text-sm px-3 py-1 rounded ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      No ({review.notHelpful})
                    </button>
                    {review.userId !== currentUserId && (
                      <button
                        onClick={() => setReportingReview(review.id)}
                        className={`flex items-center gap-1 text-sm px-3 py-1 rounded ml-auto ${
                          isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Flag className="w-4 h-4" />
                        Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Write Review Modal */}
      {showWriteReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } p-6`}>
            <h2 className="text-lg font-semibold mb-4">Write a Review</h2>

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Your Rating</label>
                <div className="flex items-center gap-2">
                  {renderStars(newReview.rating, true, (rating) => setNewReview({ ...newReview, rating }))}
                  <span className="ml-2">{newReview.rating} out of 5</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1">Review Title</label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Summarize your experience"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium mb-1">Your Review</label>
                <textarea
                  value={newReview.content}
                  onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  rows={5}
                  placeholder="What did you like or dislike about this course?"
                />
              </div>

              {/* Pros */}
              <div>
                <label className="block text-sm font-medium mb-1">Pros (optional)</label>
                {newReview.pros.map((pro, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={pro}
                      onChange={(e) => {
                        const newPros = [...newReview.pros];
                        newPros[index] = e.target.value;
                        setNewReview({ ...newReview, pros: newPros });
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                      placeholder="What was good?"
                    />
                    {index === newReview.pros.length - 1 && (
                      <button
                        onClick={() => setNewReview({ ...newReview, pros: [...newReview.pros, ''] })}
                        className="px-3 py-2 bg-green-500 text-white rounded-lg"
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Cons */}
              <div>
                <label className="block text-sm font-medium mb-1">Cons (optional)</label>
                {newReview.cons.map((con, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={con}
                      onChange={(e) => {
                        const newCons = [...newReview.cons];
                        newCons[index] = e.target.value;
                        setNewReview({ ...newReview, cons: newCons });
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                      placeholder="What could be improved?"
                    />
                    {index === newReview.cons.length - 1 && (
                      <button
                        onClick={() => setNewReview({ ...newReview, cons: [...newReview.cons, ''] })}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg"
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowWriteReview(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={!newReview.title || !newReview.content || isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <h2 className="text-lg font-semibold mb-4">Report Review</h2>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Why are you reporting this review?
            </p>
            <div className="space-y-2">
              {[
                'Spam or fake review',
                'Inappropriate content',
                'Not about this course',
                'Contains personal information',
                'Other',
              ].map(reason => (
                <button
                  key={reason}
                  onClick={() => {
                    onReportReview(reportingReview, reason);
                    setReportingReview(null);
                  }}
                  className={`w-full p-3 text-left rounded-lg ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReportingReview(null)}
              className={`w-full mt-4 py-2 rounded-lg ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
