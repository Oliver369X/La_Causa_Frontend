"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  LogOut,
  Building2,
  Sparkles,
  X,
  Sun,
  Moon,
  Menu,
  ShieldCheck,
  ChevronDown,
  Trophy,
  Award,
  History,
  Settings,
  FileText,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { agentApi } from "@/features/agent/api/agentApi";
import { useAuthStore } from "@/shared/store/authStore";
import { useTheme } from "@/shared/store/themeStore";
import { cn } from "@/shared/utils/utils";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { clearAuthSessionCookie } from "@/shared/auth/sessionCookie";
import { NotificationBell } from "@/features/communications/components/NotificationBell";
import { usePermissions, type PermissionAction } from "@/shared/hooks/usePermissions";
import { ORGANIZER_NAV_SECTIONS } from "@/shared/config/organizerNavConfig";
import { useSidebarLayoutStore } from "@/shared/store/sidebarLayoutStore";
import { OrgLogoBox } from "@/shared/ui/OrgLogoBox";

const volunteerNavItemsBase = [
  { href: "/dashboard",                icon: LayoutDashboard, label: "Dashboard"      },
  { href: "/dashboard/organizaciones", icon: Building2,       label: "Explorar orgs" },
  { href: "/dashboard/events",        icon: Calendar,        label: "Eventos"       },
  { href: "/dashboard/tasks",         icon: CheckSquare,     label: "Mis Tareas"    },
  { href: "/dashboard/gamification",  icon: Trophy,          label: "Gamificación"   },
  { href: "/dashboard/temporadas",     icon: History,         label: "Temporadas"    },
  { href: "/dashboard/certificates",  icon: Award,           label: "Certificados"  },
  { href: "/dashboard/manuales",     icon: FileText,        label: "Manuales"      },
  { href: "/dashboard/settings",     icon: Settings,        label: "Mi Perfil"     },
];

