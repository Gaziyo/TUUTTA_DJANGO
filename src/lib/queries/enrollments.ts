import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

export function useEnrollments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['enrollments', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/enrollments/', { params: filters });
      return data;
    },
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentData: Record<string, unknown>) => {
      const { data } = await apiClient.post('/enrollments/', enrollmentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}
