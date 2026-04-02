"use client";

import { PillNumberPresets, PillSelect } from "@/features/badges/ui/BadgeFormPills";

export type ReglaAsignacion = "manual" | "gestion_completada" | "horas_minimas" | "tareas_completadas";

export interface ReglaConfigValues {
  manual: { requiere_aprobacion_admin: boolean };
  gestion_completada: { meses_minimos: number; requiere_activo: boolean };
  horas_minimas: { horas_minimas: number; periodo: "anual" | "semestral" | "mensual" };
  tareas_completadas: { tareas_minimas: number; estado: string };
}

export interface RequisitosValues {
  evidencia_requerida: boolean;
  nivel_minimo: number;
}

const DEFAULT_REGLAS: ReglaConfigValues = {
  manual: { requiere_aprobacion_admin: true },
  gestion_completada: { meses_minimos: 6, requiere_activo: true },
  horas_minimas: { horas_minimas: 120, periodo: "anual" },
  tareas_completadas: { tareas_minimas: 20, estado: "completada" },
};

const DEFAULT_REQUISITOS: RequisitosValues = {
  evidencia_requerida: false,
  nivel_minimo: 1,
};

interface ConfigMedallaFormProps {
  regla: ReglaAsignacion;
  reglaConfig: ReglaConfigValues[ReglaAsignacion];
  requisitos: RequisitosValues;
  onReglaChange: (r: ReglaAsignacion) => void;
  onReglaConfigChange: (c: ReglaConfigValues[ReglaAsignacion]) => void;
  onRequisitosChange: (r: RequisitosValues) => void;
}

export function ConfigMedallaForm({
  regla,
  reglaConfig,
  requisitos,
  onReglaChange,
  onReglaConfigChange,
  onRequisitosChange,
}: ConfigMedallaFormProps) {
  const handleReglaChange = (r: ReglaAsignacion) => {
    onReglaChange(r);
    onReglaConfigChange(DEFAULT_REGLAS[r] as ReglaConfigValues[ReglaAsignacion]);
  };

  return (
    <div className="space-y-4">
      {/* Regla de asignación */}
      <PillSelect<ReglaAsignacion>
        label="Regla de asignación"
        hint="Una sola: cómo se define que el voluntario puede recibirla."
        value={regla}
        onChange={handleReglaChange}
        options={[
          { value: "manual", label: "Manual (admin)" },
          { value: "gestion_completada", label: "Gestión completada" },
          { value: "horas_minimas", label: "Horas mínimas" },
          { value: "tareas_completadas", label: "Tareas completadas" },
        ]}
      />

      {/* Config según regla */}
      {regla === "manual" && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(reglaConfig as ReglaConfigValues["manual"]).requiere_aprobacion_admin}
              onChange={(e) =>
                onReglaConfigChange({ requiere_aprobacion_admin: e.target.checked } as ReglaConfigValues["manual"])
              }
            />
            <span className="text-sm">Requiere aprobación de administrador</span>
          </label>
        </div>
      )}

      {regla === "gestion_completada" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Meses mínimos de gestión</label>
            <input
              type="number"
              min={1}
              max={24}
              value={(reglaConfig as ReglaConfigValues["gestion_completada"]).meses_minimos}
              onChange={(e) =>
                onReglaConfigChange({
                  ...(reglaConfig as ReglaConfigValues["gestion_completada"]),
                  meses_minimos: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(reglaConfig as ReglaConfigValues["gestion_completada"]).requiere_activo}
                onChange={(e) =>
                  onReglaConfigChange({
                    ...(reglaConfig as ReglaConfigValues["gestion_completada"]),
                    requiere_activo: e.target.checked,
                  })
                }
              />
              <span className="text-sm">Debe estar activo en la organización</span>
            </label>
          </div>
        </div>
      )}

      {regla === "horas_minimas" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Horas mínimas</label>
            <input
              type="number"
              min={1}
              value={(reglaConfig as ReglaConfigValues["horas_minimas"]).horas_minimas}
              onChange={(e) =>
                onReglaConfigChange({
                  ...(reglaConfig as ReglaConfigValues["horas_minimas"]),
                  horas_minimas: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="min-w-0">
            <PillSelect<"anual" | "semestral" | "mensual">
              label="Período"
              value={(reglaConfig as ReglaConfigValues["horas_minimas"]).periodo}
              onChange={(periodo) =>
                onReglaConfigChange({
                  ...(reglaConfig as ReglaConfigValues["horas_minimas"]),
                  periodo,
                })
              }
              options={[
                { value: "anual", label: "Anual" },
                { value: "semestral", label: "Semestral" },
                { value: "mensual", label: "Mensual" },
              ]}
            />
          </div>
        </div>
      )}

      {regla === "tareas_completadas" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tareas mínimas</label>
            <input
              type="number"
              min={1}
              value={(reglaConfig as ReglaConfigValues["tareas_completadas"]).tareas_minimas}
              onChange={(e) =>
                onReglaConfigChange({
                  ...(reglaConfig as ReglaConfigValues["tareas_completadas"]),
                  tareas_minimas: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="min-w-0">
            <PillSelect<string>
              label="Estado de tarea"
              value={(reglaConfig as ReglaConfigValues["tareas_completadas"]).estado}
              onChange={(estado) =>
                onReglaConfigChange({
                  ...(reglaConfig as ReglaConfigValues["tareas_completadas"]),
                  estado,
                })
              }
              options={[
                { value: "completada", label: "Completada" },
                { value: "aprobada", label: "Aprobada" },
              ]}
            />
          </div>
        </div>
      )}

      {/* Requisitos generales */}
      <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-sm font-medium mb-2">Requisitos adicionales</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requisitos.evidencia_requerida}
              onChange={(e) => onRequisitosChange({ ...requisitos, evidencia_requerida: e.target.checked })}
            />
            <span className="text-sm">Requiere evidencia al solicitar</span>
          </label>
          <div className="min-w-0">
            <PillNumberPresets
              label="Nivel mínimo del voluntario"
              hint="Solo cuenta si es mayor que 1. Elige un valor rápido o escribe otro."
              value={requisitos.nivel_minimo}
              onChange={(n) => onRequisitosChange({ ...requisitos, nivel_minimo: n })}
              presets={[1, 3, 5, 10, 15, 20]}
              min={0}
              max={999}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Parsea regla_config existente */
export function parseReglaConfig(
  regla: ReglaAsignacion,
  raw: Record<string, unknown> | null | undefined
): ReglaConfigValues[ReglaAsignacion] {
  const def = DEFAULT_REGLAS[regla];
  if (!raw || typeof raw !== "object") return def;
  return { ...def, ...raw } as ReglaConfigValues[ReglaAsignacion];
}

/** Parsea requisitos existente */
export function parseRequisitos(raw: Record<string, unknown> | null | undefined): RequisitosValues {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_REQUISITOS };
  return {
    evidencia_requerida: Boolean(raw.evidencia_requerida),
    nivel_minimo: typeof raw.nivel_minimo === "number" ? raw.nivel_minimo : DEFAULT_REQUISITOS.nivel_minimo,
  };
}

/** Convierte a JSON para el backend */
export function reglaConfigToJson(c: ReglaConfigValues[ReglaAsignacion]): Record<string, unknown> {
  return { ...c };
}

export function requisitosToJson(r: RequisitosValues): Record<string, unknown> {
  return { evidencia_requerida: r.evidencia_requerida, nivel_minimo: r.nivel_minimo };
}
