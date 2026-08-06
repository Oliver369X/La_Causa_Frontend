import type { Certificate } from "@/features/certificates/api/certificatesApi";

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[char] ?? char));
}

function fallbackHtml(cert: Certificate) {
  const summary = cert.firma_digital_metadata?.resumen;
  const org = summary?.organizacion || "La Causa";
  const season = summary?.temporada || cert.gestion_periodo || "Gestión de voluntariado";
  const name = summary?.voluntario || "Voluntario/a";
  const rankName = summary?.medalla_rango_nombre || summary?.rango || "Aspirante";
  const rankImage = summary?.medalla_rango_imagen_url;
  const rankBadge = rankImage
    ? `<img src="${esc(rankImage)}" alt="Medalla ${esc(rankName)}" style="width:48px;height:48px;object-fit:contain">`
    : "<b>🏅</b>";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#f7f1df;font-family:Georgia,'Times New Roman',serif;color:#1f2937}.certificate{width:100%;min-height:100vh;padding:48px;background:linear-gradient(135deg,#fffdf7,#f7ecd0);border:18px solid #6b4f1d;outline:3px solid #d4af37;outline-offset:-29px;text-align:center;position:relative}.seal{color:#6b4f1d;font:700 16px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase}h1{font-size:52px;letter-spacing:2px;margin:44px 0 14px;color:#4c3510}p{font-size:21px;line-height:1.5;margin:10px auto;max-width:850px}.name{font-size:42px;font-weight:bold;color:#6b4f1d;border-bottom:2px solid #b58b2a;display:inline-block;padding:0 32px 10px;margin:16px 0}.stats{display:flex;justify-content:center;gap:28px;margin:38px 0 28px;font-family:Arial,sans-serif}.stat{min-width:115px;padding:13px;border-top:2px solid #d4af37;border-bottom:2px solid #d4af37}.stat b{display:block;font-size:25px;color:#4c3510}.stat span{font-size:11px;text-transform:uppercase;letter-spacing:1px}.footer{position:absolute;bottom:44px;left:70px;right:70px;display:flex;justify-content:space-between;font:13px Arial,sans-serif;color:#5b4b2b}
  </style></head><body><main class="certificate"><div class="seal">${esc(org)} · Reconocimiento oficial</div><h1>Certificado de participación</h1><p>Se otorga a</p><div class="name">${esc(name)}</div><p>por su valiosa participación durante <strong>${esc(season)}</strong>.</p><div class="stats"><div class="stat"><b>${esc(summary?.eventos ?? 0)}</b><span>Eventos</span></div><div class="stat"><b>${esc(summary?.tareas_completadas ?? 0)}</b><span>Tareas</span></div><div class="stat"><b>${esc(cert.horas_acreditadas)} h</b><span>Horas</span></div><div class="stat">${rankBadge}<span>${esc(rankName)}</span></div></div><p>Gracias por convertir tu tiempo y compromiso en impacto para la comunidad.</p><div class="footer"><span>Emitido por ${esc(org)}</span><span>Verificación: ${esc(cert.codigo_validacion)}</span></div></main></body></html>`;
}

export function CertificatePreview({ certificate, className = "" }: { certificate: Certificate; className?: string }) {
  const html = certificate.firma_digital_metadata?.html_generado || fallbackHtml(certificate);
  return <iframe title={`Certificado: ${certificate.titulo}`} srcDoc={html} sandbox="" className={`w-full aspect-[1.42] rounded-xl border ${className}`} style={{ borderColor: "var(--border)", background: "#f7f1df" }} />;
}
