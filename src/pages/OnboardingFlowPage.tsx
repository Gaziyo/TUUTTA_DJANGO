import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { onboardingService } from '../services';
import { useLMSStore } from '../store/lmsStore';

interface OnboardingFlowPageProps {
  isDarkMode: boolean;
}

type OnboardingStep = 'profile' | 'organization' | 'diagnostic' | 'recommendation' | 'complete';

const stepOrder: OnboardingStep[] = ['profile', 'organization', 'diagnostic', 'recommendation', 'complete'];

export default function OnboardingFlowPage({ isDarkMode }: OnboardingFlowPageProps) {
  const { step } = useParams();
  const navigate = useNavigate();
  const { currentOrg } = useLMSStore();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({
    profile_setup: false,
    organization_selection: false,
    diagnostic_assessment: false,
    first_recommendation: false,
    completed: false,
  });

  const currentStep = (step as OnboardingStep) || 'profile';

  useEffect(() => {
    let canceled = false;
    (async () => {
      const onboarding = await onboardingService.getState();
      if (!canceled) {
        setState(onboarding);
        setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const stepStatus = useMemo(() => ({
    profile: state.profile_setup,
    organization: state.organization_selection || Boolean(currentOrg),
    diagnostic: state.diagnostic_assessment,
    recommendation: state.first_recommendation,
    complete: state.completed,
  }), [state, currentOrg]);

  const markStepDone = async (stepKey: OnboardingStep) => {
    const updates: Record<string, boolean> = {};
    if (stepKey === 'profile') updates.profile_setup = true;
    if (stepKey === 'organization') updates.organization_selection = true;
    if (stepKey === 'diagnostic') updates.diagnostic_assessment = true;
    if (stepKey === 'recommendation') updates.first_recommendation = true;
    if (stepKey === 'complete') updates.completed = true;

    const nextState = await onboardingService.updateState(updates);
    setState(nextState);

    if (nextState.completed) {
      navigate('/app', { replace: true });
      return;
    }
    const idx = stepOrder.indexOf(stepKey);
    const next = stepOrder[Math.min(idx + 1, stepOrder.length - 1)];
    navigate(`/onboarding/${next}`, { replace: true });
  };

  if (loading) {
    return <div className="p-6">Loading onboarding…</div>;
  }

  const contentByStep: Record<OnboardingStep, { title: string; body: string; cta: string; onClick: () => void }> = {
    profile: {
      title: 'Set up your profile',
      body: 'Add profile details so recommendations and assessments can be tailored to you.',
      cta: 'Complete Profile',
      onClick: () => markStepDone('profile'),
    },
    organization: {
      title: 'Pick your workspace',
      body: currentOrg
        ? `Organization selected: ${currentOrg.name}.`
        : 'Join an organization or continue in personal mode for now.',
      cta: currentOrg ? 'Continue' : 'Mark Workspace Step Complete',
      onClick: () => markStepDone('organization'),
    },
    diagnostic: {
      title: 'Run a quick diagnostic',
      body: 'Establish your baseline so we can personalize your learning path.',
      cta: 'Complete Diagnostic',
      onClick: () => markStepDone('diagnostic'),
    },
    recommendation: {
      title: 'Review your first recommendation',
      body: 'Accept your first recommended course to start learning immediately.',
      cta: 'Accept Recommendation',
      onClick: () => markStepDone('recommendation'),
    },
    complete: {
      title: 'Onboarding complete',
      body: 'You are ready. Continue to your workspace.',
      cta: 'Go To Workspace',
      onClick: () => markStepDone('complete'),
    },
  };

  const active = contentByStep[currentStep] || contentByStep.profile;

  return (
    <div className={`min-h-full p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-3xl mx-auto rounded-2xl border p-8 ${
        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Complete all steps to unlock your full workspace experience.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-5 gap-2">
          {stepOrder.map((item) => (
            <div
              key={item}
              className={`rounded-lg px-3 py-2 text-xs font-medium text-center ${
                stepStatus[item]
                  ? isDarkMode ? 'bg-emerald-600/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                  : item === currentStep
                    ? isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                    : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">{active.title}</h2>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{active.body}</p>
          <button
            onClick={active.onClick}
            className={`mt-6 px-4 py-2 rounded-lg font-medium ${
              isDarkMode ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {active.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
