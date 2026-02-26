import { apiClient } from '../lib/api';

export interface OnboardingState {
  profile_setup: boolean;
  organization_selection: boolean;
  diagnostic_assessment: boolean;
  first_recommendation: boolean;
  completed: boolean;
  completed_at: string | null;
}

const defaultState: OnboardingState = {
  profile_setup: false,
  organization_selection: false,
  diagnostic_assessment: false,
  first_recommendation: false,
  completed: false,
  completed_at: null,
};

export const onboardingService = {
  getState: async (): Promise<OnboardingState> => {
    try {
      const { data } = await apiClient.get('/auth/onboarding/');
      return { ...defaultState, ...(data as Partial<OnboardingState>) };
    } catch {
      return defaultState;
    }
  },
  updateState: async (updates: Partial<OnboardingState>): Promise<OnboardingState> => {
    const { data } = await apiClient.patch('/auth/onboarding/', updates);
    return { ...defaultState, ...(data as Partial<OnboardingState>) };
  },
};
