"use client";

import { cn } from "@/shared/utils/utils";

const pillBase =
  "inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium transition-colors border text-left break-words max-w-full";

/** Selección única: barra de opciones tipo chips. */
export function PillSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <div className="w-full min-w-0 space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {hint && (
        <p className="text-[11px] leading-snug -mt-0.5" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2 w-full min-w-0" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                pillBase,
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--bg-subtle)] hover:opacity-90",
              )}
              style={{ color: active ? "var(--accent)" : "var(--text)" }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Multiselección: varias categorías. */
export function PillMultiSelect({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  hint?: string;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div className="w-full min-w-0 space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {hint && (
        <p className="text-[11px] leading-snug -mt-0.5" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2 w-full min-w-0" role="group" aria-label={label}>
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(o)}
              className={cn(
                pillBase,
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--bg-subtle)] hover:opacity-90",
              )}
              style={{ color: active ? "var(--accent)" : "var(--text)" }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Presets numéricos + valor actual (XP, etc.). */
export function PillNumberPresets({
  label,
  value,
  onChange,
  presets,
  min = 0,
  max = 99999,
  suffix = "",
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  presets: readonly number[];
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="w-full min-w-0 space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {hint && (
        <p className="text-[11px] leading-snug -mt-0.5" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2 w-full min-w-0 items-center">
        {presets.map((p) => {
          const active = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                pillBase,
                "min-h-[2.25rem]",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--bg-subtle)] hover:opacity-90",
              )}
              style={{ color: active ? "var(--accent)" : "var(--text)" }}
            >
              {p}
              {suffix}
            </button>
          );
        })}
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value, 10) || 0)))}
          className="w-24 h-9 px-2 rounded-lg text-sm outline-none shrink-0"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          aria-label={`${label} personalizado`}
        />
      </div>
    </div>
  );
}
