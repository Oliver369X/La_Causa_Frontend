"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, ExternalLink, CheckCircle, Plus, Users, Search } from "lucide-react";
import { toast } from "sonner";
import { manualsApi, type CreateManualPayload } from "@/features/manuals/api/manualsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { TopBar } from "@/shared/ui/Sidebar";
import { motionSpring, staggerFast } from "@/shared/lib/motion";

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ManualesPage() {
  const { user, activeOrgId } = useAuthStore();
  const { can, isSuperAdmin, canManageOrg } = usePermissions();
  const qc = useQueryClient();
  const isOrganizer = canManageOrg;
  const canCreateManual = isSuperAdmin || can("createEvents") || can("editOrg");
  const [search, setSearch] = useState("");

  const { data: manuals = [], isLoading } = useQuery({
    queryKey: ["manuals", activeOrgId],
    queryFn: () => manualsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateManualPayload>({
    titulo: "",
    descripcion: "",
    url_documento: "",
    requiere_aceptacion: false,
  });

  const createMutation = useMutation({
    mutationFn: () => manualsApi.create(activeOrgId!, form),
    onSuccess: () => {
      toast.success("Manual creado correctamente");
      qc.invalidateQueries({ queryKey: ["manuals", activeOrgId] });
      setShowForm(false);
      setForm({ titulo: "", descripcion: "", url_documento: "", requiere_aceptacion: false });
    },
    onError: () => toast.error("Error al crear el manual"),
  });

  const acceptMutation = useMutation({
    mutationFn: (manualId: string) => manualsApi.accept(manualId),
    onSuccess: () => {
      toast.success("Términos aceptados");
      qc.invalidateQueries({ queryKey: ["manuals", activeOrgId] });
    },
    onError: () => toast.error("Error al aceptar los términos"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.url_documento.trim()) {
      toast.error("Título y URL del documento son obligatorios");
      return;
    }
    if (!isValidHttpUrl(form.url_documento)) {
      toast.error("La URL debe comenzar con http:// o https://");
      return;
    }
    createMutation.mutate();
  };

  const filteredManuals = useMemo(() => {
    if (!search.trim()) return manuals;
    const q = search.toLowerCase();
    return manuals.filter(
      (m) =>
        m.titulo.toLowerCase().includes(q) ||
        (m.descripcion ?? "").toLowerCase().includes(q)
    );
  }, [manuals, search]);

  const userAlreadyAccepted = (manualId: string) =>
    manuals
      .find((m) => m.id === manualId)
      ?.aceptaciones.some((a) => a.usuario_id === user?.id) ?? false;

  return (
    <>
      <TopBar title="Manuales" />
      <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionSpring.tab}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" style={{ color: "var(--accent)" }} />
              Manuales
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Documentos, guías y términos de la organización. Voluntarios: revisá y aceptá los que correspondan.
            </p>
          </div>
          {canCreateManual && (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-4 h-4" />
              {showForm ? "Cancelar" : "Nuevo manual"}
            </Button>
          )}
        </motion.div>

        {manuals.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o descripción…"
              className="w-full h-10 pl-10 pr-4 text-sm rounded-xl outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        )}

        {canCreateManual && showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={motionSpring.tab}
            onSubmit={handleCreate}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                  Título
                </label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Código de conducta"
                  className="w-full h-10 px-4 text-sm rounded-xl outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                  URL del documento (https)
                </label>
                <input
                  type="url"
                  value={form.url_documento}
                  onChange={(e) => setForm((f) => ({ ...f, url_documento: e.target.value }))}
                  placeholder="https://docs.google.com/… o PDF público"
                  className="w-full h-10 px-4 text-sm rounded-xl outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                rows={3}
                placeholder="Breve descripción del contenido del manual…"
                className="w-full px-4 py-2.5 text-sm rounded-xl outline-none resize-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, requiere_aceptacion: !f.requiere_aceptacion }))}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: form.requiere_aceptacion ? "var(--accent)" : "var(--border)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: form.requiere_aceptacion ? "calc(100% - 1.125rem)" : "0.125rem" }}
                />
              </button>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Requiere aceptación de T&C
              </span>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={createMutation.isPending}>
                Crear manual
              </Button>
            </div>
          </motion.form>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filteredManuals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-12 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <EmptyState
              title={search.trim() ? "Sin coincidencias" : "Sin manuales"}
              description={search.trim() ? "Probá otra búsqueda." : "No hay manuales publicados en esta organización."}
              icon={<FileText className="w-14 h-14 mx-auto" style={{ color: "var(--text-muted)" }} />}
            />
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredManuals.map((manual, i) => {
              const accepted = userAlreadyAccepted(manual.id);
              return (
                <motion.div
                  key={manual.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...motionSpring.tab, delay: staggerFast * i }}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--accent-soft)" }}
                    >
                      <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm line-clamp-2">{manual.titulo}</p>
                      {manual.descripcion && (
                        <p className="text-xs mt-0.5 line-clamp-3" style={{ color: "var(--text-muted)" }}>
                          {manual.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    <a
                      href={manual.url_documento}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver documento
                    </a>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {manual.aceptaciones.length} aceptaciones
                    </span>
                  </div>

                  {manual.requiere_aceptacion && !isOrganizer && (
                    <div className="pt-1">
                      {accepted ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          T&C aceptados
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => acceptMutation.mutate(manual.id)}
                          loading={acceptMutation.isPending}
                        >
                          Aceptar T&C
                        </Button>
                      )}
                    </div>
                  )}

                  {manual.requiere_aceptacion && isOrganizer && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg w-fit"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Requiere aceptación
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
