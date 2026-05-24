"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ChevronDown, CreditCard, Info, Loader2, Sparkles } from "lucide-react";
import { TopBar } from "@/shared/ui/Sidebar";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Spinner } from "@/shared/ui/Spinner";
import { useAuthStore } from "@/shared/store/authStore";
import { usePermissions } from "@/shared/hooks/usePermissions";
import {
  volunteersApi,
  type MatchResponse,
  type VolunteerMatchResult,
} from "@/features/volunteers/api/volunteersApi";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { agentApi } from "@/features/agent/api/agentApi";

const LS_WEIGHTS = "matching.calibration.weights.v1";

const WEIGHT_KEYS = ["skill", "reliability", "availability", "experience", "preference", "distance"] as const;
type WeightKey = (typeof WEIGHT_KEYS)[number];

const DEFAULT_SLIDER: Record<WeightKey, number> = {
  skill: 35,
  reliability: 20,
  availability: 15,
  experience: 15,
  preference: 10,
  distance: 5,
};

const LABELS: Record<WeightKey, string> = {
  skill: "Habilidades",
  reliability: "Confiabilidad",
  availability: "Disponibilidad en la fecha",
  experience: "Experiencia en eventos similares",
  preference: "Afinidad con el tipo de evento",
  distance: "Proximidad",
};

function normalizeWeights(w: Record<WeightKey, number>): Record<WeightKey, number> {
  const sum = WEIGHT_KEYS.reduce((s, k) => s + w[k], 0) || 1;
  return Object.fromEntries(WEIGHT_KEYS.map((k) => [k, w[k] / sum])) as Record<WeightKey, number>;
}

function weightedTotal(
  breakdown: Partial<Record<string, number>> | null | undefined,
  w: Record<WeightKey, number>,
): number {
  if (!breakdown) return 0;
  const nw = normalizeWeights(w);
  return WEIGHT_KEYS.reduce((s, k) => {
    const v = breakdown[k];
    return s + (typeof v === "number" ? nw[k] * v : 0);
  }, 0);
}

interface SkillDraft {
  skill_id: string;
  skill_name: string;
  min_level: number;
  critical: boolean;
}

function confianzaLabel(c: string): string {
  if (c === "high") return "Alta";
  if (c === "medium") return "Media";
  if (c === "low") return "Baja";
  return c;
}

