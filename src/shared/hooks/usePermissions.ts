"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { permisosApi } from "@/features/permisos/api/permisosApi";
import type { UserRole } from "@/shared/types/user.types";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner:     4,
  admin:     3,
  staff:     2,
  volunteer: 1,
};

/** Mapeo: acción frontend -> permiso(s) en backend (snake_case) */
const ACTION_TO_PERM: Record<PermissionAction, string[]> = {
  manageRoles:   ["manage_roles"],
  manageMembers: ["manage_members"],
  /** Ver listado de miembros (directiva, coordinación, etc.); invitar sigue siendo manageMembers */
  viewMembers:   ["view_members", "manage_members"],
  editOrg:       ["edit_org"],
  viewAudit:     ["view_audit"],
  createEvents:  ["create_events"],
  assignTasks:   ["assign_tasks"],
  viewAnalytics: ["view_analytics"],
  managePlans:   ["manage_plans"],
  manageTenants: ["manage_tenants"],
};

const PERMISSION_MAP: Record<PermissionAction, (r: UserRole) => boolean> = {
  manageRoles:    (r) => r === "owner" || r === "admin",
  manageMembers:  (r) => r === "owner" || r === "admin",
  viewMembers:    (r) => r !== "volunteer",
  editOrg:        (r) => r === "owner",
  viewAudit:      (r) => r === "owner" || r === "admin",
  createEvents:   (r) => r !== "volunteer",
  assignTasks:    (r) => r !== "volunteer",
  viewAnalytics:  (r) => r !== "volunteer",
  managePlans:    (r) => r === "owner" || r === "admin",
  manageTenants:  () => false,
};

type PermissionAction =
  | "manageRoles"
  | "manageMembers"
  | "viewMembers"
  | "editOrg"
  | "viewAudit"
  | "createEvents"
  | "assignTasks"
  | "viewAnalytics"
  | "managePlans"
  | "manageTenants";

/**
 * Permisos basados en el backend (GET /permisos/mis) cuando hay org activa.
 * Fallback a rol cuando no hay permisos cargados.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [permisosLoaded, setPermisosLoaded] = useState(false);

  const isSuperAdmin = Boolean(user?.is_super_admin);
  const fallbackRole: UserRole = user?.tipo === "organizador" ? "owner" : "volunteer";
  const role = (user?.rol as UserRole | undefined) ?? fallbackRole;

  useEffect(() => {
    if (!activeOrgId || !user) {
      setPermisos([]);
      setPermisosLoaded(false);
      return;
    }
    setPermisosLoaded(false);
    permisosApi.getMis(activeOrgId)
      .then(setPermisos)
      .catch(() => setPermisos([]))
      .finally(() => setPermisosLoaded(true));
  }, [activeOrgId, user?.id]);

  const isAtLeast = (minimum: UserRole) =>
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];

  const can = (action: PermissionAction): boolean => {
    if (isSuperAdmin) return true;
    if (permisosLoaded && permisos.length > 0) {
      const required = ACTION_TO_PERM[action];
      if (required) return required.some((p) => permisos.includes(p));
    }
    return PERMISSION_MAP[action]?.(role) ?? false;
  };

  return { role, isAtLeast, can, isOwner: role === "owner", isSuperAdmin, permisos } as const;
}
