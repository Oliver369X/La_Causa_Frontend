"use client";
import { useState, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { TopBar } from "@/shared/ui/Sidebar";
import { communicationsApi, type Notification } from "@/features/communications/api/communicationsApi";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";

const TYPE_VARIANT = {
  info:    "info",
  warning: "warning",
  success: "success",
  error:   "danger",
  event:   "purple",
  task:    "default",
  system:  "default",
} as const;

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export default function CommunicationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);

  const load = () => {
    setLoading(true);
    communicationsApi.list()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id: string) => {
    await communicationsApi.markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.leida).map((n) => n.id);
    if (unread.length === 0) return;
    setMarkingAll(true);
    await communicationsApi.markAllRead(unread).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter((n) => !n.leida).length;

  return (
    <>
      <TopBar title="Comunicaciones" />
      <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Comunicaciones
            {unreadCount > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Notificaciones del sistema, eventos y tareas.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead} loading={markingAll}>
            <CheckCheck className="w-4 h-4" /> Marcar todas leídas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : notifications.length === 0 ? (
        <EmptyState title="Sin notificaciones" description="Las notificaciones de eventos, tareas y sistema aparecerán aquí." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.leida && markRead(n.id)}
              className="rounded-2xl px-5 py-4 flex items-start gap-4 transition-opacity cursor-pointer"
              style={{
                background: n.leida ? "var(--bg-card)" : "var(--bg-subtle)",
                border: `1px solid ${n.leida ? "var(--border)" : "var(--accent)55"}`,
                opacity: n.leida ? 0.7 : 1,
              }}
            >
              {!n.leida && (
                <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "var(--accent)" }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{n.titulo}</p>
                  <Badge label={n.tipo} variant={(TYPE_VARIANT as Record<string, "info" | "warning" | "success" | "danger" | "purple" | "default">)[n.tipo] ?? "default"} />
                </div>
                <p className="text-sm mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{n.mensaje}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
