"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { eventsApi, type CreateEventData, type Event } from "@/features/events/api/eventsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import Link from "next/link";
import { Plus, Calendar, Clock, Send, MessageSquare, Award, Brain, Download, ImagePlus, MapPin, Users } from "lucide-react";
import { LocationMapPicker, type LocationPoint } from "@/shared/ui/LocationMapPicker";
import { formatDate } from "@/shared/utils/utils";
import { geocodeWithNominatim, reverseGeocodeWithNominatim } from "@/shared/utils/geocoding";
import { toast } from "sonner";
import { extractApiDetail } from "@/shared/utils/apiError";
import { agentApi } from "@/features/agent/api/agentApi";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { downloadCsv } from "@/shared/lib/csvExport";
import { uploadImage } from "@/features/uploads/api/uploadApi";

type EventTab = "proximos" | "curso" | "pasados";

/** Campos de formulario locales (p. ej. texto de dirección antes de geocodificar). */
type EventFormState = Partial<CreateEventData> & { ubicacion?: string };

function nowForDatetimeLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function validateEventDates(fechaInicio: string, fechaFin: string): string | null {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const now = new Date();
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return "Las fechas no son válidas.";
  }
  const margin24h = 24 * 60 * 60 * 1000;
  if (inicio.getTime() < now.getTime() - margin24h) {
    return "La fecha de inicio no puede estar en el pasado.";
  }
  if (fin <= inicio) {
    return "La fecha de fin debe ser posterior a la de inicio.";
  }
  if (fin.getTime() < now.getTime() - margin24h) {
    return "La fecha de fin no puede estar en el pasado.";
  }
  return null;
}

function classifyEvents(events: Event[]): { proximos: Event[]; curso: Event[]; pasados: Event[] } {
  const now = new Date();
  const proximos: Event[] = [];
  const curso: Event[] = [];
  const pasados: Event[] = [];
  for (const e of events) {
    const inicio = new Date(e.fecha_inicio);
    const fin = new Date(e.fecha_fin);
    if (fin < now) pasados.push(e);
    else if (inicio > now) proximos.push(e);
    else curso.push(e);
  }
  return { proximos, curso, pasados };
}

function timeUntil(date: string): string {
  const difference = new Date(date).getTime() - Date.now();
  if (difference <= 0) return "En curso";
  const hours = Math.ceil(difference / 3_600_000);
  if (hours < 48) return `Faltan ${hours} h`;
  return `Faltan ${Math.ceil(hours / 24)} días`;
}

