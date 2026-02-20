import React from 'react';

interface AppFooterProps {
  isDarkMode: boolean;
  onNavigate: (route: string) => void;
}

export default function AppFooter({ isDarkMode, onNavigate }: AppFooterProps) {
  const statusUrl = import.meta.env.VITE_STATUS_PAGE_URL as string | undefined;
  const statusBadgeUrl = import.meta.env.VITE_STATUS_BADGE_URL as string | undefined;
  return (
    <footer className={`mt-auto border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
          Tuutta Learning Platform
        </div>
        <div className="flex items-center gap-4 text-sm">
          {statusBadgeUrl && (
            <img
              src={statusBadgeUrl}
              alt="System uptime badge"
              className="h-5 w-auto"
              loading="lazy"
            />
          )}
          {statusUrl && (
            <a
              href={statusUrl}
              target="_blank"
              rel="noreferrer"
              className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Status
            </a>
          )}
          <button
            onClick={() => onNavigate('/privacy')}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Privacy
          </button>
          <button
            onClick={() => onNavigate('/terms')}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Terms
          </button>
          <button
            onClick={() => onNavigate('/security')}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Security
          </button>
        </div>
      </div>
    </footer>
  );
}
