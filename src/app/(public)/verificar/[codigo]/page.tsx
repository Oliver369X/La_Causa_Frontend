"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { certificatesApi, type Certificate } from "@/features/certificates/api/certificatesApi";
import { Spinner } from "@/shared/ui/Spinner";

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default function VerificarCertificadoPage() {
  const params = useParams();
  const codigo = params.codigo as string;
  const [cert, setCert] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!codigo) return;
    certificatesApi.verify(codigo)
      .then(setCert)
      .catch(() => setError("Certificado no encontrado o código inválido"))
      .finally(() => setLoading(false));
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: cert ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
            border: `2px solid ${cert ? "#22c55e55" : "#ef444455"}`,
          }}
        >
          {cert ? (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-xl font-bold mb-2">Certificado válido</h1>
              <p className="text-lg font-semibold mb-1">{cert.titulo}</p>
              {cert.descripcion && <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{cert.descripcion}</p>}
              <p className="text-sm">
                {cert.horas_acreditadas > 0 && `${cert.horas_acreditadas} horas acreditadas`}
                {cert.horas_acreditadas > 0 && " · "}
                Emitido el {formatDate(cert.fecha_emision)}
              </p>
              {cert.url_pdf && (
                <a
                  href={cert.url_pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-4 px-4 py-2 rounded-lg font-medium"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  Ver PDF
                </a>
              )}
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h1 className="text-xl font-bold mb-2">Certificado inválido</h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
            </>
          )}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
          Verificación de autenticidad mediante código único. Este certificado fue emitido por la plataforma de voluntariado.
        </p>
      </div>
    </div>
  );
}
