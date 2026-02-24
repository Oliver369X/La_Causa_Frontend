import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  tipo: "voluntario" | "organizador";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  is_active: boolean;
  tipo?: "voluntario" | "organizador";
  is_super_admin?: boolean;
}

interface BackendUserResponse {
  id: string;
  email: string;
  nombre: string;
  estado: boolean;
  tipo?: string;
  is_super_admin?: boolean;
}

function toUserProfile(user: BackendUserResponse): UserProfile {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    is_active: user.estado,
    tipo: user.tipo as "voluntario" | "organizador" | undefined,
    is_super_admin: user.is_super_admin ?? false,
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", credentials);
    return data;
  },

  register: async (userData: RegisterData): Promise<UserProfile> => {
    const { data } = await apiClient.post<BackendUserResponse>("/auth/register", userData);
    return toUserProfile(data);
  },

  me: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<BackendUserResponse>("/auth/me");
    return toUserProfile(data);
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post(EP.AUTH_FORGOT_PASSWORD, { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post(EP.AUTH_RESET_PASSWORD, { token, new_password: newPassword });
  },
};
