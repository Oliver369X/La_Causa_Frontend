"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, Award, X } from "lucide-react";

export interface CelebrationData {
  delta_elo?: number;
  delta_xp?: number;
  nuevas_insignias?: { id: string; nombre: string; imagen_url?: string }[];
  subio_nivel?: boolean;
  tarea_titulo?: string;
}

interface CelebrationModalProps {
  open: boolean;
  onClose: () => void;
  data?: CelebrationData;
}

export function CelebrationModal({ open, onClose, data }: CelebrationModalProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [open, onClose]);

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
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative max-w-sm w-full rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "2px solid var(--accent)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full"
                style={{ color: "var(--text-muted)" }}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--accent)" }} />
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
                    <TrendingUp className="w-5 h-5" style={{ color: "#22c55e" }} />
                    <span>+{data.delta_elo} ELO</span>
                  </motion.div>
                )}
                {data?.delta_xp != null && data.delta_xp > 0 && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span>+{data.delta_xp} XP</span>
                  </motion.div>
                )}
                {data?.nuevas_insignias && data.nuevas_insignias.length > 0 && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 mt-2"
                  >
                    <Award className="w-5 h-5" style={{ color: "#f59e0b" }} />
                    <span>¡{data.nuevas_insignias.length} nueva(s) insignia(s)!</span>
                  </motion.div>
                )}
                {data?.subio_nivel && (
                  <motion.p
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-sm font-semibold mt-2"
                    style={{ color: "var(--accent)" }}
                  >
                    ¡Subiste de nivel!
                  </motion.p>
                )}
              </div>

              {(!data || (data.delta_elo == null && data.delta_xp == null && (!data.nuevas_insignias || data.nuevas_insignias.length === 0))) && (
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
