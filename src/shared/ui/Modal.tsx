"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Si true, el cuerpo del modal hace scroll cuando el contenido es largo */
  scrollable?: boolean;
}

const SIZE_MAP = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" };

export function Modal({ open, onClose, title, description, children, footer, size = "md", scrollable = false }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={ref}
        className={cn("relative z-10 w-full rounded-2xl p-6 shadow-2xl", SIZE_MAP[size])}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h2>}
            {description && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{description}</p>}
          </div>
          <button onClick={onClose} className="ml-4 p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className={cn(scrollable && "max-h-[min(85vh,640px)] overflow-y-auto overflow-x-hidden pr-1 -mr-1")}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-5 flex justify-end gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
