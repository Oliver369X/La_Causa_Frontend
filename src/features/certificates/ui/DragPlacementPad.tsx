"use client";

import { useCallback, useRef } from "react";
import { Move } from "lucide-react";

import { CERT_MINI_HOJA_MAX_W, certAspectRatioCSS, type CertOrientacion } from "@/features/certificates/ui/certificateUiConstants";

type Props = {
  xPct: number;
  yPct: number;
  onChange: (xPct: number, yPct: number) => void;
  label?: string;
  accentColor?: string;
  /** Retrato o apaisado (misma proporción que el certificado) */
  orientacion?: CertOrientacion;
  /** Ancho máximo en px (misma escala que la vista previa del certificado) */
  maxWidthPx?: number;
};

/**
 * Área tipo hoja A4: arrastra el punto (o toca en cualquier sitio) para fijar posición en %.
 */
export function DragPlacementPad({
  xPct,
  yPct,
  onChange,
  label,
  accentColor,
  orientacion = "vertical",
  maxWidthPx = CERT_MINI_HOJA_MAX_W,
}: Props) {
  const padRef = useRef<HTMLDivElement>(null);

  const setFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * 100;
      const y = ((clientY - r.top) / r.height) * 100;
      onChange(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
    },
    [onChange]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClient(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFromClient(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <p className="text-[11px] leading-tight flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Move className="w-3 h-3 shrink-0" />
          {label}
        </p>
      )}
      <div
        ref={padRef}
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mx-auto w-full cursor-crosshair touch-none select-none rounded-lg overflow-hidden shrink-0"
        style={{
          maxWidth: maxWidthPx,
          aspectRatio: certAspectRatioCSS(orientacion),
          background: "linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-card) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06)",
        }}
      >
        <div
          className="absolute rounded-full border shadow-sm pointer-events-none"
          style={{
            width: 10,
            height: 10,
            left: `${xPct}%`,
            top: `${yPct}%`,
            transform: "translate(-50%, -50%)",
            borderColor: accentColor ?? "var(--accent)",
            borderWidth: 2,
            background: "var(--bg-card)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: "10% 10%",
          }}
        />
      </div>
      <p className="text-[9px] leading-tight text-center" style={{ color: "var(--text-muted)" }}>
        {Math.round(xPct)}% · {Math.round(yPct)}%
      </p>
    </div>
  );
}
