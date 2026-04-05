"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { eventsApi, type CreateEventData, type Event } from "@/features/events/api/eventsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import Link from "next/link";
import { Plus, Calendar, Clock, Send, MessageSquare, Award, Brain } from "lucide-react";
import { LocationMapPicker, type LocationPoint } from "@/shared/ui/LocationMapPicker";
import { formatDate } from "@/shared/utils/utils";
import { geocodeWithNominatim, reverseGeocodeWithNominatim } from "@/shared/utils/geocoding";

type EventTab = "proximos" | "curso" | "pasados";

/** Campos de formulario locales (p. ej. texto de dirección antes de geocodificar). */
type EventFormState = Partial<CreateEventData> & { ubicacion?: string };

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

export default function EventsPage() {
  const { activeOrgId, user } = useAuthStore();
  const isVolunteer = user?.tipo === "voluntario";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EventFormState>({});
  const [ubicacionGeo, setUbicacionGeo] = useState<LocationPoint | null>(null);
  const [geocodingMap, setGeocodingMap] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const reverseAbortRef = useRef<AbortController | null>(null);
  const [tab, setTab] = useState<EventTab>("curso");

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
    queryKey: ["events", isVolunteer ? "all" : activeOrgId, isVolunteer ? activeOrgId : null],
    queryFn: () => eventsApi.list(isVolunteer ? (activeOrgId ?? undefined) : activeOrgId ?? undefined),
    enabled: isVolunteer || !!activeOrgId,
  });

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", activeOrgId] });
      setShowForm(false);
      setFormData({});
      setUbicacionGeo(null);
    },
  });

  const [applyEventId, setApplyEventId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const applyMutation = useMutation({
    mutationFn: ({ eventId, mensaje }: { eventId: string; mensaje?: string }) =>
      eventsApi.apply(eventId, mensaje),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setApplyEventId(null);
      setApplyMessage("");
    },
  });

  const { proximos, curso, pasados } = useMemo(() => classifyEvents(events), [events]);

  const displayedEvents = tab === "proximos" ? proximos : tab === "curso" ? curso : pasados;

  const canPostular = (e: Event) =>
    isVolunteer && (e.estado === "publicado" || e.estado === "en_curso");

  const statusColors: Record<string, { background: string; color: string }> = {
    borrador:   { background: "var(--bg-subtle)",      color: "var(--text-muted)" },
    publicado:  { background: "rgba(34,197,94,.15)",  color: "#22c55e" },
    en_curso:   { background: "rgba(59,130,246,.15)", color: "#60a5fa" },
    finalizado: { background: "rgba(59,130,246,.15)", color: "#60a5fa" },
    cancelado:  { background: "rgba(239,68,68,.15)", color: "#f87171" },
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
          {!isVolunteer && activeOrgId && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              <Plus className="w-4 h-4" />
              Nuevo evento
            </button>
          )}
        </div>

        {!isVolunteer && activeOrgId && (
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
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  const fd = formData as Record<string, unknown>;
                  const direccion = (fd.ubicacion as string)?.trim();
                  const hasUbicacion = direccion || ubicacionGeo;
                  createMutation.mutate({
                    organizacion_id: activeOrgId!,
                    nombre: (fd.nombre as string) || "",
                    descripcion: (fd.descripcion as string) || undefined,
                    fecha_inicio: (fd.fecha_inicio as string) || "",
                    fecha_fin: (fd.fecha_fin as string) || "",
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
                className="px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Crear
              </button>
              <button
                onClick={() => setShowForm(false)}
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
                className="p-6 rounded-2xl transition-colors hover:opacity-90"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-sm leading-snug">{event.nombre}</h3>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={statusColors[event.estado] ?? { background: "var(--bg-subtle)", color: "var(--text-muted)" }}
                  >
                    {statusLabels[event.estado] ?? event.estado}
                  </span>
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
                  <span>{formatDate(event.fecha_inicio)}</span>
                </div>
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
                      onClick={() => setApplyEventId(event.id)}
                      disabled={applyMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Postular
                    </button>
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
