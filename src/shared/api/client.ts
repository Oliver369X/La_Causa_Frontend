import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { clearAuthSessionCookie } from '../auth/sessionCookie';
import { API_BASE_URL } from '../config/env';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el token
apiClient.interceptors.request.use(
  (config) => {
    const { token, activeOrgId } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (activeOrgId) {
      config.headers["X-Org-Id"] = activeOrgId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores (ej. 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Si el error llegó desde el endpoint de login, no redirigir —
      // dejar que el formulario muestre el mensaje de error al usuario.
      const requestUrl: string = error.config?.url ?? '';
      const isLoginAttempt = requestUrl.includes('/auth/login');
      if (!isLoginAttempt) {
        // Token expirado o inválido en otra ruta — limpiar sesión y redirigir
        useAuthStore.getState().logout();
        clearAuthSessionCookie();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
