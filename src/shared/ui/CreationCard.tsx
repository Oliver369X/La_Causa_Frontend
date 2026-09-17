"use client";

import type { ReactNode } from "react";
import { CalendarDays, ClipboardList, Medal, X } from "lucide-react";
import styles from "./CreationCard.module.css";

export const creationStyles = styles;

/** Shared editor shell for chat proposals and the manual creation screens. */
export function CreationCard({ kind, children, onClose, status = "Borrador", embedded = false, label }: {
  kind: "event" | "task" | "medal"; children: ReactNode;
  onClose?: () => void; status?: string; embedded?: boolean; label?: string;
}) {
  const Icon = kind === "event" ? CalendarDays : kind === "task" ? ClipboardList : Medal;
  return <section className={`${styles.card} ${embedded ? styles.embedded : ""}`} aria-label={label}>
    <header className={styles.toolbar}>
      <span className={styles.kind}><Icon size={17} aria-hidden="true" />{kind === "event" ? "Evento" : kind === "task" ? "Tarea" : "Medalla"}</span>
      <span className={styles.status}>{status}</span>
      {onClose && <button type="button" onClick={onClose} className={styles.close} aria-label="Cerrar editor"><X size={19} /></button>}
    </header>
    <div className={styles.body}>{children}</div>
  </section>;
}
