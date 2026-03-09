"use client";

import { motion } from "framer-motion";
import { Share2, Award } from "lucide-react";
import type { Badge } from "../api/gamificationApi";
import { motionSpring, staggerFast } from "@/shared/lib/motion";

interface Props {
  badges: Badge[];
  maxVisible?: number;
  onShare?: (badge: Badge) => void;
}

type RarezaKey = "common" | "uncommon" | "rare" | "epic" | "legendary";
const RAREZA_CONFIG: Record<RarezaKey, { border: string; glow: string; label: string; bg: string }> = {
  common:    { border: "var(--g-common)",    glow: "none",                        label: "Común",    bg: "var(--g-common-soft)" },
  uncommon:  { border: "var(--g-uncommon)", glow: "0 0 8px var(--g-uncommon-soft)", label: "Poco común", bg: "var(--g-uncommon-soft)" },
  rare:      { border: "var(--g-rare)",      glow: "0 0 10px var(--g-rare-soft)",   label: "Raro",     bg: "var(--g-rare-soft)" },
  epic:      { border: "var(--g-epic)",     glow: "0 0 12px var(--g-epic-soft)",   label: "Épico",    bg: "var(--g-epic-soft)" },
  legendary: { border: "var(--g-legendary)", glow: "0 0 14px var(--g-legendary-soft)", label: "Legendario", bg: "var(--g-legendary-soft)" },
};

export function BadgeGrid({ badges, maxVisible = 12, onShare }: Props) {
  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;

  if (badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
        <Award className="w-12 h-12 mb-3" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Sin insignias aún</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Completa tareas y eventos para desbloquear medallas</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {visible.map((badge, i) => {
        const config = RAREZA_CONFIG[(badge.rareza ?? "common") as RarezaKey] ?? RAREZA_CONFIG.common;
        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...motionSpring.progress, delay: staggerFast * i }}
            className="relative group"
          >
            <motion.div
              className="relative"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              title={`${badge.nombre} — ${badge.descripcion} [${config.label}]`}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden transition-shadow"
                style={{
                  border: `2px solid ${config.border}`,
                  boxShadow: config.glow,
                  background: config.bg,
                }}
              >
                {badge.imagen_url ? (
                  <img src={badge.imagen_url} alt={badge.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🏅</span>
                )}
              </div>
              {onShare && (
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={(e) => { e.stopPropagation(); onShare(badge); }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "var(--g-progreso)", color: "#fff" }}
                  title="Compartir"
                >
                  <Share2 className="w-3 h-3" />
                </motion.button>
              )}
            </motion.div>
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "0 4px 12px rgba(0,0,0,.12)" }}
            >
              <p className="font-semibold">{badge.nombre}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{config.label}</p>
            </div>
          </motion.div>
        );
      })}
      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: staggerFast * visible.length }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold"
          style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", border: "2px dashed var(--border)" }}
        >
          +{overflow}
        </motion.div>
      )}
    </div>
  );
}
