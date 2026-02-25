import { apiClient } from '../lib/api';

export interface UnlockStatus {
  unlocked: boolean;
  reasons: string[];
}

export const adaptiveReleaseService = {
  getModuleUnlockStatus: async (courseId: string, moduleId: string): Promise<UnlockStatus> => {
    try {
      const { data } = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/unlock-status/`);
      return {
        unlocked: Boolean(data?.unlocked),
        reasons: Array.isArray(data?.reasons) ? data.reasons : [],
      };
    } catch {
      return { unlocked: true, reasons: [] };
    }
  }
};

export default adaptiveReleaseService;
