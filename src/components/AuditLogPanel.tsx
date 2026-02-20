import React, { useEffect } from 'react';
import { useLMSStore } from '../store/lmsStore';

export default function AuditLogPanel() {
  const { currentOrg, auditLogs, loadAuditLogs } = useLMSStore();

  useEffect(() => {
    if (currentOrg?.id) {
      loadAuditLogs();
    }
  }, [currentOrg?.id, loadAuditLogs]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${days} days ago`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audit Log</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Recent administrative actions across the workspace.
        </p>
      </div>

      {auditLogs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">No audit activity yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {log.action.replace(/_/g, ' ')}{log.targetName ? `: ${log.targetName}` : ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(log.createdAt)} • by {log.actorName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
