import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get('/auth/me/');
      return data;
    },
    enabled: !!localStorage.getItem('accessToken'),
    retry: false,
  });
}
