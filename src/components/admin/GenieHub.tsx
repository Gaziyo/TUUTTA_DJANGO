import React from 'react';
import {
  Sparkles,
  FileText,
  Layers,
  ClipboardCheck,
  Users,
  BarChart3,
  Award,
  Bell,
  Bot
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import GenieAutoBuildLauncher from './GenieAutoBuildLauncher';

interface GenieHubProps {
  isDarkMode?: boolean;
}

const GenieHub: React.FC<GenieHubProps> = ({ isDarkMode = false }) => {
  const { navigate } = useAppContext();

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <AdminPageHeader
        title="Genie AI"
        subtitle="Studio Tools. Jump directly to the tools you need."
        isDarkMode={isDarkMode}
        badge="AI"
        actions={(
          <div className="flex items-center gap-3">
            <GenieAutoBuildLauncher isDarkMode={isDarkMode} />
            <button
              onClick={() => navigate('/admin/genie/ai-bot')}
              className="btn-secondary-min flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Bot className="w-4 h-4" />
              AI Bot
            </button>
            <button
              onClick={() => navigate('/admin/genie/sources')}
              className="btn-primary-min flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Start new flow
            </button>
          </div>
        )}
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="Studio Tools" subtitle="Jump directly to the tools you need." isDarkMode={isDarkMode} minHeight="200px">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { title: 'Sources', desc: 'Upload and tag source files.', icon: FileText, route: '/admin/genie/sources' },
              { title: 'Draft Studio', desc: 'Generate modules and lessons.', icon: Layers, route: '/admin/genie/studio' },
              { title: 'Assessments', desc: 'Create quizzes and checks.', icon: ClipboardCheck, route: '/admin/genie/assessments' },
              { title: 'Launch', desc: 'Enroll by role or team.', icon: Users, route: '/admin/genie/enrollments' },
              { title: 'Analytics', desc: 'Completion, risk, outcomes.', icon: BarChart3, route: '/admin/genie/analytics' },
              { title: 'Compliance', desc: 'Certificates and audit trail.', icon: Award, route: '/admin/genie/compliance' },
              { title: 'Notifications', desc: 'Alerts and reports.', icon: Bell, route: '/admin/genie/notifications' }
            ].map((item) => (
              <button
                key={item.title}
                onClick={() => item.route && navigate(item.route)}
                className="card-min p-4 text-left transition-colors hover:bg-app-surface-2"
              >
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-app-muted" />
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <p className="text-xs mt-2 text-app-muted">{item.desc}</p>
              </button>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Next Actions" subtitle="A simple, focused path to launch." isDarkMode={isDarkMode} minHeight="140px">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[
              { label: 'Upload a policy', route: '/admin/genie/sources' },
              { label: 'Generate a draft', route: '/admin/genie/studio' },
              { label: 'Launch to a team', route: '/admin/genie/enrollments' }
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="card-min p-3 text-left text-sm font-semibold transition-colors hover:bg-app-surface-2"
              >
                {item.label}
              </button>
            ))}
          </div>
        </AdminSection>
      </div>
    </div>
  );
};

export default GenieHub;
