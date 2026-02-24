import type { UUID, Timestamps } from "./common.types";

export type UserRole = "owner" | "admin" | "staff" | "volunteer";
export type AuthProvider = "email" | "google" | "github";

export interface User {
  id: UUID;
  email: string;
  nombre: string;
  apellido?: string;
  avatar_url?: string;
  rol: UserRole;
  organizacion_id?: UUID;
  es_propietario?: boolean;
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: "bearer";
}

export interface OrgMembership extends Timestamps {
  id: UUID;
  usuario_id: UUID;
  organizacion_id: UUID;
  rol: UserRole;
  es_propietario: boolean;
  estado_membresia: "active" | "suspended" | "left";
  fecha_ingreso: string;
}
