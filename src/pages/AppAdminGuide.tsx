// ============================================================================
// APP ADMIN GUIDE PAGE
// Moodle-style launchpad with detailed guides for admins and teachers
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  Compass,
  BookOpen,
  ShieldCheck,
  Wrench,
  Users,
  GraduationCap,
  Upload,
  BarChart2,
  Sliders,
  Puzzle,
  ClipboardCheck,
  MessageCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { guideContent, GuideContent } from '../data/adminGuideContent';
import GuideModal from '../components/GuideModal';

interface AppAdminGuideProps {
  isDarkMode: boolean;
}

// Map guide IDs to section card items
const SECTION_CARDS = [
  {
    title: 'Get started',
    description: 'Quick orientation for admins and teachers.',
    items: [
      { label: 'Browse features', guideId: 'browse_features', tag: 'Popular' },
      { label: 'Teacher quick guide', guideId: 'teacher_quick_guide', tag: 'Recommended' },
      { label: 'Admin quick guide', guideId: 'admin_quick_guide', tag: 'Popular' },
      { label: 'Installation quick guide', guideId: 'installation_guide' }
    ],
    icon: <Compass className="w-5 h-5" />,
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    title: 'Manage your course',
    description: 'Set up learning and keep learners on track.',
    items: [
      { label: 'Set up your course', guideId: 'set_up_course', tag: 'Popular' },
      { label: 'Add students', guideId: 'add_students' },
      { label: 'Track progress', guideId: 'track_progress' },
      { label: 'Upload files', guideId: 'upload_files' }
    ],
    icon: <BookOpen className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    title: 'Manage your site',
    description: 'Configure users, courses, and settings.',
    items: [
      { label: 'Add users', guideId: 'add_users', tag: 'Popular' },
      { label: 'Add courses', guideId: 'add_courses' },
      { label: 'Change the look and feel', guideId: 'change_look_feel' },
      { label: 'Install plugins', guideId: 'install_plugins' }
    ],
    icon: <ShieldCheck className="w-5 h-5" />,
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    title: 'Add activities',
    description: 'Build engaging learning experiences.',
    items: [
      { label: 'Use assignments to assess', guideId: 'use_assignments', tag: 'Popular' },
      { label: 'Discuss in forums', guideId: 'discuss_in_forums' },
      { label: 'Test students with a quiz', guideId: 'test_with_quiz', tag: 'Recommended' },
      { label: 'Peer-assess with a workshop', guideId: 'peer_assess_workshop' }
    ],
    icon: <Wrench className="w-5 h-5" />,
    gradient: 'from-rose-500 to-pink-500'
  }
];

const QUICK_ACTIONS = [
  { label: 'Create course', icon: <GraduationCap className="w-4 h-4" />, route: '/admin/courses/new' },
  { label: 'Add users', icon: <Users className="w-4 h-4" />, route: '/admin/users' },
  { label: 'Upload content', icon: <Upload className="w-4 h-4" />, route: '/admin/content' },
  { label: 'Track progress', icon: <BarChart2 className="w-4 h-4" />, route: '/admin/reports' },
  { label: 'Site settings', icon: <Sliders className="w-4 h-4" />, route: '/admin/settings' },
  { label: 'Install plugins', icon: <Puzzle className="w-4 h-4" />, route: '/admin/settings' }
];

const FEATURE_GRID = [
  { label: 'Assignments', icon: <ClipboardCheck className="w-4 h-4" />, guideId: 'use_assignments' },
  { label: 'Forums', icon: <MessageCircle className="w-4 h-4" />, guideId: 'discuss_in_forums' },
  { label: 'Quizzes', icon: <HelpCircle className="w-4 h-4" />, guideId: 'test_with_quiz' },
  { label: 'Workshops', icon: <Layers className="w-4 h-4" />, guideId: 'peer_assess_workshop' }
];

