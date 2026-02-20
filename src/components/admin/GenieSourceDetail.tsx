import React, { useMemo } from 'react';
import { ArrowLeft, FileText, Tag, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useLMSStore } from '../../store/lmsStore';
import { useAppContext } from '../../context/AppContext';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';

interface GenieSourceDetailProps {
  isDarkMode?: boolean;
  sourceId: string;
}

const GenieSourceDetail: React.FC<GenieSourceDetailProps> = ({ isDarkMode = false, sourceId }) => {
  const { navigate } = useAppContext();
  const { genieSources } = useLMSStore();

  const source = genieSources.find((item) => item.id === sourceId);

  const readiness = useMemo(() => {
    if (!source) return { score: 0, checks: [] as { label: string; ok: boolean }[] };
    const checks = [
      { label: 'File uploaded', ok: Boolean(source.fileUrl || source.fileName) },
      { label: 'Tags added', ok: source.tags.length > 0 },
      { label: 'Description provided', ok: Boolean(source.description?.trim()) },
      { label: 'Active status', ok: source.status === 'active' }
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
    return { score, checks };
  }, [source]);

  if (!source) {
    return (
      <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <AdminPageHeader
          title="Source not found"
          subtitle="We couldn't locate that Genie source."
          isDarkMode={isDarkMode}
          actions={(
            <button
              onClick={() => navigate('/admin/genie/sources')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sources
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <AdminPageHeader
        title={source.title}
        subtitle={`Genie Source • ${source.type.toUpperCase()} • v${source.version}`}
        isDarkMode={isDarkMode}
        badge="Genie"
        actions={(
          <button
            onClick={() => navigate('/admin/genie/sources')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-500 text-indigo-500 hover:bg-indigo-500/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sources
          </button>
        )}
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="Preview" isDarkMode={isDarkMode} minHeight="220px">
          <div className={`rounded-xl border p-5 ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDarkMode ? 'bg-gray-700 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">{source.fileName || 'Manual entry'}</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {source.fileType || 'Unknown type'} • {source.fileSize ? `${Math.round(source.fileSize / 1024)} KB` : 'Unknown size'}
                </p>
              </div>
              {source.fileUrl && (
                <a
                  href={source.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`ml-auto inline-flex items-center gap-1 text-xs ${
                    isDarkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-500'
                  }`}
                >
                  Open file
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className={`mt-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {source.description || 'No description provided yet.'}
            </p>
          </div>
        </AdminSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminSection title="Metadata" isDarkMode={isDarkMode} minHeight="200px">
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Source Key</p>
                <p className="font-medium">{source.sourceKey}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Status</p>
                <p className="font-medium">{source.status}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Uploaded By</p>
                <p className="font-medium">{source.uploadedBy || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Created</p>
                <p className="font-medium">{new Date(source.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Updated</p>
                <p className="font-medium">{new Date(source.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Tags" isDarkMode={isDarkMode} minHeight="200px">
            {source.tags.length === 0 ? (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No tags yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {source.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Tag className="inline w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection title="AI Readiness" isDarkMode={isDarkMode} minHeight="200px">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-semibold ${readiness.score >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {readiness.score}%
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Ready for course generation
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {readiness.checks.map((check) => (
                <div key={check.label} className="flex items-center gap-2 text-xs">
                  {check.ok ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>{check.label}</span>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  );
};

export default GenieSourceDetail;
