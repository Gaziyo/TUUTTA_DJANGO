import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

export function useAssessments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['assessments', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/assessments/', { params: filters });
      return data;
    },
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: ['assessments', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/assessments/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assessmentData: Record<string, unknown>) => {
      const { data } = await apiClient.post('/assessments/', assessmentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}
