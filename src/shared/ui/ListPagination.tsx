"use client";
export function ListPagination({ page, total, size = 12, onChange }: { page: number; total: number; size?: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <nav aria-label="Paginación" className="flex justify-center items-center gap-4 py-4 text-sm">
    <button type="button" disabled={page <= 1} className="disabled:opacity-40" onClick={() => onChange(page - 1)}>Anterior</button>
    <span aria-live="polite">{page} / {pages} · {total} resultados</span>
    <button type="button" disabled={page >= pages} className="disabled:opacity-40" onClick={() => onChange(page + 1)}>Siguiente</button>
  </nav>;
}
