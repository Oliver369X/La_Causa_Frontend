"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, CheckCheck, BellRing } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { communicationsApi, type Notification } from "@/features/communications/api/communicationsApi";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/utils/utils";

const TYPE_VARIANT: Record<string, "info" | "warning" | "success" | "danger" | "purple" | "default"> = {
  info: "info",
  warning: "warning",
  success: "success",
  error: "danger",
  evento: "purple",
  event: "purple",
  tarea: "default",
  task: "default",
  sistema: "default",
  system: "default",
};

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function isUnread(n: Notification): boolean {
  return !n.leida;
}

function showBrowserNotification(n: Notification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(n.titulo, {
      body: n.mensaje,
      icon: "/favicon.ico",
      tag: n.id,
    });
  } catch { /* SW-only env, ignore */ }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => communicationsApi.list(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const handleNewNotifications = useCallback((notifs: Notification[]) => {
    const currentIds = new Set(notifs.filter(isUnread).map((n) => n.id));
    if (prevIdsRef.current.size > 0) {
      for (const n of notifs) {
        if (isUnread(n) && !prevIdsRef.current.has(n.id)) {
          showBrowserNotification(n);
        }
      }
    }
    prevIdsRef.current = currentIds;
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      handleNewNotifications(notifications);
    }
  }, [notifications, handleNewNotifications]);

  const togglePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setPushEnabled(true);
      return;
    }
    const perm = await Notification.requestPermission();
    setPushEnabled(perm === "granted");
  };

  const unreadCount = notifications.filter((n) => isUnread(n)).length;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markRead = async (id: string) => {
    await communicationsApi.markRead(id).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => isUnread(n)).map((n) => n.id);
    if (unread.length === 0) return;
    await communicationsApi.markAllRead(unread).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const recent = notifications.slice(0, 8);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl transition-all hover:opacity-80"
        style={{ background: open ? "var(--bg-card)" : "transparent", border: "1px solid transparent" }}
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 max-h-[min(400px,70vh)] overflow-hidden rounded-2xl z-50"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}
        >
          <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Notificaciones</span>
            <div className="flex items-center gap-2">
              {!pushEnabled && (
                <button
                  onClick={togglePush}
                  className="text-xs font-medium flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)", background: "var(--bg-subtle)" }}
                  title="Activar notificaciones del navegador"
                >
                  <BellRing className="w-3.5 h-3.5" /> Push
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: "var(--accent)" }}
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Leídas
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto max-h-[320px]">
            {isLoading ? (
              <div className="p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>Cargando…</div>
            ) : recent.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>Sin notificaciones</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {recent.map((n) => {
                  const unread = isUnread(n);
                  const actionHref =
                    n.entidad_tipo === "evento_feedback_ml" && n.entidad_id
                      ? `/dashboard/events/${n.entidad_id}/feedback-ml`
                      : n.entidad_tipo === "evento_retro_voluntario" && n.entidad_id
                        ? `/dashboard/events/${n.entidad_id}/retro-voluntario`
                        : null;
                  const inner = (
                    <>
                      <div className="flex items-start gap-2">
                        {unread && (
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent)" }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium line-clamp-1">{n.titulo}</p>
                            <Badge label={n.tipo} variant={TYPE_VARIANT[n.tipo] ?? "default"} />
                          </div>
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{n.mensaje}</p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </>
                  );
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "px-3 py-2.5 transition-opacity hover:opacity-90",
                        unread && "opacity-100",
                        actionHref ? "cursor-pointer" : "cursor-pointer"
                      )}
                      style={{
                        background: unread ? "var(--bg-subtle)" : "transparent",
                        borderLeft: unread ? "3px solid var(--accent)" : "3px solid transparent",
                      }}
                    >
                      {actionHref ? (
                        <Link
                          href={actionHref}
                          onClick={() => {
                            if (unread) markRead(n.id);
                            setOpen(false);
                          }}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            if (unread) markRead(n.id);
                          }}
                        >
                          {inner}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Link
            href="/dashboard/communications"
            onClick={() => setOpen(false)}
            className="block py-2.5 text-center text-sm font-medium"
            style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
