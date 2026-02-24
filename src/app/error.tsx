"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8"
      style={{ color: "var(--text)" }}
    >
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            background: "var(--accent)",
            color: "white",
          }}
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
