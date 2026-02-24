"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, CheckSquare, Users, Users2,
  ShieldCheck, Settings, LogOut, Building2, Sparkles, X,
  Sun, Moon, Menu, Trophy, Award, Medal, Shield, CreditCard,
  UserCheck, RotateCcw, AlertTriangle, History, Wrench, ChevronDown,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { agentApi } from "@/features/agent/api/agentApi";
import { useAuthStore } from "@/shared/store/authStore";
import { useTheme } from "@/shared/store/themeStore";
import { cn } from "@/shared/utils/utils";
import { useState } from "react";
import { clearAuthSessionCookie } from "@/shared/auth/sessionCookie";
import { NotificationBell } from "@/features/communications/components/NotificationBell";

const organizerNavItemsBase = [
  // ── Core ─────────────────────────────────────────────────────────────
  { href: "/dashboard",                  icon: LayoutDashboard, label: "Dashboard"       },
  { href: "/dashboard/events",           icon: Calendar,        label: "Eventos"         },
  { href: "/dashboard/tasks",            icon: CheckSquare,     label: "Tareas"          },
  { href: "/dashboard/volunteers",       icon: Users,           label: "Voluntarios"     },
  // ── People ───────────────────────────────────────────────────────────
  { href: "/dashboard/roles",            icon: Shield,          label: "Roles", superAdminOnly: true },
  { href: "/dashboard/teams",            icon: Users2,          label: "Equipos"         },
  { href: "/dashboard/staff",            icon: UserCheck,       label: "Staff"           },
  // ── Engagement ───────────────────────────────────────────────────────
  { href: "/dashboard/gamification",     icon: Trophy,          label: "Gamificación"    },
  { href: "/dashboard/certificates",     icon: Award,           label: "Certificados"    },
  { href: "/dashboard/badges",           icon: Medal,          label: "Medallas"        },
  // ── Intelligence ─────────────────────────────────────────────────────
  { href: "/dashboard/reportes-dinamicos", icon: FileText,       label: "Reporte Dinámico" },
  { href: "/dashboard/ml-lab",            icon: Wrench,         label: "ML Lab"          },
  { href: "/dashboard/retrospectives",   icon: RotateCcw,       label: "Retroalimentac." },
  { href: "/dashboard/incidents",        icon: AlertTriangle,   label: "Incidentes"      },
  // ── Platform ─────────────────────────────────────────────────────────
  { href: "/dashboard/subscriptions",    icon: CreditCard,      label: "Suscripción"     },
  { href: "/dashboard/audit",            icon: ShieldCheck,     label: "Auditoría"       },
  { href: "/dashboard/agent",            icon: Sparkles,        label: "Agente IA", paidOnly: true },
  { href: "/dashboard/settings",         icon: Settings,        label: "Configuración"   },
];

const volunteerNavItems = [
  { href: "/dashboard",                icon: LayoutDashboard, label: "Dashboard"      },
  { href: "/dashboard/organizaciones", icon: Building2,       label: "Explorar orgs" },
  { href: "/dashboard/events",        icon: Calendar,        label: "Eventos"       },
  { href: "/dashboard/tasks",         icon: CheckSquare,     label: "Mis Tareas"    },
  { href: "/dashboard/gamification",  icon: Trophy,          label: "Gamificación"   },
  { href: "/dashboard/temporadas",   icon: History,         label: "Temporadas"     },
  { href: "/dashboard/certificates",  icon: Award,           label: "Certificados"  },
  // Agente IA solo para organizaciones con plan de pago — no para voluntarios
  { href: "/dashboard/settings",     icon: Settings,        label: "Mi Perfil"     },
];

