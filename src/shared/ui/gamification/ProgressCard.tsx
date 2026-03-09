"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/utils/utils";
import { motionSpring } from "@/shared/lib/motion";

interface ProgressCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}

export function ProgressCard({ children, className, delay = 0, style }: ProgressCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...motionSpring.progress, delay }}
      className={cn("g-progress-card p-5", className)}
      style={style}
    >
      {children}
    </motion.div>
  );
}
