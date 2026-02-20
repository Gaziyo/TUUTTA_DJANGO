import React from 'react';
import { Search } from 'lucide-react';

interface AdminToolbarProps {
  isDarkMode: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export default function AdminToolbar({
  isDarkMode: _isDarkMode,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  leftContent,
  rightContent
}: AdminToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {leftContent && (
        <div className="flex items-center gap-2">
          {leftContent}
        </div>
      )}
      {showSearch && (
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-app-muted" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-app-border bg-transparent text-app-text placeholder:text-app-muted focus:ring-1 focus:ring-app-border focus:border-app-border"
          />
        </div>
      )}
      <div className="flex-1" />
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
}
