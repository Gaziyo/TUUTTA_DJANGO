import axios from 'axios';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  '/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT access token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
