import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useLMSStore } from '../../store/lmsStore';
import { GenieAssessmentCategory, QuizQuestion } from '../../types/lms';
import { generateAssessment } from '../../lib/assessment';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import { QuizBuilder } from './QuizBuilder';
import GenieTutorPanel from './GenieTutorPanel';
import { buildGenieTutorContext } from '../../lib/genieTutorContext';

const CATEGORY_LABELS: Record<GenieAssessmentCategory, string> = {
  general: 'General Knowledge',
  reading: 'Reading',
  listening: 'Listening',
  speaking: 'Speaking',
  math: 'Math'
};

const GenieAssessments: React.FC<{ isDarkMode?: boolean; embedded?: boolean }> = ({
  isDarkMode = false,
  embedded = false
}) => {
  const { navigate } = useAppContext();
  const {
    genieSources,
    genieAssessments,
    genieDrafts,
    createGenieAssessment,
    updateGenieAssessment,
    deleteGenieAssessment
  } = useLMSStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | GenieAssessmentCategory>('all');
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  const [showBuilderId, setShowBuilderId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const el = document.querySelector(`[data-section="${section}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('section-highlight');
      window.setTimeout(() => el.classList.remove('section-highlight'), 1600);
    }
  }, [searchParams]);

  const jumpTo = (section: string) => {
    if (section === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const params = new URLSearchParams(searchParams);
      params.delete('section');
      setSearchParams(params, { replace: true });
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.set('section', section);
    setSearchParams(params, { replace: true });
  };

  const filteredAssessments = useMemo(() => {
    return genieAssessments.filter((assessment) => {
      const matchesSearch = searchQuery.trim().length === 0 ||
        assessment.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || assessment.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [genieAssessments, searchQuery, categoryFilter]);

  const draftMap = useMemo(() => {
    const map = new Map<string, string>();
    genieDrafts.forEach((draft) => map.set(draft.id, draft.title));
    return map;
  }, [genieDrafts]);

  const buildAssessmentContent = () => {
    if (!selectedDraftId) {
      return 'Generate an assessment for general organizational training content.';
    }
    const draft = genieDrafts.find((item) => item.id === selectedDraftId);
    if (!draft) return 'Generate an assessment based on the selected draft.';
    const outlineText = draft.outline
      .map((module) => `${module.title}: ${module.lessons.map((lesson) => lesson.title).join(', ')}`)
      .join('\n');
    return `Course Draft: ${draft.title}\nModules:\n${outlineText}`;
  };

  const mapAssessmentQuestions = (questions: Array<Record<string, unknown>>): QuizQuestion[] => {
    return questions.map((question, index) => {
      const type = question.type;
      let mappedType: QuizQuestion['type'] = 'short_answer';
      if (type === 'multiple' || type === 'single') mappedType = 'multiple_choice';
      if (type === 'truefalse') mappedType = 'true_false';
      if (type === 'fill') mappedType = 'fill_blank';
      if (type === 'match') mappedType = 'matching';

      const options = question.options || (question.pairs
        ? question.pairs.map((pair: { equation: string; solution: string }) => `${pair.equation}:${pair.solution}`)
        : undefined);

      const correctAnswer = question.correctAnswer ?? (question.pairs ? question.pairs.map((pair: { equation: string; solution: string }) => `${pair.equation}:${pair.solution}`) : '');

      return {
        id: question.id || `q-${Date.now()}-${index}`,
        type: mappedType,
        question: question.question || 'Generated question',
        options,
        correctAnswer,
        points: 10,
        explanation: question.explanation || '',
        bloomLevel: question.bloomLevel ?? question.bloom_level ?? undefined,
        bloomLabel: question.bloomLabel ?? question.bloom_label ?? undefined
      };
    });
  };

  const handleGenerateAssessment = async (category: GenieAssessmentCategory) => {
    setErrorMessage(null);
    setIsGenerating(true);
    try {
      const title = `${CATEGORY_LABELS[category]} Assessment`;
      const draftId = selectedDraftId || undefined;
      const assessmentType = category === 'math' ? 'mathematics' : category;
      const aiAssessment = await generateAssessment(
        buildAssessmentContent(),
        '',
        '',
        assessmentType,
        6
      );
      const questions = mapAssessmentQuestions(aiAssessment.questions || []);
      const created = await createGenieAssessment({
        orgId: '',
        title,
        category,
        draftId,
        questions: questions.length > 0 ? questions : [],
        status: 'draft'
      });
      setShowBuilderId(created.id);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to generate assessment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeAssessment = genieAssessments.find((assessment) => assessment.id === showBuilderId) || null;
  const tutorContext = buildGenieTutorContext({
    step: 'develop',
    sources: genieSources,
    drafts: genieDrafts,
    assessments: genieAssessments
  });
  const tutorActions = [
    {
      label: 'Generate Reading assessment',
      description: 'Reading comprehension and recall.',
      onClick: () => handleGenerateAssessment('reading'),
      disabled: isGenerating,
      variant: 'primary' as const
    },
    {
      label: 'Generate Listening assessment',
      description: 'Audio listening checks.',
      onClick: () => handleGenerateAssessment('listening'),
      disabled: isGenerating
    },
    {
      label: 'Generate Math assessment',
      description: 'Problem-solving and logic.',
      onClick: () => handleGenerateAssessment('math'),
      disabled: isGenerating
    }
  ];

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text" data-section="builder">
      {!embedded && (
        <AdminPageHeader
          title="Genie Assessments"
          subtitle="Generate, edit, and publish AI assessments."
          isDarkMode={isDarkMode}
          badge="Genie"
          actions={(
            <button
              onClick={() => navigate('/admin/genie')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-500 text-indigo-500 hover:bg-indigo-500/10"
            >
              <ClipboardCheck className="w-4 h-4" />
              Back to Genie
            </button>
          )}
        />
      )}
      {!embedded && (
        <div className="px-6 pb-2 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="rounded-full border border-indigo-200 px-3 py-1 font-semibold text-indigo-700"
            onClick={() => jumpTo('top')}
          >
            Top
          </button>
          <button
            type="button"
            className="rounded-full border border-indigo-200 px-3 py-1 font-semibold text-indigo-700"
            onClick={() => jumpTo('builder')}
          >
            Builder
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="AI Tutor" subtitle="Guidance for generating assessments." isDarkMode={isDarkMode} minHeight="200px">
          <GenieTutorPanel context={tutorContext} actions={tutorActions} isDarkMode={isDarkMode} />
        </AdminSection>

        <AdminSection title="Generate Assessment" subtitle="Select a category and generate a draft." isDarkMode={isDarkMode} minHeight="160px">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">Link to draft (optional)</label>
              <select
                value={selectedDraftId}
                onChange={(e) => setSelectedDraftId(e.target.value)}
                className={`mt-1 px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">No draft selected</option>
                {genieDrafts.map((draft) => (
                  <option key={draft.id} value={draft.id}>{draft.title}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LABELS) as GenieAssessmentCategory[]).map((category) => (
                <button
                  key={category}
                  onClick={() => handleGenerateAssessment(category)}
                  disabled={isGenerating}
                  className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                    isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                  )}
                  {isGenerating ? 'Generating...' : CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
            {errorMessage && (
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-red-300' : 'text-red-500'}`}>
                {errorMessage}
              </p>
            )}
          </div>
        </AdminSection>

        <AdminSection title="Assessments" isDarkMode={isDarkMode} minHeight="240px">
          <AdminToolbar
            isDarkMode={isDarkMode}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search assessments..."
            rightContent={(
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All categories</option>
                {(Object.keys(CATEGORY_LABELS) as GenieAssessmentCategory[]).map((category) => (
                  <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                ))}
              </select>
            )}
          />

          <div className="mt-4 space-y-3">
            {filteredAssessments.length === 0 ? (
              <div className={`rounded-xl border p-6 text-center ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                <p className="text-sm font-semibold">No assessments yet</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Generate a draft assessment from your Genie sources.
                </p>
              </div>
            ) : (
              filteredAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className={`rounded-xl border p-4 flex flex-wrap items-center gap-3 ${
                    isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-semibold">{assessment.title}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {CATEGORY_LABELS[assessment.category]} • {assessment.questions.length} questions • {assessment.status}
                    </p>
                    {assessment.draftId && (
                      <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Linked to: {draftMap.get(assessment.draftId) || 'Draft'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowBuilderId(assessment.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs ${
                      isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => updateGenieAssessment(assessment.id, {
                      status: assessment.status === 'draft' ? 'published' : 'draft'
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs ${
                      assessment.status === 'draft'
                        ? isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {assessment.status === 'draft' ? 'Publish' : 'Unpublish'}
                  </button>
                  <button
                    onClick={() => deleteGenieAssessment(assessment.id)}
                    className={`p-2 rounded-lg ${
                      isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-500'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </AdminSection>
      </div>

      {activeAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBuilderId(null)} />
          <div className={`relative w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-xl shadow-xl border ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div>
                <p className="text-sm font-semibold">{activeAssessment.title}</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {CATEGORY_LABELS[activeAssessment.category]}
                </p>
              </div>
              <button
                onClick={() => setShowBuilderId(null)}
                className={`px-3 py-2 rounded-lg text-xs ${
                  isDarkMode ? 'border border-gray-700 text-gray-300 hover:bg-gray-800' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <QuizBuilder
                questions={activeAssessment.questions}
                quiz={{
                  id: `quiz-${activeAssessment.id}`,
                  title: activeAssessment.title,
                  questions: activeAssessment.questions,
                  passingScore: 70,
                  maxAttempts: 3,
                  shuffleQuestions: false,
                  showCorrectAnswers: true
                }}
                isDarkMode={isDarkMode}
                onCancel={() => setShowBuilderId(null)}
                onSave={(questions) => {
                  updateGenieAssessment(activeAssessment.id, { questions });
                  setShowBuilderId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenieAssessments;
