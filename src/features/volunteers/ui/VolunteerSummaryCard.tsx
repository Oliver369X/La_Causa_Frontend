"use client";
import type { ReactNode } from "react";
import { UserAvatar } from "@/shared/ui/UserAvatar";

export function VolunteerSummaryCard({ name, avatar, email, rank = "Aspirante", xp = 0, elo = 0, detail, children }: {
  name: string; avatar?: string | null; email?: string; rank?: string; xp?: number; elo?: number; detail?: ReactNode; children: ReactNode;
}) {
  return <article className="relative min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
    <img src={`/medals/${rank.toLowerCase()}.png`} alt={rank} title={`Rango en esta organización: ${rank}`} className="absolute right-4 top-4 w-12 h-12 object-contain" />
    <div className="flex items-center gap-3 pr-12"><UserAvatar src={avatar} name={name} /><div className="min-w-0"><h3 className="font-semibold break-words">{name}</h3><p className="text-xs text-[var(--text-muted)] break-all">{email}</p></div></div>
    <p className="text-sm"><strong>{xp.toLocaleString()} XP</strong> · {elo.toLocaleString()} ELO · {rank}</p>
    <div className="text-xs text-[var(--text-muted)]">{detail}</div>
    <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">{children}</div>
  </article>;
}
