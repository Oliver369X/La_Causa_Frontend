"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { permisosApi } from "@/features/permisos/api/permisosApi";

/**
 * Mapeo acción UI → slugs de permiso en backend (snake_case).
 * Debe coincidir con `rol.permisos` y con ORG_FULL_PERMISSIONS / MANAGEMENT_CAPABILITY_PERMS en el servidor.
 */
const ACTION_TO_PERM: Record<PermissionAction, string[]> = {
  manageRoles:   ["manage_roles"],
  manageMembers: ["manage_members"],
  viewMembers:   ["view_members", "manage_members"],
  /** Ver eventos (listado / calendario) */
  viewEvents:    ["view_events", "create_events"],
  /** Ver y operar tareas */
  viewTasks:     ["view_tasks", "assign_tasks"],
  editOrg:       ["edit_org"],
  viewAudit:     ["view_audit"],
  createEvents:  ["create_events"],
  assignTasks:   ["assign_tasks"],
  viewAnalytics: ["view_analytics"],
  managePlans:   ["manage_plans"],
  manageTenants: ["manage_tenants"],
};

export type PermissionAction =
  | "manageRoles"
  | "manageMembers"
  | "viewMembers"
  | "viewEvents"
  | "viewTasks"
  | "editOrg"
  | "viewAudit"
  | "createEvents"
  | "assignTasks"
  | "viewAnalytics"
  | "managePlans"
  | "manageTenants";

/**
 * Permisos solo desde GET /permisos/mis (sin fallback por tipo/rol).
 * Hasta que cargue, can() es false (salvo super-admin).
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [esPropietario, setEsPropietario] = useState(false);
  const [permisosLoaded, setPermisosLoaded] = useState(false);

  const isSuperAdmin = Boolean(user?.is_super_admin);

  useEffect(() => {
    if (!activeOrgId || !user) {
      setPermisos([]);
      setEsPropietario(false);
      setPermisosLoaded(false);
      return;
    }
    setPermisosLoaded(false);
    permisosApi
      .getMis(activeOrgId)
      .then((ctx) => {
        setPermisos(ctx.permisos);
        setEsPropietario(ctx.esPropietario);
      })
      .catch(() => {
        setPermisos([]);
        setEsPropietario(false);
      })
      .finally(() => setPermisosLoaded(true));
  }, [activeOrgId, user?.id]);

  const can = (action: PermissionAction): boolean => {
    if (isSuperAdmin) return true;
    if (!permisosLoaded) return false;
    const required = ACTION_TO_PERM[action];
    if (!required?.length) return false;
    return required.some((p) => permisos.includes(p));
  };

  return {
    can,
    isSuperAdmin,
    permisos,
    permisosLoaded,
    /** Propietario de la organización activa (según backend). */
    isOwner: esPropietario,
    esPropietario,
  } as const;
}
