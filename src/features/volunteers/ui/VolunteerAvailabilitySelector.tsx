"use client";

import type { DisponibilidadEstado } from "@/shared/store/authStore";
import { Globe } from "lucide-react";

interface VolunteerAvailabilitySelectorProps {
  value: DisponibilidadEstado;
  onChange: (value: DisponibilidadEstado) => void;
  title?: string;
  description?: string;
}

const OPTIONS: { value: DisponibilidadEstado; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "no_disponible", label: "No disponible" },
  { value: "previo_consulta", label: "Previo a consulta" },
];

export function VolunteerAvailabilitySelector({
  value,
  onChange,
  title = "Disponibilidad",
  description = "Indica cómo prefieres que te contacten o asignen actividades.",
}: VolunteerAvailabilitySelectorProps) {
  return (
    <div className="p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: value === option.value ? "var(--accent-soft)" : "var(--bg-subtle)",
              border: `1px solid ${value === option.value ? "var(--accent)" : "var(--border)"}`,
              color: value === option.value ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <input
              type="radio"
              name="disponibilidad"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}
