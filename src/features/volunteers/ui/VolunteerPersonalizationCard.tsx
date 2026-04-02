"use client";

import { Sparkles, Link2 } from "lucide-react";

interface VolunteerPersonalizationCardProps {
  tituloPublico: string;
  setTituloPublico: (v: string) => void;
  linkedin: string;
  setLinkedin: (v: string) => void;
  web: string;
  setWeb: (v: string) => void;
  github: string;
  setGithub: (v: string) => void;
  onSave: () => void | Promise<void>;
  savePending?: boolean;
}

export function VolunteerPersonalizationCard({
  tituloPublico,
  setTituloPublico,
  linkedin,
  setLinkedin,
  web,
  setWeb,
  github,
  setGithub,
  onSave,
  savePending = false,
}: VolunteerPersonalizationCardProps) {
  return (
    <div className="p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h3 className="font-semibold">Personaliza tu perfil público</h3>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Esto se muestra en tu{" "}
        <strong className="font-medium" style={{ color: "var(--text)" }}>
          página pública
        </strong>{" "}
        junto a tu nombre y bio. No se muestra tu correo.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
            Título o frase corta
          </label>
          <input
            type="text"
            value={tituloPublico}
            onChange={(e) => setTituloPublico(e.target.value.slice(0, 120))}
            placeholder="Ej. Estudiante de Ingeniería · Me gusta el trabajo en equipo"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            {tituloPublico.length}/120 caracteres
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link2 className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Enlaces (opcional)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              LinkedIn
            </label>
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Sitio web
            </label>
            <input
              type="url"
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              GitHub
            </label>
            <input
              type="url"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="https://github.com/…"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={savePending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          {savePending ? "Guardando…" : "Guardar personalización"}
        </button>
      </div>
    </div>
  );
}
