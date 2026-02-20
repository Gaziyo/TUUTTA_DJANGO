import React, { useState } from 'react';
import { FolderPlus, Folder, ChevronRight, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { Folder as FolderType } from '../types';

interface FolderManagerProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({ selectedFolderId, onSelectFolder }) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { getFolders, addFolder, updateFolder, deleteFolder, user } = useStore();
  const isDarkMode = user?.settings?.theme === 'dark';
  const folders = getFolders();

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim(), null);
      setNewFolderName('');
    }
  };

  const handleUpdateFolder = (id: string) => {
    if (editingName.trim()) {
      updateFolder(id, editingName.trim());
      setEditingFolderId(null);
      setEditingName('');
    }
  };

  const handleDeleteFolder = (id: string) => {
    if (window.confirm('Are you sure you want to delete this folder? Notes will be moved to root.')) {
      deleteFolder(id);
    }
  };

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolderItem = (folder: FolderType, level: number = 0) => {
    const childFolders = folders.filter(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id} style={{ marginLeft: `${level * 16}px` }}>
        <div
          className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer ${isSelected
              ? isDarkMode
                ? 'bg-indigo-900 text-indigo-200'
                : 'bg-indigo-50 text-indigo-700'
              : isDarkMode
                ? 'hover:bg-gray-700 text-gray-300'
                : 'hover:bg-gray-50 text-gray-900'
            }`}
        >
          <div
            className="flex items-center flex-1 min-w-0"
            onClick={() => onSelectFolder(folder.id)}
          >
            {childFolders.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(folder.id);
                }}
                className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <Folder className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              } mr-2`} />
            {editingFolderId === folder.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdateFolder(folder.id)}
                onBlur={() => handleUpdateFolder(folder.id)}
                className={`flex-1 px-2 py-1 text-sm border rounded ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate">{folder.name}</span>
            )}
          </div>

          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolderId(folder.id);
                setEditingName(folder.name);
              }}
              className={`p-1 rounded-lg ${isDarkMode
                  ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-600'
                  : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'
                } transition-colors`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder.id);
              }}
              className={`p-1 rounded-lg ${isDarkMode
                  ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600'
                  : 'text-gray-400 hover:text-red-600 hover:bg-red-100'
                } transition-colors`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isExpanded && childFolders.length > 0 && (
          <div className="mt-1">
            {childFolders.map(childFolder => renderFolderItem(childFolder, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name..."
          className={`flex-1 px-3 py-2 text-sm border rounded-lg ${isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
        />
        <button
          onClick={handleAddFolder}
          disabled={!newFolderName.trim()}
          className={`p-2 rounded-lg transition-colors ${isDarkMode
              ? 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400'
            } disabled:cursor-not-allowed`}
        >
          <FolderPlus className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-1">
        <div
          className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedFolderId === null
              ? isDarkMode
                ? 'bg-indigo-900 text-indigo-200'
                : 'bg-indigo-50 text-indigo-700'
              : isDarkMode
                ? 'hover:bg-gray-700 text-gray-300'
                : 'hover:bg-gray-50 text-gray-900'
            }`}
          onClick={() => onSelectFolder(null)}
        >
          <Folder className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            } mr-2`} />
          <span>Root (No Folder)</span>
        </div>

        {folders
          .filter(folder => !folder.parentId)
          .map(folder => renderFolderItem(folder))}
      </div>
    </div>
  );
};

export default FolderManager;