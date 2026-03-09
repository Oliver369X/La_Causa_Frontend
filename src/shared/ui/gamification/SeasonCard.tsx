"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/utils/utils";
import { motionSpring } from "@/shared/lib/motion";

interface SeasonCardProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  delay?: number;
}

export function SeasonCard({ children, className, active, delay = 0 }: SeasonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...motionSpring.tab, delay }}
      className={cn(
        "g-season-card p-5",
        active && "ring-2 ring-[var(--g-progreso)] ring-offset-2",
        "ring-offset-[var(--bg)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
