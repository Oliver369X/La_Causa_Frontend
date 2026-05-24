"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { apiClient } from "@/shared/api/client";
import { volunteersApi } from "@/features/volunteers/api/volunteersApi";
import { TopBar } from "@/shared/ui/Sidebar";
import {
  Settings,
  Users,
  Building2,
  UserPlus,
  Trash2,
  Loader2,
  CheckCircle,
  Globe,
  FileText,
  Camera,
  Image,
  ExternalLink,
  Eye,
  Palette,
  Trophy,
  LogOut,
  Copy,
  LayoutList,
  Sparkles,
  Hash,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { organizationsApi, type OrgNormas, type Organization } from "@/features/organizations/api/organizationsApi";
import { gamificationApi, type ConfigGamificacionOrg } from "@/features/gamification/api/gamificationApi";
import Link from "next/link";
import { VolunteerProfileBasicsCard } from "@/features/volunteers/ui/VolunteerProfileBasicsCard";
import { VolunteerPersonalizationCard } from "@/features/volunteers/ui/VolunteerPersonalizationCard";
import { VolunteerAvailabilitySelector } from "@/features/volunteers/ui/VolunteerAvailabilitySelector";
import { VolunteerSkillsManager } from "@/features/volunteers/ui/VolunteerSkillsManager";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { extractApiDetail, extractUploadError } from "@/shared/utils/apiError";

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

function copyTextToClipboard(text: string, successMessage = "Copiado al portapapeles") {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(successMessage),
    () => toast.error("No se pudo copiar. Copia manualmente.")
  );
}

/** ID y URL pública de la org (soporte / integraciones) */
function OrgTechnicalIds({ activeOrgId }: { activeOrgId: string }) {
  const { data: org } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId),
    enabled: !!activeOrgId,
  });
  if (!org) return null;
  return (
    <div className="mt-5 pt-5 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Referencia técnica</p>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyTextToClipboard(org.id, "ID de organización copiado")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono w-full sm:w-auto justify-start text-left"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <Hash className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{org.id.slice(0, 8)}… · Copiar ID completo</span>
        </button>
        {org.slug ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return;
              copyTextToClipboard(`${window.location.origin}/org/${org.slug}`);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full sm:w-auto justify-start text-left"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">/org/{org.slug} · Copiar URL pública</span>
          </button>
        ) : null}
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        El ID puede pedirlo soporte o integraciones. La URL pública requiere guardar el subenlace en «Perfil público».
      </p>
    </div>
  );
}

