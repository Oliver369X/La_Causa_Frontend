import { Share2 } from "lucide-react";
import type { Badge } from "../api/gamificationApi";

interface Props {
  badges: Badge[];
  maxVisible?: number;
  onShare?: (badge: Badge) => void;
}

type RarezaKey = "common" | "uncommon" | "rare" | "epic" | "legendary";
const RAREZA_STYLE: Record<RarezaKey, { border: string; glow: string; label: string }> = {
  common:    { border: "#9ca3af", glow: "none",                     label: "Común"      },
  uncommon:  { border: "#34d399", glow: "0 0 6px #34d39955",        label: "Poco común" },
  rare:      { border: "#60a5fa", glow: "0 0 8px #60a5fa66",        label: "Raro"       },
  epic:      { border: "#a78bfa", glow: "0 0 10px #a78bfa77",       label: "Épico"      },
  legendary: { border: "#fbbf24", glow: "0 0 12px #fbbf2488",       label: "Legendario" },
};

export function BadgeGrid({ badges, maxVisible = 12, onShare }: Props) {
  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;

  if (badges.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
        Sin insignias aún.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {visible.map((badge) => {
        const style = RAREZA_STYLE[(badge.rareza ?? "common") as RarezaKey] ?? RAREZA_STYLE.common;
        return (
          <div
            key={badge.id}
            title={`${badge.nombre} — ${badge.descripcion} [${style.label}]`}
            className="relative group"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl overflow-hidden"
              style={{
                border:    `2px solid ${style.border}`,
                boxShadow: style.glow,
                background: "var(--bg-subtle)",
              }}
            >
              {badge.imagen_url ? (
                <img src={badge.imagen_url} alt={badge.nombre} className="w-full h-full object-cover rounded-xl" />
              ) : (
                "🏅"
              )}
            </div>
            {onShare && (
              <button
                onClick={(e) => { e.stopPropagation(); onShare(badge); }}
                className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "var(--accent)", color: "#fff" }}
                title="Compartir"
              >
                <Share2 className="w-3 h-3" />
              </button>
            )}
            {/* Tooltip */}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {badge.nombre}
            </div>
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold"
          style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", border: "2px dashed var(--border)" }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
