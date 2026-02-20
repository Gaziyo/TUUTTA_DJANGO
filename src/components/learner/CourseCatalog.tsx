import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Grid,
  List,
  Clock,
  Users,
  Star,
  BookOpen,
  Play,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { Course } from '../../types/lms';

interface CatalogCourse extends Course {
  rating?: number;
  reviewCount?: number;
  enrolledCount?: number;
  isBookmarked?: boolean;
  isEnrolled?: boolean;
  completionPercentage?: number;
}

interface CourseCatalogProps {
  courses: CatalogCourse[];
  categories: string[];
  onEnroll: (courseId: string) => Promise<void>;
  onBookmark: (courseId: string) => void;
  onCourseClick: (course: CatalogCourse) => void;
  isDarkMode?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'popular' | 'newest' | 'rating' | 'title';

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  courses,
  categories,
  onEnroll,
  onBookmark,
  onCourseClick,
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    let filtered = [...courses];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        course =>
          course.title.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          course.category?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(course =>
        course.category && selectedCategories.includes(course.category)
      );
    }

    // Duration filter
    if (selectedDuration) {
      filtered = filtered.filter(course => {
        const duration = course.estimatedDuration || 0;
        switch (selectedDuration) {
          case 'short': return duration <= 30;
          case 'medium': return duration > 30 && duration <= 120;
          case 'long': return duration > 120;
          default: return true;
        }
      });
    }

    // Level filter
    if (selectedLevel) {
      filtered = filtered.filter(course => course.level === selectedLevel);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.enrolledCount || 0) - (a.enrolledCount || 0);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [courses, searchQuery, selectedCategories, selectedDuration, selectedLevel, sortBy]);

  const handleEnroll = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnrollingCourseId(courseId);
    try {
      await onEnroll(courseId);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleBookmark = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark(courseId);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedDuration('');
    setSelectedLevel('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedDuration || selectedLevel;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : isDarkMode
                  ? 'text-gray-600'
                  : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h1 className="text-2xl font-bold mb-2">Course Catalog</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Discover courses to enhance your skills
        </p>
      </div>

      {/* Search and Controls */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600 focus:border-indigo-500'
                    : 'bg-white border-gray-300 focus:border-indigo-500'
                } focus:outline-none focus:ring-1 focus:ring-indigo-500`}
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              showFilters || hasActiveFilters
                ? 'bg-indigo-600 text-white border-indigo-600'
                : isDarkMode
                  ? 'border-gray-600 hover:bg-gray-800'
                  : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 text-xs bg-white text-indigo-600 rounded-full">
                {selectedCategories.length + (selectedDuration ? 1 : 0) + (selectedLevel ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`appearance-none pl-3 pr-8 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="title">A-Z</option>
            </select>
            <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
          </div>

          {/* View Toggle */}
          <div className={`flex rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode
                    ? 'hover:bg-gray-800'
                    : 'hover:bg-gray-100'
              } ${viewMode === 'grid' ? 'rounded-l-lg' : 'rounded-l-lg'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode
                    ? 'hover:bg-gray-800'
                    : 'hover:bg-gray-100'
              } rounded-r-lg`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Filter Courses</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-500 hover:text-indigo-600"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Categories */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1 text-sm rounded-full ${
                        selectedCategories.includes(category)
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-white hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Duration
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'short', label: 'Under 30 min' },
                    { value: 'medium', label: '30 min - 2 hours' },
                    { value: 'long', label: 'Over 2 hours' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDuration(selectedDuration === option.value ? '' : option.value)}
                      className={`px-3 py-1 text-sm rounded-full ${
                        selectedDuration === option.value
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-white hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Level
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['beginner', 'intermediate', 'advanced'].map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(selectedLevel === level ? '' : level)}
                      className={`px-3 py-1 text-sm rounded-full capitalize ${
                        selectedLevel === level
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-white hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className={`px-6 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
      </div>

      {/* Course Grid/List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className="text-lg font-medium mb-2">No courses found</h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Try adjusting your search or filters
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <div
                key={course.id}
                onClick={() => onCourseClick(course)}
                className={`rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white shadow'
                }`}
              >
                {/* Course Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-indigo-500 to-purple-600">
                  {course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => handleBookmark(course.id, e)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white"
                  >
                    {course.isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                  {/* Status Badge */}
                  {course.isEnrolled && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {course.completionPercentage === 100 ? 'Completed' : 'Enrolled'}
                    </div>
                  )}
                  {course.isRequired && !course.isEnrolled && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Required
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="p-4">
                  {/* Category & Level */}
                  <div className="flex items-center gap-2 mb-2">
                    {course.category && (
                      <span className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {course.category}
                      </span>
                    )}
                    {course.level && (
                      <span className={`text-xs px-2 py-0.5 rounded ${getLevelColor(course.level)}`}>
                        {course.level}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold mb-2 line-clamp-2">{course.title}</h3>

                  {course.description && (
                    <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {course.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm mb-3">
                    {course.estimatedDuration && (
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                        {formatDuration(course.estimatedDuration)}
                      </div>
                    )}
                    {course.enrolledCount !== undefined && (
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Users className="w-4 h-4" />
                        {course.enrolledCount.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  {course.rating !== undefined && (
                    <div className="flex items-center gap-2 mb-3">
                      {renderStars(course.rating)}
                      <span className="text-sm font-medium">{course.rating.toFixed(1)}</span>
                      {course.reviewCount !== undefined && (
                        <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          ({course.reviewCount})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress or Enroll Button */}
                  {course.isEnrolled ? (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Progress</span>
                        <span className="font-medium">{course.completionPercentage || 0}%</span>
                      </div>
                      <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${course.completionPercentage || 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleEnroll(course.id, e)}
                      disabled={enrollingCourseId === course.id}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {enrollingCourseId === course.id ? (
                        'Enrolling...'
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Enroll Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map(course => (
              <div
                key={course.id}
                onClick={() => onCourseClick(course)}
                className={`flex rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white shadow'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-64 flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600">
                  {course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    onClick={(e) => handleBookmark(course.id, e)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white"
                  >
                    {course.isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {course.category && (
                          <span className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            {course.category}
                          </span>
                        )}
                        {course.level && (
                          <span className={`text-xs px-2 py-0.5 rounded ${getLevelColor(course.level)}`}>
                            {course.level}
                          </span>
                        )}
                        {course.isRequired && !course.isEnrolled && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                            Required
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{course.title}</h3>
                    </div>

                    {course.rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-medium">{course.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {course.description && (
                    <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm mt-auto">
                    {course.estimatedDuration && (
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                        {formatDuration(course.estimatedDuration)}
                      </div>
                    )}
                    {course.enrolledCount !== undefined && (
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Users className="w-4 h-4" />
                        {course.enrolledCount.toLocaleString()} enrolled
                      </div>
                    )}
                    {course.modules && (
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <BookOpen className="w-4 h-4" />
                        {course.modules.length} modules
                      </div>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className={`w-48 p-4 flex flex-col justify-center border-l ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  {course.isEnrolled ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">
                          {course.completionPercentage === 100 ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${course.completionPercentage || 0}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {course.completionPercentage || 0}% complete
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleEnroll(course.id, e)}
                      disabled={enrollingCourseId === course.id}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {enrollingCourseId === course.id ? (
                        'Enrolling...'
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Enroll Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
