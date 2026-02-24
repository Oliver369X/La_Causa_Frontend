"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/utils/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize    = "xs" | "sm" | "md" | "lg";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:   "text-white",
  secondary: "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-subtle)]",
  ghost:     "bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)]",
  danger:    "bg-red-600 hover:bg-red-700 text-white",
  outline:   "bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)]",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  xs: "h-7  px-2.5 text-xs  rounded-md  gap-1",
  sm: "h-8  px-3   text-xs  rounded-lg  gap-1.5",
  md: "h-9  px-4   text-sm  rounded-lg  gap-2",
  lg: "h-11 px-5   text-base rounded-xl gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className, children, ...props }, ref) => {
    const isPrimary = variant === "primary";
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          SIZE_STYLES[size],
          VARIANT_STYLES[variant],
          className,
        )}
        style={isPrimary ? { background: "var(--accent)" } : undefined}
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
