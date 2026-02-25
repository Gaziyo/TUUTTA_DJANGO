import { apiClient } from '../lib/api';

export interface WorkforceCapabilityIndex {
  id: string;
  organization: string;
  score: number;
  trend: Record<string, unknown>;
  created_at?: string;
}

export interface DepartmentBloomTrend {
  id: string;
  organization: string;
  department: string | null;
  bloom_level: number;
  trend: Record<string, unknown>;
  created_at?: string;
}

export interface CompetencyTrajectoryForecast {
  id: string;
  organization: string;
  competency: string | null;
  forecast: Record<string, unknown>;
  created_at?: string;
}

export interface ComplianceReadinessPrediction {
  id: string;
  organization: string;
  prediction: Record<string, unknown>;
  created_at?: string;
}

export interface StrategicSkillShortageDetection {
  id: string;
  organization: string;
  shortage: Record<string, unknown>;
  created_at?: string;
}

export const forecastingService = {
  recalc: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/workforce-capability/recalculate/`, {
      organization: orgId,
    });
  },

  getWorkforceIndex: async (orgId: string): Promise<WorkforceCapabilityIndex | null> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/workforce-capability/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results.length ? (results[0] as WorkforceCapabilityIndex) : null;
  },

  listDepartmentTrends: async (orgId: string): Promise<DepartmentBloomTrend[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/department-bloom-trends/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as DepartmentBloomTrend[];
  },

  listCompetencyForecasts: async (orgId: string): Promise<CompetencyTrajectoryForecast[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/competency-forecasts/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as CompetencyTrajectoryForecast[];
  },

  listComplianceReadiness: async (orgId: string): Promise<ComplianceReadinessPrediction[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/compliance-readiness/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as ComplianceReadinessPrediction[];
  },

  listSkillShortages: async (orgId: string): Promise<StrategicSkillShortageDetection[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/skill-shortages/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as StrategicSkillShortageDetection[];
  },
};

export default forecastingService;
