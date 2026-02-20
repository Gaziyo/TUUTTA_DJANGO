import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

export function useCourses(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/courses/', { params: filters });
      return data;
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/courses/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseData: Record<string, unknown>) => {
      const { data } = await apiClient.post('/courses/', courseData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data } = await apiClient.patch(`/courses/${id}/`, updates);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['courses', id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/courses/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function usePublishCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await apiClient.post(`/courses/${courseId}/publish/`);
      return data;
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
    },
  });
}

export function useCourseModules(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId, 'modules'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/courses/${courseId}/modules/`);
      return data;
    },
    enabled: !!courseId,
  });
}
