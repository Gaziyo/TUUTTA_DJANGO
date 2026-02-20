import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileVideo,
  FileAudio,
  File,
  Download,
  Search,
  Grid,
  List,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Clock,
  FolderOpen,
  Star
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'audio' | 'link' | 'template' | 'other';
  format?: string; // pdf, docx, mp4, etc.
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  duration?: number; // for video/audio
  courseId?: string;
  courseName?: string;
  category: string;
  tags: string[];
  downloadCount: number;
  viewCount: number;
  isFeatured: boolean;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ResourceCategory {
  id: string;
  name: string;
  icon?: string;
  resourceCount: number;
}

interface ResourceLibraryProps {
  resources: Resource[];
  categories: ResourceCategory[];
  bookmarkedIds: string[];
  onDownload: (resourceId: string) => void;
  onBookmark: (resourceId: string) => void;
  onView: (resource: Resource) => void;
  isDarkMode?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'popular' | 'title' | 'downloads';

export const ResourceLibrary: React.FC<ResourceLibraryProps> = ({
  resources,
  categories,
  bookmarkedIds,
  onDownload,
  onBookmark,
  onView,
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach(r => r.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType);
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(r =>
        selectedTags.every(tag => r.tags.includes(tag))
      );
    }

    if (showBookmarkedOnly) {
      filtered = filtered.filter(r => bookmarkedIds.includes(r.id));
    }

    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'downloads':
        filtered.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
    }

    // Featured first
    filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

    return filtered;
  }, [resources, searchQuery, selectedCategory, selectedType, selectedTags, sortBy, showBookmarkedOnly, bookmarkedIds]);

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'document': return FileText;
      case 'video': return FileVideo;
      case 'audio': return FileAudio;
      case 'link': return ExternalLink;
      default: return File;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className={`h-full flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`w-64 border-r ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} p-4`}>
        <h2 className="font-semibold mb-4">Categories</h2>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
              selectedCategory === 'all'
                ? isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <span>All Resources</span>
            <span className={`text-xs ${selectedCategory === 'all' ? 'opacity-80' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {resources.length}
            </span>
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                selectedCategory === category.id
                  ? isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                  : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <span>{category.name}</span>
              <span className={`text-xs ${selectedCategory === category.id ? 'opacity-80' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {category.resourceCount}
              </span>
            </button>
          ))}
        </div>

        <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="font-semibold mb-4">Resource Type</h2>
          <div className="space-y-1">
            {[
              { value: 'all', label: 'All Types' },
              { value: 'document', label: 'Documents' },
              { value: 'video', label: 'Videos' },
              { value: 'audio', label: 'Audio' },
              { value: 'template', label: 'Templates' },
              { value: 'link', label: 'Links' },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedType === type.value
                    ? isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                    : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="font-semibold mb-4">Popular Tags</h2>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 text-xs rounded-full ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-600 text-white'
                    : isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h1 className="text-2xl font-bold mb-4">Resource Library</h1>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600'
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <button
              onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                showBookmarkedOnly
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : isDarkMode
                    ? 'border-gray-600 hover:bg-gray-800'
                    : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="downloads">Most Downloaded</option>
              <option value="title">A-Z</option>
            </select>

            <div className={`flex rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : ''
                } rounded-l-lg`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list' ? 'bg-indigo-600 text-white' : ''
                } rounded-r-lg`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {selectedTags.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filters:</span>
              {selectedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded-full"
                >
                  {tag}
                  <span className="ml-1">×</span>
                </button>
              ))}
              <button
                onClick={() => setSelectedTags([])}
                className={`text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className={`px-6 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''} found
        </div>

        {/* Resources Grid/List */}
        <div className="flex-1 overflow-auto p-6">
          {filteredResources.length === 0 ? (
            <div className={`p-12 text-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <FolderOpen className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className="text-lg font-medium mb-2">No resources found</h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Try adjusting your search or filters
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-6">
              {filteredResources.map(resource => {
                const ResourceIcon = getResourceIcon(resource.type);
                const isBookmarked = bookmarkedIds.includes(resource.id);

                return (
                  <div
                    key={resource.id}
                    className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${
                      resource.isFeatured ? 'ring-2 ring-yellow-500' : ''
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative h-40 bg-gradient-to-br from-indigo-500 to-purple-600 cursor-pointer"
                      onClick={() => onView(resource)}
                    >
                      {resource.thumbnailUrl ? (
                        <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ResourceIcon className="w-16 h-16 text-white/50" />
                        </div>
                      )}
                      {resource.isFeatured && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-white" />
                          Featured
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookmark(resource.id);
                        }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white"
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                      {resource.format && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded uppercase">
                          {resource.format}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-medium mb-1 line-clamp-2">{resource.title}</h3>
                      {resource.description && (
                        <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {resource.description}
                        </p>
                      )}

                      {resource.courseName && (
                        <div className={`text-xs mb-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {resource.courseName}
                        </div>
                      )}

                      <div className={`flex items-center gap-3 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {resource.fileSize && (
                          <span>{formatFileSize(resource.fileSize)}</span>
                        )}
                        {resource.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(resource.duration)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {resource.downloadCount}
                        </span>
                      </div>

                      <button
                        onClick={() => onDownload(resource.id)}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map(resource => {
                const ResourceIcon = getResourceIcon(resource.type);
                const isBookmarked = bookmarkedIds.includes(resource.id);

                return (
                  <div
                    key={resource.id}
                    className={`flex items-center gap-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${
                      resource.isFeatured ? 'ring-2 ring-yellow-500' : ''
                    }`}
                  >
                    <div
                      className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center cursor-pointer"
                      onClick={() => onView(resource)}
                    >
                      <ResourceIcon className="w-8 h-8 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{resource.title}</h3>
                        {resource.isFeatured && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      {resource.description && (
                        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {resource.description}
                        </p>
                      )}
                      <div className={`flex items-center gap-4 mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <span className="uppercase">{resource.format || resource.type}</span>
                        {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
                        {resource.courseName && (
                          <span className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>
                            {resource.courseName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="text-center">
                        <div className="font-medium">{resource.downloadCount}</div>
                        <div className="text-xs">downloads</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{resource.viewCount}</div>
                        <div className="text-xs">views</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onBookmark(resource.id)}
                        className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-5 h-5 text-indigo-500" />
                        ) : (
                          <Bookmark className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => onDownload(resource.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
