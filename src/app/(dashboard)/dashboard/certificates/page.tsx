"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Search, CheckCircle, XCircle, Share2, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { certificatesApi, type Certificate, type CertificateUpdateData } from "@/features/certificates/api/certificatesApi";
import { shareApi, type ShareCanal } from "@/features/share/api/shareApi";
import { ShareModal } from "@/features/share/ui/ShareModal";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { RewardCard } from "@/shared/ui/gamification";
import { motionSpring, staggerFast } from "@/shared/lib/motion";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Modal } from "@/shared/ui/Modal";

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CertificatesPage() {
  const { user, activeOrgId } = useAuthStore();
  const { can } = usePermissions();
  const isOrganizer = user?.tipo === "organizador";
  const canManageCerts = isOrganizer && activeOrgId && can("createEvents");

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCertId, setShareCertId] = useState<string | null>(null);

  const [editCert, setEditCert] = useState<Certificate | null>(null);
  const [editForm, setEditForm] = useState<CertificateUpdateData>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCerts = useCallback(async () => {
    setLoading(true);
    try {
      if (canManageCerts && activeOrgId) {
        const data = await certificatesApi.list({ organizacion_id: activeOrgId });
        setCerts(data);
      } else {
        const data = await certificatesApi.list();
        setCerts(data);
      }
    } catch {
      setCerts([]);
    } finally {
      setLoading(false);
    }
  }, [canManageCerts, activeOrgId]);

  useEffect(() => {
    loadCerts();
  }, [loadCerts]);

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

  const openEdit = (c: Certificate) => {
    setEditCert(c);
    setEditForm({
      titulo: c.titulo,
      descripcion: c.descripcion ?? undefined,
      horas_acreditadas: c.horas_acreditadas,
      url_pdf: c.url_pdf ?? undefined,
    });
  };

  const saveEdit = async () => {
    if (!editCert) return;
    setSavingEdit(true);
    try {
      await certificatesApi.update(editCert.id, editForm);
      setEditCert(null);
      await loadCerts();
    } catch {
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Revocar y eliminar este certificado? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    try {
      await certificatesApi.delete(id);
      await loadCerts();
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionSpring.tab}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" style={{ color: "var(--g-progreso)" }} />
            Certificados
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {canManageCerts
              ? "Certificados emitidos en tu organización activa. Podés editar o revocar."
              : "Certificados por temporada. Verifica con el código de validación."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOrganizer && (
            <Link href="/dashboard/certificates/emitir">
              <Button size="sm">Emisión masiva</Button>
            </Link>
          )}
          <Link href="/dashboard/certificates/templates">
            <Button variant="outline" size="sm">Plantillas</Button>
          </Link>
        </div>
      </motion.div>

      <Modal
        open={!!editCert}
        onClose={() => !savingEdit && setEditCert(null)}
        title="Editar certificado"
      >
        {editCert && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Título</label>
              <input
                className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={editForm.titulo ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Descripción</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-y"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={editForm.descripcion ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value || undefined }))}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Horas acreditadas</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={editForm.horas_acreditadas ?? 0}
                onChange={(e) => setEditForm((f) => ({ ...f, horas_acreditadas: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>URL PDF (opcional)</label>
              <input
                className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={editForm.url_pdf ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, url_pdf: e.target.value || undefined }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditCert(null)} disabled={savingEdit}>
                Cancelar
              </Button>
              <Button size="sm" loading={savingEdit} onClick={() => void saveEdit()}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ShareModal
        open={shareModalOpen}
        onClose={() => { setShareModalOpen(false); setShareCertId(null); }}
        title="Compartir certificado"
        onShare={async (canal: ShareCanal) => {
          if (!shareCertId) throw new Error("No certificate");
          return shareApi.certificate(shareCertId as `${string}-${string}-${string}-${string}-${string}`, canal);
        }}
      />

      {/* Verificación */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-semibold mb-3">Verificar certificado</p>
        <div className="flex gap-2">
          <input
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="Código de validación (UUID) …"
            className="flex-1 h-10 px-4 text-sm rounded-xl outline-none"
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 flex items-start gap-3 rounded-xl p-4 text-sm"
            style={{
              background: verifiedCert ? "var(--g-logro-soft)" : "var(--g-streak-soft)",
              border: `1px solid ${verifiedCert ? "var(--g-logro)" : "var(--g-streak)"}`,
            }}
          >
            {verifiedCert ? (
              <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--g-logro)" }} />
            ) : (
              <XCircle className="w-5 h-5 shrink-0" style={{ color: "var(--g-streak)" }} />
            )}
            <div>
              <p className="font-semibold">{verifiedCert ? "Certificado válido" : "Certificado inválido"}</p>
              <p style={{ color: "var(--text-muted)" }}>
                {verifiedCert ? `${verifiedCert.titulo} · ${formatDate(verifiedCert.fecha_emision)}` : verifyError}
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Vitrina de certificados emitidos */}
      <div>
        <h2 className="font-semibold text-sm mb-4">
          {canManageCerts ? "Certificados de la organización" : "Certificados emitidos"}
        </h2>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : certs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-12 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <EmptyState
              title="Sin certificados"
              description={
                canManageCerts
                  ? "Emití certificados desde Emisión masiva o al cerrar temporadas."
                  : "Los certificados se emiten al cerrar una temporada."
              }
              icon={<GraduationCap className="w-14 h-14 mx-auto" style={{ color: "var(--text-muted)" }} />}
            />
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((cert, i) => (
              <RewardCard key={cert.id} delay={staggerFast * i}>
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--g-progreso-soft)", color: "var(--g-progreso)" }}
                  >
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm line-clamp-2">{cert.titulo}</p>
                    {cert.descripcion && (
                      <p className="text-xs line-clamp-2 mt-0.5" style={{ color: "var(--text-muted)" }}>{cert.descripcion}</p>
                    )}
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                      {cert.horas_acreditadas > 0 && `${cert.horas_acreditadas} h acreditadas · `}
                      Emitido: {formatDate(cert.fecha_emision)}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {cert.url_pdf && (
                        <a
                          href={cert.url_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold"
                          style={{ color: "var(--g-progreso)" }}
                        >
                          Descargar PDF →
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => { setShareCertId(cert.id); setShareModalOpen(true); }}
                        className="flex items-center gap-1 text-xs font-semibold"
                        style={{ color: "var(--g-progreso)" }}
                      >
                        <Share2 className="w-3.5 h-3.5" /> Compartir
                      </button>
                      {canManageCerts && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(cert)}
                            className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: "var(--accent)" }}
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(cert.id)}
                            disabled={deletingId === cert.id}
                            className="flex items-center gap-1 text-xs font-semibold text-red-500 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> {deletingId === cert.id ? "…" : "Revocar"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </RewardCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