export default function AppAdminGuide({ isDarkMode }: AppAdminGuideProps) {
  const { navigate } = useAppContext();
  const [selectedGuide, setSelectedGuide] = useState<GuideContent | null>(null);
  const [lastGuideId, setLastGuideId] = useState<string | null>(null);

  const openGuide = (guideId: string) => {
    const guide = guideContent[guideId];
    if (guide) {
      setSelectedGuide(guide);
      setLastGuideId(guideId);
      localStorage.setItem('tuutta:lastAdminGuide', guideId);
    }
  };

  const closeGuide = () => {
    setSelectedGuide(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem('tuutta:lastAdminGuide');
    if (saved && guideContent[saved]) {
      setLastGuideId(saved);
    }
  }, []);

  return (
    <div className={`h-full overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <span
            className={`inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            App Admin Center
          </span>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Admin Quick Guides & Feature Map
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            A Moodle-style launchpad for admins and teachers to get started fast. Click any guide for
            step-by-step instructions.
          </p>
        </div>

        {lastGuideId && guideContent[lastGuideId] && (
          <div
            className={`rounded-2xl p-6 border ${
              isDarkMode ? 'bg-indigo-900/40 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                }`}>
                  Continue where you left off
                </p>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {guideContent[lastGuideId].title}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
                  {guideContent[lastGuideId].description}
                </p>
              </div>
              <button
                onClick={() => openGuide(lastGuideId)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Resume Guide
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div
          className={`rounded-2xl p-6 ${
            isDarkMode ? 'bg-gray-800/70 border border-gray-700' : 'bg-white border border-gray-200'
          } shadow-sm`}
        >
          <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-[1.02] ${
                  isDarkMode
                    ? 'border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-700 hover:border-gray-600'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-gray-300'
                }`}
              >
                <span className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SECTION_CARDS.map((section) => (
            <div
              key={section.title}
              className={`rounded-2xl p-6 border transition-all flex flex-col min-h-[260px] ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${section.gradient} text-white`}
                >
                  {section.icon}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm flex-1">
                {section.items.map((item) => {
                  const guide = guideContent[item.guideId];
                  return (
                    <button
                      key={item.label}
                      onClick={() => openGuide(item.guideId)}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all ${
                        isDarkMode
                          ? 'bg-gray-900/50 text-gray-200 hover:bg-gray-700'
                          : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'
                          }`}
                        />
                        <span>{item.label}</span>
                        {'tag' in item && item.tag && (
                          <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            isDarkMode ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                          }`}>
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {guide && (
                          <span
                            className={`flex items-center gap-1 text-xs ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {guide.estimatedTime}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                            isDarkMode ? 'text-gray-600' : 'text-gray-400'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Core Activities */}
        <div
          className={`rounded-2xl p-6 border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Core Activities
          </h2>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Click any activity to learn how to use it effectively in your courses.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FEATURE_GRID.map((feature) => (
              <button
                key={feature.label}
                onClick={() => openGuide(feature.guideId)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-[1.02] ${
                  isDarkMode
                    ? 'border-gray-700 bg-gray-900/50 text-gray-200 hover:bg-gray-700 hover:border-gray-600'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
                }`}
              >
                <span className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>
                  {feature.icon}
                </span>
                {feature.label}
              </button>
            ))}
          </div>
        </div>

        {/* Help Banner */}
        <div
          className={`rounded-2xl p-6 bg-gradient-to-r ${
            isDarkMode
              ? 'from-indigo-900/50 to-purple-900/50 border border-indigo-500/20'
              : 'from-indigo-50 to-purple-50 border border-indigo-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Need more help?
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Each guide includes step-by-step instructions, pro tips, and direct links to the
                relevant features. Click any item above to get started, or explore the full
                documentation.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => openGuide('admin_quick_guide')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  Start with Admin Guide
                </button>
                <button
                  onClick={() => openGuide('teacher_quick_guide')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  Teacher Quick Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Modal */}
      {selectedGuide && (
        <GuideModal
          guide={selectedGuide}
          isOpen={!!selectedGuide}
          onClose={closeGuide}
          onOpenGuide={openGuide}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
