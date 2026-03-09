"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/shared/utils/utils";

interface LockedStateProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export function LockedState({ children, className, label = "Desbloquea para ver" }: LockedStateProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="g-locked-state">{children}</div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center gap-1"
        >
          <Lock className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            {label}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
