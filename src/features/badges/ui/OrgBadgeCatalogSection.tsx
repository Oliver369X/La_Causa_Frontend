"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Sparkles, Tag } from "lucide-react";
import { gamificationApi, type OrgBadgeCatalogItem } from "@/features/gamification/api/gamificationApi";
import { describeHowToEarn, getRarezaVisual, labelTipoInsignia } from "@/features/badges/lib/badgePresentation";
import { Spinner } from "@/shared/ui/Spinner";

interface OrgBadgeCatalogSectionProps {
  organizacionId: string;
  /** Si hay sesión, marcamos cuáles ya obtuvo el usuario. */
  userId?: string | null;
  title?: string;
  subtitle?: string;
  /** Color de acento (p. ej. página pública de la org). */
  accentColor?: string;
  variant?: "dashboard" | "public";
  /** Ancla para el menú (ej. navbar «Logros de la org» → #logros-org). Solo en dashboard. */
  anchorId?: string;
}

export function OrgBadgeCatalogSection({
  organizacionId,
  userId,
  title = "Logros que podés conseguir",
  subtitle = "Reconocimientos definidos por la organización. Participá en tareas y eventos para desbloquearlos.",
  accentColor = "var(--accent)",
  variant = "dashboard",
  anchorId,
}: OrgBadgeCatalogSectionProps) {
  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["org-badge-catalog", organizacionId, "solo-publicas"],
    queryFn: () => gamificationApi.listOrgBadgeCatalog(organizacionId, { soloVisiblesCatalogo: true }),
    enabled: !!organizacionId,
  });

  const { data: earned = [] } = useQuery({
    queryKey: ["badges", userId],
    queryFn: () => gamificationApi.getBadges(userId!),
    enabled: !!userId,
  });

  const earnedInsigniaIds = useMemo(() => {
    const s = new Set<string>();
    for (const b of earned) {
      const ins = (b as { insignia_id?: string }).insignia_id;
      if (ins) s.add(ins);
    }
    return s;
  }, [earned]);

  if (isLoading) {
    return (
      <section
        id={anchorId}
        className="rounded-2xl p-8 flex justify-center scroll-mt-24"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <Spinner size="lg" />
      </section>
    );
  }

  if (catalog.length === 0) {
    return (
      <section
        id={anchorId}
        className="rounded-2xl p-6 scroll-mt-24"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
          {title}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Esta organización todavía no publicó medallas en el catálogo. Volvé más adelante o preguntá al equipo.
        </p>
      </section>
    );
  }

  return (
    <section
      id={anchorId}
      className="rounded-2xl p-5 sm:p-6 mb-8 scroll-mt-24"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <Award className="w-5 h-5" style={{ color: accentColor }} />
        {title}
      </h2>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        {subtitle}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((b) => (
          <BadgeCatalogCard
            key={b.id}
            badge={b}
            earned={earnedInsigniaIds.has(b.id)}
            accentColor={accentColor}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}

function BadgeCatalogCard({
  badge,
  earned,
  accentColor,
  variant,
}: {
  badge: OrgBadgeCatalogItem;
  earned: boolean;
  accentColor: string;
  variant: "dashboard" | "public";
}) {
  const rv = getRarezaVisual(badge.rareza);
  const how = describeHowToEarn(badge.regla_asignacion, badge.regla_config ?? undefined, badge.requisitos ?? undefined);

  return (
    <article
      className="rounded-xl overflow-hidden flex flex-col min-h-[180px] transition-transform hover:scale-[1.01]"
      style={{
        border: `1px solid var(--border)`,
        background: variant === "public" ? "var(--bg-subtle)" : "var(--bg-subtle)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="relative flex items-center justify-center py-4 px-3"
        style={{
          borderBottom: `2px solid ${rv.border}`,
          background: `linear-gradient(160deg, ${rv.bg} 0%, var(--bg-card) 50%)`,
        }}
      >
        <div
          className="w-[72px] h-[72px] rounded-xl flex items-center justify-center p-2"
          style={{
            border: `2px solid ${rv.border}`,
            boxShadow: rv.glow,
            background: rv.bg,
          }}
        >
          {badge.url_imagen ? (
            <img src={badge.url_imagen} alt="" className="max-w-full max-h-full object-contain" />
          ) : (
            <Award className="w-8 h-8 opacity-50" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
        {earned && (
          <span
            className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
            style={{ background: "var(--g-logro-soft)", color: "var(--g-logro)", border: "1px solid var(--g-logro)" }}
          >
            <CheckCircle2 className="w-3 h-3" /> Obtenida
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: rv.bg, color: "var(--text)" }}>
            {rv.label}
          </span>
          {badge.categoria?.trim() && (
            <span className="text-[10px] px-1.5 py-0.5 rounded truncate max-w-[120px]" style={{ color: "var(--text-muted)" }} title={badge.categoria}>
              {badge.categoria}
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "var(--text)" }}>
          {badge.nombre}
        </h3>
        {badge.descripcion && (
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {badge.descripcion}
          </p>
        )}
        <div
          className="text-[11px] leading-snug rounded-lg p-2 mt-auto flex-1"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <span className="font-semibold" style={{ color: accentColor }}>Cómo ganarla: </span>
          {how}
        </div>
        <p className="text-[10px] flex items-center gap-1 flex-wrap" style={{ color: "var(--text-muted)" }}>
          <Tag className="w-3 h-3 shrink-0" />
          {labelTipoInsignia(badge.tipo)}
          {badge.da_xp ? <span>· +{badge.puntos_bonus} XP</span> : <span>· Sin XP extra</span>}
        </p>
      </div>
    </article>
  );
}
