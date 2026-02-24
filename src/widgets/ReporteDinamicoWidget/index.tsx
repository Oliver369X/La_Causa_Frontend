"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

/**
 * ReporteDinamicoWidget — acceso rápido al reporte dinámico de la organización.
 */
export function ReporteDinamicoWidget() {
  return (
    <Link
      href="/dashboard/reportes-dinamicos"
      className="block rounded-2xl p-4 transition-opacity hover:opacity-90"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
          Reporte Dinámico
        </p>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Métricas y estadísticas de la organización en tiempo real.
      </p>
      <span
        className="inline-flex items-center justify-center w-full py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        Ver reportes
      </span>
    </Link>
  );
}
