import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';
import { useLMSStore } from '../../store/lmsStore';
import { AuditLog } from '../../types/lms';
import { exportToCSV, exportToJSON } from '../../lib/reportExport';

interface AdminAuditLogViewerProps {
  isDarkMode?: boolean;
}

const ACTION_OPTIONS = [
  'course.created',
  'course.published',
  'course.archived',
  'enrollment.created',
  'enrollment.completed',
  'assessment.submitted',
  'user.enrolled',
  'user.removed'
];

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
};

export default function AdminAuditLogViewer({ isDarkMode = false }: AdminAuditLogViewerProps) {
  const { auditLogs, loadAuditLogs, currentOrg } = useLMSStore();
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    if (currentOrg) {
      loadAuditLogs();
    }
  }, [currentOrg, loadAuditLogs]);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const days = Number(dateRange);
    const cutoff = Number.isFinite(days) ? now - days * 24 * 60 * 60 * 1000 : 0;

    return auditLogs.filter((log) => {
      if (cutoff && log.timestamp < cutoff) return false;
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (actorFilter !== 'all' && log.actorType !== actorFilter) return false;
      if (!query.trim()) return true;
      const haystack = [
        log.actorName,
        log.action,
        log.entityType,
        log.entityId,
        log.targetName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [auditLogs, actionFilter, actorFilter, dateRange, query]);

  const exportAuditLogs = (format: 'csv' | 'json') => {
    const data = filteredLogs.map((log) => ({
      timestamp: formatTimestamp(log.timestamp),
      actor: log.actorName || log.actorId,
      actorType: log.actorType || 'user',
      action: log.action,
      entity: log.entityType || '—',
      target: log.targetName || log.targetId || '—',
      metadata: log.metadata ? JSON.stringify(log.metadata) : ''
    }));

    const filename = `tuutta_audit_log_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      exportToCSV({
        filename,
        columns: [
          { id: 'timestamp', label: 'Timestamp' },
          { id: 'actor', label: 'Actor' },
          { id: 'actorType', label: 'Actor Type' },
          { id: 'action', label: 'Action' },
          { id: 'entity', label: 'Entity' },
          { id: 'target', label: 'Target' },
          { id: 'metadata', label: 'Metadata' }
        ],
        data
      });
    } else {
      exportToJSON(filename, data);
    }
  };

  return (
    <div className={`h-full overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Audit Log</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Track security-sensitive actions and compliance events across your organization.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => exportAuditLogs('csv')}
              className="tuutta-button-secondary text-sm px-4 py-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => exportAuditLogs('json')}
              className="tuutta-button-primary text-sm px-4 py-2"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_repeat(3,_minmax(0,_1fr))] gap-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search actor, action, or target..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              >
                <option value="all">All actions</option>
                {ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              >
                <option value="all">All actors</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last 12 months</option>
                <option value="0">All time</option>
              </select>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className={`grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-xs uppercase tracking-widest ${
            isDarkMode ? 'bg-gray-900/60 text-gray-400' : 'bg-gray-50 text-gray-500'
          }`}>
            <span>Timestamp</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Entity</span>
            <span>Target</span>
          </div>
          <div className="divide-y divide-gray-200/60 dark:divide-gray-700">
            {filteredLogs.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
                No audit activity matches the selected filters.
              </div>
            ) : (
              filteredLogs.map((log: AuditLog) => (
                <div key={log.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{formatTimestamp(log.timestamp)}</span>
                  <span className="font-medium">{log.actorName || log.actorId}</span>
                  <span className="text-indigo-500">{log.action}</span>
                  <span>{log.entityType || '—'}</span>
                  <span>{log.targetName || log.targetId || '—'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
