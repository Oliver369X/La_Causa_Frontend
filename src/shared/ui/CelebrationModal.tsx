"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, Award, X } from "lucide-react";
import confetti from "canvas-confetti";
import { motionSpring } from "@/shared/lib/motion";

export interface CelebrationData {
  delta_elo?: number;
  delta_xp?: number;
  nuevas_insignias?: { id: string; nombre: string; imagen_url?: string }[];
  subio_nivel?: boolean;
  nivel_actual?: number;
  xp_en_nivel?: number;
  xp_para_siguiente_nivel?: number;
  tarea_titulo?: string;
}

interface CelebrationModalProps {
  open: boolean;
  onClose: () => void;
  data?: CelebrationData;
}

function fireConfetti() {
  if (typeof window === "undefined") return;
  const count = 80;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };
  confetti({ ...defaults, particleCount: count });
  confetti({ ...defaults, spread: 100, particleCount: count * 0.4 });
  confetti({ ...defaults, spread: 60, scalar: 1.2, colors: ["#7c3aed", "#a78bfa", "#22c55e", "#f59e0b"] });
}

export function CelebrationModal({ open, onClose, data }: CelebrationModalProps) {
  const hasReward = data && (
    (data.delta_elo != null && data.delta_elo > 0) ||
    (data.delta_xp != null && data.delta_xp > 0) ||
    (data.nuevas_insignias && data.nuevas_insignias.length > 0) ||
    data.subio_nivel
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  useEffect(() => {
    if (open && hasReward) {
      const id = setTimeout(fireConfetti, 400);
      return () => clearTimeout(id);
    }
  }, [open, hasReward]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={motionSpring.celebration}
              className="relative max-w-sm w-full rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "2px solid var(--g-progreso)", boxShadow: "0 0 24px var(--g-progreso-soft)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full transition-opacity hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--g-progreso)" }} />
              </motion.div>

              <h3 className="text-xl font-bold mb-2">¡Tarea completada!</h3>
              {data?.tarea_titulo && (
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  {data.tarea_titulo}
                </p>
              )}

              <div className="flex flex-col gap-2">
                {data?.delta_elo != null && data.delta_elo > 0 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-5 h-5" style={{ color: "var(--g-logro)" }} />
                    <span className="font-semibold">+{data.delta_elo} ELO</span>
                  </motion.div>
                )}
                {data?.delta_xp != null && data.delta_xp > 0 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span className="font-semibold" style={{ color: "var(--g-progreso)" }}>+{data.delta_xp} XP</span>
                  </motion.div>
                )}
                {data?.nuevas_insignias && data.nuevas_insignias.length > 0 && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 mt-2"
                  >
                    <Award className="w-5 h-5" style={{ color: "var(--g-energia)" }} />
                    <span className="font-semibold">¡{data.nuevas_insignias.length} nueva(s) insignia(s)!</span>
                  </motion.div>
                )}
                {data?.subio_nivel && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-2"
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--g-progreso)" }}>
                      ¡Subiste de nivel!
                    </p>
                    {data.nivel_actual != null &&
                      data.xp_en_nivel != null &&
                      data.xp_para_siguiente_nivel != null &&
                      data.xp_para_siguiente_nivel > 0 && (
                        <div className="mt-2">
                          <div
                            className="h-2 rounded-full overflow-hidden"
                            style={{ background: "var(--bg-subtle)" }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(data.xp_en_nivel / data.xp_para_siguiente_nivel) * 100}%`,
                              }}
                              transition={{ duration: 0.6, delay: 0.8 }}
                              className="h-full rounded-full"
                              style={{ background: "var(--g-progreso)" }}
                            />
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            Nivel {data.nivel_actual} · {data.xp_en_nivel}/{data.xp_para_siguiente_nivel} XP
                          </p>
                        </div>
                      )}
                  </motion.div>
                )}
              </div>

              {(!data || !hasReward) && (
                <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>
                  +50 ELO · +100 XP
                </p>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