function VolunteerSettingsNav() {
  const items = [
    { href: "#settings-public-vol", label: "Enlace público" },
    { href: "#settings-profile-core", label: "Datos" },
    { href: "#settings-orgs", label: "Organizaciones" },
    { href: "#settings-skills", label: "Habilidades" },
    { href: "/dashboard/settings/ajustes", label: "Ajustes" },
  ];
  return (
    <nav
      className="sticky top-14 md:top-0 z-[5] -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 mb-4 rounded-xl border"
      style={{
        background: "color-mix(in oklab, var(--bg-card) 88%, transparent)",
        borderColor: "var(--border)",
        backdropFilter: "blur(10px)",
      }}
      aria-label="Secciones de tu perfil"
    >
      <div className="flex items-center gap-2 mb-2">
        <LayoutList className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Ir a
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
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
  apellido,
  setApellido,
  bio,
  setBio,
  tituloPublico,
  setTituloPublico,
  linkedin,
  setLinkedin,
  web,
  setWeb,
  github,
  setGithub,
  savePersonalization,
  savePersonalizationPending,
  updateProfile,
  updateAvatar,
  updateUbicacion,
  updatePerfilExtra,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  apellido: string;
  setApellido: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  tituloPublico: string;
  setTituloPublico: (v: string) => void;
  linkedin: string;
  setLinkedin: (v: string) => void;
  web: string;
  setWeb: (v: string) => void;
  github: string;
  setGithub: (v: string) => void;
  savePersonalization: () => Promise<void>;
  savePersonalizationPending: boolean;
  updateProfile: { mutate: () => void; isPending: boolean };
  updateAvatar: { mutate: (url: string) => void; isPending: boolean };
  updateUbicacion: { mutate: (ubicacion: { lat: number; lon: number; ciudad?: string }) => void; isPending: boolean };
  updatePerfilExtra: {
    mutate: (perfil_extra: {
      disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta";
      preferencias?: string[];
      titulo_publico?: string;
      enlaces_publicos?: { linkedin?: string; web?: string; github?: string };
    }) => void;
    isPending: boolean;
  };
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [disponibilidadEstado, setDisponibilidadEstado] = useState<"disponible" | "no_disponible" | "previo_consulta">(
    () => (user?.perfil_extra?.disponibilidad_estado as "disponible" | "no_disponible" | "previo_consulta") ?? "previo_consulta"
  );

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

  const handleAvatarChange = (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Elegí una imagen JPG, PNG, WebP o GIF.");
      return;
    }
    uploadImage(file)
      .then((res) => updateAvatar.mutate(res.url))
      .catch((err) => toast.error(extractUploadError(err)));
  };

  return (
    <>
      <TopBar title="Perfil y datos" />
      <div className="flex-1 p-5 sm:p-8 max-w-3xl mx-auto w-full space-y-6">
        <div
          className="p-4 sm:p-5 rounded-2xl"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Tu perfil y tu cuenta
          </h2>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Aquí defines <strong className="font-medium" style={{ color: "var(--text)" }}>cómo te muestras</strong>{" "}
            (nombre, foto, ubicación, habilidades, disponibilidad) y el enlace público de tu perfil competitivo.
            <span className="block mt-2">
              <strong className="font-medium" style={{ color: "var(--text)" }}>Avisos y navegación:</strong>{" "}
              <strong className="font-medium" style={{ color: "var(--text)" }}>Comunicaciones</strong> está en el menú lateral.
              El tema claro/oscuro y cerrar sesión están en el <strong className="font-medium" style={{ color: "var(--text)" }}>pie del menú lateral</strong>{" "}
              (en móvil, al abrir el menú).
            </span>
          </p>
        </div>

        <VolunteerSettingsNav />

        <div className="flex flex-wrap items-center justify-end gap-3 -mt-1 mb-1">
          <Link
            href="/dashboard/settings/ajustes"
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-90"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--accent)" }}
          >
            Ajustes de cuenta y seguridad →
          </Link>
        </div>

        {user?.id ? (
          <div
            id="settings-public-vol"
            className="p-4 sm:p-5 rounded-2xl scroll-mt-28 md:scroll-mt-8"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <Globe className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                  Tu perfil competitivo público
                </p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Otros pueden ver tu ELO, racha de entregas, insignias y habilidades con un enlace. No muestra tu correo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!user?.id || typeof window === "undefined") return;
                    copyTextToClipboard(`${window.location.origin}/voluntario/${user.id}`);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <Copy className="w-4 h-4" /> Copiar enlace
                </button>
                <Link
                  href={`/voluntario/${user.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)" }}
                >
                  <ExternalLink className="w-4 h-4" /> Ver vista previa
                </Link>
              </div>
            </div>
          </div>
        ) : null}

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

        <div id="settings-profile-core" className="space-y-6 scroll-mt-28 md:scroll-mt-24">
          <VolunteerProfileBasicsCard
            user={user}
            displayName={displayName}
            setDisplayName={setDisplayName}
            apellido={apellido}
            setApellido={setApellido}
            bio={bio}
            setBio={setBio}
            onSave={() => updateProfile.mutate()}
            savePending={updateProfile.isPending}
            onAvatarFile={handleAvatarChange}
            avatarPending={updateAvatar.isPending}
            onUseLocation={handleUsarMiUbicacion}
            locationPending={updateUbicacion.isPending}
            description="Completa tu presentación, sube una foto y guarda tu ubicación para recibir mejores recomendaciones."
          />

          <VolunteerPersonalizationCard
            tituloPublico={tituloPublico}
            setTituloPublico={setTituloPublico}
            linkedin={linkedin}
            setLinkedin={setLinkedin}
            web={web}
            setWeb={setWeb}
            github={github}
            setGithub={setGithub}
            onSave={savePersonalization}
            savePending={savePersonalizationPending}
          />

          <VolunteerAvailabilitySelector
            value={disponibilidadEstado}
            onChange={(value) => {
              setDisponibilidadEstado(value);
              updatePerfilExtra.mutate({ disponibilidad_estado: value });
            }}
            description="Solo los miembros de tu organización verán este estado al asignar tareas."
          />
        </div>

        <Section id="settings-orgs" title="Mis organizaciones" icon={Building2}>
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

        <div id="settings-skills" className="scroll-mt-28 md:scroll-mt-24">
          <VolunteerSkillsManager
            userSkills={userSkills}
            allSkills={allSkills}
            loadingSkills={loadingSkills}
            loadingAllSkills={loadingAllSkills}
            addPending={addSkillMutation.isPending}
            removePending={removeSkillMutation.isPending}
            onAddSkill={(skillId) => addSkillMutation.mutate(skillId)}
            onRemoveSkill={(skillId) => removeSkillMutation.mutate(skillId)}
            description="Gestiona tus habilidades para que las organizaciones te asignen mejores tareas."
          />
        </div>

      </div>
    </>
  );
}

/* ── Logo de la organización (Cloudinary) ────────────────────── */
function OrgLogoSection({
  activeOrgId,
  canManageOrg,
}: {
  activeOrgId: string;
  canManageOrg: boolean;
}) {
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
    if (!canManageOrg) {
      toast.error("No tienes permiso para editar la organización.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
    uploadImage(file)
      .then((res) =>
        updateLogo.mutate(res.url, {
          onSuccess: () => toast.success("Logo actualizado"),
          onError: (err) =>
            toast.error(extractApiDetail(err, "No se pudo guardar el logo en la organización.")),
        })
      )
      .catch((err) => toast.error(extractUploadError(err)));
    e.target.value = "";
  };

  return (
    <Section id="settings-logo" title="Logo de la organización" icon={Image}>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        El logo se muestra en el perfil público y al explorar organizaciones. JPG, PNG o WebP. Máx. 10 MB
        (mín. 200×200 px).
      </p>
      {!canManageOrg && (
        <p className="text-xs mb-3 text-amber-600">
          Solo lectura: necesitas permiso de gestión de la organización para cambiar el logo.
        </p>
      )}
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
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleLogoChange}
              disabled={updateLogo.isPending || !canManageOrg}
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <Section id="settings-public" title="Perfil público" icon={Globe}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Lo que verán los voluntarios al explorar organizaciones.
        </p>
        {publicUrl && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyTextToClipboard(publicUrl)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <Copy className="w-3.5 h-3.5" /> Copiar URL
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver cómo lo ven otros
            </a>
          </div>
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
    mostrar_ranking: true,
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVis((prev) => ({
        mostrar_mision: v.mostrar_mision ?? prev.mostrar_mision,
        mostrar_vision: v.mostrar_vision ?? prev.mostrar_vision,
        mostrar_objetivos: v.mostrar_objetivos ?? prev.mostrar_objetivos,
        mostrar_redes: v.mostrar_redes ?? prev.mostrar_redes,
        mostrar_eventos: v.mostrar_eventos ?? prev.mostrar_eventos,
        mostrar_ranking: v.mostrar_ranking ?? prev.mostrar_ranking,
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
    <Section id="settings-visibility" title="Visibilidad" icon={Eye}>
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
          { key: "mostrar_ranking" as const, label: "Mostrar ranking de voluntarios (ELO)" },
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
function OrgPersonalizacionSection({
  activeOrgId,
  canManageOrg,
}: {
  activeOrgId: string;
  canManageOrg: boolean;
}) {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!canManageOrg) {
      toast.error("No tienes permiso para editar la organización.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
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
        updateNormas.mutate(normas, {
          onSuccess: () => toast.success("Banner actualizado"),
          onError: (err) =>
            toast.error(extractApiDetail(err, "No se pudo guardar el banner.")),
        });
      })
      .catch((err) => toast.error(extractUploadError(err)));
    e.target.value = "";
  };

  return (
    <Section id="settings-brand" title="Identidad visual" icon={Palette}>
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium w-fit ${
              canManageOrg ? "cursor-pointer" : "cursor-not-allowed opacity-60"
            }`}
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
          >
            <Camera className="w-4 h-4" />
            {bannerUrl ? "Cambiar banner" : "Subir banner"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleBannerChange}
              disabled={!canManageOrg}
              className="hidden"
            />
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <Section id="settings-terms" title="Términos y políticas" icon={FileText}>
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
/* ── Configuración de gamificación por organización ───────────── */
function OrgGamificacionSection({ activeOrgId }: { activeOrgId: string }) {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ["config-gamificacion", activeOrgId],
    queryFn: () => gamificationApi.getConfigGamificacion(activeOrgId),
    enabled: !!activeOrgId,
  });
  const [duracion, setDuracion] = useState(12);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (config) setDuracion(config.duracion_temporada_meses);
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<ConfigGamificacionOrg>) =>
      gamificationApi.updateConfigGamificacion(activeOrgId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-gamificacion", activeOrgId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ duracion_temporada_meses: duracion });
  };

  return (
    <Section id="settings-gamification" title="Gamificación" icon={Trophy}>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        Configura temporadas, penalizaciones y reglas de ranking para tu organización.
      </p>
      {isLoading ? (
        <div className="h-24 rounded-xl animate-pulse" style={{ background: "var(--bg-subtle)" }} />
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
              Duración de temporada (meses)
            </label>
            <div className="flex gap-2">
              <select
                value={duracion}
                onChange={(e) => setDuracion(parseInt(e.target.value, 10))}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                {[6, 12, 24].map((m) => (
                  <option key={m} value={m}>{m} meses</option>
                ))}
              </select>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || duracion === config?.duracion_temporada_meses}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
                {saved ? "Guardado" : "Guardar"}
              </button>
            </div>
          </div>
          {config && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Reset ELO: {config.tipo_reset_elo} · Actividad mínima: {config.elo_min_actividad_temporada} tareas
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

function OrgAgentSection({ activeOrgId }: { activeOrgId: string }) {
  return (
    <Section id="settings-agent" title="Configuración del Agente IA" icon={Sparkles}>
      <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
        El agente conversacional puede revisar entregas de tareas, consultar estadísticas de la organización, gestionar eventos y buscar voluntarios. Requiere un plan activo.
      </p>
      <div className="space-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <p>Herramientas disponibles: revisión de evidencias, consulta de candidatos, creación de eventos, búsqueda de voluntarios, estadísticas organizacionales.</p>
        <p>Modelo: configurado por entorno del servidor (Mistral / OpenRouter).</p>
      </div>
      <div className="mt-4">
        <Link
          href="/dashboard/agent"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <Sparkles className="w-4 h-4" />
          Ir al agente
        </Link>
      </div>
    </Section>
  );
}

function Section({ title, icon: Icon, children, id, description }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  id?: string;
  description?: string;
}) {
  return (
    <section
      id={id}
      className="p-6 rounded-2xl scroll-mt-28 md:scroll-mt-24"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-2 mb-6">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {description ? (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Navegación rápida anclada (solo vista organizador) */
function SettingsOrganizerNav() {
  const items: { href: string; label: string }[] = [
    { href: "#settings-org", label: "Organización" },
    { href: "#settings-logo", label: "Logo" },
    { href: "#settings-public", label: "Página pública" },
    { href: "#settings-visibility", label: "Visibilidad" },
    { href: "#settings-brand", label: "Colores" },
    { href: "#settings-terms", label: "Términos" },
    { href: "#settings-gamification", label: "Gamificación" },
    { href: "#settings-invite", label: "Invitar" },
    { href: "#settings-members", label: "Miembros" },
  ];
  return (
    <nav
      className="sticky top-14 md:top-0 z-[5] -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 mb-4 rounded-xl border"
      style={{
        background: "color-mix(in oklab, var(--bg-card) 88%, transparent)",
        borderColor: "var(--border)",
        backdropFilter: "blur(10px)",
      }}
      aria-label="Secciones de configuración"
    >
      <div className="flex items-center gap-2 mb-2">
        <LayoutList className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Ir a
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function SettingsPage() {
  const { activeOrgId, user, setAuth, token } = useAuthStore();
  const { can, esPropietario, isSuperAdmin, permisosLoaded, isVolunteerExperience } = usePermissions();
  const isVolunteer = isVolunteerExperience;
  const qc = useQueryClient();
  const canManageOrg =
    isSuperAdmin ||
    esPropietario ||
    (permisosLoaded &&
      (can("editOrg") ||
        can("createEvents") ||
        can("manageMembers") ||
        can("assignTasks")));

  /* Org name update */
  const [orgName, setOrgName]           = useState("");
  const [nameSuccess, setNameSuccess]   = useState(false);
  const [displayName, setDisplayName]   = useState(user?.nombre ?? "");
  const [apellido, setApellido] = useState(user?.apellido ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [tituloPublico, setTituloPublico] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [web, setWeb] = useState("");
  const [github, setGithub] = useState("");

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
  const { data: orgData } = useQuery({
    queryKey: ["org", activeOrgId],
    queryFn: () => organizationsApi.get(activeOrgId!),
    enabled: !!activeOrgId,
  });

  useEffect(() => {
    if (orgData?.nombre) setOrgName(orgData.nombre);
  }, [orgData?.nombre]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.nombre ?? "");
    setApellido(user.apellido ?? "");
    setBio(user.bio ?? "");
    const pe = user.perfil_extra;
    setTituloPublico(typeof pe?.titulo_publico === "string" ? pe.titulo_publico : "");
    const en = pe?.enlaces_publicos;
    setLinkedin(typeof en?.linkedin === "string" ? en.linkedin : "");
    setWeb(typeof en?.web === "string" ? en.web : "");
    setGithub(typeof en?.github === "string" ? en.github : "");
  }, [user]);

  const updateOrg = useMutation({
    mutationFn: async (nombre: string) => {
      const { data } = await apiClient.put(`/organizaciones/${activeOrgId}`, { nombre });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", activeOrgId] });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 2500);
      toast.success("Nombre de la organización actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el nombre."),
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
      toast.success("Miembro invitado correctamente");
      setInviteUserId("");
      setInviteOwner(false);
      qc.invalidateQueries({ queryKey: ["members", activeOrgId] });
    },
    onError: () => toast.error("No se pudo invitar. Comprueba el UUID y permisos."),
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
      const { data } = await apiClient.patch("/auth/me", {
        nombre: displayName,
        apellido: apellido.trim() || null,
        bio,
      });
      return data as {
        id: string;
        email: string;
        nombre: string;
        apellido?: string | null;
        estado: boolean;
        tipo?: "voluntario" | "organizador";
        is_super_admin?: boolean;
        avatar_url?: string;
        bio?: string;
      };
    },
    onSuccess: (data) => {
      toast.success("Perfil guardado");
      if (token && user) {
        setAuth(token, {
          ...user,
          nombre: data.nombre,
          apellido: data.apellido ?? undefined,
          tipo: data.tipo ?? user.tipo,
          is_super_admin: data.is_super_admin ?? user.is_super_admin,
          avatar_url: data.avatar_url ?? user.avatar_url,
          bio: data.bio ?? bio,
        });
      }
    },
    onError: () => toast.error("No se pudo guardar el perfil."),
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
      toast.success("Foto de perfil actualizada");
    },
    onError: (err) =>
      toast.error(extractApiDetail(err, "No se pudo guardar la foto en tu perfil.")),
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
    mutationFn: async (perfil_extra: {
      disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta";
      preferencias?: string[];
      titulo_publico?: string;
      enlaces_publicos?: { linkedin?: string; web?: string; github?: string };
    }) => {
      const { data } = await apiClient.patch("/auth/me", { perfil_extra });
      return data as {
        id: string;
        perfil_extra?: import("@/shared/store/authStore").UserPerfilExtra;
      };
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

  const savePersonalization = useCallback(async () => {
    try {
      await updatePerfilExtra.mutateAsync({
        titulo_publico: tituloPublico.trim(),
        enlaces_publicos: {
          linkedin: linkedin.trim(),
          web: web.trim(),
          github: github.trim(),
        },
      });
      toast.success("Personalización guardada");
    } catch {
      toast.error("No se pudo guardar la personalización.");
    }
  }, [tituloPublico, linkedin, web, github, updatePerfilExtra]);

  if (isVolunteer) {
    return (
      <VolunteerProfile
        displayName={displayName}
        setDisplayName={setDisplayName}
        apellido={apellido}
        setApellido={setApellido}
        bio={bio}
        setBio={setBio}
        tituloPublico={tituloPublico}
        setTituloPublico={setTituloPublico}
        linkedin={linkedin}
        setLinkedin={setLinkedin}
        web={web}
        setWeb={setWeb}
        github={github}
        setGithub={setGithub}
        savePersonalization={savePersonalization}
        savePersonalizationPending={updatePerfilExtra.isPending}
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

        <div
          className="p-4 sm:p-5 rounded-2xl"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Configuración de la organización
          </h2>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <strong className="font-medium" style={{ color: "var(--text)" }}>Configuración de la ONG</strong> (marca, página
            pública, visibilidad, miembros): no es tu perfil personal de usuario.
            <span className="block mt-2">
              Define nombre, imagen y página pública; controla qué ven los voluntarios; gestiona invitaciones y miembros.
              Usa el menú inferior en móvil para saltar de sección. El tema y cerrar sesión están en el pie del menú lateral.
            </span>
          </p>
        </div>

        <SettingsOrganizerNav />

        {/* Org settings */}
        <Section
          id="settings-org"
          title="Organización"
          icon={Building2}
          description="Nombre interno que ves en el panel. Puedes cambiarlo cuando quieras."
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Nombre de la organización"
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
          <OrgTechnicalIds activeOrgId={activeOrgId!} />
        </Section>

        {/* Logo de la organización (Cloudinary) */}
        <OrgLogoSection activeOrgId={activeOrgId!} canManageOrg={canManageOrg} />

        {/* Perfil público (lo que ven los voluntarios al explorar organizaciones) */}
        <OrgPerfilPublicoSection activeOrgId={activeOrgId!} />

        {/* Visibilidad: qué mostrar en el perfil público */}
        <OrgVisibilidadSection activeOrgId={activeOrgId!} />

        {/* Personalización: colores, banner, identidad */}
        <OrgPersonalizacionSection activeOrgId={activeOrgId!} canManageOrg={canManageOrg} />

        {/* Términos y políticas (aceptación obligatoria antes de unirse) */}
        <OrgTerminosSection activeOrgId={activeOrgId!} />

        {/* Configuración de gamificación */}
        <OrgGamificacionSection activeOrgId={activeOrgId!} />

        <OrgAgentSection activeOrgId={activeOrgId!} />

        {/* Invite member */}
        <Section
          id="settings-invite"
          title="Invitar miembro"
          icon={UserPlus}
          description="Añade a alguien que ya tenga cuenta en la plataforma. Necesitas su ID de usuario (UUID)."
        >
          <div className="space-y-3">
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              placeholder="UUID del usuario (ej. desde administración o soporte)"
              className="w-full px-4 py-2.5 rounded-xl outline-none font-mono text-xs"
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
            {addMember.isError && <p className="text-xs text-red-500">Revisa el mensaje de error arriba o los permisos.</p>}
          </div>
        </Section>

        {/* Members list */}
        <Section
          id="settings-members"
          title="Miembros actuales"
          icon={Users}
          description="Lista de personas con acceso a esta organización."
        >
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
              {members.map((m) => {
                const displayName = (m.usuario_nombre && m.usuario_nombre.trim()) || m.usuario_email || "Miembro";
                const initial = (displayName[0] || "?").toUpperCase();
                return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {m.usuario_email && m.usuario_email !== displayName ? `${m.usuario_email} · ` : ""}
                        {m.es_propietario ? "Propietario" : "Miembro"} · {m.estado_membresia}
                      </p>
                    </div>
                  </div>
                  {!m.es_propietario && (
                    <button
                      onClick={() => removeMember.mutate(m.usuario_id)}
                      disabled={removeMember.isPending}
                      title="Quitar miembro"
                      className="p-2 rounded-xl opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
