import React from 'react';

interface AdminSectionProps {
  title?: string;
  subtitle?: string;
  isDarkMode: boolean;
  minHeight?: string;
  children: React.ReactNode;
}

export default function AdminSection({
  title,
  subtitle,
  isDarkMode: _isDarkMode,
  minHeight,
  children
}: AdminSectionProps) {
  return (
    <section
      className="card-min p-6"
      style={minHeight ? { minHeight } : undefined}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-sm font-semibold text-app-text">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-app-muted">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
