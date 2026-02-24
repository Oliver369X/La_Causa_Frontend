"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Search, CheckCircle, XCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { certificatesApi, type Certificate } from "@/features/certificates/api/certificatesApi";
import { shareApi, type ShareCanal } from "@/features/share/api/shareApi";
import { ShareModal } from "@/features/share/ui/ShareModal";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCertId, setShareCertId] = useState<string | null>(null);

  useEffect(() => {
    certificatesApi.list()
      .then(setCerts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async () => {
    if (!verifyCode.trim()) return;
    setVerifying(true);
    setVerifiedCert(null);
    setVerifyError(null);
    try {
      const result = await certificatesApi.verify(verifyCode.trim());
      setVerifiedCert(result);
    } catch {
      setVerifyError("Certificado no encontrado o código inválido.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Certificados
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Certificados por temporada (fin de temporada). Verifica con el código de validación.
          </p>
        </div>
        <Link href="/dashboard/certificates/templates">
          <Button variant="outline" size="sm">Plantillas</Button>
        </Link>
      </div>

      <ShareModal
        open={shareModalOpen}
        onClose={() => { setShareModalOpen(false); setShareCertId(null); }}
        title="Compartir certificado"
        onShare={async (canal: ShareCanal) => {
          if (!shareCertId) throw new Error("No certificate");
          const r = await shareApi.certificate(shareCertId as `${string}-${string}-${string}-${string}-${string}`, canal);
          return r;
        }}
      />

      <Card>
        <p className="text-sm font-semibold mb-3">Verificar certificado</p>
        <div className="flex gap-2">
          <input
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="Código de validación (UUID) …"
            className="flex-1 h-9 px-3 text-sm rounded-lg outline-none"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <Button onClick={handleVerify} loading={verifying} size="sm">
            <Search className="w-4 h-4" /> Verificar
          </Button>
        </div>

        {(verifiedCert || verifyError) && (
          <div
            className="mt-3 flex items-start gap-3 rounded-xl p-3 text-sm"
            style={{
              background: verifiedCert ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
              border: `1px solid ${verifiedCert ? "#22c55e55" : "#ef444455"}`,
            }}
          >
            {verifiedCert
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
              : <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />}
            <div>
              <p className="font-medium">{verifiedCert ? "Certificado válido" : "Certificado inválido"}</p>
              <p style={{ color: "var(--text-muted)" }}>
                {verifiedCert ? `${verifiedCert.titulo} · ${formatDate(verifiedCert.fecha_emision)}` : verifyError}
              </p>
            </div>
          </div>
        )}
      </Card>

      <div>
        <h2 className="font-semibold text-sm mb-3">Certificados emitidos</h2>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : certs.length === 0 ? (
          <EmptyState
            title="Sin certificados"
            description="Los certificados se emiten al cerrar una temporada."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((cert) => (
              <div
                key={cert.id}
                className="rounded-2xl p-4 flex flex-col gap-2"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold line-clamp-2">{cert.titulo}</p>
                {cert.descripcion && (
                  <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{cert.descripcion}</p>
                )}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Usuario: <code className="font-mono text-[10px]">{cert.usuario_id.slice(0, 8)}…</code>
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {cert.horas_acreditadas > 0 && `${cert.horas_acreditadas} h acreditadas · `}
                  Emitido: {formatDate(cert.fecha_emision)}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {cert.url_pdf && (
                    <a href={cert.url_pdf} target="_blank" rel="noreferrer" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                      Descargar PDF →
                    </a>
                  )}
                  <button
                    onClick={() => { setShareCertId(cert.id); setShareModalOpen(true); }}
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    <Share2 className="w-3.5 h-3.5" /> Compartir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
