import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

// ─ Types ──────────────────────────────────────────────────────────────────
export interface StaffMember {
  id: UUID;
  usuario_id: UUID;
  organizacion_id: UUID;
  rol: "owner" | "admin" | "coordinador" | "organizador" | "staff" | "volunteer";
  nombre?: string;
  email?: string;
  es_propietario: boolean;
  /** Backend: activo | suspendido | retirado (también acepta legacy EN) */
  estado_membresia: "activo" | "suspendido" | "retirado" | "active" | "suspended" | "left";
  fecha_ingreso: string;
  rol_slug?: string;
}

export interface InviteMemberData {
  email: string;
  rol_slug?: "organizador" | "voluntario";
  rol?: "organizador" | "voluntario"; // legacy, se mapea a rol_slug
  es_propietario?: boolean;
}

export interface UpdateMemberData {
  rol_slug?: "organizador" | "voluntario";
  rol?: "organizador" | "voluntario";
  estado_membresia?: "activo" | "suspendido" | "active" | "suspended";
}

const MEMBERSHIP_STATUS_MAP: Record<string, StaffMember["estado_membresia"]> = {
  active: "activo",
  suspended: "suspendido",
  left: "retirado",
  activo: "activo",
  suspendido: "suspendido",
  retirado: "retirado",
};

// ─ API ────────────────────────────────────────────────────────────────────
export const staffApi = {
  list: async (orgId: UUID): Promise<StaffMember[]> => {
    const { data } = await apiClient.get<(StaffMember & { rol_slug?: string })[]>(EP.ORG_MEMBERS(orgId));
    return data.map((m) => staffApi.normalizeMember(m));
  },

  invite: async (orgId: UUID, payload: InviteMemberData): Promise<StaffMember> => {
    const rol_slug = payload.rol_slug ?? (payload.rol === "organizador" ? "organizador" : "voluntario");
    const { data } = await apiClient.post<StaffMember>(EP.ORG_MEMBERS(orgId), {
      email: payload.email,
      rol_slug,
      es_propietario: payload.es_propietario ?? false,
    });
    return staffApi.normalizeMember(data);
  },
  normalizeMember: (m: StaffMember & { rol_slug?: string; usuario_nombre?: string; usuario_email?: string }): StaffMember => {
    const rawRol = m.es_propietario ? "owner" : (m.rol_slug ?? m.rol ?? "volunteer");
    const rol =
      rawRol === "voluntario"
        ? "volunteer"
        : (rawRol as StaffMember["rol"]);
    const rawStatus = (m.estado_membresia || "activo").toLowerCase();
    const estado_membresia = MEMBERSHIP_STATUS_MAP[rawStatus] ?? "activo";
    return {
      ...m,
      rol,
      estado_membresia,
      nombre: m.nombre ?? m.usuario_nombre,
      email: m.email ?? m.usuario_email,
    } as StaffMember;
  },

  update: async (orgId: UUID, userId: UUID, payload: UpdateMemberData): Promise<StaffMember> => {
    const body = payload.rol_slug
      ? { rol_slug: payload.rol_slug }
      : payload;
    const { data } = await apiClient.patch<StaffMember & { rol_slug?: string }>(EP.ORG_MEMBER(orgId, userId), body);
    return staffApi.normalizeMember(data);
  },

  remove: async (orgId: UUID, userId: UUID): Promise<void> => {
    await apiClient.delete(EP.ORG_MEMBER(orgId, userId));
  },
};
