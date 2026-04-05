"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, FlaskConical, Play, RefreshCcw, Sparkles } from "lucide-react";
import { TopBar } from "@/shared/ui/Sidebar";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Spinner } from "@/shared/ui/Spinner";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useAuthStore } from "@/shared/store/authStore";
import { volunteersApi, type MatchResponse } from "@/features/volunteers/api/volunteersApi";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { mlAdminApi } from "@/features/ml/api/mlAdminApi";

type PhaseChoice = 1 | 2 | 3;

interface SkillDraft {
  skill_id: string;
  skill_name: string;
  min_level: number;
  critical: boolean;
}

export default function MLLabPage() {
  const qc = useQueryClient();
  const { activeOrgId } = useAuthStore();
  const { isSuperAdmin } = usePermissions();
  const canUseLab = isSuperAdmin;

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
  const [syntheticSamples, setSyntheticSamples] = useState(300);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ["ml-status"],
    queryFn: mlAdminApi.getStatus,
    enabled: canUseLab,
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["ml-lab-members", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: canUseLab && !!activeOrgId,
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ["ml-lab-skills"],
    queryFn: skillsApi.list,
    enabled: canUseLab,
  });

  const candidatosIds = useMemo(
    () => members.map((m) => m.usuario_id),
    [members]
  );

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
    mutationFn: async (phase: PhaseChoice) => {
      if (!activeOrgId) throw new Error("Selecciona una organización activa.");
      if (candidatosIds.length === 0) throw new Error("No hay candidatos en la organización.");

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
        force_phase: phase,
      });
    },
    onSuccess: (data) => {
      setMatchResult(data);
    },
  });

  const generateSyntheticMutation = useMutation({
    mutationFn: () => mlAdminApi.generateSynthetic(syntheticSamples),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ml-status"] });
    },
  });

  const retrainMutation = useMutation({
    mutationFn: (phase: 2 | 3) =>
      mlAdminApi.retrainPhase(phase, {
        bootstrap_samples: syntheticSamples,
        seed: 42,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ml-status"] });
    },
  });

  if (!canUseLab) {
    return (
      <>
        <TopBar title="ML Lab" />
        <div className="p-6 md:p-8">
          <Card className="p-6">
            <p className="text-sm">
              ML Lab es solo para super-administradores (pipeline, sintéticos, reentrenamiento). El matching en producción usa fase 1 desde el flujo de eventos/voluntarios.
            </p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="ML Lab" />
      <div className="p-5 md:p-8 space-y-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Estado del pipeline</h2>
          </div>
          {loadingStatus ? (
            <Spinner />
          ) : status ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={`Fase activa auto: ${status.active_phase}`} variant="default" />
                <Badge label={`Labels: ${status.total_labeled_matches}`} variant="default" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["phase_1", "phase_2", "phase_3"] as const).map((k) => {
                  const p = status.phases[k];
                  return (
                    <div
                      key={k}
                      className="rounded-xl p-3"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <p className="font-medium">{k.replace("_", " ").toUpperCase()}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {p.type}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        disponible: {p.available ? "sí" : "no"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Entrenamiento con data sintética</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Muestras sintéticas (100-500 recomendado)</label>
              <input
                type="number"
                min={100}
                max={500}
                value={syntheticSamples}
                onChange={(e) => setSyntheticSamples(Number(e.target.value || 300))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <Button
              onClick={() => generateSyntheticMutation.mutate()}
              loading={generateSyntheticMutation.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generar data
            </Button>
            <Button
              onClick={() => retrainMutation.mutate(2)}
              loading={retrainMutation.isPending}
            >
              Entrenar Fase 2
            </Button>
            <Button
              onClick={() => retrainMutation.mutate(3)}
              loading={retrainMutation.isPending}
            >
              Entrenar Fase 3
            </Button>
          </div>
          {retrainMutation.data && (
            <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
              {retrainMutation.data.message} · muestras: {retrainMutation.data.trained_samples}
            </p>
          )}
          {generateSyntheticMutation.data && (
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              {generateSyntheticMutation.data.message}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">Prueba comparativa por fase</h2>
            <Button
              variant="outline"
              onClick={() => qc.invalidateQueries({ queryKey: ["ml-status"] })}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refrescar estado
            </Button>
          </div>

          {!activeOrgId && (
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Selecciona una organización activa para obtener candidatos.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-sm mb-1">Tipo evento</label>
              <select
                value={tipoEvento}
                onChange={(e) => setTipoEvento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <option value="meetup">meetup</option>
                <option value="workshop">workshop</option>
                <option value="conferencia">conferencia</option>
                <option value="hackathon">hackathon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Voluntarios necesarios</label>
              <input
                type="number"
                min={1}
                max={50}
                value={voluntariosNecesarios}
                onChange={(e) => setVoluntariosNecesarios(Number(e.target.value || 5))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-sm mb-1">Hora</label>
              <input
                type="number"
                min={0}
                max={23}
                value={horaInicio}
                onChange={(e) => setHoraInicio(Number(e.target.value || 9))}
                className="w-full px-3 py-2 rounded-lg border"
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
                className="w-full px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Lat</label>
              <input
                type="number"
                value={ubicacionLat}
                onChange={(e) => setUbicacionLat(Number(e.target.value || 0))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Lon</label>
              <input
                type="number"
                value={ubicacionLon}
                onChange={(e) => setUbicacionLon(Number(e.target.value || 0))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div className="rounded-xl p-3 mb-4" style={{ border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium mb-2">Skills requeridas</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="md:col-span-2 px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <option value="">Selecciona skill...</option>
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
                className="px-3 py-2 rounded-lg border"
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
              <Button variant="outline" onClick={addSkill} disabled={!selectedSkillId}>
                Agregar
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {skills.map((s) => (
                  <button
                    key={s.skill_id}
                    onClick={() => setSkills((prev) => prev.filter((x) => x.skill_id !== s.skill_id))}
                    className="px-2 py-1 rounded-lg text-xs"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    title="Quitar"
                  >
                    {s.skill_name} · L{s.min_level} {s.critical ? "· crítica" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((phase) => (
              <Button
                key={phase}
                onClick={() => matchMutation.mutate(phase as PhaseChoice)}
                disabled={!activeOrgId || candidatosIds.length === 0 || loadingMembers}
                loading={matchMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Probar Fase {phase}
              </Button>
            ))}
          </div>

          {matchMutation.error && (
            <p className="text-sm mt-3 text-red-500">
              {(matchMutation.error as Error).message}
            </p>
          )}

          {matchResult && (
            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={`Fase usada: ${matchResult.fase_usada}`} variant="default" />
                <Badge label={`Candidatos: ${matchResult.total_candidatos}`} variant="default" />
              </div>
              {matchResult.advertencias.length > 0 && (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {matchResult.advertencias.join(" · ")}
                </div>
              )}
              <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                      <th className="text-left px-3 py-2">Voluntario</th>
                      <th className="text-left px-3 py-2">Score</th>
                      <th className="text-left px-3 py-2">Confianza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchResult.ranking.map((r) => (
                      <tr key={r.voluntario_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-3 py-2">{r.nombre || r.voluntario_id}</td>
                        <td className="px-3 py-2">{r.match_score.toFixed(4)}</td>
                        <td className="px-3 py-2">{r.confianza}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
