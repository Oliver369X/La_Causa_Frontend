"use client";
import { useCallback, useEffect, useState } from "react";
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

/** Permisos que habilitan la experiencia de gestión de la organización. */
const MANAGEMENT_CAPABILITY_PERMS = [
  "create_events",
  "edit_events",
  "delete_events",
  "assign_tasks",
  "manage_members",
  "edit_org",
  "manage_plans",
] as const;

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
 * Permisos desde GET /permisos/mis (rol y permisos efectivos por organización).
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [esPropietario, setEsPropietario] = useState(false);
  const [rolSlug, setRolSlug] = useState<string | null>(null);
  const [puedeGestionar, setPuedeGestionar] = useState(false);
  const [permisosLoaded, setPermisosLoaded] = useState(false);

  const isSuperAdmin = Boolean(user?.is_super_admin);
  const isOrganizerAccount = user?.tipo === "organizador";

  const loadPermisos = useCallback(() => {
    if (!activeOrgId || !user) {
      setPermisos([]);
      setEsPropietario(false);
      setRolSlug(null);
      setPuedeGestionar(false);
      setPermisosLoaded(false);
      return;
    }
    setPermisosLoaded(false);
    permisosApi
      .getMis(activeOrgId)
      .then((ctx) => {
        setPermisos(ctx.permisos);
        setEsPropietario(ctx.esPropietario);
        setRolSlug(ctx.rolSlug);
        setPuedeGestionar(ctx.puedeGestionar);
      })
      .catch(() => {
        setPermisos([]);
        setEsPropietario(false);
        setRolSlug(null);
        setPuedeGestionar(false);
      })
      .finally(() => setPermisosLoaded(true));
  }, [activeOrgId, user]);

  useEffect(() => {
    loadPermisos();
  }, [loadPermisos]);

  useEffect(() => {
    const onFocus = () => loadPermisos();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadPermisos]);

  const canManageOrg =
    puedeGestionar ||
    esPropietario ||
    MANAGEMENT_CAPABILITY_PERMS.some((p) => permisos.includes(p));

  /**
   * Experiencia de voluntario: menú y pantallas de participante.
   * Un voluntario promovido a organizador/coordinador en la org activa deja de serlo.
   */
  const isVolunteerExperience = (() => {
    if (isSuperAdmin) return false;
    if (isOrganizerAccount) return false;
    if (!activeOrgId) return user?.tipo === "voluntario";
    if (!permisosLoaded) return user?.tipo === "voluntario";
    return !canManageOrg;
  })();

  const can = (action: PermissionAction): boolean => {
    if (isSuperAdmin) return true;
    if (!permisosLoaded) return false;
    const required = ACTION_TO_PERM[action];
    if (!required?.length) return false;
    if (esPropietario && action !== "manageTenants" && action !== "manageRoles") {
      return true;
    }
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
    /** Rol principal en la org activa (organizador, coordinador, admin, voluntario). */
    rolSlug,
    /** Puede operar la gestión de la org activa (eventos, miembros, etc.). */
    canManageOrg,
    /** Menú/pantallas de voluntario vs gestión de organización. */
    isVolunteerExperience,
    refreshPermisos: loadPermisos,
  } as const;
}
