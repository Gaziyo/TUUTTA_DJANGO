import { apiClient } from '../lib/api';

export interface GovernancePolicy {
  id: string;
  organization: string;
  name: string;
  policy_type: string;
  description?: string;
  content: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
}

export interface ExplainabilityLog {
  id: string;
  organization: string;
  model_name: string;
  decision_type: string;
  rationale: Record<string, unknown>;
  created_at?: string;
}

export interface BiasScan {
  id: string;
  organization: string;
  name: string;
  status: string;
  results: Record<string, unknown>;
  created_at?: string;
}

export interface ModelVersion {
  id: string;
  organization: string;
  model_name: string;
  version: string;
  status: string;
  metrics: Record<string, unknown>;
  created_at?: string;
}

export interface HumanOverride {
  id: string;
  organization: string;
  target_type: string;
  target_id: string;
  action: string;
  reason?: string;
  created_at?: string;
}

export const governanceService = {
  listPolicies: async (orgId: string): Promise<GovernancePolicy[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/governance-policies/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as GovernancePolicy[];
  },

  listExplainabilityLogs: async (orgId: string): Promise<ExplainabilityLog[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/explainability-logs/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as ExplainabilityLog[];
  },

  listBiasScans: async (orgId: string): Promise<BiasScan[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/bias-scans/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as BiasScan[];
  },

  listModelVersions: async (orgId: string): Promise<ModelVersion[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/model-versions/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as ModelVersion[];
  },

  listOverrides: async (orgId: string): Promise<HumanOverride[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/human-overrides/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as HumanOverride[];
  },

  createPolicy: async (orgId: string, payload: Partial<GovernancePolicy>): Promise<GovernancePolicy> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/governance-policies/`, {
      organization: orgId,
      ...payload,
    });
    return data as GovernancePolicy;
  },

  createBiasScan: async (orgId: string, payload: Partial<BiasScan>): Promise<BiasScan> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/bias-scans/`, {
      organization: orgId,
      ...payload,
    });
    return data as BiasScan;
  },

  runBiasScan: async (orgId: string, scanId: string): Promise<BiasScan> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/bias-scans/${scanId}/run/`, {
      organization: orgId,
    });
    return data as BiasScan;
  },

  createModelVersion: async (orgId: string, payload: Partial<ModelVersion>): Promise<ModelVersion> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/model-versions/`, {
      organization: orgId,
      ...payload,
    });
    return data as ModelVersion;
  },

  rollbackModelVersion: async (orgId: string, modelVersionId: string): Promise<ModelVersion> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/model-versions/${modelVersionId}/rollback/`, {
      organization: orgId,
    });
    return data as ModelVersion;
  },

  createOverride: async (orgId: string, payload: Partial<HumanOverride>): Promise<HumanOverride> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/human-overrides/`, {
      organization: orgId,
      ...payload,
    });
    return data as HumanOverride;
  },
};

export default governanceService;