/* ─── Inner sidebar content ───────────────────────────────────────────── */
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, toggle } = useTheme();
  const { user, logout, activeOrgId, setActiveOrg } = useAuthStore();
  const isVolunteer = user?.tipo === "voluntario";
  const canSeeGlobalAdmin = Boolean(user?.is_super_admin);

  const { data: agentAccess } = useQuery({
    queryKey: ["agent-access", activeOrgId],
    queryFn: () => agentApi.getAccess(activeOrgId ?? null),
    enabled: !!activeOrgId && !isVolunteer,
  });
  const agentCanUse = agentAccess?.can_use ?? false;

  const organizerNavFiltered = organizerNavItemsBase.filter((item) => {
    const i = item as { superAdminOnly?: boolean; paidOnly?: boolean };
    if (i.superAdminOnly && !canSeeGlobalAdmin) return false;
    if (i.paidOnly && !agentCanUse) return false;
    return true;
  });

  const navBase = isVolunteer ? volunteerNavItems : organizerNavFiltered;
  const showAgentQuickAccess = !isVolunteer && agentCanUse;
  const navItemsResolved = canSeeGlobalAdmin
    ? [...navBase, { href: "/dashboard/admin", icon: ShieldCheck, label: "Admin SaaS" }]
    : navBase;

  const { data: volunteerOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: !!user?.id && isVolunteer,
  });

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const selectedOrg = volunteerOrgs.find((o) => o.id === activeOrgId);

  const handleLogout = () => {
    logout();
    clearAuthSessionCookie();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full"
         style={{ background: "var(--bg-subtle)", borderRight: "1px solid var(--border)" }}>

      {/* Logo */}
      <div className="p-5 flex items-center justify-between"
           style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm" onClick={onClose}>
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 inline-block shrink-0" />
          La Causa AI
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Org / Perfil badge */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {isVolunteer && volunteerOrgs.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
                <Building2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Organización</p>
                <p className="text-sm font-medium truncate">
                  {selectedOrg?.nombre ?? "Seleccionar..."}
                </p>
              </div>
              <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", orgDropdownOpen && "rotate-180")} style={{ color: "var(--text-muted)" }} />
            </button>
            {orgDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOrgDropdownOpen(false)} aria-hidden />
                <div
                  className="absolute left-0 right-0 top-full mt-1 py-1 rounded-xl z-50 max-h-48 overflow-y-auto"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}
                >
                  {volunteerOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setActiveOrg(org.id);
                        setOrgDropdownOpen(false);
                        onClose?.();
                        if (pathname === "/dashboard/organizaciones") {
                          router.push(`/dashboard/organizaciones/${org.id}`);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:opacity-80"
                      style={{
                        background: activeOrgId === org.id ? "var(--accent-soft)" : "transparent",
                        color: "var(--text)",
                      }}
                    >
                      {org.nombre}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
               style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: "var(--accent-soft)" }}>
              {isVolunteer ? (
                <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
              ) : (
                <Building2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {isVolunteer ? "Voluntario" : "Organización"}
              </p>
              <p className="text-sm font-medium truncate">
                {isVolunteer ? "Mi Perfil" : "Mi Organización"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-0.5">
        {navItemsResolved.map((item) => {
          const exact    = item.href === "/dashboard";
          const isActive = exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all")}
              style={{
                background: isActive ? "var(--bg-card)"  : "transparent",
                color:      isActive ? "var(--text)"     : "var(--text-muted)",
                border:     isActive ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              <item.icon className="w-4 h-4 shrink-0"
                style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Agent quick-access — solo para organizadores (no voluntarios) */}
      {showAgentQuickAccess && (
        <div className="px-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", paddingBottom: "0.5rem" }}>
          <Link
            href="/dashboard/agent"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}
          >
            <Sparkles className="w-4 h-4" />
            Agente IA
          </Link>
        </div>
      )}

      {/* Theme + user */}
      <div className="p-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={toggle}
          data-testid="sidebar-theme-toggle"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nombre ?? "Usuario"}</p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user?.email ?? ""}</p>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión"
                  className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile top-bar ─────────────────────────────────────────────────── */
export function MobileTopBar({ onOpen }: { onOpen: () => void }) {
  return (
    <header
      className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14"
      style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}
    >
      <button onClick={onOpen} className="p-2" data-testid="sidebar-open">
        <Menu className="w-5 h-5" />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sm">
        <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 inline-block" />
        La Causa AI
      </Link>
      <NotificationBell />
    </header>
  );
}

/* ─── Main export ────────────────────────────────────────────────────── */
export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 z-40">
        <SidebarContent />
      </aside>
      {/* Mobile trigger */}
      <MobileTopBar onOpen={() => setMobileOpen(true)} />
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="relative w-72 h-full z-10" onClick={(e) => e.stopPropagation()}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6" style={{ borderBottom: "1px solid var(--border)" }}>
      <h1 className="text-base font-semibold">{title}</h1>
      <NotificationBell />
    </header>
  );
}
