import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/organizations/');
      return data;
    },
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useOrganizationMembers(orgId: string) {
  return useQuery({
    queryKey: ['organizations', orgId, 'members'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${orgId}/members/`);
      return data;
    },
    enabled: !!orgId,
  });
}

export function useDepartments(orgId: string) {
  return useQuery({
    queryKey: ['organizations', orgId, 'departments'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${orgId}/departments/`);
      return data;
    },
    enabled: !!orgId,
  });
}

export function useTeams(orgId: string) {
  return useQuery({
    queryKey: ['organizations', orgId, 'teams'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${orgId}/teams/`);
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orgData: Record<string, unknown>) => {
      const { data } = await apiClient.post('/organizations/', orgData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
