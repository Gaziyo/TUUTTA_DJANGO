import React from 'react';
import routesMarkdown from '../../../docs/ROUTES.md?raw';

interface AdminRouteMapProps {
  isDarkMode?: boolean;
}

export default function AdminRouteMap({ isDarkMode = false }: AdminRouteMapProps) {
  return (
    <div className={`h-full overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Route Map</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Source: `docs/ROUTES.md`
          </p>
        </div>
        <pre className={`whitespace-pre-wrap rounded-2xl border p-6 text-sm leading-relaxed ${
          isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
        }`}>
          {routesMarkdown}
        </pre>
      </div>
    </div>
  );
}
