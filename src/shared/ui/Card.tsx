"use client";
import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/utils/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes the default padding */
  noPadding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ noPadding, className, children, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-2xl transition-shadow", !noPadding && "p-5", className)}
      style={{
        background:  "var(--bg-card)",
        border:      "1px solid var(--border)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

/** Light-weight section title inside a card */
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
