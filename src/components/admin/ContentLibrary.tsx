import React, { useState, useMemo, useRef } from 'react';
import {
  FolderOpen,
  File,
  FileText,
  FileVideo,
  FileAudio,
  Image,
  Upload,
  Search,
  Grid,
  List,
  MoreVertical,
  Download,
  Trash2,
  Edit2,
  Copy,
  Eye,
  FolderPlus,
  ChevronRight,
  HardDrive,
  Check,
} from 'lucide-react';

interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'document' | 'scorm' | 'other';
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  tags: string[];
  usedInCourses: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  duration?: number; // for video/audio in seconds
  dimensions?: { width: number; height: number }; // for images/video
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  assetCount: number;
  createdAt: Date;
}

interface ContentLibraryProps {
  assets?: MediaAsset[];
  folders?: Folder[];
  onUpload?: (files: File[], folderId?: string) => Promise<void>;
  onDelete?: (assetId: string) => Promise<void>;
  onRename?: (assetId: string, newName: string) => Promise<void>;
  onMove?: (assetId: string, folderId: string) => Promise<void>;
  onCreateFolder?: (name: string, parentId?: string) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onUpdateTags?: (assetId: string, tags: string[]) => Promise<void>;
  onPreview?: (asset: MediaAsset) => void;
  isDarkMode?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'date' | 'size' | 'type';

export const ContentLibrary: React.FC<ContentLibraryProps> = ({
  assets = [],
  folders = [],
  onUpload = async () => {},
  onDelete = async () => {},
  onRename = async () => {},
  onMove: _onMove = async () => {},
  onCreateFolder = async () => {},
  onDeleteFolder: _onDeleteFolder = async () => {},
  onUpdateTags: _onUpdateTags = async () => {},
  onPreview = () => {},
  isDarkMode = false,
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ assetId: string; x: number; y: number } | null>(null);
  const [_expandedFolders, _setExpandedFolders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolderAssets = useMemo(() => {
    let filtered = assets.filter(a => a.folderId === currentFolderId);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'date': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'size': return b.size - a.size;
        case 'type': return a.type.localeCompare(b.type);
        default: return 0;
      }
    });

    return filtered;
  }, [assets, currentFolderId, searchQuery, selectedType, sortBy]);

  const currentFolderSubfolders = useMemo(() => {
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { id?: string; name: string }[] = [{ name: 'Content Library' }];
    let folderId = currentFolderId;

    while (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        crumbs.splice(1, 0, { id: folder.id, name: folder.name });
        folderId = folder.parentId;
      } else {
        break;
      }
    }

    return crumbs;
  }, [currentFolderId, folders]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload(files, currentFolderId);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload(files, currentFolderId);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await onCreateFolder(newFolderName.trim(), currentFolderId);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleRename = async (assetId: string) => {
    if (!editingName.trim()) return;
    await onRename(assetId, editingName.trim());
    setEditingAsset(null);
    setEditingName('');
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const _toggleFolderExpand = (folderId: string) => {
    _setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const getFileIcon = (type: MediaAsset['type']) => {
    switch (type) {
      case 'video': return FileVideo;
      case 'audio': return FileAudio;
      case 'image': return Image;
      case 'document': return FileText;
      default: return File;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSize = assets.reduce((sum, a) => sum + a.size, 0);

  return (
    <div className="h-full flex bg-app-bg text-app-text">
      {/* Sidebar - Folder Tree */}
      <div className="w-64 border-r border-app-border bg-app-surface">
        <div className="p-4">
          <h2 className="font-semibold mb-4">Folders</h2>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="btn-secondary-min w-full flex items-center gap-2 text-sm"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
        </div>

        <div className="px-2">
          {/* Root */}
          <button
            onClick={() => setCurrentFolderId(undefined)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              currentFolderId === undefined
                ? 'bg-app-accent text-app-bg'
                : 'hover:bg-app-surface2 text-app-muted'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            All Files
          </button>

          {/* Folder Tree */}
          {folders
            .filter(f => !f.parentId)
            .map(folder => (
              <div key={folder.id}>
                <button
                  onClick={() => setCurrentFolderId(folder.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    currentFolderId === folder.id
                      ? 'bg-app-accent text-app-bg'
                      : 'hover:bg-app-surface2 text-app-muted'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className="text-xs text-app-muted">
                    {folder.assetCount}
                  </span>
                </button>
              </div>
            ))}
        </div>

        {/* Storage Info */}
        <div className="mt-auto p-4 border-t border-app-border">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4" />
            <span className="text-sm font-medium">Storage</span>
          </div>
          <div className="text-sm text-app-muted">
            {formatFileSize(totalSize)} used
          </div>
          <div className="h-2 rounded-full mt-2 bg-app-surface2">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '35%' }} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-app-border">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id || 'root'}>
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={`text-sm ${
                    index === breadcrumbs.length - 1
                      ? 'font-medium'
                      : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-min w-full pl-10 pr-4"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input-min"
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="image">Images</option>
              <option value="document">Documents</option>
              <option value="scorm">SCORM</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input-min"
            >
              <option value="date">Date Modified</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>

            <div className="flex rounded-lg border border-app-border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid' ? 'bg-app-accent text-app-bg' : ''
                } rounded-l-lg`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list' ? 'bg-app-accent text-app-bg' : ''
                } rounded-r-lg`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn-primary-min flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className="flex-1 overflow-auto p-6"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Subfolders */}
          {currentFolderSubfolders.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Folders
              </h3>
              <div className="grid grid-cols-6 gap-4">
                {currentFolderSubfolders.map(folder => (
                  <button
                    key={folder.id}
                    onDoubleClick={() => setCurrentFolderId(folder.id)}
                    className={`p-4 rounded-lg text-center ${
                      isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <FolderOpen className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm font-medium truncate">{folder.name}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {folder.assetCount} items
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {currentFolderAssets.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg ${
              isDarkMode ? 'border-gray-700' : 'border-gray-300'
            }`}>
              <Upload className={`w-16 h-16 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className="text-lg font-medium mb-2">Drop files here</p>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                or click Upload to add files
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-5 gap-4">
              {currentFolderAssets.map(asset => {
                const FileIcon = getFileIcon(asset.type);
                const isSelected = selectedAssets.includes(asset.id);

                return (
                  <div
                    key={asset.id}
                    onClick={() => toggleAssetSelection(asset.id)}
                    onDoubleClick={() => onPreview(asset)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ assetId: asset.id, x: e.clientX, y: e.clientY });
                    }}
                    className={`relative p-4 rounded-lg cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-indigo-500'
                        : ''
                    } ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {asset.thumbnailUrl ? (
                        <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon className={`w-12 h-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      )}
                    </div>

                    {editingAsset === asset.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRename(asset.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(asset.id)}
                        className={`w-full px-2 py-1 text-sm rounded ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                    )}
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatFileSize(asset.size)}
                      {asset.duration && ` • ${formatDuration(asset.duration)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-min overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-app-surface2">
                    <th className="w-8 px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">Modified</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">Used In</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border bg-app-surface">
                  {currentFolderAssets.map(asset => {
                    const FileIcon = getFileIcon(asset.type);
                    return (
                      <tr
                        key={asset.id}
                        className="hover:bg-app-surface2"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedAssets.includes(asset.id)}
                            onChange={() => toggleAssetSelection(asset.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FileIcon className="w-5 h-5 text-gray-400" />
                            <span className="font-medium">{asset.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{asset.type}</td>
                        <td className="px-4 py-3">{formatFileSize(asset.size)}</td>
                        <td className="px-4 py-3 text-app-muted">
                          {new Date(asset.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {asset.usedInCourses.length > 0 && (
                            <span className="text-sm text-app-muted">
                              {asset.usedInCourses.length} course{asset.usedInCourses.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button className="p-1 rounded hover:bg-app-surface2">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selection Actions */}
        {selectedAssets.length > 0 && (
          <div className="p-4 border-t border-app-border bg-app-surface">
            <div className="flex items-center gap-4">
              <span className="text-sm">
                {selectedAssets.length} item{selectedAssets.length !== 1 ? 's' : ''} selected
              </span>
              <button className="btn-secondary-min flex items-center gap-2 px-3 py-1.5">
                <Download className="w-4 h-4" />
                Download
              </button>
              <button className="btn-secondary-min flex items-center gap-2 px-3 py-1.5">
                <FolderOpen className="w-4 h-4" />
                Move
              </button>
              <button
                onClick={() => selectedAssets.forEach(id => onDelete(id))}
                className="btn-primary-min flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedAssets([])}
                className="ml-auto btn-secondary-min px-3 py-1.5"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-lg bg-app-surface border border-app-border p-6">
            <h3 className="font-semibold mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="input-min w-full mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="btn-secondary-min"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="btn-primary-min disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className={`fixed z-50 w-48 rounded-lg shadow-lg py-2 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { icon: Eye, label: 'Preview', action: () => {
                const asset = assets.find(a => a.id === contextMenu.assetId);
                if (asset) onPreview(asset);
              }},
              { icon: Edit2, label: 'Rename', action: () => {
                const asset = assets.find(a => a.id === contextMenu.assetId);
                if (asset) {
                  setEditingAsset(asset.id);
                  setEditingName(asset.name);
                }
              }},
              { icon: Download, label: 'Download', action: () => {} },
              { icon: Copy, label: 'Copy Link', action: () => {
                const asset = assets.find(a => a.id === contextMenu.assetId);
                if (asset) navigator.clipboard.writeText(asset.url);
              }},
              { icon: FolderOpen, label: 'Move to...', action: () => {} },
              { icon: Trash2, label: 'Delete', action: () => onDelete(contextMenu.assetId), danger: true },
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.action();
                  setContextMenu(null);
                }}
                className={`w-full px-4 py-2 text-left flex items-center gap-2 text-sm ${
                  item.danger
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
