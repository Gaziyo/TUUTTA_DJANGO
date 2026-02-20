import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Upload,
  FileText,
  File,
  Video,
  Headphones,
  Image,
  Check,
  Sparkles,
  FolderOpen,
  Tag
} from 'lucide-react';
import { useGeniePipeline } from '../../../context/GeniePipelineContext';
import { useLMSStore } from '../../../store/lmsStore';
import { useStore } from '../../../store';
import { uploadFile } from '../../../lib/storage';
import { GenieSourceType } from '../../../types/lms';
import AdminSection from '../AdminSection';
import { EmptyState } from '../genie/EmptyState';
import '../genie/animations.css';

interface GenieStageIngestProps {
  isDarkMode: boolean;
}

const SOURCE_TYPES: { id: GenieSourceType; label: string; icon: React.ReactNode }[] = [
  { id: 'policy', label: 'Policy', icon: <FileText className="w-4 h-4" /> },
  { id: 'sop', label: 'SOP', icon: <File className="w-4 h-4" /> },
  { id: 'manual', label: 'Manual', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'resource', label: 'Resource', icon: <FileText className="w-4 h-4" /> },
];

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5" />,
  doc: <File className="w-5 h-5" />,
  docx: <File className="w-5 h-5" />,
  ppt: <FileText className="w-5 h-5" />,
  pptx: <FileText className="w-5 h-5" />,
  mp4: <Video className="w-5 h-5" />,
  mp3: <Headphones className="w-5 h-5" />,
  wav: <Headphones className="w-5 h-5" />,
  png: <Image className="w-5 h-5" />,
  jpg: <Image className="w-5 h-5" />,
  jpeg: <Image className="w-5 h-5" />,
};

