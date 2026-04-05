"use client";

import { ListChecks } from "lucide-react";

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "ordered"; items: string[] }
  | { kind: "bullet"; items: string[] };

function buildBlocks(text: string): Block[] {
  const raw = text.replace(/\r\n/g, "\n").trim();
  if (!raw) return [];

  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    const t = buf.join("\n").trim();
    if (t) blocks.push({ kind: "paragraph", text: t });
    buf.length = 0;
  };

  let paraBuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph(paraBuf);
      i++;
      continue;
    }

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph(paraBuf);
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t === "") break;
        const m = t.match(/^(\d+)[.)]\s+(.+)$/);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      if (items.length) blocks.push({ kind: "ordered", items });
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph(paraBuf);
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t === "") break;
        const m = t.match(/^[-*•]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      if (items.length) blocks.push({ kind: "bullet", items });
      continue;
    }

    paraBuf.push(line);
    i++;
  }
  flushParagraph(paraBuf);

  return blocks;
}

interface TaskInstructionsDisplayProps {
  text: string;
  /** compact = menos padding, para tarjetas en lista */
  variant?: "default" | "compact";
  showHeading?: boolean;
  heading?: string;
}

export function TaskInstructionsDisplay({
  text,
  variant = "default",
  showHeading = true,
  heading = "Instrucciones",
}: TaskInstructionsDisplayProps) {
  if (!text?.trim()) return null;

  const blocks = buildBlocks(text);
  const pad = variant === "compact" ? "p-3" : "p-4";
  const textSize = "text-sm";

  return (
    <div
      className={`rounded-xl ${pad}`}
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
    >
      {showHeading && (
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {heading}
          </span>
        </div>
      )}
      <div className={`space-y-3 ${textSize} leading-relaxed`} style={{ color: "var(--text)" }}>
        {blocks.map((b, idx) => {
          if (b.kind === "paragraph") {
            return (
              <p key={idx} className="whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                {b.text}
              </p>
            );
          }
          if (b.kind === "ordered") {
            return (
              <ol
                key={idx}
                className="list-decimal space-y-2 pl-5 [list-style-position:outside] marker:font-medium"
                style={{ color: "var(--text)" }}
              >
                {b.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    {item}
                  </li>
                ))}
              </ol>
            );
          }
          return (
            <ul
              key={idx}
              className="list-disc space-y-2 pl-5 [list-style-position:outside]"
              style={{ color: "var(--text)" }}
            >
              {b.items.map((item, j) => (
                <li key={j} className="pl-1">
                  {item}
                </li>
              ))}
            </ul>
          );
        })}
      </div>
    </div>
  );
}
