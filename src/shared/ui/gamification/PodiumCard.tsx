"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/utils/utils";
import { motionSpring } from "@/shared/lib/motion";

interface PodiumCardProps {
  children: React.ReactNode;
  className?: string;
  position?: 1 | 2 | 3;
  delay?: number;
}

export function PodiumCard({ children, className, position, delay = 0 }: PodiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...motionSpring.celebration, delay }}
      className={cn(
        "g-podium-card p-5",
        position === 1 && "border-t-2 border-t-[var(--g-legendary)]",
        position === 2 && "border-t-2 border-t-[var(--g-common)]",
        position === 3 && "border-t-2 border-t-[var(--g-advertencia)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
