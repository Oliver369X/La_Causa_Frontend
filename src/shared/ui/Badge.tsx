"use client";
import { cn } from "@/shared/utils/utils";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple";

const STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: "var(--bg-card)",       color: "var(--text-muted)" },
  success: { bg: "rgba(34,197,94,.15)",  color: "#22c55e" },
  warning: { bg: "rgba(234,179,8,.15)",  color: "#eab308" },
  danger:  { bg: "rgba(239,68,68,.15)",  color: "#ef4444" },
  info:    { bg: "rgba(59,130,246,.15)", color: "#3b82f6" },
  purple:  { bg: "rgba(168,85,247,.15)", color: "#a855f7" },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export function Badge({ label, variant = "default", dot, className }: BadgeProps) {
  const { bg, color } = STYLES[variant];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", className)}
      style={{ background: bg, color }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {label}
    </span>
  );
}
