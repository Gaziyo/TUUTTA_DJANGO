import { apiClient } from '../lib/api';
import type {
  CompetencyFramework,
  Competency,
  RoleCompetencyMapping,
  CompliancePolicy
} from '../types/lms';

const toTimestamp = (value?: string | null): number | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
};

export const competencyFrameworkService = {
  // Frameworks
  listFrameworks: async (orgId: string): Promise<CompetencyFramework[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/competency-frameworks/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results.map((row: any) => ({
      id: row.id,
      orgId,
      name: row.name,
      description: row.description || '',
      version: row.version || '',
      isActive: Boolean(row.is_active ?? row.isActive ?? true),
      createdAt: toTimestamp(row.created_at),
      updatedAt: toTimestamp(row.updated_at)
    }));
  },

  createFramework: async (orgId: string, payload: Partial<CompetencyFramework>): Promise<CompetencyFramework> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/competency-frameworks/`, {
      organization: orgId,
      name: payload.name,
      description: payload.description || '',
      version: payload.version || '',
      is_active: payload.isActive ?? true
    });
    return {
      id: data.id,
      orgId,
      name: data.name,
      description: data.description || '',
      version: data.version || '',
      isActive: Boolean(data.is_active ?? true),
      createdAt: toTimestamp(data.created_at),
      updatedAt: toTimestamp(data.updated_at)
    };
  },

  updateFramework: async (orgId: string, id: string, updates: Partial<CompetencyFramework>): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/competency-frameworks/${id}/`, {
      name: updates.name,
      description: updates.description,
      version: updates.version,
      is_active: updates.isActive
    });
  },

  deleteFramework: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/competency-frameworks/${id}/`);
  },

  // Competencies
  listCompetencies: async (orgId: string): Promise<Competency[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/competencies/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results.map((row: any) => ({
      id: row.id,
      orgId,
      frameworkId: row.framework || null,
      parentId: row.parent || null,
      name: row.name,
      description: row.description || '',
      level: row.level || 'novice',
      bloomLevelTarget: row.bloom_level_target ?? null,
      requiredModalities: row.required_modalities ?? [],
      thresholdScore: row.threshold_score ?? null,
      createdAt: toTimestamp(row.created_at),
      updatedAt: toTimestamp(row.updated_at)
    }));
  },

  createCompetency: async (orgId: string, payload: Partial<Competency>): Promise<Competency> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/competencies/`, {
      organization: orgId,
      framework: payload.frameworkId || null,
      parent: payload.parentId || null,
      name: payload.name,
      description: payload.description || '',
      level: payload.level || 'novice',
      bloom_level_target: payload.bloomLevelTarget ?? null,
      required_modalities: payload.requiredModalities ?? [],
      threshold_score: payload.thresholdScore ?? null
    });
    return {
      id: data.id,
      orgId,
      frameworkId: data.framework || null,
      parentId: data.parent || null,
      name: data.name,
      description: data.description || '',
      level: data.level || 'novice',
      bloomLevelTarget: data.bloom_level_target ?? null,
      requiredModalities: data.required_modalities ?? [],
      thresholdScore: data.threshold_score ?? null,
      createdAt: toTimestamp(data.created_at),
      updatedAt: toTimestamp(data.updated_at)
    };
  },

  updateCompetency: async (orgId: string, id: string, updates: Partial<Competency>): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/competencies/${id}/`, {
      framework: updates.frameworkId ?? null,
      parent: updates.parentId ?? null,
      name: updates.name,
      description: updates.description,
      level: updates.level,
      bloom_level_target: updates.bloomLevelTarget ?? null,
      required_modalities: updates.requiredModalities ?? [],
      threshold_score: updates.thresholdScore ?? null
    });
  },

  deleteCompetency: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/competencies/${id}/`);
  },

  // Role mappings
  listRoleMappings: async (orgId: string): Promise<RoleCompetencyMapping[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/role-competency-mappings/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results.map((row: any) => ({
      id: row.id,
      orgId,
      competencyId: row.competency,
      roleName: row.role_name,
      requiredLevel: row.required_level,
      isMandatory: Boolean(row.is_mandatory),
      priority: row.priority ?? (row.is_mandatory ? 'mandatory' : 'recommended'),
      createdAt: toTimestamp(row.created_at)
    }));
  },

  createRoleMapping: async (orgId: string, payload: Partial<RoleCompetencyMapping>): Promise<RoleCompetencyMapping> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/role-competency-mappings/`, {
      organization: orgId,
      competency: payload.competencyId,
      role_name: payload.roleName,
      required_level: payload.requiredLevel,
      is_mandatory: payload.isMandatory ?? (payload.priority ? payload.priority === 'mandatory' : true),
      priority: payload.priority ?? (payload.isMandatory === false ? 'recommended' : 'mandatory')
    });
    return {
      id: data.id,
      orgId,
      competencyId: data.competency,
      roleName: data.role_name,
      requiredLevel: data.required_level,
      isMandatory: Boolean(data.is_mandatory),
      priority: data.priority ?? (data.is_mandatory ? 'mandatory' : 'recommended'),
      createdAt: toTimestamp(data.created_at)
    };
  },

  updateRoleMapping: async (orgId: string, id: string, updates: Partial<RoleCompetencyMapping>): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/role-competency-mappings/${id}/`, {
      competency: updates.competencyId,
      role_name: updates.roleName,
      required_level: updates.requiredLevel,
      is_mandatory: updates.isMandatory ?? (updates.priority ? updates.priority === 'mandatory' : undefined),
      priority: updates.priority
    });
  },

  deleteRoleMapping: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/role-competency-mappings/${id}/`);
  },

  // Compliance policies
  listCompliancePolicies: async (orgId: string): Promise<CompliancePolicy[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/compliance-policies/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results.map((row: any) => ({
      id: row.id,
      orgId,
      name: row.name,
      description: row.description || '',
      regulation: row.regulation || 'custom',
      dueDays: row.due_days ?? 30,
      recurrenceDays: row.recurrence_days ?? null,
      penaltyDescription: row.penalty_description || '',
      linkedCourse: row.linked_course ?? null,
      linkedAssessment: row.linked_assessment ?? null,
      linkedCompetencyIds: row.linked_competencies ?? [],
      isActive: Boolean(row.is_active ?? true),
      createdAt: toTimestamp(row.created_at),
      updatedAt: toTimestamp(row.updated_at)
    }));
  },

  createCompliancePolicy: async (orgId: string, payload: Partial<CompliancePolicy>): Promise<CompliancePolicy> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/compliance-policies/`, {
      organization: orgId,
      name: payload.name,
      description: payload.description || '',
      regulation: payload.regulation || 'custom',
      due_days: payload.dueDays ?? 30,
      recurrence_days: payload.recurrenceDays ?? null,
      penalty_description: payload.penaltyDescription || '',
      linked_course: payload.linkedCourse ?? null,
      linked_assessment: payload.linkedAssessment ?? null,
      linked_competencies: payload.linkedCompetencyIds ?? [],
      is_active: payload.isActive ?? true
    });
    return {
      id: data.id,
      orgId,
      name: data.name,
      description: data.description || '',
      regulation: data.regulation || 'custom',
      dueDays: data.due_days ?? 30,
      recurrenceDays: data.recurrence_days ?? null,
      penaltyDescription: data.penalty_description || '',
      linkedCourse: data.linked_course ?? null,
      linkedAssessment: data.linked_assessment ?? null,
      linkedCompetencyIds: data.linked_competencies ?? [],
      isActive: Boolean(data.is_active ?? true),
      createdAt: toTimestamp(data.created_at),
      updatedAt: toTimestamp(data.updated_at)
    };
  },

  updateCompliancePolicy: async (orgId: string, id: string, updates: Partial<CompliancePolicy>): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/compliance-policies/${id}/`, {
      name: updates.name,
      description: updates.description,
      regulation: updates.regulation,
      due_days: updates.dueDays,
      recurrence_days: updates.recurrenceDays ?? null,
      penalty_description: updates.penaltyDescription,
      linked_course: updates.linkedCourse ?? null,
      linked_assessment: updates.linkedAssessment ?? null,
      linked_competencies: updates.linkedCompetencyIds ?? [],
      is_active: updates.isActive
    });
  },

  deleteCompliancePolicy: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/compliance-policies/${id}/`);
  }
};
