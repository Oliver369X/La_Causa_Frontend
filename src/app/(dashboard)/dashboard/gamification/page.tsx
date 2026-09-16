"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, GraduationCap, Share2, Target, Award, ChevronRight } from "lucide-react";
import { gamificationApi, type RankingEntry, type Badge, type CompetitiveProfile, type Season, type Certificate, type HistoricalRankingEntry } from "@/features/gamification/api/gamificationApi";
import { shareApi, type ShareCanal } from "@/features/share/api/shareApi";
import { ShareModal } from "@/features/share/ui/ShareModal";
import { useAuthStore } from "@/shared/store/authStore";
import { GamificationSkeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ProfileBanner } from "@/features/gamification/ui/ProfileBanner";
import { BadgeGrid } from "@/features/gamification/ui/BadgeGrid";
import { GamificationSoundPanel } from "@/features/gamification/ui/GamificationSoundPanel";
import { RewardCard, ProgressCard } from "@/shared/ui/gamification";
import { motionSpring, staggerFast } from "@/shared/lib/motion";
import { useCelebrationStore } from "@/shared/store/celebrationStore";

const XP_PER_LEVEL = 100;

function GamificationPageContent() {
  const { user, activeOrgId } = useAuthStore();
  const searchParams = useSearchParams();
  const showCelebration = useCelebrationStore((s) => s.show);

  const [profile, setProfile] = useState<CompetitiveProfile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingOrg, setRankingOrg] = useState<RankingEntry[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [seasonHistory, setSeasonHistory] = useState<Array<{ season: Season; snapshot: HistoricalRankingEntry | null; badgeCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"badges" | "certificados" | "ranking">("badges");
  const [rankingScope, setRankingScope] = useState<"org" | "global">(activeOrgId ? "org" : "global");
  const [shareBadgeId, setShareBadgeId] = useState<string | null>(null);
  const [shareCertId, setShareCertId] = useState<string | null>(null);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const activeSeason = seasons.find((s) => s.activa);

  useEffect(() => {
    if (activeOrgId) setRankingScope("org");
    else setRankingScope("global");
  }, [activeOrgId]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      gamificationApi.getProfile(user.id, activeOrgId ?? undefined),
      gamificationApi.getBadges(user.id, activeOrgId ?? undefined),
      gamificationApi.getRanking(),
      activeOrgId ? gamificationApi.getRanking(activeOrgId) : Promise.resolve([] as RankingEntry[]),
      activeOrgId ? gamificationApi.getSeasons(activeOrgId) : Promise.resolve([] as Season[]),
      gamificationApi.listCertificates(user.id, activeOrgId ?? undefined),
    ])
      .then(([p, b, rGlobal, rOrg, s, c]) => {
        setProfile(p);
        setBadges(b);
        setRanking(rGlobal);
        setRankingOrg(rOrg);
        setSeasons(s ?? []);
        setCertificates(c ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, activeOrgId]);

  useEffect(() => {
    if (!user?.id || !activeOrgId || seasons.length === 0) {
      setSeasonHistory([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      seasons.map(async (season) => {
        const rows = season.activa ? [] : await gamificationApi.getHistoricalRanking(season.id);
        const snapshot = rows.find((row) => row.usuario_id === user.id) ?? null;
        const start = new Date(`${season.fecha_inicio}T00:00:00`).getTime();
        const end = new Date(`${season.fecha_fin}T23:59:59`).getTime();
        const badgeCount = badges.filter((badge) => {
          if (badge.organizacion_id !== activeOrgId || !badge.fecha_obtencion) return false;
          const obtained = new Date(badge.fecha_obtencion).getTime();
          return obtained >= start && obtained <= end;
        }).length;
        return { season, snapshot, badgeCount };
      }),
    ).then((history) => { if (!cancelled) setSeasonHistory(history); }).catch(() => { if (!cancelled) setSeasonHistory([]); });
    return () => { cancelled = true; };
  }, [user?.id, activeOrgId, seasons, badges]);

  useEffect(() => {
    const badgeId = searchParams.get("badge_id");
    if (badgeId && badges.length > 0) {
      setSelectedBadge(badges.find((badge) => badge.id === badgeId || badge.insignia_id === badgeId) ?? null);
    }
  }, [badges, searchParams]);

  useEffect(() => {
    if (searchParams.get("celebration") !== "reward") return;
    showCelebration({
      tarea_titulo: searchParams.get("task") ?? undefined,
      delta_xp: Number(searchParams.get("xp")) || undefined,
      delta_elo: Number(searchParams.get("elo")) || undefined,
    });
  }, [searchParams, showCelebration]);

  const xpTotal = profile?.xp_total ?? 0;
  const nivel = profile?.nivel ?? Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const xpEnNivel = xpTotal % XP_PER_LEVEL;
  const xpFaltante = XP_PER_LEVEL - xpEnNivel;
  const recentBadges = badges.slice(0, 3);
  const badgesByOrganization = Array.from(
    badges.reduce((groups, badge) => {
      const organizationName = badge.organizacion_nombre ?? "Medallas generales";
      const group = groups.get(organizationName) ?? [];
      group.push(badge);
      groups.set(organizationName, group);
      return groups;
    }, new Map<string, Badge[]>()),
  );
  const visibleRanking = rankingScope === "org" && activeOrgId ? rankingOrg : ranking;
  const myRank = visibleRanking.findIndex((e) => e.usuario_id === user?.id) + 1;

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <ShareModal
        open={!!shareBadgeId || !!shareCertId || shareProfileOpen}
        onClose={() => { setShareBadgeId(null); setShareCertId(null); setShareProfileOpen(false); }}
        title={shareProfileOpen ? "Compartir mi perfil" : shareCertId ? "Compartir certificado" : "Compartir medalla"}
        onShare={async (canal: ShareCanal) => {
          if (shareProfileOpen && user?.id) return shareApi.profile(user.id, canal);
          if (shareCertId) return shareApi.certificate(shareCertId as `${string}-${string}-${string}-${string}-${string}`, canal);
          if (shareBadgeId) return shareApi.badge(shareBadgeId as `${string}-${string}-${string}-${string}-${string}`, canal);
          throw new Error("No item to share");
        }}
      />

      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.58)" }}
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: "var(--g-epic-soft)", border: "2px solid var(--g-epic)" }}>
                {selectedBadge.imagen_url ? <img src={selectedBadge.imagen_url} alt={selectedBadge.nombre} className="w-full h-full object-cover" /> : <Award className="w-9 h-9" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{selectedBadge.nombre}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{selectedBadge.descripcion || "Sin descripción."}</p>
                <div className="flex flex-wrap gap-2 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="px-2 py-1 rounded-full" style={{ background: "var(--bg-subtle)" }}>{selectedBadge.rareza ?? "common"}</span>
                  {selectedBadge.puntos != null && <span className="px-2 py-1 rounded-full" style={{ background: "var(--bg-subtle)" }}>+{selectedBadge.puntos} XP</span>}
                  {selectedBadge.fecha_obtencion && <span className="px-2 py-1 rounded-full" style={{ background: "var(--bg-subtle)" }}>{new Date(selectedBadge.fecha_obtencion).toLocaleDateString("es-ES")}</span>}
                </div>`r`n              </div>
            </div>
            <button type="button" onClick={() => setSelectedBadge(null)} className="w-full mt-6 px-4 py-2 rounded-full text-sm font-medium" style={{ background: "var(--text)", color: "var(--bg)" }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionSpring.tab}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6" style={{ color: "var(--g-progreso)" }} />
            Mi perfil competitivo
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Tu nivel, XP, medallas e insignias. Certificados por temporada. Ranking global y por organización.
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Para ver <strong style={{ color: "var(--text)" }}>todas las medallas que podés ganar en cada organización</strong>, entrá a{" "}
            <Link href="/dashboard/organizaciones" className="font-medium underline-offset-2 hover:underline" style={{ color: "var(--accent)" }}>
              Mis organizaciones
            </Link>{" "}
            y elegí una org.
          </p>
        </div>
        {activeSeason && (
          <Link
            href="/dashboard/temporadas"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-opacity hover:opacity-90"
            style={{ background: "var(--g-progreso-soft)", color: "var(--g-progreso)" }}
          >
            Temporada activa
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </motion.div>

      <GamificationSoundPanel />

      {loading ? (
        <GamificationSkeleton />
      ) : (
        <>
          {/* Profile banner + Share */}
          {profile && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <ProfileBanner
                    profile={{
                      ...profile,
                      nombre: profile.nombre ?? user?.nombre ?? "Voluntario",
                      avatar_url: profile.avatar_url ?? user?.avatar_url,
                    }}
                    currentBadge={badges.find((badge) =>
                      badge.organizacion_id === activeOrgId &&
                      badge.nombre?.toUpperCase().startsWith(`${(profile.rango ?? "").toUpperCase()}-`),
                    ) ?? null}
                    currentBadgeOrgName={badges.find((badge) =>
                      badge.organizacion_id === activeOrgId &&
                      badge.nombre?.toUpperCase().startsWith(`${(profile.rango ?? "").toUpperCase()}-`),
                    )?.organizacion_nombre}
                  />
                </div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => setShareProfileOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shrink-0 transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "white" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Share2 className="w-4 h-4" /> Compartir mi perfil
                </motion.button>
              </div>
            </div>
          )}

          {seasonHistory.length > 0 && (
            <ProgressCard>
              <h3 className="text-sm font-semibold mb-3">Historial por temporada</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {seasonHistory.map(({ season, snapshot, badgeCount }) => (
                  <div key={season.id} className="rounded-xl p-4" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-semibold text-sm">{season.nombre}</p>
                      <span className="text-[10px]" style={{ color: season.activa ? "var(--g-logro)" : "var(--text-muted)" }}>{season.activa ? "Activa" : "Cerrada"}</span>
                    </div>
                    {snapshot ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Rango maximo: {snapshot.rango_final ?? "-"} · {snapshot.elo_final} ELO · {badgeCount} medallas</p>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{season.activa ? "Temporada en curso." : "Sin registro historico."}</p>
                    )}
                  </div>
                ))}
              </div>
            </ProgressCard>
          )}

          {/* Next goal + Recent rewards */}
          {profile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {xpFaltante > 0 && xpFaltante < XP_PER_LEVEL && (
                <ProgressCard delay={0.1}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--g-logro-soft)", color: "var(--g-logro)" }}>
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Meta siguiente</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {xpFaltante} XP para subir al nivel {nivel + 1}
                      </p>
                    </div>
                  </div>
                </ProgressCard>
              )}
              {recentBadges.length > 0 && (
                <ProgressCard delay={0.15}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--g-epic-soft)", color: "var(--g-epic)" }}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Recompensas recientes</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {recentBadges.length} medalla{recentBadges.length !== 1 ? "s" : ""} obtenida{recentBadges.length !== 1 ? "s" : ""} recientemente
                      </p>
                    </div>
                  </div>
                </ProgressCard>
              )}
            </motion.div>
          )}

          {/* Tabs: badges, certificados, ranking */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-1 p-1 rounded-xl w-fit"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            {(["badges", "certificados", "ranking"] as const).map((t) => (
              <motion.button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: tab === t ? "var(--bg-card)" : "transparent",
                  color: tab === t ? "var(--text)" : "var(--text-muted)",
                  boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.12)" : undefined,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t === "badges" ? "Mis medallas" : t === "certificados" ? "Mis certificados" : "Ranking"}
              </motion.button>
            ))}
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {tab === "ranking" && (
              <motion.div
                key="ranking"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={motionSpring.tab}
              >
                {activeOrgId && (
                  <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "var(--bg-subtle)" }}>
                    {(["org", "global"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRankingScope(s)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: rankingScope === s ? "var(--bg-card)" : "transparent",
                          color: rankingScope === s ? "var(--text)" : "var(--text-muted)",
                          boxShadow: rankingScope === s ? "0 1px 4px rgba(0,0,0,.12)" : undefined,
                        }}
                      >
                        {s === "org" ? "Mi organización" : "Global"}
                      </button>
                    ))}
                  </div>
                )}
                <ProgressCard>
                  {visibleRanking.length === 0 ? (
                    <EmptyState
                      title="Sin datos de ranking"
                      description={
                        rankingScope === "org"
                          ? "El ranking de la organización se actualiza al completar tareas en la temporada activa."
                          : "El ranking global se actualiza al finalizar cada evento."
                      }
                    />
                  ) : (
                    <>
                      {myRank > 0 && (
                        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                          Tu posición ({rankingScope === "org" && activeOrgId ? "org" : "global"}):{" "}
                          <span className="font-medium" style={{ color: "var(--g-progreso)" }}>#{myRank}</span>
                        </p>
                      )}
                      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {visibleRanking.map((entry, i) => (
                          <motion.li
                            key={entry.usuario_id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: staggerFast * i }}
                            className="first:pt-0"
                            style={{ borderBottom: i < visibleRanking.length - 1 ? "1px solid var(--border)" : undefined }}
                          >
                            <Link
                              href={`/voluntario/${entry.usuario_id}?returnTo=${encodeURIComponent("/dashboard/gamification")}`}
                              className="flex items-center gap-4 px-0 py-3 w-full hover:opacity-90 transition-opacity"
                              style={{ color: "var(--text)" }}
                            >
                              <span
                                className="w-8 h-8 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  background: entry.posicion <= 3 ? "var(--g-progreso)" : "var(--bg-subtle)",
                                  color: entry.posicion <= 3 ? "#fff" : "var(--text-muted)",
                                }}
                              >
                                {entry.posicion}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{entry.nombre}</p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  {entry.tareas_completadas ?? 0} tareas
                                </p>
                              </div>
                              <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--g-energia)" }}>
                                {rankingScope === "global" ? `${entry.xp_total ?? 0} XP` : `${entry.puntos_elo ?? entry.elo_score ?? 0} ELO`}
                              </span>
                            </Link>
                          </motion.li>
                        ))}
                      </ul>
                    </>
                  )}
                </ProgressCard>
              </motion.div>
            )}

            {tab === "badges" && (
              <motion.div
                key="badges"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={motionSpring.tab}
              >
                {badges.length === 0 ? (
                  <ProgressCard>
                    <EmptyState
                      title="Aún no tienes medallas"
                      description="Las medallas se obtienen al completar eventos o tareas destacadas. ¡Completa tu primera tarea para empezar!"
                    />
                  </ProgressCard>
                ) : (
                  <div className="g-progress-card p-5">
                    <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                      Tus medallas: {badges.length} insignia{badges.length !== 1 ? "s" : ""} obtenida{badges.length !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-6">
                      {badgesByOrganization.map(([organizationName, organizationBadges]) => (
                        <section key={organizationName}>
                          <h3 className="text-sm font-semibold mb-3">{organizationName}</h3>
                          <BadgeGrid
                            badges={organizationBadges.map((b) => ({ ...b, rareza: (b.rareza ?? "common") as Badge["rareza"] }))}
                            maxVisible={50}
                            onShare={(b) => setShareBadgeId(b.id)}
                            onSelect={setSelectedBadge}
                          />
                        </section>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === "certificados" && (
              <motion.div
                key="certificados"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={motionSpring.tab}
              >
                {certificates.length === 0 ? (
                  <ProgressCard>
                    <EmptyState
                      title="Sin certificados"
                      description="Los certificados se emiten al finalizar temporadas o eventos."
                      icon={<GraduationCap className="w-12 h-12" style={{ color: "var(--text-muted)" }} />}
                    />
                  </ProgressCard>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certificates.map((c, i) => (
                      <RewardCard key={c.id} delay={staggerFast * i}>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--g-progreso-soft)", color: "var(--g-progreso)" }}>
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm">{c.titulo}</p>
                            {c.descripcion && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{c.descripcion}</p>}
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{c.horas_acreditadas} h acreditadas</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {c.url_pdf && (
                            <a
                              href={c.url_pdf}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium"
                              style={{ color: "var(--accent)" }}
                            >
                              Ver PDF
                            </a>
                          )}
                          <button
                            onClick={() => setShareCertId(c.id)}
                            className="text-xs font-medium flex items-center gap-1"
                            style={{ color: "var(--accent)" }}
                          >
                            <Share2 className="w-3.5 h-3.5" /> Compartir
                          </button>
                        </div>
                      </RewardCard>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default function GamificationPage() {
  return (
    <Suspense fallback={<GamificationSkeleton />}>
      <GamificationPageContent />
    </Suspense>
  );
}

