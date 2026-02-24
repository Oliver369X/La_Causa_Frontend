import { Calendar, Clock } from "lucide-react";
import type { Event } from "../api/eventsApi";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";

interface Props {
  event: Event;
  onClick?: (event: Event) => void;
  actions?: React.ReactNode;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "info" | "default"> = {
  activo:     "success",
  en_curso:   "info",
  planificado:"warning",
  cerrado:    "default",
  cancelado:  "default",
};

export function EventCard({ event, onClick, actions }: Props) {
  const start = new Date(event.fecha_inicio);
  const end   = new Date(event.fecha_fin);

  return (
    <Card
      onClick={onClick ? () => onClick(event) : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-semibold leading-snug">{event.nombre}</p>
        <Badge
          label={event.estado}
          variant={STATUS_VARIANT[event.estado] ?? "default"}
        />
      </div>

      {event.descripcion && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {event.descripcion}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {start.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {end.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>

      {actions && <div className="mt-3 pt-3 flex gap-2 border-t" style={{ borderColor: "var(--border)" }}>{actions}</div>}
    </Card>
  );
}
