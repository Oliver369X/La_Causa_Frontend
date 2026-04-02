"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  FileText,
  Send,
  Download,
  Link2,
  ClipboardCopy,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import {
  certificatesApi,
  plantillasCertificadoApi,
  type Certificate,
} from "@/features/certificates/api/certificatesApi";
import { volunteersApi } from "@/features/volunteers/api/volunteersApi";
import { gamificationApi, type Season } from "@/features/gamification/api/gamificationApi";
import {
  buildCertificadosEmisionCsv,
  buildEnlacesVerificacionLista,
  downloadTextFile,
} from "@/features/certificates/lib/certificadosBulkExport";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { toast } from "sonner";
import { cn } from "@/shared/utils/utils";

export default function EmitirCertificadosPage() {
  const { activeOrgId, user } = useAuthStore();
  const isOrganizer = user?.tipo === "organizador";

  const [plantillaId, setPlantillaId] = useState("");
  const [temporadaId, setTemporadaId] = useState<string>("");
  const [gestionPeriodo, setGestionPeriodo] = useState("2025");
  const [tituloBase, setTituloBase] = useState("Certificado de voluntariado");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ultimaEmision, setUltimaEmision] = useState<Certificate[] | null>(null);
  const [solicitados, setSolicitados] = useState(0);

  const { data: plantillas = [], isLoading: loadingPlantillas } = useQuery({
    queryKey: ["plantillas-cert", activeOrgId],
    queryFn: () => plantillasCertificadoApi.list(activeOrgId!, true),
    enabled: !!activeOrgId && isOrganizer,
  });

  const { data: temporadas = [] } = useQuery({
    queryKey: ["temporadas", activeOrgId],
    queryFn: () => gamificationApi.getSeasons(activeOrgId!),
    enabled: !!activeOrgId && isOrganizer,
  });

  const { data: miembros = [], isLoading: loadingMiembros } = useQuery({
    queryKey: ["miembros-org", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: !!activeOrgId && isOrganizer,
  });

  const miembrosFiltrados = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return miembros;
    return miembros.filter(
      (m) =>
        (m.usuario_nombre?.toLowerCase().includes(q) ?? false) ||
        (m.usuario_email?.toLowerCase().includes(q) ?? false)
    );
  }, [miembros, filter]);

  const toggleOne = (usuarioId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(usuarioId)) next.delete(usuarioId);
      else next.add(usuarioId);
      return next;
    });
  };

  const seleccionarTodosFiltrados = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      miembrosFiltrados.forEach((m) => next.add(m.usuario_id));
      return next;
    });
  };

  const limpiarSeleccion = () => setSelected(new Set());

  const emitir = async () => {
    if (!activeOrgId || !plantillaId) {
      toast.error("Elige una plantilla activa.");
      return;
    }
    if (selected.size === 0) {
      toast.error("Selecciona al menos un voluntario.");
      return;
    }
    if (!tituloBase.trim() || tituloBase.trim().length < 3) {
      toast.error("El título debe tener al menos 3 caracteres.");
      return;
    }
    if (!gestionPeriodo.trim()) {
      toast.error("Indica el período de gestión (ej. 2025 o 2024-H2).");
      return;
    }
    setSubmitting(true);
    setUltimaEmision(null);
    const n = selected.size;
    setSolicitados(n);
    try {
      const emitidos = await certificatesApi.emitirPorGestion(activeOrgId, {
        plantilla_id: plantillaId,
        temporada_id: temporadaId || null,
        gestion_periodo: gestionPeriodo.trim(),
        usuario_ids: Array.from(selected),
        titulo_base: tituloBase.trim(),
      });
      setUltimaEmision(emitidos);
      if (emitidos.length === 0) {
        toast.message(
          "Ningún certificado nuevo",
          {
            description:
              "Todos los seleccionados ya tenían este certificado para la misma temporada y título, o hubo un fallo.",
          }
        );
      } else {
        toast.success(`Emitidos ${emitidos.length} certificado(s).`);
        if (emitidos.length < n) {
          toast.message("Algunos omitidos", {
            description: `${n - emitidos.length} ya existían (mismo título/temporada).`,
          });
        }
      }
    } catch {
      toast.error("No se pudo emitir. Revisa permisos y datos.");
    } finally {
      setSubmitting(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const exportarCsv = () => {
    if (!ultimaEmision?.length || !origin) return;
    const csv = buildCertificadosEmisionCsv(ultimaEmision, miembros, origin);
    const safe = gestionPeriodo.replace(/[^\w-]+/g, "_");
    downloadTextFile(`certificados-${safe}-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("CSV descargado");
  };

  const copiarEnlaces = async () => {
    if (!ultimaEmision?.length || !origin) return;
    const text = buildEnlacesVerificacionLista(ultimaEmision, origin);
    await navigator.clipboard.writeText(text);
    toast.success("Enlaces copiados al portapapeles");
  };

  if (!isOrganizer) {
    return (
      <div className="p-5 md:p-8 max-w-lg" style={{ color: "var(--text)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Solo los usuarios con rol de organización pueden emitir certificados masivos.
        </p>
        <Link href="/dashboard/certificates" className="text-sm mt-4 inline-block underline">
          Volver a certificados
        </Link>
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="p-5 md:p-8" style={{ color: "var(--text)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Selecciona una organización en el panel lateral.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 space-y-6 max-w-4xl" style={{ color: "var(--text)" }}>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard/certificates"
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Certificados
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" style={{ color: "var(--accent)" }} />
          Emisión por gestión
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Al cerrar una gestión, emite certificados a muchas personas a la vez. Luego exporta un CSV con emails y
          enlaces para enviar por correo o imprimir usando los enlaces de verificación.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" /> Datos de la emisión
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Plantilla activa</label>
            {loadingPlantillas ? (
              <Loader2 className="w-5 h-5 animate-spin opacity-50" />
            ) : plantillas.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No hay plantillas activas.{" "}
                <Link href="/dashboard/certificates/templates" className="underline">
                  Crear plantilla
                </Link>
              </p>
            ) : (
              <select
                value={plantillaId}
                onChange={(e) => setPlantillaId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">— Elegir —</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Temporada (opcional)</label>
            <select
              value={temporadaId}
              onChange={(e) => setTemporadaId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">Ninguna</option>
              {temporadas.map((t: Season) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.activa ? "(activa)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Período de gestión</label>
            <input
              value={gestionPeriodo}
              onChange={(e) => setGestionPeriodo(e.target.value)}
              placeholder="ej. 2025, 2024-H2"
              className="w-full h-10 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Título base del certificado</label>
            <input
              value={tituloBase}
              onChange={(e) => setTituloBase(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Voluntarios de la organización</h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {selected.size} seleccionado(s)
          </span>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-full h-9 px-3 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="xs" onClick={seleccionarTodosFiltrados}>
            <CheckSquare className="w-3.5 h-3.5" /> Añadir todos (vista filtrada)
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={limpiarSeleccion}>
            <Square className="w-3.5 h-3.5" /> Quitar todos
          </Button>
        </div>
        <div
          className="max-h-64 overflow-y-auto rounded-lg border divide-y"
          style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
        >
          {loadingMiembros ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin opacity-50" />
            </div>
          ) : miembrosFiltrados.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
              No hay miembros que coincidan.
            </p>
          ) : (
            miembrosFiltrados.map((m) => (
              <label
                key={m.usuario_id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:opacity-90",
                  selected.has(m.usuario_id) && "opacity-100"
                )}
                style={{ background: selected.has(m.usuario_id) ? "var(--accent-soft)" : "transparent" }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.usuario_id)}
                  onChange={() => toggleOne(m.usuario_id)}
                  className="rounded border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.usuario_nombre ?? m.usuario_id}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {m.usuario_email ?? "—"}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={emitir} loading={submitting} disabled={!plantillaId || selected.size === 0}>
          <Send className="w-4 h-4" /> Emitir certificados
        </Button>
      </div>

      {ultimaEmision && ultimaEmision.length > 0 && (
        <Card className="p-5 space-y-3" style={{ borderColor: "var(--g-logro)", background: "var(--g-logro-soft)" }}>
          <h3 className="text-sm font-semibold">Última emisión ({ultimaEmision.length})</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Descarga el CSV y ábrelo en Excel o Google Sheets: columnas de email y enlaces para mail merge. Los
            enlaces de verificación sirven si aún no hay PDF almacenado.
            {solicitados > ultimaEmision.length && (
              <span> Omitidos: {solicitados - ultimaEmision.length} (ya existían).</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exportarCsv}>
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copiarEnlaces}>
              <ClipboardCopy className="w-4 h-4" /> Copiar solo enlaces
            </Button>
          </div>
          <ul className="text-xs space-y-1 max-h-32 overflow-y-auto font-mono" style={{ color: "var(--text-muted)" }}>
            {ultimaEmision.slice(0, 15).map((c) => (
              <li key={c.id}>
                {c.titulo} · {c.codigo_validacion?.slice(0, 8)}…
              </li>
            ))}
            {ultimaEmision.length > 15 && <li>…</li>}
          </ul>
        </Card>
      )}

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        <Link2 className="w-3.5 h-3.5 inline mr-1" />
        Impresión: abre cada enlace de verificación en pestañas y usa Imprimir del navegador, o pega los enlaces en un
        documento. Envío por correo: importa el CSV en tu cliente (Gmail, Outlook) como combinación de correspondencia.
      </p>
    </div>
  );
}
