import React, { useMemo, useRef, useState } from 'react';
import { Upload, FileText, Tag, Archive, Filter, History, X, ExternalLink } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { GenieSourceType } from '../../types/lms';
import { uploadFile } from '../../lib/storage';
import { useAppContext } from '../../context/AppContext';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import GenieTutorPanel from './GenieTutorPanel';
import { buildGenieTutorContext } from '../../lib/genieTutorContext';

const SOURCE_TYPES: { id: GenieSourceType; label: string }[] = [
  { id: 'policy', label: 'Policy' },
  { id: 'sop', label: 'SOP' },
  { id: 'manual', label: 'Manual' },
  { id: 'resource', label: 'Resource' },
];

const GenieSources: React.FC<{ isDarkMode?: boolean; embedded?: boolean }> = ({
  isDarkMode = false,
  embedded = false
}) => {
  const { user } = useStore();
  const { navigate } = useAppContext();
  const {
    currentOrg,
    genieSources,
    genieDrafts,
    genieAssessments,
    addGenieSource,
    archiveGenieSource,
  } = useLMSStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | GenieSourceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedType, setSelectedType] = useState<GenieSourceType>('policy');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [historySourceId, setHistorySourceId] = useState<string | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (!user) {
      alert('Please sign in to upload sources.');
      return;
    }
    if (!currentOrg) {
      alert('Please select an organization first.');
      return;
    }

    setIsUploading(true);
    try {
      for (const file of files) {
        const uploaded = await uploadFile(file, user.id);
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const sourceKey = baseName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const existing = genieSources.filter((source) => source.sourceKey === sourceKey);
        const maxVersion = existing.reduce((acc, cur) => Math.max(acc, cur.version), 0);
        const tags = tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);

        await addGenieSource({
          orgId: currentOrg.id,
          sourceKey,
          title: baseName,
          description: description.trim() || undefined,
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
      }
      setTagsInput('');
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const filteredSources = useMemo(() => {
    return genieSources.filter((source) => {
      const matchesSearch = searchQuery.trim().length === 0 ||
        source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === 'all' || source.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || source.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [genieSources, searchQuery, typeFilter, statusFilter]);

  const historySource = historySourceId
    ? genieSources.find((source) => source.id === historySourceId)
    : null;
  const historyVersions = historySource
    ? genieSources
      .filter((source) => source.sourceKey === historySource.sourceKey)
      .sort((a, b) => b.version - a.version)
    : [];

  const tutorContext = buildGenieTutorContext({
    step: 'content_ingestion',
    sources: genieSources,
    drafts: genieDrafts,
    assessments: genieAssessments
  });
  const primarySourceId = filteredSources[0]?.id;
  const tutorActions = [
    {
      label: 'Upload source',
      description: 'Add policies, SOPs, or manuals.',
      onClick: handleUploadClick,
      variant: 'primary' as const
    },
    {
      label: 'Open latest source',
      description: 'Preview metadata and readiness.',
      onClick: () => {
        if (primarySourceId) navigate(`/admin/genie/sources/${primarySourceId}`);
      },
      disabled: !primarySourceId
    },
    {
      label: 'View version history',
      description: 'Compare earlier uploads.',
      onClick: () => {
        if (primarySourceId) setHistorySourceId(primarySourceId);
      },
      disabled: !primarySourceId
    }
  ];

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      {!embedded && (
        <AdminPageHeader
          title="Genie Sources"
          subtitle="Upload, tag, and version your policies and training materials."
          isDarkMode={isDarkMode}
          badge="Genie"
          actions={(
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload source'}
            </button>
          )}
        />
      )}

      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <AdminSection title="Upload Settings" isDarkMode={isDarkMode} minHeight="96px">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Source type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as GenieSourceType)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tags</label>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}>
                <Tag className="w-4 h-4 text-indigo-500" />
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="compliance, onboarding, safety"
                  className={`bg-transparent outline-none text-sm w-full ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-[260px] flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional context for the AI course builder"
                className={`px-3 py-2 rounded-lg border text-sm w-full ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
        </AdminSection>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="Sources" isDarkMode={isDarkMode} minHeight="160px">
          <AdminToolbar
            isDarkMode={isDarkMode}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search sources or tags..."
            rightContent={(
              <>
                <Filter className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Types</option>
                  {SOURCE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </>
            )}
          />

          <div className="mt-4">
            {filteredSources.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <FileText className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                <p className="text-sm font-semibold">No sources yet</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Upload policies, SOPs, or training documents to start building courses.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className={`rounded-xl border p-4 flex flex-wrap items-center gap-3 ${
                      isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isDarkMode ? 'bg-gray-700 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{source.title}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {source.type.toUpperCase()} • v{source.version} • {source.fileName || 'Manual entry'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {source.tags.map((tag) => (
                        <span
                          key={`${source.id}-${tag}`}
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {source.status === 'archived' ? 'Archived' : 'Active'}
                    </div>
                    <button
                      onClick={() => navigate(`/admin/genie/sources/${source.id}`)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => setHistorySourceId(source.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <History className="w-3 h-3" />
                      Versions
                    </button>
                    {source.status === 'active' && (
                      <button
                        onClick={() => archiveGenieSource(source.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                          isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Archive className="w-3 h-3" />
                        Archive
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminSection>

        <AdminSection title="AI Tutor" subtitle="Guidance for content ingestion & preprocessing." isDarkMode={isDarkMode} minHeight="200px">
          <GenieTutorPanel context={tutorContext} actions={tutorActions} isDarkMode={isDarkMode} />
        </AdminSection>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {historySource && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setHistorySourceId(null)}
          />
          <aside className={`relative w-full max-w-md h-full shadow-xl border-l ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div>
                <p className="text-sm font-semibold">Version History</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {historySource.title}
                </p>
              </div>
              <button
                onClick={() => setHistorySourceId(null)}
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto h-full">
              {historyVersions.map((version) => (
                <div
                  key={version.id}
                  className={`rounded-xl border p-4 ${
                    isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">v{version.version}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(version.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      version.status === 'active'
                        ? isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {version.status}
                    </span>
                  </div>
                  <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {version.fileName || 'Manual entry'}
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate(`/admin/genie/sources/${version.id}`)}
                      className={`text-xs inline-flex items-center gap-1 ${
                        isDarkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-500'
                      }`}
                    >
                      View details
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default GenieSources;
