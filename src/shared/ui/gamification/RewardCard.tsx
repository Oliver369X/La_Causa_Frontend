"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/utils/utils";
import { motionSpring } from "@/shared/lib/motion";

interface RewardCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
  style?: React.CSSProperties;
}

export function RewardCard({ children, className, onClick, delay = 0, style }: RewardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...motionSpring.progress, delay }}
      className={cn("g-reward-card p-4 cursor-pointer", className)}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
