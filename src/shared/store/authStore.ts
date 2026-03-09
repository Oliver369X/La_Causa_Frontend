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
  organizer_onboarding_v1?: {
    started_at?: string;
    completed_at?: string;
    steps?: {
      welcome_seen?: boolean;
      profile_seen?: boolean;
      team_seen?: boolean;
      event_seen?: boolean;
      task_seen?: boolean;
    };
  };
  [key: string]: unknown;
}

export interface VolunteerOnboardingState {
  welcomeSeen?: boolean;
  platformSeen?: boolean;
  orgExplorerSeen?: boolean;
  completedAt?: string | null;
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
  bio?: string;
  ubicacion?: UserUbicacion;
  perfil_extra?: UserPerfilExtra;
}

interface AuthState {
  token: string | null;
  user: User | null;
  activeOrgId: string | null;
  volunteerOnboarding: VolunteerOnboardingState;
  setAuth: (token: string, user: User) => void;
  setActiveOrg: (orgId: string) => void;
  updateVolunteerOnboarding: (patch: Partial<VolunteerOnboardingState>) => void;
  resetVolunteerOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeOrgId: null,
      volunteerOnboarding: {},
      setAuth: (token, user) => set({ token, user }),
      setActiveOrg: (orgId) => set({ activeOrgId: orgId }),
      updateVolunteerOnboarding: (patch) =>
        set((state) => ({
          volunteerOnboarding: {
            ...state.volunteerOnboarding,
            ...patch,
          },
        })),
      resetVolunteerOnboarding: () => set({ volunteerOnboarding: {} }),
      logout: () => set({ token: null, user: null, activeOrgId: null, volunteerOnboarding: {} }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
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
        volunteerOnboarding: state.volunteerOnboarding,
      }),
    }
  )
);
