"use client";
import { useState, useEffect } from "react";
import { Trophy, GraduationCap, Share2 } from "lucide-react";
import { gamificationApi, type RankingEntry, type Badge, type CompetitiveProfile, type Season, type Certificate } from "@/features/gamification/api/gamificationApi";
import { shareApi, type ShareCanal } from "@/features/share/api/shareApi";
import { ShareModal } from "@/features/share/ui/ShareModal";
import { useAuthStore } from "@/shared/store/authStore";
import { Card } from "@/shared/ui/Card";
import { Badge as BadgeChip } from "@/shared/ui/Badge";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ProfileBanner } from "@/features/gamification/ui/ProfileBanner";
import { BadgeGrid } from "@/features/gamification/ui/BadgeGrid";

const RARITY_VARIANT = {
  common:    "default",
  uncommon:  "info",
  rare:      "success",
  epic:      "purple",
  legendary: "warning",
} as const;

export default function GamificationPage() {
  const { user } = useAuthStore();

  const [profile, setProfile]       = useState<CompetitiveProfile | null>(null);
  const [badges, setBadges]         = useState<Badge[]>([]);
  const [ranking, setRanking]       = useState<RankingEntry[]>([]);
  const [seasons, setSeasons]       = useState<Season[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"ranking" | "badges" | "certificados">("badges");
  const [shareBadgeId, setShareBadgeId] = useState<string | null>(null);
  const [shareCertId, setShareCertId] = useState<string | null>(null);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);

  const activeSeason = seasons.find((s) => s.activa);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      gamificationApi.getProfile(user.id),
      gamificationApi.getBadges(user.id),
      gamificationApi.getRanking(),
      gamificationApi.getSeasons(),
      gamificationApi.listCertificates(user.id),
    ])
      .then(([p, b, r, s, c]) => {
        setProfile(p);
        setBadges(b);
        setRanking(r);
        setSeasons(s ?? []);
        setCertificates(c ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

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

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Mi perfil competitivo
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Tu nivel, XP, medallas e insignias personales. Certificados por temporada. Ranking global en la última pestaña.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Profile banner + Compartir perfil */}
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
                  />
                </div>
                <button
                  onClick={() => setShareProfileOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shrink-0 transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  <Share2 className="w-4 h-4" /> Compartir mi perfil
                </button>
              </div>
            </div>
          )}

          {/* Tabs: primero lo personal (medallas, certificados), luego ranking global */}
          <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            {(["badges", "certificados", "ranking"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === t ? "var(--bg-card)" : "transparent",
                  color:      tab === t ? "var(--text)"   : "var(--text-muted)",
                  boxShadow:  tab === t ? "0 1px 4px rgba(0,0,0,.15)" : undefined,
                }}
              >
                {t === "badges" ? "🎖 Mis medallas" : t === "certificados" ? "📜 Mis certificados" : "🏆 Ranking global"}
              </button>
            ))}
          </div>

          {/* Ranking tab — lista global de voluntarios */}
          {tab === "ranking" && (
            <Card noPadding>
              {ranking.length === 0 ? (
                <EmptyState title="Sin datos de ranking" description="El ranking global se actualiza al finalizar cada evento." />
              ) : (
                <ul className="divide-y" style={{ "--tw-divide-opacity": 1, borderColor: "var(--border)" } as React.CSSProperties}>
                  {ranking.map((entry) => (
                    <li key={entry.usuario_id} className="flex items-center gap-4 px-5 py-3">
                      <span
                        className="w-7 h-7 text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: entry.posicion <= 3 ? "var(--accent)" : "var(--bg-subtle)",
                          color:      entry.posicion <= 3 ? "#fff"          : "var(--text-muted)",
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
                      <span className="text-sm font-semibold tabular-nums">
                        {entry.puntos_elo ?? entry.elo_score ?? 0} ELO
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Badges tab — medallas personales del voluntario */}
          {tab === "badges" && (
            <>
              {badges.length === 0 ? (
                <EmptyState title="Aún no tienes medallas" description="Las medallas se obtienen al completar eventos o tareas destacadas." />
              ) : (
                <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                    Tus medallas: {badges.length} insignia{badges.length !== 1 ? "s" : ""} obtenida{badges.length !== 1 ? "s" : ""}
                  </p>
                  <BadgeGrid
                    badges={badges.map((b) => ({ ...b, rareza: (b.rareza ?? "common") as Badge["rareza"] }))}
                    maxVisible={50}
                    onShare={(b) => setShareBadgeId(b.id)}
                  />
                </div>
              )}
            </>
          )}

          {/* Certificados tab */}
          {tab === "certificados" && (
            <>
              {certificates.length === 0 ? (
                <EmptyState title="Sin certificados" description="Los certificados se emiten al finalizar temporadas o eventos." icon={<GraduationCap className="w-12 h-12" style={{ color: "var(--text-muted)" }} />} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {certificates.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl flex flex-col gap-2"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm">{c.titulo}</p>
                          {c.descripcion && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{c.descripcion}</p>}
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{c.horas_acreditadas} h acreditadas</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
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
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
