import React from 'react';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';

interface IntelligencePlaceholderProps {
  title: string;
  subtitle: string;
  isDarkMode?: boolean;
  roadmap: string[];
  nextSteps?: string[];
}

const IntelligencePlaceholder: React.FC<IntelligencePlaceholderProps> = ({
  title,
  subtitle,
  isDarkMode = false,
  roadmap,
  nextSteps = []
}) => {
  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <AdminPageHeader
        title={title}
        subtitle={subtitle}
        isDarkMode={isDarkMode}
        badge="Intelligence"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="Status" isDarkMode={isDarkMode} minHeight="120px">
          <div className={`rounded-lg border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <p className="text-sm font-semibold">Not yet implemented</p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              UI shell is live. Data wiring + models are pending for this module.
            </p>
          </div>
        </AdminSection>

        <AdminSection title="Planned Scope" isDarkMode={isDarkMode} minHeight="160px">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roadmap.map((item) => (
              <div
                key={item}
                className={`rounded-lg border p-3 text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
              >
                {item}
              </div>
            ))}
          </div>
        </AdminSection>

        {nextSteps.length > 0 && (
          <AdminSection title="Next Steps" isDarkMode={isDarkMode} minHeight="120px">
            <div className="space-y-2">
              {nextSteps.map((step) => (
                <div
                  key={step}
                  className={`rounded-lg border p-3 text-xs ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
                >
                  {step}
                </div>
              ))}
            </div>
          </AdminSection>
        )}
      </div>
    </div>
  );
};

export default IntelligencePlaceholder;
