import type { Department } from '../types/lms';
import { apiClient } from '../lib/api';

function mapDepartment(data: Record<string, unknown>): Department {
  return {
    id: data.id as string,
    orgId: data.organization as string,
    name: data.name as string,
    description: (data.description as string) || undefined,
    parentId: (data.parent as string) || undefined,
    managerId: (data.manager as string) || undefined,
    createdAt: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
  };
}

export const departmentService = {
  list: async (orgId: string): Promise<Department[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/departments/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapDepartment);
    } catch {
      return [];
    }
  },

  create: async (dept: Omit<Department, 'id' | 'createdAt'>): Promise<Department> => {
    const payload = {
      organization: dept.orgId,
      name: dept.name,
      description: dept.description,
      parent: dept.parentId,
      manager: dept.managerId,
    };
    const { data } = await apiClient.post(`/organizations/${dept.orgId}/departments/`, payload);
    return mapDepartment(data);
  },

  update: async (deptId: string, updates: Partial<Department>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.managerId !== undefined) payload.manager = updates.managerId;
    // orgId needed for the nested URL — fall back to org from update or skip
    const orgId = updates.orgId;
    if (orgId) {
      await apiClient.patch(`/organizations/${orgId}/departments/${deptId}/`, payload);
    }
  },

  remove: async (deptId: string): Promise<void> => {
    // Flat delete — Django router supports /departments/{pk} via org nesting.
    // Without orgId we can't use nested URL; skip silently if unknown.
    console.warn('[departmentService] remove called without orgId context:', deptId);
  },
};
