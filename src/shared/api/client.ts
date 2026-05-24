import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { clearAuthSessionCookie } from '../auth/sessionCookie';
import { API_BASE_URL } from '../config/env';

/**
 * Cuando está activo, un 401 en rutas posteriores al login NO limpia la sesión
 * ni recarga la página. Evita falsos positivos durante el bootstrap (token ya
 * emitido pero otra llamada paralela llega sin Bearer o hay latencia/retraso).
 */
let suspend401SessionRedirectDepth = 0;

/** Retorna `release`; llamar sí o sí para reactivar el redirect (p. ej. en `finally`). */
export function suspend401SessionRedirect(): () => void {
  suspend401SessionRedirectDepth += 1;
  return () => {
    suspend401SessionRedirectDepth -= 1;
    if (suspend401SessionRedirectDepth < 0) {
      suspend401SessionRedirectDepth = 0;
    }
  };
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el token y corregir multipart (FormData)
apiClient.interceptors.request.use(
  (config) => {
    const { token, activeOrgId } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (activeOrgId) {
      config.headers["X-Org-Id"] = activeOrgId;
    }
    // FormData: el boundary lo define el navegador; application/json rompe POST /uploads/*
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.headers.delete("Content-Type");
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
      if (suspend401SessionRedirectDepth > 0 || isLoginAttempt) {
        return Promise.reject(error);
      }
      // Token expirado o inválido en otra ruta — limpiar sesión y redirigir
      useAuthStore.getState().logout();
      clearAuthSessionCookie();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
