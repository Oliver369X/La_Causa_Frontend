"use client";

import { useMemo, useState } from "react";
import type { Skill, UserSkill } from "@/features/skills/api/skillsApi";
import { Trash2, Wrench } from "lucide-react";

interface VolunteerSkillsManagerProps {
  userSkills: UserSkill[];
  allSkills: Skill[];
  loadingSkills?: boolean;
  loadingAllSkills?: boolean;
  addPending?: boolean;
  removePending?: boolean;
  onAddSkill: (skillId: string) => void;
  onRemoveSkill: (skillId: string) => void;
  title?: string;
  description?: string;
  highlightMin?: number;
}

export function VolunteerSkillsManager({
  userSkills,
  allSkills,
  loadingSkills = false,
  loadingAllSkills = false,
  addPending = false,
  removePending = false,
  onAddSkill,
  onRemoveSkill,
  title = "Habilidades",
  description = "Agrega habilidades para que las organizaciones puedan encontrarte mejor.",
  highlightMin,
}: VolunteerSkillsManagerProps) {
  const [skillSearch, setSkillSearch] = useState("");

  const availableSkills = useMemo(
    () =>
      allSkills.filter(
        (skill) => !userSkills.some((userSkill) => userSkill.habilidad_id === skill.id || userSkill.habilidad?.id === skill.id)
      ),
    [allSkills, userSkills]
  );

  const filteredAvailableSkills = useMemo(() => {
    const query = skillSearch.trim().toLowerCase();
    if (!query) return availableSkills;
    return availableSkills.filter(
      (skill) =>
        skill.nombre.toLowerCase().includes(query) ||
        (skill.categoria?.toLowerCase().includes(query) ?? false) ||
        (skill.tipo?.toLowerCase().includes(query) ?? false)
    );
  }, [availableSkills, skillSearch]);

  return (
    <div className="p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {highlightMin ? (
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{
              background: userSkills.length >= highlightMin ? "rgba(34,197,94,.14)" : "var(--bg-subtle)",
              color: userSkills.length >= highlightMin ? "#16a34a" : "var(--text-muted)",
            }}
          >
            {userSkills.length}/{highlightMin}
          </span>
        ) : null}
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>

      {loadingSkills ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>
      ) : (
        <div className="space-y-4">
          {userSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Tus habilidades:</p>
              <div className="flex flex-wrap gap-2">
                {userSkills.map((userSkill) => (
                  <span
                    key={userSkill.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                    style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
                  >
                    {userSkill.habilidad?.nombre ?? userSkill.habilidad_id}
                    <button
                      onClick={() => onRemoveSkill(userSkill.habilidad_id)}
                      disabled={removePending}
                      className="p-0.5 rounded opacity-60 hover:opacity-100"
                      title="Quitar"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {allSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Buscar y añadir:</p>
              <input
                type="text"
                placeholder="Buscar habilidades por nombre o categoría..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-3"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {filteredAvailableSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => onAddSkill(skill.id)}
                    disabled={addPending}
                    className="px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-80 shrink-0"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                    title={skill.descripcion}
                  >
                    + {skill.nombre}
                    {skill.categoria ? <span className="opacity-60 ml-0.5">({skill.categoria})</span> : null}
                  </button>
                ))}
              </div>
              {filteredAvailableSkills.length === 0 && availableSkills.length > 0 ? (
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  No hay resultados para &quot;{skillSearch}&quot;
                </p>
              ) : null}
            </div>
          )}

          {userSkills.length === 0 && availableSkills.length === 0 && !loadingAllSkills ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay habilidades en el catálogo.</p>
          ) : null}

          {loadingAllSkills ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando catálogo...</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
