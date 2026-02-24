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
  estado_membresia: "active" | "suspended" | "left";
  fecha_ingreso: string;
  rol_slug?: string;
}

export interface InviteMemberData {
  email: string;
  rol_slug?: "admin" | "coordinador" | "organizador";
  rol?: "admin" | "staff" | "organizador"; // legacy, se mapea a rol_slug
  es_propietario?: boolean;
}

export interface UpdateMemberData {
  rol?: "admin" | "staff" | "volunteer";
  estado_membresia?: "active" | "suspended";
}

// ─ API ────────────────────────────────────────────────────────────────────
export const staffApi = {
  list: async (orgId: UUID): Promise<StaffMember[]> => {
    const { data } = await apiClient.get<(StaffMember & { rol_slug?: string })[]>(EP.ORG_MEMBERS(orgId));
    return data.map((m) => staffApi.normalizeMember(m));
  },

  invite: async (orgId: UUID, payload: InviteMemberData): Promise<StaffMember> => {
    const rol_slug = payload.rol_slug ?? (payload.rol === "admin" ? "admin" : payload.rol === "organizador" ? "organizador" : "organizador");
    const { data } = await apiClient.post<StaffMember>(EP.ORG_MEMBERS(orgId), {
      email: payload.email,
      rol_slug,
      es_propietario: payload.es_propietario ?? false,
    });
    return staffApi.normalizeMember(data);
  },
  normalizeMember: (m: StaffMember & { rol_slug?: string; usuario_nombre?: string; usuario_email?: string }): StaffMember => {
    const rol = m.es_propietario ? "owner" : (m.rol_slug ?? m.rol ?? "volunteer");
    return {
      ...m,
      rol,
      nombre: m.nombre ?? m.usuario_nombre,
      email: m.email ?? m.usuario_email,
    } as StaffMember;
  },

  update: async (orgId: UUID, userId: UUID, payload: UpdateMemberData): Promise<StaffMember> => {
    const { data } = await apiClient.patch<StaffMember>(EP.ORG_MEMBER(orgId, userId), payload);
    return data;
  },

  remove: async (orgId: UUID, userId: UUID): Promise<void> => {
    await apiClient.delete(EP.ORG_MEMBER(orgId, userId));
  },
};
