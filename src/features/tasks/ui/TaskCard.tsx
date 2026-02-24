import { CheckCircle2, Clock, XCircle, Circle } from "lucide-react";
import type { Task } from "../api/tasksApi";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";

interface Props {
  task: Task;
  onClick?: (task: Task) => void;
  onStatusChange?: (task: Task, status: Task["estado"]) => void;
  actions?: React.ReactNode;
}

const STATUS_META: Record<Task["estado"], { label: string; variant: "success" | "warning" | "info" | "default"; Icon: React.ElementType }> = {
  pending:    { label: "Pendiente",   variant: "default",  Icon: Circle        },
  in_progress:{ label: "En curso",    variant: "info",     Icon: Clock         },
  completed:  { label: "Completada",  variant: "success",  Icon: CheckCircle2  },
  cancelled:  { label: "Cancelada",   variant: "default",  Icon: XCircle       },
};

const NEXT_STATUS: Partial<Record<Task["estado"], Task["estado"]>> = {
  pending:     "in_progress",
  in_progress: "completed",
};

export function TaskCard({ task, onClick, onStatusChange, actions }: Props) {
  const meta = STATUS_META[task.estado];

  return (
    <Card
      onClick={onClick ? () => onClick(task) : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <meta.Icon className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
          <p className="text-sm font-semibold truncate">{task.titulo}</p>
        </div>
        <Badge label={meta.label} variant={meta.variant} />
      </div>

      {task.descripcion && (
        <p className="text-xs pl-6 line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {task.descripcion}
        </p>
      )}

      {(onStatusChange || actions) && (
        <div className="mt-3 pt-3 flex items-center gap-2 border-t" style={{ borderColor: "var(--border)" }}>
          {onStatusChange && NEXT_STATUS[task.estado] && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task, NEXT_STATUS[task.estado]!); }}
              className="text-xs px-2 py-1 rounded-md transition-colors"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              → {STATUS_META[NEXT_STATUS[task.estado]!].label}
            </button>
          )}
          {actions}
        </div>
      )}
    </Card>
  );
}
