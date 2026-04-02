/**
 * Navegación lateral del dashboard para cuenta tipo organizador.
 *
 * - **Orden**: el array `ORGANIZER_NAV_SECTIONS` define secciones e ítems en el orden mostrado.
 * - **Permisos**: `permissionAction` opcional; si falta, el enlace se muestra a todo organizador
 *   con org activa (tras cargar `/permisos/mis`). Ver `usePermissions` y `ACTION_TO_PERM`.
 * - **Otros flags**: `paidOnly` (agente con plan), `superAdminOnly` (panel global).
 *
 * Para cambiar qué permiso exige un ítem, edita el `permissionAction` aquí y,
 * si hace falta, el mapeo en `shared/hooks/usePermissions.ts`.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  Users2,
  ShieldCheck,
  Settings,
  Trophy,
  Award,
  Medal,
  Sparkles,
  Shield,
  CreditCard,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  History,
  Wrench,
  FileText,
} from "lucide-react";
import type { PermissionAction } from "@/shared/hooks/usePermissions";

export type OrganizerNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Si está definido, `can(permissionAction)` debe ser true para mostrar el enlace. */
  permissionAction?: PermissionAction;
  paidOnly?: boolean;
  superAdminOnly?: boolean;
};

export type OrganizerNavSection = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: OrganizerNavItem[];
};

export const ORGANIZER_NAV_SECTIONS: OrganizerNavSection[] = [
  {
    key: "principal",
    label: "Principal",
    icon: LayoutDashboard,
    items: [{ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    key: "operaciones",
    label: "Operaciones",
    icon: CheckSquare,
    items: [
      { href: "/dashboard/events", icon: Calendar, label: "Eventos", permissionAction: "viewEvents" },
      { href: "/dashboard/tasks", icon: CheckSquare, label: "Tareas", permissionAction: "viewTasks" },
      { href: "/dashboard/volunteers", icon: Users, label: "Voluntarios", permissionAction: "viewMembers" },
      { href: "/dashboard/roles", icon: Shield, label: "Roles (plataforma)", superAdminOnly: true },
      { href: "/dashboard/teams", icon: Users2, label: "Equipos", permissionAction: "assignTasks" },
      { href: "/dashboard/staff", icon: UserCheck, label: "Miembros", permissionAction: "viewMembers" },
    ],
  },
  {
    key: "gamificacion",
    label: "Gamificación",
    icon: Trophy,
    items: [
      { href: "/dashboard/gamification", icon: Trophy, label: "Gamificación", permissionAction: "createEvents" },
      { href: "/dashboard/temporadas", icon: History, label: "Temporadas", permissionAction: "createEvents" },
      { href: "/dashboard/badges", icon: Medal, label: "Medallas", permissionAction: "createEvents" },
      { href: "/dashboard/certificates", icon: Award, label: "Certificados", permissionAction: "createEvents" },
      { href: "/dashboard/gamification-lab", icon: Sparkles, label: "Lab visual", permissionAction: "createEvents" },
    ],
  },
  {
    key: "inteligencia",
    label: "Inteligencia",
    icon: FileText,
    items: [
      { href: "/dashboard/reportes-dinamicos", icon: FileText, label: "Reporte Dinámico", permissionAction: "viewAnalytics" },
      { href: "/dashboard/ml-lab", icon: Wrench, label: "ML Lab", permissionAction: "viewAnalytics" },
      { href: "/dashboard/retrospectives", icon: RotateCcw, label: "Retroalimentac.", permissionAction: "viewAnalytics" },
      { href: "/dashboard/incidents", icon: AlertTriangle, label: "Incidentes", permissionAction: "viewAnalytics" },
    ],
  },
  {
    key: "administracion",
    label: "Administración",
    icon: ShieldCheck,
    items: [
      { href: "/dashboard/subscriptions", icon: CreditCard, label: "Suscripción", permissionAction: "managePlans" },
      { href: "/dashboard/audit", icon: ShieldCheck, label: "Auditoría", permissionAction: "viewAudit" },
      { href: "/dashboard/agent", icon: Sparkles, label: "Agente IA", paidOnly: true },
      { href: "/dashboard/settings", icon: Settings, label: "Configuración", permissionAction: "viewEvents" },
    ],
  },
];
