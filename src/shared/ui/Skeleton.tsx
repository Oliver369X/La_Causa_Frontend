"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/utils/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
}

export function Skeleton({ className, variant = "rounded" }: SkeletonProps) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "shrink-0",
        variant === "text" && "h-4 rounded",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-none",
        variant === "rounded" && "rounded-xl",
        "bg-[var(--bg-subtle)]",
        className
      )}
    />
  );
}

export function GamificationSkeleton() {
  return (
    <div className="space-y-6 p-5 md:p-8">
      <div className="flex gap-4">
        <Skeleton className="h-8 w-48" variant="text" />
        <Skeleton className="h-4 w-64" variant="text" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
