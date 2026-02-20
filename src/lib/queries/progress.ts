import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

export function useProgress() {
  return useQuery({
    queryKey: ['progress'],
    queryFn: async () => {
      const { data } = await apiClient.get('/progress/');
      return data;
    },
  });
}

export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: ['progress', 'course', courseId],
    queryFn: async () => {
      const { data } = await apiClient.get('/progress/', { params: { course: courseId } });
      return data;
    },
    enabled: !!courseId,
  });
}
