import React, { useState } from 'react';
import { Download, FileText, Users, Building2 } from 'lucide-react';
import { useLMSStore } from '../../store/lmsStore';
import { exportToCSV, exportToJSON, exportToExcel } from '../../lib/reportExport';
import { useStore } from '../../store';
import * as lmsService from '../../lib/lmsService';

interface AdminDataExportsProps {
  isDarkMode?: boolean;
}

type ExportFormat = 'csv' | 'json' | 'excel';

export default function AdminDataExports({ isDarkMode = false }: AdminDataExportsProps) {
  const { currentMember, currentOrg } = useLMSStore();
  const { user } = useStore();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (scope: 'learner' | 'org') => {
    if (!currentOrg) {
      setError('Select an organization to export data.');
      return;
    }
    setError(null);
    setIsExporting(true);
    const filename = scope === 'learner'
      ? `tuutta_learner_export_${new Date().toISOString().slice(0, 10)}`
      : `tuutta_org_export_${new Date().toISOString().slice(0, 10)}`;

    try {
      const data = scope === 'learner'
        ? await (async () => {
            const learnerId = currentMember?.id ?? user?.id;
            if (!learnerId) {
              throw new Error('No learner selected for export.');
            }
            const freshEnrollments = await lmsService.getUserEnrollments(currentOrg.id, learnerId);
            return freshEnrollments.map((en) => ({
              courseId: en.courseId,
              status: en.status,
              progress: en.progress,
              score: en.score ?? '',
              assignedAt: en.assignedAt ? new Date(en.assignedAt).toLocaleDateString() : '',
              completedAt: en.completedAt ? new Date(en.completedAt).toLocaleDateString() : ''
            }));
          })()
        : await (async () => {
            const [orgEnrollments, orgCourses, orgPaths] = await Promise.all([
              lmsService.getOrgEnrollments(currentOrg.id),
              lmsService.getCourses(currentOrg.id),
              lmsService.getLearningPaths(currentOrg.id)
            ]);
            return [
              { metric: 'Courses', value: orgCourses.length },
              { metric: 'Learning paths', value: orgPaths.length },
              { metric: 'Enrollments', value: orgEnrollments.length },
              { metric: 'Active learners', value: new Set(orgEnrollments.map((en) => en.userId)).size }
            ];
          })();

      const columns = scope === 'learner'
        ? [
            { id: 'courseId', label: 'Course ID' },
            { id: 'status', label: 'Status' },
            { id: 'progress', label: 'Progress' },
            { id: 'score', label: 'Score' },
            { id: 'assignedAt', label: 'Assigned' },
            { id: 'completedAt', label: 'Completed' }
          ]
        : [
            { id: 'metric', label: 'Metric' },
            { id: 'value', label: 'Value' }
          ];

      if (format === 'csv') {
        exportToCSV({ filename, columns, data });
      } else if (format === 'excel') {
        exportToExcel({ filename, columns, data });
      } else {
        exportToJSON(filename, data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`h-full overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Data Exports</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Export learner and organization data for audits, analytics, or external systems.
          </p>
        </div>

        <div className={`rounded-2xl border p-4 flex flex-wrap items-center gap-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <span className="text-sm font-medium">Export format</span>
          {(['csv', 'excel', 'json'] as ExportFormat[]).map((option) => (
            <button
              key={option}
              onClick={() => setFormat(option)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                format === option
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
          {error && (
            <span className="text-sm text-red-500">{error}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold">Learner export</h2>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Download learner progress, assessments, and completion status.
            </p>
            <button
              onClick={() => handleExport('learner')}
              className="tuutta-button-primary text-sm px-4 py-2 mt-4 disabled:opacity-60"
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Preparing export...' : 'Export learner data'}
            </button>
          </div>

          <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold">Organization export</h2>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Export org-level rollups for compliance, audits, or executive reporting.
            </p>
            <button
              onClick={() => handleExport('org')}
              className="tuutta-button-secondary text-sm px-4 py-2 mt-4 disabled:opacity-60"
              disabled={isExporting}
            >
              <FileText className="w-4 h-4" />
              {isExporting ? 'Preparing export...' : 'Export org summary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
