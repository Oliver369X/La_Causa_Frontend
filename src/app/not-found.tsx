import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8"
      style={{ color: "var(--text)" }}
    >
      <h2 className="text-xl font-semibold">Página no encontrada</h2>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        La página que buscas no existe o ha sido movida.
      </p>
      <Link
        href="/"
        className="rounded-lg px-4 py-2 text-sm font-medium"
        style={{
          background: "var(--accent)",
          color: "white",
        }}
      >
        Ir al inicio
      </Link>
    </div>
  );
}