const GenieStageIngest: React.FC<GenieStageIngestProps> = ({ isDarkMode }) => {
  const { project, updateProject, markStageComplete, markStageInProgress, registerStageActions } = useGeniePipeline();
  const { user } = useStore();
  const { currentOrg, genieSources, addGenieSource } = useLMSStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [_isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; progress: number }[]>([]);
  const [selectedType, setSelectedType] = useState<GenieSourceType>('policy');
  const [tagsInput, setTagsInput] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Selected sources for the project
  const selectedSourceIds = project?.sourceIds || [];

  // Filter sources for current org
  const orgSources = useMemo(() => {
    return genieSources.filter((source) => source.status === 'active');
  }, [genieSources]);

  // Recently selected animation
  const [recentlySelected, setRecentlySelected] = useState<string | null>(null);
  const handleSourceSelection = (sourceId: string) => {
    setRecentlySelected(sourceId);
    setTimeout(() => setRecentlySelected(null), 300);
    toggleSourceSelection(sourceId);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFilesSelected(files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    registerStageActions('ingest', {
      openUpload: handleUploadClick
    });
  }, [registerStageActions]);

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      await handleFilesSelected(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!user) {
      alert('Please sign in to upload sources.');
      return;
    }
    if (!currentOrg) {
      alert('Please select an organization first.');
      return;
    }

    setIsUploading(true);
    markStageInProgress('ingest');

    const progressItems = files.map((file) => ({ name: file.name, progress: 0 }));
    setUploadProgress(progressItems);

    try {
      const newSourceIds: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, progress: 30 } : item))
        );

        const uploaded = await uploadFile(file, user.id);

        setUploadProgress((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, progress: 70 } : item))
        );

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const sourceKey = baseName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const existing = genieSources.filter((source) => source.sourceKey === sourceKey);
        const maxVersion = existing.reduce((acc, cur) => Math.max(acc, cur.version), 0);
        const tags = tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);

        const newSource = await addGenieSource({
          orgId: currentOrg.id,
          sourceKey,
          title: baseName,
          type: selectedType,
          tags,
          version: maxVersion + 1,
          fileName: uploaded.name,
          fileUrl: uploaded.url,
          fileType: uploaded.type,
          fileSize: uploaded.size,
          status: 'active',
          uploadedBy: user.displayName || user.email || 'Admin',
        });

        newSourceIds.push(newSource.id);

        setUploadProgress((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, progress: 100 } : item))
        );
      }

      // Add uploaded sources to project
      updateProject({
        sourceIds: [...selectedSourceIds, ...newSourceIds],
      });

      setTagsInput('');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress([]), 1500);
    }
  };

  const toggleSourceSelection = (sourceId: string) => {
    const isSelected = selectedSourceIds.includes(sourceId);
    const newIds = isSelected
      ? selectedSourceIds.filter((id) => id !== sourceId)
      : [...selectedSourceIds, sourceId];

    updateProject({ sourceIds: newIds });

    // Mark stage complete if at least one source is selected
    if (newIds.length > 0) {
      markStageComplete('ingest');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return FILE_TYPE_ICONS[ext] || <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stage Header */}
      <div
        className={`rounded-2xl p-6 ${
          isDarkMode
            ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/20'
            : 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
            }`}
          >
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Content Ingestion & Preprocessing
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Upload your policies, SOPs, manuals, and training materials. Our AI will parse, classify,
              and prepare them for course generation.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Check className="w-4 h-4 text-emerald-500" />
                PDF, Word, PowerPoint
              </div>
              <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Check className="w-4 h-4 text-emerald-500" />
                Audio & Video
              </div>
              <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Check className="w-4 h-4 text-emerald-500" />
                Auto-tagging & Classification
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <AdminSection title="Upload Content" subtitle="Drag and drop or click to upload" isDarkMode={isDarkMode} minHeight="320px">
          <div className="space-y-4">
            {/* Source Type Selection */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Content Type
              </label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedType === type.id
                        ? isDarkMode
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                        : isDarkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Input */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Tags (comma-separated)
              </label>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                }`}
              >
                <Tag className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="safety, compliance, onboarding..."
                  className={`bg-transparent outline-none text-sm w-full ${
                    isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleUploadClick}
              className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? isDarkMode
                    ? 'border-indigo-400 bg-indigo-500/10'
                    : 'border-indigo-400 bg-indigo-50'
                  : isDarkMode
                    ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              <Upload
                className={`w-10 h-10 mx-auto mb-3 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {dragActive ? 'Drop files here' : 'Drop files here or click to upload'}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                PDF, DOC, DOCX, PPT, PPTX, MP4, MP3
              </p>
            </div>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="space-y-2">
                {uploadProgress.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium truncate max-w-[200px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.name}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.progress}%
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3,.wav,.png,.jpg,.jpeg"
          />
        </AdminSection>

        {/* Available Sources */}
        <AdminSection
          title="Available Sources"
          subtitle={`${orgSources.length} sources in library • ${selectedSourceIds.length} selected`}
          isDarkMode={isDarkMode}
          minHeight="320px"
        >
          {orgSources.length === 0 ? (
            <EmptyState
              type="sources"
              onAction={handleUploadClick}
              isDarkMode={isDarkMode}
            />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {orgSources.map((source) => {
                const isSelected = selectedSourceIds.includes(source.id);
                const isRecent = recentlySelected === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => handleSourceSelection(source.id)}
                    className={`w-full text-left rounded-xl border p-3 genie-card-hover genie-btn-press ${
                      isSelected
                        ? isDarkMode
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-indigo-400 bg-indigo-50'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                    } ${isRecent ? 'genie-select-active' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-indigo-100 text-indigo-600'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {source.fileName ? getFileIcon(source.fileName) : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {source.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          >
                            {source.type.toUpperCase()} • v{source.version}
                          </span>
                          {source.fileSize && (
                            <span
                              className={`text-xs ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}
                            >
                              • {formatFileSize(source.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-500'
                              : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isSelected ? <Check className={`w-4 h-4 ${isRecent ? 'genie-check-animate' : ''}`} /> : null}
                      </div>
                    </div>
                    {source.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-13">
                        {source.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {source.tags.length > 4 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            +{source.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </AdminSection>
      </div>

      {/* AI Processing Hint */}
      <div
        className={`rounded-xl p-4 flex items-start gap-3 ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <Sparkles className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-indigo-400' : 'text-amber-500'}`} />
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-amber-800'}`}>
            AI-Powered Preprocessing
          </p>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-amber-700'}`}>
            Once you proceed to the next stage, our AI will analyze your selected documents to extract
            key topics, identify learning objectives, and prepare content for course generation.
          </p>
        </div>
      </div>

      {/* Stage Summary */}
      {selectedSourceIds.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            isDarkMode ? 'border-emerald-500/30 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {selectedSourceIds.length} source{selectedSourceIds.length !== 1 ? 's' : ''} selected for processing
            </span>
          </div>
          <p className={`text-xs mt-1 ml-7 ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
            Click "Continue to Analyze" to begin AI analysis of your content
          </p>
        </div>
      )}
    </div>
  );
};

export default GenieStageIngest;
