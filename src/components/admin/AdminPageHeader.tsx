import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  isDarkMode: boolean;
  badge?: string;
  actions?: React.ReactNode;
}

export default function AdminPageHeader({
  title,
  subtitle,
  isDarkMode: _isDarkMode,
  badge,
  actions
}: AdminPageHeaderProps) {
  return (
    <div className="border-b border-app-border bg-app-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-app-text">
                {title}
              </h1>
              {badge && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-app-surface-2 text-app-muted">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-app-muted">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
