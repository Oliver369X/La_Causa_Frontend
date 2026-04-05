"use client";

import type { ComponentType, CSSProperties } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/shared/utils/utils";

const sizeMap = { sm: 32, md: 40, lg: 48 } as const;

type Size = keyof typeof sizeMap;

/**
 * Contenedor fijo + imagen con object-contain para que logos horizontales/verticales
 * no se deformen; padding interno para que no toquen el borde.
 */
export function OrgLogoBox({
  logoUrl,
  alt = "",
  size = "md",
  className,
  fallbackIcon: Fallback = Building2,
}: {
  logoUrl?: string | null;
  alt?: string;
  size?: Size;
  className?: string;
  fallbackIcon?: ComponentType<{ className?: string; style?: CSSProperties }>;
}) {
  const px = sizeMap[size];
  const inner = Math.max(12, px - 8);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-inset",
        className
      )}
      style={{
        width: px,
        height: px,
        borderColor: "var(--border)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
      }}
      aria-hidden={!logoUrl}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={alt}
          width={inner}
          height={inner}
          className="max-h-[85%] max-w-[85%] object-contain"
          style={{ objectFit: "contain", objectPosition: "center" }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: "var(--accent-soft)" }}
        >
          <Fallback className="w-[55%] h-[55%]" style={{ color: "var(--accent)" }} aria-hidden />
        </div>
      )}
    </div>
  );
}
