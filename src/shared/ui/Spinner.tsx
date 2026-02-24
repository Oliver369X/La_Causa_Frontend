"use client";
import { cn } from "@/shared/utils/utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

const SIZE: Record<SpinnerSize, string> = {
  xs: "w-3.5 h-3.5 border-2",
  sm: "w-5 h-5 border-2",
  md: "w-7 h-7 border-2",
  lg: "w-10 h-10 border-[3px]",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-current border-t-transparent animate-spin",
        SIZE[size],
        className,
      )}
    />
  );
}

/** Full-container centered loading state */
export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <span
        className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin opacity-60"
        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
      />
    </div>
  );
}
