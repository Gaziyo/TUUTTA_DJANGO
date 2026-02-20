import React from 'react';
import { Bot } from 'lucide-react';
import type { GenieTutorContext } from '../../lib/genieTutorContext';

export interface GenieTutorAction {
  label: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

interface GenieTutorPanelProps {
  context: GenieTutorContext;
  isDarkMode?: boolean;
  actions?: GenieTutorAction[];
}

const GenieTutorPanel: React.FC<GenieTutorPanelProps> = ({ context, isDarkMode = false, actions = [] }) => {
  const stepLabels: Record<GenieTutorContext['step'], string> = {
    content_ingestion: 'Content Ingestion & Preprocessing',
    analyze: 'Analyze (ADDIE)',
    design: 'Design (ADDIE + Adult Learning + Learning Pyramid)',
    develop: 'Develop (ADDIE + AI Content + Assessment)',
    implement: 'Implement (ADDIE + Delivery)',
    evaluate: 'Evaluate (ADDIE + Outcomes)',
    personalisation: 'Personalisation & Adaptivity',
    manager_portal: 'Manager & Stakeholder Portal',
    governance: 'System Governance & Monitoring'
  };

  const stepLabel = stepLabels[context.step] || context.step;

  return (
    <div className="card-min p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${
          isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
        }`}>
          <Bot className="w-4 h-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">AI Tutor</p>
          <p className="text-xs text-app-muted">{stepLabel}</p>
        </div>
      </div>

      <p className="text-xs text-app-muted mt-3">
        {context.summary}
      </p>

      <div className="mt-4 grid gap-2 text-xs text-app-muted">
        <div className="flex items-center justify-between">
          <span>Sources</span>
          <span className="font-medium text-app-text">{context.sourceCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Drafts</span>
          <span className="font-medium text-app-text">{context.draftCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Assessments</span>
          <span className="font-medium text-app-text">{context.assessmentCount}</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-app-border bg-app-surface2 p-3 text-xs text-app-muted">
        Ask Genie how to format uploads, validate sources, or detect missing content.
      </div>

      {actions.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-app-muted">Recommended actions</p>
          <div className="mt-2 space-y-2">
            {actions.map((action) => {
              const isPrimary = action.variant === 'primary';
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                    isPrimary
                      ? 'border-transparent bg-app-accent text-white hover:bg-app-accent-strong'
                      : 'border-app-border bg-app-surface2 text-app-text hover:bg-app-surface'
                  } ${action.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="font-semibold">{action.label}</div>
                  {action.description && (
                    <div className={`text-[11px] ${isPrimary ? 'text-white/80' : 'text-app-muted'}`}>
                      {action.description}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenieTutorPanel;
