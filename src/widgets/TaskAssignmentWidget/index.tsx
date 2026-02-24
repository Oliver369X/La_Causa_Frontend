"use client";
import { useState, useEffect } from "react";
import { CheckSquare, Clock, AlertCircle } from "lucide-react";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import { useAuthStore } from "@/shared/store/authStore";
import type { Task } from "@/features/tasks/api/tasksApi";

const STATUS_COLOR: Record<string, string> = {
  todo:        "#64748b",
  in_progress: "#3b82f6",
  review:      "#f59e0b",
  done:        "#22c55e",
};

/**
 * TaskAssignmentWidget — compact summary of tasks by status.
 */
export function TaskAssignmentWidget() {
  const { activeOrgId } = useAuthStore();
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrgId) return;
    tasksApi.list(activeOrgId)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeOrgId]);

  const byStatus = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.estado] = (acc[t.estado] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-semibold flex items-center gap-2 mb-4">
        <CheckSquare className="w-4 h-4" style={{ color: "var(--accent)" }} />
        Resumen de tareas
      </p>

      {loading ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>Cargando…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "todo",        label: "Pendientes",   icon: <Clock className="w-4 h-4" /> },
            { key: "in_progress", label: "En progreso",  icon: <CheckSquare className="w-4 h-4" /> },
            { key: "review",      label: "En revisión",  icon: <AlertCircle className="w-4 h-4" /> },
            { key: "done",        label: "Completadas",  icon: <CheckSquare className="w-4 h-4" /> },
          ].map(({ key, label, icon }) => (
            <div
              key={key}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              <span style={{ color: STATUS_COLOR[key] }}>{icon}</span>
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{byStatus[key] ?? 0}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
