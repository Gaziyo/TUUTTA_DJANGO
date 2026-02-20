// ============================================================================
// GUIDE MODAL COMPONENT
// Modal for displaying detailed admin guides with step-by-step instructions
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronDown,
  Clock,
  Lightbulb,
  ExternalLink,
  CheckCircle2,
  Circle,
  BookOpen,
  Compass,
  GraduationCap,
  Shield,
  Wrench,
  Users,
  BarChart2,
  Upload,
  UserPlus,
  Palette,
  Puzzle,
  ClipboardCheck,
  MessageCircle,
  HelpCircle,
  Layers
} from 'lucide-react';
import { GuideContent, getRelatedGuides } from '../data/adminGuideContent';
import { useAppContext } from '../context/AppContext';

interface GuideModalProps {
  guide: GuideContent;
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide: (guideId: string) => void;
  isDarkMode: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  compass: Compass,
  'graduation-cap': GraduationCap,
  shield: Shield,
  wrench: Wrench,
  'book-open': BookOpen,
  users: Users,
  'bar-chart-2': BarChart2,
  upload: Upload,
  'user-plus': UserPlus,
  palette: Palette,
  puzzle: Puzzle,
  'clipboard-check': ClipboardCheck,
  'message-circle': MessageCircle,
  'help-circle': HelpCircle,
  layers: Layers
};

