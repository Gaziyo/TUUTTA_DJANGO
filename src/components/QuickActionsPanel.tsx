import React from 'react';
import { PlusCircle, Users, FileBarChart, Settings } from 'lucide-react';

const quickActions = [
  { id: 'create-course', label: 'Create Course', icon: PlusCircle },
  { id: 'invite-users', label: 'Invite Users', icon: Users },
  { id: 'export-report', label: 'Export Report', icon: FileBarChart },
  { id: 'org-settings', label: 'Org Settings', icon: Settings }
];

export default function QuickActionsPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Shortcuts for common admin workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
