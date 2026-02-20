import React from 'react';
import { FolderOpen, FileText, Sparkles, Upload, Inbox, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'sources' | 'drafts' | 'search' | 'upload' | 'generic' | 'pipeline';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  isDarkMode?: boolean;
}

const emptyStateConfigs = {
  sources: {
    icon: FolderOpen,
    title: 'No sources uploaded yet',
    description: 'Upload your first document to get started with AI-powered course generation.',
    actionLabel: 'Upload Sources'
  },
  drafts: {
    icon: FileText,
    title: 'No drafts created',
    description: 'Create your first course draft to start building your learning content.',
    actionLabel: 'Create Draft'
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    actionLabel: 'Clear Search'
  },
  upload: {
    icon: Upload,
    title: 'Ready to upload',
    description: 'Drag and drop files here or click the button below to browse.',
    actionLabel: 'Browse Files'
  },
  pipeline: {
    icon: Sparkles,
    title: 'Start your Genie project',
    description: 'Create a new project to transform your content into effective learning experiences.',
    actionLabel: 'New Project'
  },
  generic: {
    icon: Inbox,
    title: 'Nothing here yet',
    description: 'Get started by adding your first item.',
    actionLabel: 'Get Started'
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  isDarkMode = false
}) => {
  const config = emptyStateConfigs[type];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      {/* Animated Illustration Container */}
      <div className="relative mb-6">
        {/* Background Glow */}
        <div className={`absolute inset-0 rounded-full blur-2xl opacity-30 ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300'}`} style={{ transform: 'scale(1.5)' }} />
        
        {/* Icon Container */}
        <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
          <Icon className={`w-10 h-10 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
          
          {/* Floating Sparkles */}
          {type === 'pipeline' && (
            <>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-1 w-3 h-3 text-indigo-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </>
          )}
        </div>
      </div>

      {/* Text Content */}
      <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {title || config.title}
      </h3>
      <p className="text-sm max-w-sm mb-6">
        {description || config.description}
      </p>

      {/* Action Button */}
      {onAction && (
        <button
          onClick={onAction}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
            isDarkMode
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
          }`}
        >
          <Icon className="w-4 h-4" />
          {actionLabel || config.actionLabel}
        </button>
      )}
    </div>
  );
};

// Specialized empty states for common use cases
export const EmptySourcesState: React.FC<{ onUpload: () => void; isDarkMode?: boolean }> = ({ onUpload, isDarkMode }) => (
  <EmptyState
    type="sources"
    onAction={onUpload}
    isDarkMode={isDarkMode}
  />
);

export const EmptyDraftsState: React.FC<{ onCreate: () => void; isDarkMode?: boolean }> = ({ onCreate, isDarkMode }) => (
  <EmptyState
    type="drafts"
    onAction={onCreate}
    isDarkMode={isDarkMode}
  />
);

export const EmptySearchState: React.FC<{ onClear: () => void; isDarkMode?: boolean }> = ({ onClear, isDarkMode }) => (
  <EmptyState
    type="search"
    onAction={onClear}
    isDarkMode={isDarkMode}
  />
);

export const EmptyPipelineState: React.FC<{ onCreate: () => void; isDarkMode?: boolean }> = ({ onCreate, isDarkMode }) => (
  <div className={`rounded-2xl border-2 border-dashed p-12 text-center ${isDarkMode ? 'border-gray-800 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
    <EmptyState
      type="pipeline"
      onAction={onCreate}
      isDarkMode={isDarkMode}
    />
  </div>
);

export default EmptyState;