export default function GuideModal({
  guide,
  isOpen,
  onClose,
  onOpenGuide,
  isDarkMode
}: GuideModalProps) {
  const { navigate } = useAppContext();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [activeSection, setActiveSection] = useState<'guide' | 'content' | 'actions'>('guide');
  const [workshopPhaseIndex, setWorkshopPhaseIndex] = useState(0);

  const IconComponent = iconMap[guide.icon] || BookOpen;
  const relatedGuides = getRelatedGuides(guide.id);
  const progress = (completedSteps.size / guide.steps.length) * 100;
  const hasContentSection = Boolean(guide.media || guide.demo);

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleComplete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  const handleAction = (route: string) => {
    navigate(route);
    onClose();
  };

  const jumpToStep = (index: number) => {
    setExpandedSteps(new Set([index]));
    const target = document.getElementById(`guide-step-${index}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sectionTabs = useMemo(() => {
    const tabs: { id: 'guide' | 'content' | 'actions'; label: string }[] = [
      { id: 'guide', label: 'Guide' }
    ];
    if (hasContentSection) tabs.push({ id: 'content', label: 'Content' });
    tabs.push({ id: 'actions', label: 'Actions' });
    return tabs;
  }, [hasContentSection]);

  const workshopPhases = [
    { title: 'Setup', description: 'Define instructions, grading strategy, and submissions.' },
    { title: 'Submission', description: 'Learners submit work for peer review.' },
    { title: 'Assessment', description: 'Peers review submissions using rubrics.' },
    { title: 'Grading', description: 'Finalize grades and release feedback.' }
  ];

  if (!isOpen) return null;

  const renderDemoPanel = () => {
    if (!guide.demo) return null;
    if (guide.demo.type === 'workshop_wizard') {
      const phase = workshopPhases[workshopPhaseIndex];
      return (
        <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-indigo-500/40 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                Workshop Wizard
              </p>
              <h4 className="text-lg font-semibold">{phase.title} Phase</h4>
              <p className={`text-sm ${isDarkMode ? 'text-indigo-200/80' : 'text-indigo-700'}`}>{phase.description}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs ${isDarkMode ? 'bg-indigo-700/40 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>
              {workshopPhaseIndex + 1} / {workshopPhases.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-900/40' : 'bg-white'}`}>
              <p className="font-medium">Checklist</p>
              <ul className={`mt-2 space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• Define rubric</li>
                <li>• Set phase dates</li>
                <li>• Allocate reviewers</li>
              </ul>
            </div>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-900/40' : 'bg-white'}`}>
              <p className="font-medium">Phase Tips</p>
              <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Keep phases short and send reminders at each transition.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setWorkshopPhaseIndex(Math.max(0, workshopPhaseIndex - 1))}
              disabled={workshopPhaseIndex === 0}
              className={`px-3 py-2 rounded-lg text-sm ${
                workshopPhaseIndex === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setWorkshopPhaseIndex(Math.min(workshopPhases.length - 1, workshopPhaseIndex + 1))}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Next Phase
            </button>
          </div>
        </div>
      );
    }

    if (guide.demo.type === 'forum_preview') {
      return (
        <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
          <h4 className="text-lg font-semibold mb-2">Forum Preview</h4>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className="font-medium">How do you apply this week’s lesson?</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>12 replies • Last post 2h ago</p>
            </div>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className="font-medium">Share your project draft for peer feedback</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>8 replies • Moderated</p>
            </div>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className="font-medium">Q&A: Common blockers</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pinned by instructor</p>
            </div>
          </div>
        </div>
      );
    }

    if (guide.demo.type === 'assignment_builder') {
      return (
        <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
          <h4 className="text-lg font-semibold mb-3">Assignment Builder Demo</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className="text-sm font-medium mb-2">Assignment details</p>
              <div className="space-y-2 text-sm">
                <div>
                  <label className={`block text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Title</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    Case Study Submission
                  </div>
                </div>
                <div>
                  <label className={`block text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Submission type</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    File upload + Text response
                  </div>
                </div>
                <div>
                  <label className={`block text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Due date</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    Friday, 5:00 PM
                  </div>
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className="text-sm font-medium mb-2">Rubric preview</p>
              <div className="space-y-2 text-sm">
                <div className={`flex items-center justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span>Clarity & Structure</span>
                  <span>0-5 pts</span>
                </div>
                <div className={`flex items-center justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span>Evidence & Sources</span>
                  <span>0-5 pts</span>
                </div>
                <div className={`flex items-center justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span>Reflection Quality</span>
                  <span>0-5 pts</span>
                </div>
                <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  Feedback template: “What stood out most was… Consider improving…”
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 border-b ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDarkMode
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <h2
                  className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {guide.title}
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {guide.description}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div
                    className={`flex items-center gap-1.5 text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {guide.estimatedTime}
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {completedSteps.size}/{guide.steps.length} steps
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div
              className={`h-1.5 rounded-full overflow-hidden ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`sticky top-0 z-10 pb-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2">
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === tab.id
                    ? isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
                    : isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          {activeSection === 'guide' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-3">
                {guide.steps.map((step, index) => {
                  const isExpanded = expandedSteps.has(index);
                  const isCompleted = completedSteps.has(index);

                  return (
                    <div
                      key={index}
                      id={`guide-step-${index}`}
                      className={`rounded-xl border transition-all ${
                        isDarkMode
                          ? isCompleted
                            ? 'border-green-500/30 bg-green-900/10'
                            : 'border-gray-700 bg-gray-800/50'
                          : isCompleted
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      <button
                        onClick={() => toggleStep(index)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => toggleComplete(index, e)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleComplete(index, e as unknown as React.MouseEvent); }}
                          className={`flex-shrink-0 transition-colors cursor-pointer ${
                            isCompleted
                              ? 'text-green-500'
                              : isDarkMode
                                ? 'text-gray-500 hover:text-gray-400'
                                : 'text-gray-400 hover:text-gray-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-medium ${
                              isCompleted
                                ? isDarkMode
                                  ? 'text-green-400'
                                  : 'text-green-700'
                                : isDarkMode
                                  ? 'text-white'
                                  : 'text-gray-900'
                            }`}
                          >
                            {step.title}
                          </h3>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        ) : (
                          <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        )}
                      </button>

                      {isExpanded && (
                        <div
                          className={`px-4 pb-4 pt-0 ml-8 border-t ${
                            isDarkMode ? 'border-gray-700' : 'border-gray-100'
                          }`}
                        >
                          <p className={`mt-3 text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {step.description}
                          </p>

                          {step.tip && (
                            <div
                              className={`mt-3 flex items-start gap-2 p-3 rounded-lg ${
                                isDarkMode
                                  ? 'bg-amber-900/20 border border-amber-500/20'
                                  : 'bg-amber-50 border border-amber-200'
                              }`}
                            >
                              <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                              <p className={`text-sm ${isDarkMode ? 'text-amber-200' : 'text-amber-800'}`}>
                                <span className="font-medium">Tip:</span> {step.tip}
                              </p>
                            </div>
                          )}

                          {step.action && (
                            <button
                              onClick={() => handleAction(step.action!.route)}
                              className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isDarkMode
                                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {step.action.label}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 hidden lg:block">
                <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className="text-sm font-semibold uppercase tracking-wide mb-3">
                    Steps Outline
                  </h4>
                  <div className="space-y-2 text-sm">
                    {guide.steps.map((step, index) => {
                      const done = completedSteps.has(index);
                      return (
                        <button
                          key={step.title}
                          onClick={() => jumpToStep(index)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${
                            isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-white text-gray-600'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${done ? 'bg-green-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                          <span className="truncate">{step.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className="text-sm font-semibold uppercase tracking-wide mb-3">
                    Quick Action
                  </h4>
                  {guide.tryItRoute ? (
                    <button
                      onClick={() => handleAction(guide.tryItRoute!)}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${
                        isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      Try it now
                    </button>
                  ) : (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No quick action available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'content' && (
            <div className="space-y-4">
              {guide.media && (
                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
                  <div className="p-4 border-b border-gray-200/40">
                    <h4 className="text-lg font-semibold">{guide.media.title}</h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{guide.media.description}</p>
                  </div>
                  <div className="p-4">
                    <div className="aspect-video rounded-lg overflow-hidden bg-black/20">
                      <iframe
                        title={guide.media.title}
                        src={guide.media.url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              )}
              {renderDemoPanel()}
              {!guide.media && !guide.demo && (
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-900/30 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  No content previews available for this guide yet.
                </div>
              )}
            </div>
          )}

          {activeSection === 'actions' && (
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                <h4 className="text-lg font-semibold mb-2">Try It Now</h4>
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Jump directly to the relevant tool to apply what you learned.
                </p>
                {guide.tryItRoute ? (
                  <button
                    onClick={() => handleAction(guide.tryItRoute!)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    Open {guide.title}
                  </button>
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No direct action available for this guide yet.
                  </p>
                )}
              </div>

              {relatedGuides.length > 0 && (
                <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className="text-lg font-semibold mb-3">Related Guides</h4>
                  <div className="grid gap-2">
                    {relatedGuides.map((related) => (
                      <button
                        key={related.id}
                        onClick={() => onOpenGuide(related.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                          isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{related.title}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {completedSteps.size === guide.steps.length ? (
                <span className="text-green-500 font-medium">Guide completed!</span>
              ) : (
                `${guide.steps.length - completedSteps.size} steps remaining`
              )}
            </div>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
