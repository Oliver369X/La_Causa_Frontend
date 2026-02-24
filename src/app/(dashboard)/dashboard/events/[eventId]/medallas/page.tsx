"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Award, Plus, Trophy, ArrowLeft } from "lucide-react";
import { eventBadgesApi } from "@/features/gamification/api/gamificationApi";
import { eventsApi } from "@/features/events/api/eventsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { toast } from "sonner";
import Link from "next/link";

export default function EventMedallasPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<{ id: string; nombre: string } | null>(null);
  const [medals, setMedals] = useState<Array<{ id: string; nombre: string }>>([]);
  const [participants, setParticipants] = useState<Array<{ id: string; usuario_id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAward, setShowAward] = useState(false);

  const [formNombre, setFormNombre] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImg, setFormImg] = useState("https://placehold.co/64x64");
  const [awardUsuarioId, setAwardUsuarioId] = useState("");
  const [awardInsigniaId, setAwardInsigniaId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    Promise.all([
      eventsApi.getById(eventId),
      eventBadgesApi.list(eventId),
      eventsApi.listApplications(eventId),
    ])
      .then(([ev, m, p]) => {
        setEvent(ev);
        setMedals(Array.isArray(m) ? m : []);
        setParticipants(p.filter((a: { estado: string }) => a.estado === "APROBADO" || a.estado === "ASISTIO"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleCreate = async () => {
    if (!formNombre.trim() || !formDesc.trim()) {
      toast.error("Nombre y descripción requeridos");
      return;
    }
    setSubmitting(true);
    try {
      await eventBadgesApi.create(eventId, {
        nombre: formNombre,
        descripcion: formDesc,
        url_imagen: formImg || "https://placehold.co/64x64",
        tipo: "TAREA_ESPECIAL",
        rareza: "COMUN",
        da_xp: true,
      });
      toast.success("Medalla creada");
      setShowCreate(false);
      setFormNombre("");
      setFormDesc("");
      eventBadgesApi.list(eventId).then((m) => setMedals(Array.isArray(m) ? m : []));
    } catch {
      toast.error("Error al crear medalla");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAward = async () => {
    if (!awardUsuarioId || !awardInsigniaId) {
      toast.error("Selecciona voluntario y medalla");
      return;
    }
    setSubmitting(true);
    try {
      await eventBadgesApi.award(eventId, {
        usuario_id: awardUsuarioId,
        insignia_id: awardInsigniaId,
      });
      toast.success("Medalla otorgada");
      setShowAward(false);
      setAwardUsuarioId("");
      setAwardInsigniaId("");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail ?? "Error al otorgar medalla");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !event) {
    return (
      <>
        <TopBar title="Medallas del evento" />
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Medallas del evento" />
      <div className="flex-1 p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/events"
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Eventos
          </Link>
        </div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Medallas – {event.nombre}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Crea medallas para este evento y otórgalas a voluntarios destacados.
        </p>

        <div className="flex gap-3">
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4" /> Crear medalla
          </Button>
          <Button variant="outline" onClick={() => setShowAward(true)} size="sm">
            <Trophy className="w-4 h-4" /> Otorgar medalla
          </Button>
        </div>

        {showCreate && (
          <Card>
            <h3 className="font-semibold mb-4">Nueva medalla</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Mejor coordinador"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">URL imagen</label>
                <input
                  value={formImg}
                  onChange={(e) => setFormImg(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Descripción</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Reconocimiento por..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreate} loading={submitting}>Crear</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </Card>
        )}

        {showAward && (
          <Card>
            <h3 className="font-semibold mb-4">Otorgar medalla a voluntario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Voluntario</label>
                <select
                  value={awardUsuarioId}
                  onChange={(e) => setAwardUsuarioId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <option value="">Seleccionar…</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.usuario_id}>{p.usuario_id.slice(0, 8)}…</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Medalla</label>
                <select
                  value={awardInsigniaId}
                  onChange={(e) => setAwardInsigniaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <option value="">Seleccionar…</option>
                  {medals.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                {medals.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Crea una medalla primero.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAward} loading={submitting}>Otorgar</Button>
              <Button variant="outline" onClick={() => setShowAward(false)}>Cancelar</Button>
            </div>
          </Card>
        )}

        <div>
          <h3 className="font-semibold mb-3">Medallas del evento</h3>
          {medals.length === 0 ? (
            <EmptyState
              title="Sin medallas"
              description="Crea medallas para reconocer a los voluntarios destacados de este evento."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {medals.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl flex items-center gap-3"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: "var(--bg-subtle)" }}>
                    🏅
                  </div>
                  <p className="font-medium text-sm">{m.nombre}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