/* ─── Inner sidebar content ───────────────────────────────────────────── */
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, toggle } = useTheme();
  const { user, logout, activeOrgId, setActiveOrg } = useAuthStore();
  const setCollapsed = useSidebarLayoutStore((s) => s.setCollapsed);
  const { can } = usePermissions();
  const isVolunteer = user?.tipo === "voluntario";
  const canSeeGlobalAdmin = Boolean(user?.is_super_admin);

  const { data: agentAccess } = useQuery({
    queryKey: ["agent-access", activeOrgId],
    queryFn: () => agentApi.getAccess(activeOrgId ?? null),
    enabled: !!activeOrgId && !isVolunteer,
  });
  const agentCanUse = agentAccess?.can_use ?? false;

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setCollapsedSections((s) => ({ ...s, [key]: !s[key] }));

  const filterOrganizerItems = (items: (typeof ORGANIZER_NAV_SECTIONS)[0]["items"]) =>
    items.filter((item) => {
      const i = item as { superAdminOnly?: boolean; paidOnly?: boolean; permissionAction?: PermissionAction };
      if (i.superAdminOnly && !canSeeGlobalAdmin) return false;
      if (i.paidOnly && !agentCanUse) return false;
      if (i.permissionAction && !can(i.permissionAction)) return false;
      return true;
    });

  const navBase = isVolunteer ? volunteerNavItemsBase : null;
  const showAgentQuickAccess = !isVolunteer && agentCanUse;

  const { data: volunteerOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: !!user?.id && isVolunteer,
  });
  const { data: managedOrgs = [] } = useQuery({
    queryKey: ["orgs-managed"],
    queryFn: () => organizationsApi.list(),
    enabled: !!user?.id && !isVolunteer,
  });

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const selectedOrg = (isVolunteer ? volunteerOrgs : managedOrgs).find((o) => o.id === activeOrgId);

  useEffect(() => {
    if (activeOrgId || !user?.id) return;
    const fallbackOrg = isVolunteer ? volunteerOrgs[0] : managedOrgs[0];
    if (fallbackOrg) {
      setActiveOrg(fallbackOrg.id);
    }
  }, [activeOrgId, isVolunteer, managedOrgs, setActiveOrg, user?.id, volunteerOrgs]);

  const handleLogout = () => {
    logout();
    clearAuthSessionCookie();
    router.push("/login");
  };

  return (
    <div
      className="flex h-full min-w-0 flex-col"
      style={{ background: "var(--bg-subtle)", borderRight: "1px solid var(--border)" }}
    >

      {/* Logo · ocultar (solo escritorio) · cerrar (drawer móvil) */}
      <div className="p-4 sm:p-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-sm" onClick={onClose}>
            <span className="inline-block h-6 w-6 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500" />
            <span className="truncate">La Causa AI</span>
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 opacity-60 transition-opacity hover:opacity-100 md:hidden"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!onClose && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold shadow-sm transition-[background,box-shadow] hover:opacity-95"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-card)",
              color: "var(--accent)",
              boxShadow: "0 1px 2px rgba(0,0,0,.06)",
            }}
            title="Ocultar barra lateral"
            aria-label="Ocultar barra lateral"
          >
            <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            <span>Ocultar panel lateral</span>
          </button>
        )}
      </div>

      {/* Org / Perfil */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {isVolunteer && volunteerOrgs.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <OrgLogoBox logoUrl={selectedOrg?.logo_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selectedOrg?.nombre ?? "Seleccionar organización"}</p>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", orgDropdownOpen && "rotate-180")} style={{ color: "var(--text-muted)" }} />
            </button>
            {orgDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOrgDropdownOpen(false)} aria-hidden />
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl py-1"
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
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:opacity-90"
                      style={{
                        background: activeOrgId === org.id ? "var(--accent-soft)" : "transparent",
                        color: "var(--text)",
                      }}
                    >
                      <OrgLogoBox logoUrl={org.logo_url} size="sm" />
                      <span className="min-w-0 flex-1 truncate">{org.nombre}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {isVolunteer ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
                <Sparkles className="h-5 w-5" style={{ color: "var(--accent)" }} />
              </div>
            ) : (
              <OrgLogoBox logoUrl={selectedOrg?.logo_url} size="md" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {isVolunteer ? "Voluntario" : selectedOrg?.nombre ?? "Sin organización"}
              </p>
              {isVolunteer && (
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  Perfil personal
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        {isVolunteer ? (
          <>
            {navBase?.map((item) => {
              const exact = item.href === "/dashboard";
              const isActive = exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={onClose}
                  className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all")}
                  style={{
                    background: isActive ? "var(--bg-card)" : "transparent",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                    border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                  }}>
                  <item.icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }} />
                  {item.label}
                </Link>
              );
            })}
            {canSeeGlobalAdmin && (
              <Link href="/dashboard/admin" onClick={onClose}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mt-2")}
                style={{ color: "var(--text-muted)", border: "1px solid transparent" }}>
                <ShieldCheck className="w-4 h-4 shrink-0" /> Admin SaaS
              </Link>
            )}
          </>
        ) : (
          <>
            {ORGANIZER_NAV_SECTIONS.map((section) => {
              const items = filterOrganizerItems(section.items);
              if (items.length === 0) return null;
              const isCollapsed = collapsedSections[section.key];
              const SectionIcon = section.icon;
              const hasActive = items.some((it) => {
                const exact = it.href === "/dashboard";
                return exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
              });
              return (
                <div key={section.key} className="space-y-0.5">
                  <button
                    onClick={() => toggleSection(section.key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      hasActive && "opacity-100"
                    )}
                    style={{ color: "var(--text-muted)" }}
                  >
                    <SectionIcon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", isCollapsed && "rotate-[-90deg]")} />
                  </button>
                  {!isCollapsed && (
                    <div className="ml-4 pl-2 space-y-0.5" style={{ borderLeft: "1px solid var(--border)" }}>
                      {items.map((item) => {
                        const exact = item.href === "/dashboard";
                        const isActive = exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                          <Link key={item.href} href={item.href} onClick={onClose}
                            className={cn("flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all")}
                            style={{
                              background: isActive ? "var(--bg-card)" : "transparent",
                              color: isActive ? "var(--text)" : "var(--text-muted)",
                              border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                            }}>
                            <item.icon className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {canSeeGlobalAdmin && (
              <Link href="/dashboard/admin" onClick={onClose}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mt-2")}
                style={{ color: "var(--text-muted)", border: "1px solid transparent" }}>
                <ShieldCheck className="w-4 h-4 shrink-0" /> Admin SaaS
              </Link>
            )}
          </>
        )}
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
/** Portal a body + z muy alto: el <main> y capas fixed de las páginas no deben robar el clic al hamburguesa */
export function MobileTopBar({ menuOpen, onToggleMenu }: { menuOpen: boolean; onToggleMenu: () => void }) {
  return (
    <header
      className="pointer-events-auto md:hidden fixed inset-x-0 top-0 z-[10000] flex h-14 items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)]"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleMenu();
        }}
        className="relative z-10 touch-manipulation rounded-lg p-2.5 [-webkit-tap-highlight-color:transparent] pointer-events-auto"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
        data-testid="sidebar-open"
      >
        <Menu className="h-5 w-5" style={{ color: "var(--text)" }} />
      </button>
      <Link href="/dashboard" className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 text-center text-sm font-semibold">
        <span className="inline-block h-5 w-5 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500" />
        <span className="truncate">La Causa AI</span>
      </Link>
      <div className="flex shrink-0 justify-end">
        <NotificationBell />
      </div>
    </header>
  );
}

/* ─── Main export ────────────────────────────────────────────────────── */
export function Sidebar() {
  const mobileNavOpen = useSidebarLayoutStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useSidebarLayoutStore((s) => s.setMobileNavOpen);
  const toggleMobileNav = useSidebarLayoutStore((s) => s.toggleMobileNav);
  const collapsed = useSidebarLayoutStore((s) => s.collapsed);
  const setCollapsed = useSidebarLayoutStore((s) => s.setCollapsed);
  /** Solo escritorio (md+): evita FAB duplicado con el menú hamburguesa en móvil */
  const [isDesktop, setIsDesktop] = useState(false);
  const [navPortalReady, setNavPortalReady] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      const next = mq.matches;
      setIsDesktop(next);
      if (!next) setCollapsed(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [setCollapsed]);
  useLayoutEffect(() => {
    setNavPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex md:flex-col fixed left-0 top-0 z-40 h-full w-64 max-w-[100vw]",
          collapsed && "pointer-events-none"
        )}
        style={{
          transform: collapsed ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 200ms ease-out",
        }}
        aria-hidden={collapsed}
      >
        <SidebarContent />
      </aside>
      {/* Solo md+: en móvil el menú es el hamburguesa (drawer); nunca `flex` en base — rompía `max-md:hidden` */}
      {isDesktop &&
        collapsed &&
        createPortal(
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCollapsed(false);
            }}
            className="pointer-events-auto fixed left-4 top-1/2 z-[9999] flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border touch-manipulation backdrop-blur-sm transition-all duration-200 hover:scale-[1.06] active:scale-95"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--accent)",
              boxShadow: "0 4px 20px rgba(0,0,0,.08), 0 0 0 1px var(--accent-soft)",
            }}
            title="Mostrar barra lateral"
            aria-label="Mostrar barra lateral"
          >
            <PanelLeft className="h-[1.15rem] w-[1.15rem] shrink-0" strokeWidth={2.25} />
          </button>,
          document.body
        )}
      {navPortalReady &&
        createPortal(
          <MobileTopBar menuOpen={mobileNavOpen} onToggleMenu={toggleMobileNav} />,
          document.body
        )}
      {/* Drawer en body: evita que el <main> (TopBar z-10, tarjetas) quede por encima del menú */}
      {navPortalReady &&
        mobileNavOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10060] flex md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            onClick={() => setMobileNavOpen(false)}
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden />
            <aside
              id="mobile-sidebar-drawer"
              className="relative z-10 flex h-full min-h-0 w-72 max-w-[85vw] flex-col shadow-2xl"
              style={{
                background: "var(--bg-subtle)",
                borderRight: "1px solid var(--border)",
                boxShadow: "4px 0 24px rgba(0,0,0,.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent onClose={() => setMobileNavOpen(false)} />
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}

export function TopBar({ title }: { title: string }) {
  const collapsed = useSidebarLayoutStore((s) => s.collapsed);
  const setCollapsed = useSidebarLayoutStore((s) => s.setCollapsed);
  return (
    <header
      className="relative z-10 flex h-14 items-center justify-between border-b px-4 md:px-6"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* En móvil el menú es solo el de MobileTopBar (layout); aquí no hamburguesa para no duplicar */}
        {collapsed && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCollapsed(false);
            }}
            className="pointer-events-auto relative z-20 hidden shrink-0 touch-manipulation items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-colors hover:opacity-95 md:inline-flex"
            style={{
              color: "var(--accent)",
              background: "var(--accent-soft)",
              borderColor: "var(--border)",
            }}
            title="Mostrar barra lateral"
            aria-label="Mostrar barra lateral"
          >
            <PanelLeft className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            <span className="hidden sm:inline">Menú</span>
          </button>
        )}
        <h1 className="truncate text-base font-semibold">{title}</h1>
      </div>
      {/* En móvil la campana va solo en MobileTopBar (evita duplicar) */}
      <div className="hidden md:block">
        <NotificationBell />
      </div>
    </header>
  );
}
