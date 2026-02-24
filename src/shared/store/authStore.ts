import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface UserUbicacion {
  lat?: number;
  lon?: number;
  ciudad?: string;
}

export type DisponibilidadEstado = "disponible" | "no_disponible" | "previo_consulta";

export interface UserPerfilExtra {
  /** Estado de disponibilidad (solo visible para miembros de organización) */
  disponibilidad_estado?: DisponibilidadEstado;
  preferencias?: string[];
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  is_active: boolean;
  rol?: "owner" | "admin" | "staff" | "volunteer";
  tipo?: "voluntario" | "organizador";
  is_super_admin?: boolean;
  avatar_url?: string;
  ubicacion?: UserUbicacion;
  perfil_extra?: UserPerfilExtra;
}

interface AuthState {
  token: string | null;
  user: User | null;
  activeOrgId: string | null;
  setAuth: (token: string, user: User) => void;
  setActiveOrg: (orgId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeOrgId: null,
      setAuth: (token, user) => set({ token, user }),
      setActiveOrg: (orgId) => set({ activeOrgId: orgId }),
      logout: () => set({ token: null, user: null, activeOrgId: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? sessionStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        activeOrgId: state.activeOrgId,
      }),
    }
  )
);
