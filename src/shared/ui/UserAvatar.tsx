"use client";
import { useState } from "react";

export function UserAvatar({ src, name, className = "w-12 h-12" }: { src?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`${className} shrink-0 overflow-hidden rounded-full bg-[var(--accent-soft)] inline-flex items-center justify-center text-[var(--accent)] font-semibold`}>
    {src && failed !== src ? <img src={src} alt={`Foto de ${name}`} className="w-full h-full object-cover" onError={() => setFailed(src)} /> : name.slice(0, 2).toUpperCase()}
  </span>;
}
