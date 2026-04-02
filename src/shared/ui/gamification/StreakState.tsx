"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { motionSpring } from "@/shared/lib/motion";

interface StreakStateProps {
  /** Número mostrado (p. ej. entregas consecutivas impecables) */
  value: number;
  label?: string;
  className?: string;
}

export function StreakState({ value, label = "Racha", className }: StreakStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={motionSpring.progress}
      className={cn("g-streak-state p-4 flex items-center gap-3", className)}
    >
      <motion.div
        animate={value > 0 ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } : {}}
        transition={{ duration: 0.5, repeat: value > 0 ? Infinity : 0, repeatDelay: 2 }}
      >
        <Flame className="w-8 h-8" style={{ color: "var(--g-streak)" }} />
      </motion.div>
      <div>
        <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
          {value}
        </p>
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}
