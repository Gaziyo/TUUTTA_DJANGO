import React from 'react';

interface GenieEnterpriseSectionProps {
  title: string;
  subtitle?: string;
  sections: { title: string; items: string[] }[];
}

const GenieEnterpriseSection: React.FC<GenieEnterpriseSectionProps> = ({
  title,
  subtitle,
  sections
}) => {
  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <div className="p-6 border-b border-app-border">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-app-muted mt-1">{subtitle}</p>}
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4">
          {sections.map((section) => (
            <div key={section.title} className="card-min p-5">
              <h2 className="text-lg font-semibold mb-3">{section.title}</h2>
              <ul className="space-y-2 text-sm text-app-muted">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-app-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenieEnterpriseSection;