export default function EventsPage() {
  const { activeOrgId } = useAuthStore();
  const { isVolunteerExperience } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const qc = useQueryClient();

  const { data: paidAccess } = useQuery({
    queryKey: ["agent-access", activeOrgId],
    queryFn: () => agentApi.getAccess(activeOrgId),
    enabled: !isVolunteer && !!activeOrgId,
  });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EventFormState>({});
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [ubicacionGeo, setUbicacionGeo] = useState<LocationPoint | null>(null);
  const [geocodingMap, setGeocodingMap] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const reverseAbortRef = useRef<AbortController | null>(null);
  const [tab, setTab] = useState<EventTab>("curso");
  const minDateTimeLocal = nowForDatetimeLocal();
  const minFechaFinLocal =
    formData.fecha_inicio && formData.fecha_inicio > minDateTimeLocal
      ? formData.fecha_inicio
      : minDateTimeLocal;

  useEffect(() => {
    const raw = formData.ubicacion?.trim() ?? "";
    if (raw.length < 3) {
      if (raw.length === 0) setGeocodeError(null);
      geocodeAbortRef.current?.abort();
      setGeocodingMap(false);
      return;
    }

    geocodeAbortRef.current?.abort();
    const t = window.setTimeout(() => {
      const ac = new AbortController();
      geocodeAbortRef.current = ac;
      setGeocodingMap(true);
      setGeocodeError(null);
      void geocodeWithNominatim(raw, ac.signal)
        .then((result) => {
          if (ac.signal.aborted) return;
          if (result) {
            setUbicacionGeo({
              lat: result.lat,
              lng: result.lng,
              direccion: result.displayName,
            });
            setFormData((prev) => ({ ...prev, ubicacion: result.displayName }));
            setGeocodeError(null);
          } else {
            setGeocodeError("No encontramos ese lugar en Bolivia. Prueba otra búsqueda o marca en el mapa.");
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setGeocodeError("No se pudo buscar la dirección. Intenta de nuevo o marca en el mapa.");
        })
        .finally(() => {
          if (!ac.signal.aborted) setGeocodingMap(false);
        });
    }, 650);

    return () => {
      window.clearTimeout(t);
    };
  }, [formData.ubicacion]);

  /** Clic en mapa sin dirección: obtener texto con geocodificación inversa. */
  useEffect(() => {
    if (!ubicacionGeo || ubicacionGeo.direccion) return;
    const lat = ubicacionGeo.lat;
    const lng = ubicacionGeo.lng;
    reverseAbortRef.current?.abort();
    const ac = new AbortController();
    reverseAbortRef.current = ac;
    void reverseGeocodeWithNominatim(lat, lng, ac.signal)
      .then((name) => {
        if (ac.signal.aborted || !name) return;
        setUbicacionGeo((prev) => {
          if (!prev) return prev;
          if (prev.direccion) return prev;
          if (Math.abs(prev.lat - lat) > 1e-5 || Math.abs(prev.lng - lng) > 1e-5) return prev;
          return { ...prev, direccion: name };
        });
        setFormData((prev) => ({ ...prev, ubicacion: name }));
      })
      .catch(() => {});
    return () => ac.abort();
  }, [ubicacionGeo?.lat, ubicacionGeo?.lng, ubicacionGeo?.direccion]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", isVolunteer ? "volunteer" : "org", activeOrgId],
    queryFn: () => eventsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setShowForm(false);
      setFormData({});
      setCoverPreview(null);
      setUbicacionGeo(null);
      toast.success("Evento creado como borrador");
    },
    onError: (err: unknown) => {
      toast.error(extractApiDetail(err, "No se pudo crear el evento."));
    },
  });

  const [applyEventId, setApplyEventId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const applyMutation = useMutation({
    mutationFn: ({ eventId, mensaje }: { eventId: string; mensaje?: string }) =>
      eventsApi.apply(eventId, mensaje),
    onSuccess: (application, { eventId }) => {
      const applicationState = String(application.estado ?? "pendiente").toLowerCase();
      // Actualiza de inmediato la tarjeta: evita que el voluntario pueda enviar
      // la misma solicitud de nuevo mientras se completa el refetch.
      qc.setQueriesData<Event[]>({ queryKey: ["events"] }, (currentEvents) =>
        currentEvents?.map((event) =>
          event.id === eventId
            ? { ...event, mi_estado_solicitud: applicationState }
            : event
        )
      );
      qc.invalidateQueries({ queryKey: ["events"] });
      setApplyEventId(null);
      setApplyMessage("");
      toast.success(
        applicationState === "aprobado"
          ? "Ya estás registrado en este evento."
          : "Tu postulación fue enviada. La organización la revisará pronto."
      );
    },
    onError: (err: unknown) => {
      toast.error(extractApiDetail(err, "No puedes postularte a este evento."));
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const { proximos, curso, pasados } = useMemo(() => classifyEvents(events), [events]);

  const displayedEvents = tab === "proximos" ? proximos : tab === "curso" ? curso : pasados;

  const canPostular = (e: Event) => {
    const applicationState = String(e.mi_estado_solicitud ?? "").toLowerCase();
    return isVolunteer && (e.estado === "publicado" || e.estado === "en_curso") &&
      !["aprobado", "asistio", "pendiente"].includes(applicationState);
  };

  const statusLabels: Record<string, string> = {
    borrador: "Borrador",
    publicado: "Publicado",
    en_curso: "En curso",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  };

  return (
    <>
      <TopBar title="Eventos" />
      <div className="flex-1 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold">
              {isVolunteer ? "Eventos" : "Todos los eventos"}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {tab === "proximos" && `${proximos.length} próximos`}
              {tab === "curso" && `${curso.length} en curso`}
              {tab === "pasados" && `${pasados.length} pasados`}
            </p>
          </div>

          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            {(["proximos", "curso", "pasados"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === t ? "var(--bg-card)" : "transparent",
                  color: tab === t ? "var(--text)" : "var(--text-muted)",
                  boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.15)" : undefined,
                }}
              >
                {t === "proximos" ? "Próximos" : t === "curso" ? "En curso" : "Pasados"}
              </button>
            ))}
          </div>
          {!isVolunteer && !activeOrgId && (
            <p className="text-sm w-full sm:w-auto" style={{ color: "var(--text-muted)" }}>
              Selecciona una organización en la barra lateral para crear eventos.
            </p>
          )}
          {isVolunteer && !activeOrgId && (
            <p className="text-sm w-full sm:w-auto" style={{ color: "var(--text-muted)" }}>
              Únete a una organización o selecciónala en la barra lateral para ver sus eventos.
            </p>
          )}
          {!isVolunteer && activeOrgId && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadCsv(
                    `eventos-${new Date().toISOString().slice(0, 10)}.csv`,
                    ["nombre", "estado", "fecha_inicio", "fecha_fin", "cupo", "campana"],
                    events.map((e) => [
                      e.nombre,
                      e.estado,
                      e.fecha_inicio,
                      e.fecha_fin,
                      e.cupo_maximo,
                      e.campana ?? "",
                    ]),
                  );
                  toast.success("CSV de eventos descargado");
                }}
                disabled={events.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                <Plus className="w-4 h-4" />
                Nuevo evento
              </button>
            </div>
          )}
        </div>

        {!isVolunteer && activeOrgId && (paidAccess?.can_use || paidAccess?.is_paid) && (
          <div
            className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl text-sm"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
          >
            <Brain className="w-5 h-5 shrink-0" style={{ color: "var(--accent)" }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium">Recomendaciones de voluntarios</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Definí requisitos y obtené sugerencias ordenadas según habilidades, disponibilidad y experiencia del equipo.{" "}
                <Link href="/dashboard/matching" className="font-medium underline" style={{ color: "var(--accent)" }}>
                  Abrir recomendaciones
                </Link>
              </p>
            </div>
          </div>
        )}

        {!isVolunteer && showForm && (
          <div className="mb-8 p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="font-semibold mb-5">Crear nuevo evento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>Arte o portada del evento</label>
                <label className="group block relative min-h-44 rounded-2xl overflow-hidden cursor-pointer" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
                  {coverPreview ? (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.45), transparent), url(${coverPreview})` }} />
                  ) : null}
                  <div className="relative min-h-44 flex flex-col items-center justify-center gap-2 p-5 text-center" style={{ color: coverPreview ? "white" : "var(--text-muted)" }}>
                    <ImagePlus className="w-7 h-7" />
                    <p className="text-sm font-medium">{uploadingCover ? "Subiendo portada…" : coverPreview ? "Cambiar arte del evento" : "Añadir arte del evento"}</p>
                    <p className="text-xs">JPG, PNG o WebP. Se mostrará en el catálogo de la organización.</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingCover}
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setUploadingCover(true);
                      try {
                        const uploaded = await uploadImage(file);
                        setCoverPreview(uploaded.url);
                        setFormData((previous) => ({ ...previous, imagen_url: uploaded.url }));
                        toast.success("Portada cargada correctamente");
                      } catch (error) {
                        toast.error(extractApiDetail(error, "No se pudo subir la portada."));
                      } finally {
                        setUploadingCover(false);
                        event.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
              {[
                { label: "Nombre *", key: "nombre", type: "text", placeholder: "Maratón de Solidaridad" },
                { label: "Descripción", key: "descripcion", type: "text", placeholder: "Descripción opcional" },
                { label: "Fecha inicio *", key: "fecha_inicio", type: "datetime-local", placeholder: "" },
                { label: "Fecha fin *", key: "fecha_fin", type: "datetime-local", placeholder: "" },
                { label: "Cupo máximo *", key: "cupo_maximo", type: "number", placeholder: "50" },
                { label: "Campaña / proyecto (opcional)", key: "campana", type: "text", placeholder: "Ej. Educación comunitaria 2026" },
                { label: "Ubicación (dirección)", key: "ubicacion", type: "text", placeholder: "Busca o escribe; al ubicar en el mapa se completa aquí" },
              ].map((f) => (
                <div key={f.key} className={f.key === "descripcion" || f.key === "ubicacion" ? "md:col-span-2" : ""}>
                  <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>{f.label}</label>
                  {f.key === "descripcion" ? (
                    <textarea
                      placeholder={f.placeholder}
                      value={(formData as Record<string, string>)[f.key] ?? ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  ) : (
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      min={
                        f.type === "datetime-local" && f.key === "fecha_fin"
                          ? (formData.fecha_inicio || undefined)
                          : undefined
                      }
                      value={(formData as Record<string, string>)[f.key] ?? ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  )}
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Mapa (se actualiza al escribir la dirección o puedes marcar a mano)
                </label>
                <LocationMapPicker
                  value={ubicacionGeo}
                  onChange={setUbicacionGeo}
                  placeholder="Escribe arriba para ubicar automáticamente, o haz clic en el mapa para ajustar el punto"
                />
                {geocodingMap && (
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    Buscando en el mapa…
                  </p>
                )}
                {geocodeError && !geocodingMap && (
                  <p className="text-xs mt-2" style={{ color: "#f87171" }}>
                    {geocodeError}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              El evento se creará como borrador. Publícalo cuando esté listo desde el detalle del evento.
            </p>
            {createMutation.isError && (
              <p className="text-xs mt-3" style={{ color: "#f87171" }}>
                {extractApiDetail(createMutation.error, "Error al crear el evento.")}
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                disabled={createMutation.isPending}
                onClick={() => {
                  const fd = formData as Record<string, unknown>;
                  const nombre = (fd.nombre as string)?.trim();
                  const fechaInicio = (fd.fecha_inicio as string)?.trim();
                  const fechaFin = (fd.fecha_fin as string)?.trim();
                  if (!nombre || !fechaInicio || !fechaFin) {
                    toast.error("Completa nombre y fechas de inicio y fin.");
                    return;
                  }
                  const dateError = validateEventDates(fechaInicio, fechaFin);
                  if (dateError) {
                    toast.error(dateError);
                    return;
                  }
                  const direccion = (fd.ubicacion as string)?.trim();
                  const hasUbicacion = direccion || ubicacionGeo;
                  createMutation.mutate({
                    organizacion_id: activeOrgId!,
                    nombre,
                    descripcion: (fd.descripcion as string) || undefined,
                    imagen_url: (fd.imagen_url as string) || undefined,
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    cupo_maximo: Math.max(1, Number(fd.cupo_maximo) || 50),
                    campana: typeof fd.campana === "string" && fd.campana.trim() ? fd.campana.trim() : undefined,
                    ubicacion_geo: hasUbicacion
                      ? {
                          direccion: direccion || undefined,
                          lat: ubicacionGeo?.lat,
                          lng: ubicacionGeo?.lng,
                        }
                      : undefined,
                  });
                }}
                className="px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                {createMutation.isPending ? "Creando…" : "Crear"}
              </button>
              <button
                onClick={() => { setShowForm(false); setCoverPreview(null); }}
                className="px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando eventos...</div>
        ) : !activeOrgId ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>
              {isVolunteer
                ? "Selecciona o únete a una organización para ver sus eventos."
                : "Selecciona una organización para gestionar eventos."}
            </p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>
              {tab === "proximos" && "No hay eventos próximos."}
            {tab === "curso" && "No hay eventos en curso."}
            {tab === "pasados" && "No hay eventos pasados."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayedEvents.map((event) => (
              <div
                key={event.id}
                className="overflow-hidden rounded-2xl transition-colors hover:opacity-90"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="relative h-40 bg-cover bg-center" style={{ backgroundImage: event.imagen_url ? `linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,.08)), url(${event.imagen_url})` : "linear-gradient(135deg, var(--accent), #312e81)" }}>
                  <span className="absolute left-4 bottom-3 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,.48)", color: "white" }}>{timeUntil(event.fecha_inicio)}</span>
                  <span className="absolute right-4 top-3 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,.9)", color: "#111" }}>{statusLabels[event.estado] ?? event.estado}</span>
                </div>
                <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-sm leading-snug">{event.nombre}</h3>
                </div>
                {event.descripcion && (
                  <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>{event.descripcion}</p>
                )}
                {event.campana && (
                  <p className="text-xs mb-3 font-medium" style={{ color: "var(--accent)" }}>
                    Campaña / proyecto: {event.campana}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(event.fecha_inicio)} · {formatDate(event.fecha_fin)}</span>
                </div>
                {event.ubicacion_geo?.direccion && <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-muted)" }}><MapPin className="w-3.5 h-3.5" /><span className="truncate">{event.ubicacion_geo.direccion}</span></div>}
                <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-muted)" }}><Users className="w-3.5 h-3.5" /><span>Hasta {event.cupo_maximo} voluntarios</span></div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    Ver detalle
                  </Link>
                  {canPostular(event) && (
                    <button
                      type="button"
                      data-testid="event-apply-btn"
                      onClick={() => setApplyEventId(event.id)}
                      disabled={applyMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {event.mi_estado_solicitud === "rechazado" ? "Volver a postularse" : "Postular"}
                    </button>
                  )}
                  {event.mi_estado_solicitud === "aprobado" && (
                    <span
                      className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-medium"
                      style={{ background: "rgba(34,197,94,.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,.2)" }}
                    >
                      Aceptado
                    </span>
                  )}
                  {event.mi_estado_solicitud === "pendiente" && (
                    <span
                      className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-medium"
                      style={{ background: "rgba(234,179,8,.15)", color: "#eab308", border: "1px solid rgba(234,179,8,.2)" }}
                    >
                      Pendiente de aprobación
                    </span>
                  )}
                  {event.mi_estado_solicitud === "rechazado" && !canPostular(event) && (
                    <span
                      className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-medium"
                      style={{ background: "rgba(239,68,68,.15)", color: "#f87171", border: "1px solid rgba(239,68,68,.2)" }}
                    >
                      Rechazado
                    </span>
                  )}
                  {!isVolunteer && (event.estado === "finalizado" || event.estado === "publicado" || event.estado === "en_curso") && (
                    <Link
                      href={`/dashboard/events/${event.id}/medallas`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    >
                      <Award className="w-3.5 h-3.5" />
                      Medallas
                    </Link>
                  )}
                  {event.estado === "finalizado" && (
                    <Link
                      href={`/dashboard/events/${event.id}/retrospectiva`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Ver retrospectiva
                    </Link>
                  )}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {applyEventId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,.5)" }}
            onClick={() => setApplyEventId(null)}
          >
            <div
              className="max-w-md w-full p-6 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold mb-4">Postular al evento</h3>
              <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                Mensaje de motivación (opcional)
              </label>
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="Cuéntanos por qué quieres participar..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none mb-4"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="event-apply-submit"
                  onClick={() =>
                    applyMutation.mutate({ eventId: applyEventId, mensaje: applyMessage.trim() || undefined })
                  }
                  disabled={applyMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {applyMutation.isPending ? "Enviando..." : "Enviar solicitud"}
                </button>
                <button
                  onClick={() => setApplyEventId(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
