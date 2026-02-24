"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { apiClient } from "@/shared/api/client";
import { volunteersApi } from "@/features/volunteers/api/volunteersApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { Settings, Users, Building2, UserPlus, Trash2, Loader2, CheckCircle, Wrench, Globe, FileText, Camera, MapPin, Image, ExternalLink, Eye, Palette, Trophy, LogOut } from "lucide-react";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { organizationsApi, type OrgNormas, type Organization } from "@/features/organizations/api/organizationsApi";
import Link from "next/link";

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const PRIVATE_HOST_RE = /^(localhost|127\.|0\.0\.0\.0|::1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i;

function normalizeHexColor(value: string, fallback: string): string {
  const v = value.trim();
  if (!v) return fallback;
  if (!HEX_COLOR_RE.test(v)) return fallback;
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return v.toLowerCase();
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname) return false;
    return !PRIVATE_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

function normalizeSocialUrl(
  platform: "facebook" | "instagram" | "twitter" | "linkedin",
  rawValue: string
): string | null {
  const raw = rawValue.trim();
  if (!raw) return "";

  const cleanHandle = raw.replace(/^@+/, "").trim();
  if (raw.startsWith("@") && cleanHandle) {
    const base =
      platform === "facebook"
        ? "https://www.facebook.com/"
        : platform === "instagram"
          ? "https://www.instagram.com/"
          : platform === "twitter"
            ? "https://x.com/"
            : "https://www.linkedin.com/in/";
    return `${base}${encodeURIComponent(cleanHandle)}`;
  }

  const maybeUrl = raw.match(/^https?:\/\//i) ? raw : `https://${raw}`;
  if (!isPublicHttpUrl(maybeUrl)) return null;
  return maybeUrl;
}

function slugifyOrgInput(value: string): string {
  return value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Volunteer profile (perfil competitivo + habilidades) ─── */
function VolunteerProfile({
  displayName,
  setDisplayName,
  bio,
  setBio,
  updateProfile,
  updateAvatar,
  updateUbicacion,
  updatePerfilExtra,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  updateProfile: { mutate: () => void; isPending: boolean };
  updateAvatar: { mutate: (url: string) => void; isPending: boolean };
  updateUbicacion: { mutate: (ubicacion: { lat: number; lon: number; ciudad?: string }) => void; isPending: boolean };
  updatePerfilExtra: { mutate: (perfil_extra: { disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta"; preferencias?: string[] }) => void; isPending: boolean };
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [skillSearch, setSkillSearch] = useState("");
  const [disponibilidadEstado, setDisponibilidadEstado] = useState<"disponible" | "no_disponible" | "previo_consulta">(
    () => (user?.perfil_extra?.disponibilidad_estado as "disponible" | "no_disponible" | "previo_consulta") ?? "previo_consulta"
  );

  useEffect(() => {
    const est = user?.perfil_extra?.disponibilidad_estado;
    if (est === "disponible" || est === "no_disponible" || est === "previo_consulta") {
      setDisponibilidadEstado(est);
    }
  }, [user?.perfil_extra?.disponibilidad_estado]);

  const { data: userSkills = [], isLoading: loadingSkills } = useQuery({
    queryKey: ["userSkills", user?.id],
    queryFn: () => skillsApi.getUserSkills(user!.id),
    enabled: !!user?.id,
  });

  const { data: allSkills = [], isLoading: loadingAllSkills } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillsApi.list(),
  });

  const { data: misOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: !!user?.id,
  });

  const dejarOrgMutation = useMutation({
    mutationFn: (orgId: string) => organizationsApi.leaveOrganization(orgId, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orgs"] }),
  });

  const addSkillMutation = useMutation({
    mutationFn: (habilidadId: string) => skillsApi.addUserSkill(user!.id, habilidadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userSkills"] }),
  });

  const removeSkillMutation = useMutation({
    mutationFn: (habilidadId: string) => skillsApi.removeUserSkill(user!.id, habilidadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userSkills"] }),
  });

  const availableSkills = allSkills.filter(
    (s) => !userSkills.some((us) => us.habilidad_id === s.id || us.habilidad?.id === s.id)
  );

  const q = skillSearch.trim().toLowerCase();
  const filteredAvailableSkills = q
    ? availableSkills.filter(
        (s) =>
          s.nombre.toLowerCase().includes(q) ||
          (s.categoria?.toLowerCase().includes(q) ?? false) ||
          (s.tipo?.toLowerCase().includes(q) ?? false)
      )
    : availableSkills;

  const handleUsarMiUbicacion = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateUbicacion.mutate({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    uploadImage(file)
      .then((res) => updateAvatar.mutate(res.url))
      .catch(() => {});
    e.target.value = "";
  };

  return (
    <>
      <TopBar title="Mi Perfil" />
      <div className="flex-1 p-5 sm:p-8 max-w-3xl mx-auto w-full space-y-6">
        <Link
          href="/dashboard/gamification"
          className="block p-4 rounded-2xl mb-6 transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8" style={{ color: "var(--accent)" }} />
            <div>
              <p className="font-semibold" style={{ color: "var(--text)" }}>Ver insignias y experiencia</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Nivel, XP, medallas, ranking y certificados
              </p>
            </div>
          </div>
        </Link>

        <Section title="Datos personales" icon={UserPlus}>
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
                style={{ background: "var(--bg-subtle)", border: "2px solid var(--border)" }}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: "var(--text-muted)" }}>
                    {(displayName || user?.nombre || "V")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer w-fit"
                  style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
                  <Camera className="w-4 h-4" />
                  {updateAvatar.isPending ? "Subiendo..." : "Cambiar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={updateAvatar.isPending}
                    className="hidden"
                  />
                </label>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>JPG, PNG. Máx. 5 MB</p>
              </div>
            </div>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nombre"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Cuéntanos sobre ti"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              onClick={() => updateProfile.mutate()}
              disabled={!displayName.trim() || updateProfile.isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              {updateProfile.isPending ? "Guardando..." : "Guardar perfil"}
            </button>
          </div>
        </Section>

        <Section title="Ubicación" icon={MapPin}>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Guarda tu ubicación para que el sistema priorice asignarte tareas y eventos cercanos a ti.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleUsarMiUbicacion}
              disabled={updateUbicacion.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              <MapPin className="w-4 h-4" />
              {updateUbicacion.isPending ? "Obteniendo..." : "Usar mi ubicación"}
            </button>
            {user?.ubicacion?.lat != null && (
              <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                Guardada: {user.ubicacion.lat?.toFixed(4)}, {user.ubicacion.lon?.toFixed(4)}
                {user.ubicacion.ciudad && ` · ${user.ubicacion.ciudad}`}
              </span>
            )}
          </div>
        </Section>

        <Section title="Disponibilidad" icon={Globe}>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Indica tu estado de disponibilidad. Solo los miembros de tu organización podrán verlo al asignar tareas.
          </p>
          <div className="flex flex-wrap gap-3">
            {(["disponible", "no_disponible", "previo_consulta"] as const).map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{
                  background: disponibilidadEstado === opt ? "var(--accent-soft)" : "var(--bg-subtle)",
                  border: `1px solid ${disponibilidadEstado === opt ? "var(--accent)" : "var(--border)"}`,
                  color: disponibilidadEstado === opt ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                <input
                  type="radio"
                  name="disponibilidad"
                  value={opt}
                  checked={disponibilidadEstado === opt}
                  onChange={() => {
                    setDisponibilidadEstado(opt);
                    updatePerfilExtra?.mutate?.({ disponibilidad_estado: opt });
                  }}
                  className="sr-only"
                />
                {opt === "disponible" && "Disponible"}
                {opt === "no_disponible" && "No disponible"}
                {opt === "previo_consulta" && "Previo a consulta"}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Mis organizaciones" icon={Building2}>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Organizaciones a las que perteneces. Puedes dejar una organización cuando quieras.
          </p>
          {misOrgs.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No perteneces a ninguna organización. Ve a Explorar orgs para unirte.
            </p>
          ) : (
            <div className="space-y-2">
              {misOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <Link
                    href={`/dashboard/organizaciones/${org.id}`}
                    className="font-medium text-sm truncate flex-1 min-w-0"
                    style={{ color: "var(--text)" }}
                  >
                    {org.nombre}
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("¿Dejar esta organización?")) dejarOrgMutation.mutate(org.id);
                    }}
                    disabled={dejarOrgMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
                    style={{ background: "rgba(239,68,68,.15)", color: "#dc2626" }}
                  >
                    <LogOut className="w-3 h-3" /> Dejar
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Habilidades" icon={Wrench}>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Gestiona tus habilidades (CU05). Los organizadores te asignarán tareas según tu perfil.
          </p>
          {loadingSkills ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando...</p>
          ) : (
            <div className="space-y-4">
              {userSkills.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Tus habilidades:</p>
                  <div className="flex flex-wrap gap-2">
                    {userSkills.map((us) => (
                      <span
                        key={us.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                        style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
                      >
                        {us.habilidad?.nombre ?? us.habilidad_id}
                        <button
                          onClick={() => removeSkillMutation.mutate(us.habilidad_id)}
                          disabled={removeSkillMutation.isPending}
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
                    placeholder="Buscar habilidades (por nombre o categoría)..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-3"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {filteredAvailableSkills.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addSkillMutation.mutate(s.id)}
                        disabled={addSkillMutation.isPending}
                        className="px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-80 shrink-0"
                        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                        title={s.descripcion}
                      >
                        + {s.nombre}
                        {s.categoria && <span className="opacity-60 ml-0.5">({s.categoria})</span>}
                      </button>
                    ))}
                  </div>
                  {filteredAvailableSkills.length === 0 && availableSkills.length > 0 && (
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>No hay resultados para &quot;{skillSearch}&quot;</p>
                  )}
                </div>
              )}
              {userSkills.length === 0 && availableSkills.length === 0 && !loadingAllSkills && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay habilidades en el catálogo.</p>
              )}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

/* ── Logo de la organización (Cloudinary) ────────────────────── */
function OrgLogoSection({ activeOrgId }: { activeOrgId: string }) {
  const qc = useQueryClient();
  const { data: org } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId),
    enabled: !!activeOrgId,
  });
  const updateLogo = useMutation({
    mutationFn: async (logo_url: string) => {
      return organizationsApi.update(activeOrgId, { logo_url });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", activeOrgId] }),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    uploadImage(file)
      .then((res) => updateLogo.mutate(res.url))
      .catch(() => {});
    e.target.value = "";
  };

  return (
    <Section title="Logo de la organización" icon={Image}>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        El logo se muestra en el perfil público y al explorar organizaciones. JPG, PNG. Máx. 5 MB.
      </p>
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
          style={{ background: "var(--bg-subtle)", border: "2px solid var(--border)" }}
        >
          {org?.logo_url ? (
            <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
        <div>
          <label
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer w-fit"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
          >
            <Camera className="w-4 h-4" />
            {updateLogo.isPending ? "Subiendo..." : "Cambiar logo"}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={updateLogo.isPending}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </Section>
  );
}

/* ── Perfil público de la organización ─────────────────────── */
function OrgPerfilPublicoSection({ activeOrgId }: { activeOrgId: string }) {
  const qc = useQueryClient();
  const { data: org } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId),
    enabled: !!activeOrgId,
  });
  const [mision, setMision] = useState("");
  const [vision, setVision] = useState("");
  const [objetivosText, setObjetivosText] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [redes, setRedes] = useState<Record<string, string>>({});
  const [slugInput, setSlugInput] = useState("");
  const [slugError, setSlugError] = useState("");
  const [socialError, setSocialError] = useState("");
  const updateNormas = useMutation({
    mutationFn: (normas: OrgNormas) => organizationsApi.update(activeOrgId, { normas }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", activeOrgId] }),
  });

  const getNormasBase = (): OrgNormas => {
    const cached = qc.getQueryData(["org", activeOrgId]) as Organization | undefined;
    return ((cached?.normas ?? org?.normas ?? {}) as OrgNormas);
  };

  useEffect(() => {
    if (org) {
      setDescripcion(org.descripcion ?? "");
      setSitioWeb(org.sitio_web ?? "");
      setSlugInput(org.slug ?? "");
      setSlugError("");
      setSocialError("");
      const pp = org.normas?.perfil_publico;
      setMision(pp?.mision ?? "");
      setVision(pp?.vision ?? "");
      setObjetivosText(Array.isArray(pp?.objetivos) ? pp.objetivos.join("\n") : "");
      setRedes((pp?.redes as Record<string, string>) ?? {});
    }
  }, [org]);

  const handleSave = () => {
    const objetivos = objetivosText
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    const redesFiltradas: Record<string, string> = {};
    for (const key of ["facebook", "instagram", "twitter", "linkedin"] as const) {
      const normalized = normalizeSocialUrl(key, redes[key] ?? "");
      if (normalized === null) {
        setSocialError(`El enlace de ${key} no es válido o apunta a una URL local/privada.`);
        return;
      }
      if (normalized) {
        redesFiltradas[key] = normalized;
      }
    }
    setRedes((prev) => ({ ...prev, ...redesFiltradas }));
    setSocialError("");
    const baseNormas = getNormasBase();
    const normas: OrgNormas = {
      ...baseNormas,
      perfil_publico: {
        ...((baseNormas.perfil_publico ?? {}) as Record<string, unknown>),
        mision: mision.trim() || undefined,
        vision: vision.trim() || undefined,
        objetivos: objetivos.length ? objetivos : undefined,
        redes: Object.keys(redesFiltradas).length ? redesFiltradas : undefined,
      },
    };

    const normalizedSlug = slugifyOrgInput(slugInput);
    if (!normalizedSlug || normalizedSlug.length < 2) {
      setSlugError("El subenlace debe tener al menos 2 caracteres.");
      return;
    }
    setSlugError("");

    organizationsApi
      .update(activeOrgId, { slug: normalizedSlug })
      .then(() => {
        setSlugInput(normalizedSlug);
        updateNormas.mutate(normas);
      })
      .catch((err: unknown) => {
        const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setSlugError(message || "No se pudo guardar el subenlace público.");
      });
  };

  const setRedUrl = (key: string, value: string) => {
    setRedes((r) => ({ ...r, [key]: value }));
  };

  const handleSaveDesc = () => {
    organizationsApi.update(activeOrgId, { descripcion: descripcion.trim() || undefined, sitio_web: sitioWeb.trim() || undefined })
      .then(() => qc.invalidateQueries({ queryKey: ["org", activeOrgId] }));
  };

  const publicUrl = org?.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/org/${org.slug}` : null;

  return (
    <Section title="Perfil público" icon={Globe}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Lo que verán los voluntarios al explorar organizaciones.
        </p>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver cómo lo ven otros
          </a>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Descripción / Base</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={handleSaveDesc}
            rows={3}
            placeholder="Breve descripción de tu organización..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Sitio web</label>
          <input
            type="url"
            value={sitioWeb}
            onChange={(e) => setSitioWeb(e.target.value)}
            onBlur={handleSaveDesc}
            placeholder="https://..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Subenlace público de organización</label>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Puedes escribir @mi_ong o mi-ong. Se convertirá en /org/mi-ong.
          </p>
          <input
            type="text"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            onBlur={handleSave}
            placeholder="@mi_organizacion"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Misión</label>
          <textarea
            value={mision}
            onChange={(e) => setMision(e.target.value)}
            rows={2}
            placeholder="¿Cuál es tu misión?"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Visión</label>
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            rows={2}
            placeholder="¿Cuál es tu visión?"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Objetivos (uno por línea)</label>
          <textarea
            value={objetivosText}
            onChange={(e) => setObjetivosText(e.target.value)}
            onBlur={handleSave}
            rows={3}
            placeholder={"Ejemplo:\nCapacitar voluntarios\nExpandir cobertura comunitaria"}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Redes sociales</label>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Puedes poner `@usuario` o URL completa. Solo se aceptan enlaces públicos reales (no localhost/red privada).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["facebook", "instagram", "twitter", "linkedin"] as const).map((key) => (
              <input
                key={key}
                type="text"
                value={redes[key] ?? ""}
                onChange={(e) => setRedUrl(key, e.target.value)}
                onBlur={handleSave}
                placeholder={key === "twitter" ? "@usuario o https://x.com/usuario" : `@usuario o https://${key}.com/...`}
                className="w-full px-4 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            ))}
          </div>
          {socialError && <p className="text-xs text-red-500 mt-1">{socialError}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={updateNormas.isPending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          {updateNormas.isPending ? "Guardando..." : "Guardar perfil público"}
        </button>
      </div>
    </Section>
  );
}

/* ── Visibilidad: qué mostrar en el perfil público ───────────── */
function OrgVisibilidadSection({ activeOrgId }: { activeOrgId: string }) {
  const qc = useQueryClient();
  const { data: org } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId),
    enabled: !!activeOrgId,
  });
  const [vis, setVis] = useState({
    mostrar_mision: true,
    mostrar_vision: true,
    mostrar_objetivos: true,
    mostrar_redes: true,
    mostrar_eventos: true,
  });
  const updateNormas = useMutation({
    mutationFn: (normas: OrgNormas) => organizationsApi.update(activeOrgId, { normas }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", activeOrgId] }),
  });

  const getNormasBase = (): OrgNormas => {
    const cached = qc.getQueryData(["org", activeOrgId]) as Organization | undefined;
    return ((cached?.normas ?? org?.normas ?? {}) as OrgNormas);
  };

  useEffect(() => {
    const v = org?.normas?.visibilidad as Record<string, boolean> | undefined;
    if (v && typeof v === "object") {
      setVis((prev) => ({
        mostrar_mision: v.mostrar_mision ?? prev.mostrar_mision,
        mostrar_vision: v.mostrar_vision ?? prev.mostrar_vision,
        mostrar_objetivos: v.mostrar_objetivos ?? prev.mostrar_objetivos,
        mostrar_redes: v.mostrar_redes ?? prev.mostrar_redes,
        mostrar_eventos: v.mostrar_eventos ?? prev.mostrar_eventos,
      }));
    }
  }, [org]);

  const handleSave = () => {
    const baseNormas = getNormasBase();
    const normas: OrgNormas = {
      ...baseNormas,
      visibilidad: vis,
    };
    updateNormas.mutate(normas);
  };

  const setVisItem = (key: keyof typeof vis, value: boolean) => {
    setVis((p) => ({ ...p, [key]: value }));
  };

  return (
    <Section title="Visibilidad" icon={Eye}>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Elige qué secciones mostrar en tu perfil público. Si no configuras nada, todo se muestra por defecto.
      </p>
      <div className="space-y-4">
        {[
          { key: "mostrar_mision" as const, label: "Mostrar misión" },
          { key: "mostrar_vision" as const, label: "Mostrar visión" },
          { key: "mostrar_objetivos" as const, label: "Mostrar objetivos" },
          { key: "mostrar_redes" as const, label: "Mostrar redes sociales" },
          { key: "mostrar_eventos" as const, label: "Mostrar eventos/actividades recientes" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={vis[key]}
              onChange={(e) => setVisItem(key, e.target.checked)}
              onBlur={handleSave}
              className="rounded"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
        <button
          onClick={handleSave}
          disabled={updateNormas.isPending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          {updateNormas.isPending ? "Guardando..." : "Guardar visibilidad"}
        </button>
      </div>
    </Section>
  );
}

/* ── Personalización: colores, banner ───────────────────────── */
function OrgPersonalizacionSection({ activeOrgId }: { activeOrgId: string }) {
  const qc = useQueryClient();
  const { data: org } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId),
    enabled: !!activeOrgId,
  });
  const [colorPrimario, setColorPrimario] = useState("#3b82f6");
  const [colorSecundario, setColorSecundario] = useState("#1e40af");
  const [bannerUrl, setBannerUrl] = useState("");
  const [colorError, setColorError] = useState("");
  const updateNormas = useMutation({
    mutationFn: (normas: OrgNormas) => organizationsApi.update(activeOrgId, { normas }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", activeOrgId] }),
  });

  const getNormasBase = (): OrgNormas => {
    const cached = qc.getQueryData(["org", activeOrgId]) as Organization | undefined;
    return ((cached?.normas ?? org?.normas ?? {}) as OrgNormas);
  };

  useEffect(() => {
    const p = org?.normas?.personalizacion as Record<string, string> | undefined;
    if (p && typeof p === "object") {
      setColorPrimario(p.color_primario ?? "#3b82f6");
      setColorSecundario(p.color_secundario ?? "#1e40af");
      setBannerUrl(p.banner_url ?? "");
    }
  }, [org]);

  const handleSave = () => {
    const colorPrimarioNorm = normalizeHexColor(colorPrimario, "#3b82f6");
    const colorSecundarioNorm = normalizeHexColor(colorSecundario, "#1e40af");
    if (!HEX_COLOR_RE.test(colorPrimario.trim()) || !HEX_COLOR_RE.test(colorSecundario.trim())) {
      setColorError("Usa colores HEX válidos, por ejemplo #3b82f6.");
    } else {
      setColorError("");
    }
    const baseNormas = getNormasBase();
    const normas: OrgNormas = {
      ...baseNormas,
      personalizacion: {
        ...((baseNormas.personalizacion as Record<string, unknown> | undefined) ?? {}),
        color_primario: colorPrimarioNorm,
        color_secundario: colorSecundarioNorm || undefined,
        banner_url: bannerUrl.trim() || undefined,
      },
    };
    setColorPrimario(colorPrimarioNorm);
    setColorSecundario(colorSecundarioNorm);
    updateNormas.mutate(normas);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    uploadImage(file)
      .then((res) => {
        setBannerUrl(res.url);
        const baseNormas = getNormasBase();
        const normas: OrgNormas = {
          ...baseNormas,
          personalizacion: {
            ...((baseNormas.personalizacion as Record<string, string> | undefined) ?? {}),
            banner_url: res.url,
          },
        };
        updateNormas.mutate(normas);
      })
      .catch(() => {});
    e.target.value = "";
  };

  return (
    <Section title="Identidad visual" icon={Palette}>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Colores y banner para personalizar tu perfil público.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Color primario</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value)}
              onBlur={handleSave}
              className="w-12 h-10 rounded-lg cursor-pointer border"
              style={{ borderColor: "var(--border)" }}
            />
            <input
              type="text"
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value)}
              onBlur={handleSave}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-mono outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Color secundario (opcional)</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorSecundario}
              onChange={(e) => setColorSecundario(e.target.value)}
              onBlur={handleSave}
              className="w-12 h-10 rounded-lg cursor-pointer border"
              style={{ borderColor: "var(--border)" }}
            />
            <input
              type="text"
              value={colorSecundario}
              onChange={(e) => setColorSecundario(e.target.value)}
              onBlur={handleSave}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-mono outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          {colorError && <p className="text-xs text-red-500 mt-1">{colorError}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Banner/portada (opcional)</label>
          {bannerUrl ? (
            <div className="mb-2">
              <img src={bannerUrl} alt="Banner" className="w-full max-h-32 object-cover rounded-xl" />
            </div>
          ) : null}
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer w-fit"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
          >
            <Camera className="w-4 h-4" />
            {bannerUrl ? "Cambiar banner" : "Subir banner"}
            <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
          </label>
        </div>
        <button
          onClick={handleSave}
          disabled={updateNormas.isPending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          {updateNormas.isPending ? "Guardando..." : "Guardar personalización"}
        </button>
      </div>
    </Section>
  );
}

/* ── Términos y políticas (aceptación antes de unirse) ──────── */
function OrgTerminosSection({ activeOrgId }: { activeOrgId: string }) {
  const qc = useQueryClient();
  const { data: org } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId),
    enabled: !!activeOrgId,
  });
  const [terminos, setTerminos] = useState("");
  const [politicas, setPoliticas] = useState<string[]>([]);
  const [nuevaPolitica, setNuevaPolitica] = useState("");
  const updateNormas = useMutation({
    mutationFn: (normas: OrgNormas) => organizationsApi.update(activeOrgId, { normas }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", activeOrgId] }),
  });

  const getNormasBase = (): OrgNormas => {
    const cached = qc.getQueryData(["org", activeOrgId]) as Organization | undefined;
    return ((cached?.normas ?? org?.normas ?? {}) as OrgNormas);
  };

  useEffect(() => {
    if (org?.normas) {
      setTerminos(org.normas.terminos_servicio ?? "");
      setPoliticas(Array.isArray(org.normas.politicas) ? org.normas.politicas : []);
    }
  }, [org]);

  const handleSave = () => {
    const baseNormas = getNormasBase();
    const normas: OrgNormas = {
      ...baseNormas,
      terminos_servicio: terminos.trim() || undefined,
      politicas: politicas.filter(Boolean),
    };
    updateNormas.mutate(normas);
  };

  const addPolitica = () => {
    if (nuevaPolitica.trim()) {
      setPoliticas((p) => [...p, nuevaPolitica.trim()]);
      setNuevaPolitica("");
    }
  };

  const removePolitica = (i: number) => {
    setPoliticas((p) => p.filter((_, j) => j !== i));
  };

  return (
    <Section title="Términos y políticas" icon={FileText}>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Los voluntarios deberán aceptar esto antes de solicitar unirse. Se guarda en JSON para flexibilidad.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Términos de servicio</label>
          <textarea
            value={terminos}
            onChange={(e) => setTerminos(e.target.value)}
            rows={5}
            placeholder="Reglas y condiciones que debe aceptar el voluntario para unirse..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Políticas (lista dinámica)</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={nuevaPolitica}
              onChange={(e) => setNuevaPolitica(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPolitica())}
              placeholder="Añadir política..."
              className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="button"
              onClick={addPolitica}
              className="px-4 py-2 rounded-lg text-sm font-medium shrink-0"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
            >
              + Añadir
            </button>
          </div>
          <div className="space-y-1">
            {politicas.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <span className="text-sm flex-1">{p}</span>
                <button type="button" onClick={() => removePolitica(i)} className="p-1 rounded opacity-60 hover:opacity-100">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateNormas.isPending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          {updateNormas.isPending ? "Guardando..." : "Guardar términos y políticas"}
        </button>
      </div>
    </Section>
  );
}

/* ── Small helpers ────────────────────────────────────────── */
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function SettingsPage() {
  const { activeOrgId, user, setAuth, token } = useAuthStore();
  const isVolunteer = user?.tipo === "voluntario";
  const qc = useQueryClient();

  /* Org name update */
  const [orgName, setOrgName]           = useState("");
  const [nameSuccess, setNameSuccess]   = useState(false);
  const [displayName, setDisplayName]   = useState(user?.nombre ?? "");
  const [bio, setBio] = useState("");

  /* Invite member */
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteOwner, setInviteOwner]   = useState(false);

  /* Members list */
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: () => volunteersApi.listMembers(activeOrgId!),
    enabled: !!activeOrgId,
  });

  /* Update org name */
  const updateOrg = useMutation({
    mutationFn: async (nombre: string) => {
      const { data } = await apiClient.put(`/organizaciones/${activeOrgId}`, { nombre });
      return data;
    },
    onSuccess: () => {
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 2500);
    },
  });

  /* Invite member */
  const addMember = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/organizaciones/${activeOrgId}/miembros`, {
        usuario_id: inviteUserId.trim(),
        es_propietario: inviteOwner,
      });
      return data;
    },
    onSuccess: () => {
      setInviteUserId("");
      setInviteOwner(false);
      qc.invalidateQueries({ queryKey: ["members", activeOrgId] });
    },
  });

  /* Remove member */
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/organizaciones/${activeOrgId}/miembros/${userId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", activeOrgId] }),
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch("/auth/me", { nombre: displayName, bio });
      return data as { id: string; email: string; nombre: string; estado: boolean; tipo?: "voluntario" | "organizador"; is_super_admin?: boolean; avatar_url?: string };
    },
    onSuccess: (data) => {
      if (token && user) {
        setAuth(token, {
          ...user,
          nombre: data.nombre,
          tipo: data.tipo ?? user.tipo,
          is_super_admin: data.is_super_admin ?? user.is_super_admin,
          avatar_url: data.avatar_url ?? user.avatar_url,
        });
      }
    },
  });

  const updateAvatar = useMutation({
    mutationFn: async (avatar_url: string) => {
      const { data } = await apiClient.patch("/auth/me", { avatar_url });
      return data as { id: string; email: string; nombre: string; estado: boolean; tipo?: "voluntario" | "organizador"; is_super_admin?: boolean; avatar_url?: string; ubicacion?: { lat?: number; lon?: number; ciudad?: string } };
    },
    onSuccess: (data) => {
      if (token && user) {
        setAuth(token, {
          ...user,
          avatar_url: data.avatar_url ?? user.avatar_url,
          ubicacion: data.ubicacion ?? user.ubicacion,
        });
      }
    },
  });

  const updateUbicacion = useMutation({
    mutationFn: async (ubicacion: { lat: number; lon: number; ciudad?: string }) => {
      const { data } = await apiClient.patch("/auth/me", { ubicacion });
      return data as { id: string; email: string; nombre: string; estado: boolean; tipo?: "voluntario" | "organizador"; is_super_admin?: boolean; avatar_url?: string; ubicacion?: { lat?: number; lon?: number; ciudad?: string }; perfil_extra?: { disponibilidad?: string[]; preferencias?: string[] } };
    },
    onSuccess: (data) => {
      if (token && user) {
        setAuth(token, {
          ...user,
          ubicacion: data.ubicacion ?? user.ubicacion,
          perfil_extra: data.perfil_extra ?? user.perfil_extra,
        });
      }
    },
  });

  const updatePerfilExtra = useMutation({
    mutationFn: async (perfil_extra: { disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta"; preferencias?: string[] }) => {
      const { data } = await apiClient.patch("/auth/me", { perfil_extra });
      return data as { id: string; email: string; nombre: string; estado: boolean; tipo?: "voluntario" | "organizador"; is_super_admin?: boolean; avatar_url?: string; ubicacion?: { lat?: number; lon?: number; ciudad?: string }; perfil_extra?: { disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta"; preferencias?: string[] } };
    },
    onSuccess: (data) => {
      if (token && user) {
        setAuth(token, {
          ...user,
          perfil_extra: data.perfil_extra ?? user.perfil_extra,
        });
      }
    },
  });

  if (isVolunteer) {
    return (
      <VolunteerProfile
        displayName={displayName}
        setDisplayName={setDisplayName}
        bio={bio}
        setBio={setBio}
        updateProfile={updateProfile}
        updateAvatar={updateAvatar}
        updateUbicacion={updateUbicacion}
        updatePerfilExtra={updatePerfilExtra}
      />
    );
  }

  if (!activeOrgId) {
    return (
      <>
        <TopBar title="Configuración" />
        <div className="flex-1 flex items-center justify-center py-24">
          <p style={{ color: "var(--text-muted)" }}>Selecciona una organización primero para configurar tu ONG.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Configuración" />
      <div className="flex-1 p-5 sm:p-8 max-w-3xl mx-auto w-full space-y-6">

        {/* Org settings */}
        <Section title="Organización" icon={Building2}>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Nuevo nombre de la organización"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              onClick={() => updateOrg.mutate(orgName)}
              disabled={!orgName.trim() || updateOrg.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all hover:scale-105"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              {updateOrg.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : nameSuccess
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <Settings className="w-4 h-4" />}
              {nameSuccess ? "Guardado" : "Guardar"}
            </button>
          </div>
          {updateOrg.isError && (
            <p className="text-xs mt-2 text-red-500">Error al actualizar.</p>
          )}
        </Section>

        {/* Logo de la organización (Cloudinary) */}
        <OrgLogoSection activeOrgId={activeOrgId!} />

        {/* Perfil público (lo que ven los voluntarios al explorar organizaciones) */}
        <OrgPerfilPublicoSection activeOrgId={activeOrgId!} />

        {/* Visibilidad: qué mostrar en el perfil público */}
        <OrgVisibilidadSection activeOrgId={activeOrgId!} />

        {/* Personalización: colores, banner, identidad */}
        <OrgPersonalizacionSection activeOrgId={activeOrgId!} />

        {/* Términos y políticas (aceptación obligatoria antes de unirse) */}
        <OrgTerminosSection activeOrgId={activeOrgId!} />

        {/* Invite member */}
        <Section title="Invitar miembro" icon={UserPlus}>
          <div className="space-y-3">
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              placeholder="UUID del usuario"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={inviteOwner}
                onChange={(e) => setInviteOwner(e.target.checked)}
                className="rounded"
              />
              Agregar como propietario
            </label>
            <button
              onClick={() => addMember.mutate()}
              disabled={!inviteUserId.trim() || addMember.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all hover:scale-105"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {addMember.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Invitar
            </button>
            {addMember.isError && <p className="text-xs text-red-500">Error al invitar.</p>}
            {addMember.isSuccess && <p className="text-xs text-green-500">¡Miembro añadido!</p>}
          </div>
        </Section>

        {/* Members list */}
        <Section title="Miembros actuales" icon={Users}>
          {loadingMembers ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>Sin miembros.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {m.usuario_id.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.usuario_id}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {m.es_propietario ? "Propietario" : "Miembro"} · {m.estado_membresia}
                      </p>
                    </div>
                  </div>
                  {!m.es_propietario && (
                    <button
                      onClick={() => removeMember.mutate(m.usuario_id)}
                      disabled={removeMember.isPending}
                      className="p-2 rounded-xl opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
