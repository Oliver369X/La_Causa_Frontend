import type { Certificate } from "@/features/certificates/api/certificatesApi";

export type MiembroParaCsv = {
  usuario_id: string;
  usuario_nombre?: string;
  usuario_email?: string;
};

function escCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV con BOM UTF-8 para Excel: datos para correo masivo o archivo de impresión. */
export function buildCertificadosEmisionCsv(
  certs: Certificate[],
  members: MiembroParaCsv[],
  origin: string
): string {
  const byUser = new Map(members.map((m) => [m.usuario_id, m]));
  const header = [
    "nombre",
    "email",
    "titulo",
    "gestion",
    "codigo_validacion",
    "enlace_verificacion",
    "enlace_pdf",
  ];
  const rows = [header.join(",")];
  for (const c of certs) {
    const m = byUser.get(c.usuario_id);
    const ver = `${origin.replace(/\/$/, "")}/verificar/${c.codigo_validacion}`;
    rows.push(
      [
        m?.usuario_nombre ?? "",
        m?.usuario_email ?? "",
        c.titulo,
        c.gestion_periodo ?? "",
        c.codigo_validacion,
        ver,
        c.url_pdf ?? "",
      ]
        .map(escCell)
        .join(",")
    );
  }
  return "\uFEFF" + rows.join("\r\n");
}

export function buildEnlacesVerificacionLista(certs: Certificate[], origin: string): string {
  const base = origin.replace(/\/$/, "");
  return certs.map((c) => `${base}/verificar/${c.codigo_validacion}`).join("\n");
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
