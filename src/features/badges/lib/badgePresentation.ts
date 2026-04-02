/** Presentación de medallas (catálogo org): rareza backend + copy “cómo ganarla”. */

export type RarezaBackend =
  | "COMUN"
  | "NORMAL"
  | "RARO"
  | "MITICO"
  | "LEGENDARIO"
  | "UNICO";

export interface RarezaVisual {
  label: string;
  border: string;
  glow: string;
  bg: string;
}

const DEFAULT_RAREZA: RarezaVisual = {
  label: "Común",
  border: "var(--g-common)",
  glow: "none",
  bg: "var(--g-common-soft)",
};

/** Alineado con tokens en globals.css (misma línea que BadgeGrid del voluntario). */
export const RAREZA_VISUAL: Record<RarezaBackend, RarezaVisual> = {
  COMUN: { label: "Común", border: "var(--g-common)", glow: "none", bg: "var(--g-common-soft)" },
  NORMAL: {
    label: "Normal",
    border: "var(--g-uncommon)",
    glow: "0 0 10px var(--g-uncommon-soft)",
    bg: "var(--g-uncommon-soft)",
  },
  RARO: { label: "Raro", border: "var(--g-rare)", glow: "0 0 12px var(--g-rare-soft)", bg: "var(--g-rare-soft)" },
  MITICO: { label: "Mítico", border: "var(--g-epic)", glow: "0 0 14px var(--g-epic-soft)", bg: "var(--g-epic-soft)" },
  LEGENDARIO: {
    label: "Legendario",
    border: "var(--g-legendary)",
    glow: "0 0 16px var(--g-legendary-soft)",
    bg: "var(--g-legendary-soft)",
  },
  UNICO: {
    label: "Único",
    border: "var(--accent)",
    glow: "0 0 18px var(--accent-soft)",
    bg: "var(--accent-soft)",
  },
};

export function getRarezaVisual(rareza: string | undefined): RarezaVisual {
  if (rareza && rareza in RAREZA_VISUAL) return RAREZA_VISUAL[rareza as RarezaBackend];
  return DEFAULT_RAREZA;
}

export function labelTipoInsignia(tipo: string): string {
  if (tipo === "ELO") return "Competencia (ELO)";
  if (tipo === "TAREA_ESPECIAL") return "Logro / tarea especial";
  return tipo;
}

/**
 * Texto para voluntarios: qué tienen que hacer o cómo se otorga la medalla.
 */
export function describeHowToEarn(
  regla: string | null | undefined,
  reglaConfig: Record<string, unknown> | null | undefined,
  requisitos: Record<string, unknown> | null | undefined,
): string {
  const extra: string[] = [];
  const nm = requisitos?.nivel_minimo;
  if (nm !== undefined && nm !== null && Number(nm) > 1) {
    extra.push(`nivel mínimo ${nm}`);
  }
  if (requisitos?.evidencia_requerida === true) {
    extra.push("evidencia requerida");
  }
  const extraStr = extra.length ? ` Requisitos: ${extra.join(" · ")}.` : "";

  const rc = reglaConfig ?? {};

  switch (regla) {
    case "gestion_completada": {
      const meses = typeof rc.meses_minimos === "number" ? rc.meses_minimos : 6;
      const activo = rc.requiere_activo === true;
      return `Mantener participación${activo ? " activa" : ""} al menos ${meses} meses en la organización.${extraStr}`;
    }
    case "horas_minimas": {
      const h = typeof rc.horas_minimas === "number" ? rc.horas_minimas : 0;
      const periodo = rc.periodo === "semestral" ? "semestre" : rc.periodo === "mensual" ? "mes" : "año natural";
      return `Acumular al menos ${h} horas de voluntariado en el ${periodo}.${extraStr}`;
    }
    case "tareas_completadas": {
      const t = typeof rc.tareas_minimas === "number" ? rc.tareas_minimas : 0;
      return `Completar al menos ${t} tareas (según el estado configurado).${extraStr}`;
    }
    case "manual":
    default: {
      const needAdmin = rc.requiere_aprobacion_admin !== false;
      return needAdmin
        ? `Un administrador la otorga cuando cumplas el criterio.${extraStr}`
        : `Un coordinador puede otorgarla por tu desempeño.${extraStr}`;
    }
  }
}