export default function MatchingPage() {
  const { activeOrgId } = useAuthStore();
  const { can } = usePermissions();
  const canView = can("viewMembers");

  const { data: access, isLoading: loadingAccess } = useQuery({
    queryKey: ["agent-access", activeOrgId],
    queryFn: () => agentApi.getAccess(activeOrgId),
    enabled: canView && !!activeOrgId,
  });
  const hasPaidAccess = access?.can_use === true;

  const [tipoEvento, setTipoEvento] = useState("workshop");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState(9);
  const [duracion, setDuracion] = useState(4);
  const [voluntariosNecesarios, setVoluntariosNecesarios] = useState(5);
  const [ubicacionLat, setUbicacionLat] = useState(0);
  const [ubicacionLon, setUbicacionLon] = useState(0);
  const [skills, setSkills] = useState<SkillDraft[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedMinLevel, setSelectedMinLevel] = useState(2);
  const [selectedCritical, setSelectedCritical] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [weights, setWeights] = useState<Record<WeightKey, number>>(DEFAULT_SLIDER);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_WEIGHTS);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<WeightKey, number>>;
      const next = { ...DEFAULT_SLIDER };
      for (const k of WEIGHT_KEYS) {
        if (typeof parsed[k] === "number" && parsed[k] >= 0) next[k] = parsed[k];
      }
      setWeights(next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_WEIGHTS, JSON.stringify(weights));
    } catch {
      /* ignore */
    }
  }, [weights]);

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["matching-members", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: canView && !!activeOrgId && hasPaidAccess,
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ["matching-skills"],
    queryFn: skillsApi.list,
    enabled: canView && hasPaidAccess,
  });

  const candidatosIds = useMemo(() => members.map((m) => m.usuario_id), [members]);

  const addSkill = () => {
    const selected = allSkills.find((s) => s.id === selectedSkillId);
    if (!selected) return;
    if (skills.some((s) => s.skill_id === selected.id)) return;
    setSkills((prev) => [
      ...prev,
      {
        skill_id: selected.id,
        skill_name: selected.nombre,
        min_level: selectedMinLevel,
        critical: selectedCritical,
      },
    ]);
    setSelectedSkillId("");
    setSelectedMinLevel(2);
    setSelectedCritical(false);
  };

  const matchMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrgId) throw new Error("Selecciona una organización activa.");
      if (candidatosIds.length === 0) throw new Error("No hay miembros en la organización para evaluar.");

      return volunteersApi.match({
        evento_id: crypto.randomUUID(),
        tipo_evento: tipoEvento,
        skills_requeridas: skills,
        fecha,
        hora_inicio: horaInicio,
        duracion_horas: duracion,
        ubicacion_lat: ubicacionLat,
        ubicacion_lon: ubicacionLon,
        voluntarios_necesarios: voluntariosNecesarios,
        candidatos_ids: candidatosIds,
        // Motor explicable con desglose; no se muestra nomenclatura interna en la UI.
        force_phase: 1,
      });
    },
    onSuccess: (data) => {
      setMatchResult(data);
    },
  });

  const displayRanking = useMemo((): VolunteerMatchResult[] => {
    if (!matchResult?.ranking.length) return [];
    const rows = [...matchResult.ranking];
    const hasBreakdown = rows.some((r) => r.breakdown && Object.keys(r.breakdown).length > 0);
    if (!hasBreakdown) {
      rows.sort((a, b) => b.match_score - a.match_score);
      return rows;
    }
    rows.sort((a, b) => {
      const sa = weightedTotal(a.breakdown ?? null, weights);
      const sb = weightedTotal(b.breakdown ?? null, weights);
      if (sa !== sb) return sb - sa;
      return b.match_score - a.match_score;
    });
    return rows;
  }, [matchResult, weights]);

  const resetWeights = () => setWeights({ ...DEFAULT_SLIDER });

  if (!canView) {
    return (
      <>
        <TopBar title="Recomendaciones" />
        <div className="p-6 md:p-8">
          <Card className="p-6">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No tenés permisos para ver recomendaciones de equipo.
            </p>
          </Card>
        </div>
      </>
    );
  }

  if (loadingAccess) {
    return (
      <>
        <TopBar title="Recomendaciones" />
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      </>
    );
  }

  if (access && !access.can_use) {
    const needsPlan = access.reason === "sin_plan_pago";
    const noOrg = access.reason === "sin_organizacion";
    return (
      <>
        <TopBar title="Recomendaciones" />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div
            className="max-w-md p-6 rounded-2xl text-center space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <AlertTriangle className="w-12 h-12 mx-auto" style={{ color: "var(--accent)" }} />
            <h2 className="text-lg font-semibold">Acceso restringido</h2>
            {needsPlan && (
              <>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Las recomendaciones con IA forman parte del Plan Pro. Actualizá tu suscripción para ordenar a tu equipo según habilidades, disponibilidad y experiencia.
                </p>
                <Link
                  href="/dashboard/subscriptions"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: "var(--accent)" }}
                >
                  <CreditCard className="w-4 h-4" />
                  Ver planes y suscribirse
                </Link>
              </>
            )}
            {noOrg && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Seleccioná o creá una organización para acceder a las recomendaciones.
              </p>
            )}
            {!needsPlan && !noOrg && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Esta función está disponible solo para organizadores con plan de pago.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Recomendaciones" />
      <div className="p-5 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" style={{ color: "var(--accent)" }} />
            Recomendaciones para tu equipo
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Ordenamos a los miembros según encaje con lo que el evento necesita: habilidades, disponibilidad, historial y ubicación.
          </p>
        </div>

        <Card className="p-5">
          <div className="flex gap-2 mb-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <div className="text-sm space-y-2" style={{ color: "var(--text-muted)" }}>
              <p className="font-medium" style={{ color: "var(--text)" }}>
                ¿Cómo funciona?
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Comparamos el perfil de cada persona con los requisitos que definís abajo.</li>
                <li>Quienes cumplen mejor habilidades críticas y tienen mejor disponibilidad suelen aparecer primero.</li>
                <li>Los textos de cada fila resumen los motivos principales (por ejemplo, skills faltantes o distancia).</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">Requisitos del evento</h2>

          {!activeOrgId && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Seleccioná una organización activa para cargar miembros.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Tipo de evento</label>
              <select
                value={tipoEvento}
                onChange={(e) => setTipoEvento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <option value="meetup">Meetup</option>
                <option value="workshop">Workshop</option>
                <option value="conferencia">Conferencia</option>
                <option value="hackathon">Hackathon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Voluntarios buscados</label>
              <input
                type="number"
                min={1}
                max={50}
                value={voluntariosNecesarios}
                onChange={(e) => setVoluntariosNecesarios(Number(e.target.value || 5))}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm mb-1">Hora inicio</label>
              <input
                type="number"
                min={0}
                max={23}
                value={horaInicio}
                onChange={(e) => setHoraInicio(Number(e.target.value || 9))}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Duración (h)</label>
              <input
                type="number"
                min={1}
                max={24}
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value || 4))}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Latitud</label>
              <input
                type="number"
                value={ubicacionLat}
                onChange={(e) => setUbicacionLat(Number(e.target.value || 0))}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Longitud</label>
              <input
                type="number"
                value={ubicacionLon}
                onChange={(e) => setUbicacionLon(Number(e.target.value || 0))}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium mb-2">Habilidades requeridas</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="md:col-span-2 px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <option value="">Seleccioná una habilidad…</option>
                {allSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={5}
                value={selectedMinLevel}
                onChange={(e) => setSelectedMinLevel(Number(e.target.value || 2))}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCritical}
                  onChange={(e) => setSelectedCritical(e.target.checked)}
                />
                Crítica
              </label>
              <Button variant="outline" type="button" onClick={addSkill} disabled={!selectedSkillId}>
                Agregar
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {skills.map((s) => (
                  <button
                    key={s.skill_id}
                    type="button"
                    onClick={() => setSkills((prev) => prev.filter((x) => x.skill_id !== s.skill_id))}
                    className="px-2 py-1 rounded-lg text-xs"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    {s.skill_name} · Nivel {s.min_level}
                    {s.critical ? " · crítica" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => matchMutation.mutate()}
            disabled={!activeOrgId || candidatosIds.length === 0 || loadingMembers}
            loading={matchMutation.isPending}
          >
            Obtener recomendaciones
          </Button>
          {loadingMembers && <Spinner className="inline ml-2" />}
          {candidatosIds.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Evaluando {candidatosIds.length} miembro{candidatosIds.length !== 1 ? "s" : ""} de la organización.
            </p>
          )}

          {matchMutation.error && (
            <p className="text-sm text-red-500">{(matchMutation.error as Error).message}</p>
          )}
        </Card>

        <details className="group rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
            <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
            Ajustar prioridades (opcional)
          </summary>
          <div className="px-4 pb-4 pt-0 space-y-4 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs pt-3" style={{ color: "var(--text-muted)" }}>
              Mové las barras para dar más peso a lo que más te importa al leer la lista. Solo reordena resultados cuando hay
              desglose por criterio; se guarda en este navegador.
            </p>
            <div className="space-y-3">
              {WEIGHT_KEYS.map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{LABELS[k]}</span>
                    <span style={{ color: "var(--text-muted)" }}>{weights[k]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[k]}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))
                    }
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" type="button" onClick={resetWeights}>
              Restablecer barras
            </Button>
          </div>
        </details>

        {matchResult && (
          <Card className="p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={`Candidatos evaluados: ${matchResult.total_candidatos}`} variant="default" />
            </div>
            {matchResult.advertencias.length > 0 && (
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {matchResult.advertencias.join(" · ")}
              </div>
            )}
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                    <th className="text-left px-3 py-2">Persona</th>
                    <th className="text-left px-3 py-2">Puntuación</th>
                    <th className="text-left px-3 py-2">Confianza</th>
                    <th className="text-left px-3 py-2">Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRanking.map((r) => {
                    const showCustom = !!(r.breakdown && Object.keys(r.breakdown).length);
                    const scoreDisplay = showCustom
                      ? weightedTotal(r.breakdown ?? null, weights).toFixed(1)
                      : r.match_score <= 1
                        ? (r.match_score * 100).toFixed(1)
                        : r.match_score.toFixed(1);
                    return (
                      <tr key={r.voluntario_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-3 py-2 align-top">{r.nombre || r.voluntario_id}</td>
                        <td className="px-3 py-2 align-top font-medium">{scoreDisplay}</td>
                        <td className="px-3 py-2 align-top">{confianzaLabel(r.confianza)}</td>
                        <td className="px-3 py-2 align-top text-xs" style={{ color: "var(--text-muted)" }}>
                          {r.explanation ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
