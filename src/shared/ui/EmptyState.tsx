"use client";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No hay datos",
  description = "No se encontraron registros para mostrar.",
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      >
        {icon ?? <Inbox className="w-6 h-6" style={{ color: "var(--text-muted)" }} />}
      </div>
      <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{title}</p>
      <p className="text-xs mt-1 max-w-sm" style={{ color: "var(--text-muted)" }}>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
