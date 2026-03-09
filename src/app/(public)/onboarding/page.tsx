"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { Input, Field } from "@/shared/ui/AuthCard";
import { Building2 } from "lucide-react";
import { VolunteerOnboardingWizard } from "@/features/onboarding/ui/VolunteerOnboardingWizard";
import { OrganizerOnboardingWizard } from "@/features/onboarding/ui/OrganizerOnboardingWizard";
import { skillsApi } from "@/features/skills/api/skillsApi";
import { uploadImage } from "@/features/uploads/api/uploadApi";
import { apiClient } from "@/shared/api/client";
import { buildVolunteerOnboardingProgress } from "@/features/onboarding/lib/volunteerOnboarding";
import {
  buildOrganizerOnboardingProgress,
  shouldShowOrganizerOnboarding,
} from "@/features/onboarding/lib/organizerOnboarding";
import { eventsApi } from "@/features/events/api/eventsApi";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import { volunteersApi } from "@/features/volunteers/api/volunteersApi";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const {
    setActiveOrg,
    activeOrgId,
    user,
    token,
    setAuth,
    volunteerOnboarding,
    updateVolunteerOnboarding,
  } = useAuthStore();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [displayName, setDisplayName] = useState(user?.nombre ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [disponibilidadEstado, setDisponibilidadEstado] = useState<"disponible" | "no_disponible" | "previo_consulta">(
    () => (user?.perfil_extra?.disponibilidad_estado as "disponible" | "no_disponible" | "previo_consulta") ?? "previo_consulta"
  );

  const patchOrganizerOnboardingState = useCallback(async (patch: {
    started_at?: string;
    completed_at?: string;
    steps?: {
      welcome_seen?: boolean;
      profile_seen?: boolean;
      team_seen?: boolean;
      event_seen?: boolean;
      task_seen?: boolean;
    };
  }) => {
    if (!user || !token) return;
    const currentPerfilExtra = (user.perfil_extra ?? {}) as Record<string, unknown>;
    const currentOrganizer = (currentPerfilExtra.organizer_onboarding_v1 ?? {}) as Record<string, unknown>;
    const currentSteps = (currentOrganizer.steps ?? {}) as Record<string, unknown>;
    const nextPerfilExtra = {
      ...currentPerfilExtra,
      organizer_onboarding_v1: {
        ...currentOrganizer,
        ...patch,
        steps: {
          ...currentSteps,
          ...(patch.steps ?? {}),
        },
      },
    };

    const { data } = await apiClient.patch("/auth/me", { perfil_extra: nextPerfilExtra });
    setAuth(token, {
      ...user,
      perfil_extra: (data?.perfil_extra as typeof user.perfil_extra | undefined) ?? (nextPerfilExtra as typeof user.perfil_extra),
    });
  }, [setAuth, token, user]);

  const createMutation = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: async (org) => {
      setActiveOrg(org.id);
      qc.invalidateQueries({ queryKey: ["orgs"] });
      if (user?.tipo === "organizador") {
        try {
          await patchOrganizerOnboardingState({ started_at: new Date().toISOString(), steps: { welcome_seen: true } });
        } catch {
          // Si falla este patch, no bloqueamos la creación de organización.
        }
      }
      router.push(user?.tipo === "organizador" ? "/onboarding" : "/dashboard");
    },
  });

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.nombre ?? "");
    setBio(user.bio ?? "");
  }, [user]);

  const { data: userSkills = [], isLoading: loadingUserSkills } = useQuery({
    queryKey: ["userSkills", user?.id],
    queryFn: () => skillsApi.getUserSkills(user!.id),
    enabled: user?.tipo === "voluntario" && !!user?.id,
  });

  const { data: allSkills = [], isLoading: loadingAllSkills } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillsApi.list(),
    enabled: user?.tipo === "voluntario",
  });

  const { data: misOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: user?.tipo === "voluntario" && !!user?.id,
  });

  const { data: misSolicitudes = [] } = useQuery({
    queryKey: ["mis-solicitudes"],
    queryFn: () => organizationsApi.listMySolicitudes(),
    enabled: user?.tipo === "voluntario" && !!user?.id,
  });

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["orgs-publicas"],
    queryFn: () => organizationsApi.listPublic(),
    enabled: user?.tipo === "voluntario",
  });

  const { data: organizerOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: user?.tipo === "organizador",
  });

  const organizerActiveOrgId = activeOrgId ?? organizerOrgs[0]?.id ?? null;

  const { data: organizerOrg } = useQuery({
    queryKey: ["org", organizerActiveOrgId],
    queryFn: () => organizationsApi.get(organizerActiveOrgId!),
    enabled: user?.tipo === "organizador" && !!organizerActiveOrgId,
  });

  const { data: organizerEvents = [] } = useQuery({
    queryKey: ["events", organizerActiveOrgId],
    queryFn: () => eventsApi.list(organizerActiveOrgId!),
    enabled: user?.tipo === "organizador" && !!organizerActiveOrgId,
  });

  const { data: organizerTasks = [] } = useQuery({
    queryKey: ["tasks", organizerActiveOrgId],
    queryFn: () => tasksApi.list(organizerActiveOrgId!),
    enabled: user?.tipo === "organizador" && !!organizerActiveOrgId,
  });

  const { data: organizerMembers = [] } = useQuery({
    queryKey: ["members", organizerActiveOrgId],
    queryFn: () => volunteersApi.listMembers(organizerActiveOrgId!),
    enabled: user?.tipo === "organizador" && !!organizerActiveOrgId,
  });

  const progress = useMemo(
    () =>
      buildVolunteerOnboardingProgress({
        user,
        userSkills,
        organizations: misOrgs,
        solicitudes: misSolicitudes,
        session: volunteerOnboarding,
      }),
    [misOrgs, misSolicitudes, user, userSkills, volunteerOnboarding]
  );

  const organizerProgress = useMemo(
    () =>
      buildOrganizerOnboardingProgress({
        user,
        orgs: organizerOrgs,
        org: organizerOrg ?? null,
        members: organizerMembers,
        events: organizerEvents,
        tasks: organizerTasks,
      }),
    [user, organizerOrgs, organizerOrg, organizerMembers, organizerEvents, organizerTasks]
  );
  const organizerShouldShow = useMemo(
    () => shouldShowOrganizerOnboarding(user, organizerOrgs),
    [user, organizerOrgs]
  );

  useEffect(() => {
    if (user?.tipo !== "organizador") return;
    if (activeOrgId) return;
    if (organizerOrgs.length > 0) {
      setActiveOrg(organizerOrgs[0].id);
    }
  }, [activeOrgId, organizerOrgs, setActiveOrg, user?.tipo]);

  useEffect(() => {
    if (user?.tipo !== "organizador") return;
    if (organizerOrgs.length === 0) return;
    if (!organizerShouldShow) {
      router.replace("/dashboard");
    }
  }, [organizerOrgs.length, organizerShouldShow, router, user?.tipo]);

  const organizerPatchInFlight = useRef(false);
  useEffect(() => {
    if (user?.tipo !== "organizador") return;
    if (!organizerShouldShow) return;
    if (organizerOrgs.length === 0) return;
    if (organizerPatchInFlight.current) return;

    const state = user.perfil_extra?.organizer_onboarding_v1;
    const currentSteps = state?.steps ?? {};
    const stepPatch: {
      welcome_seen?: boolean;
      profile_seen?: boolean;
      team_seen?: boolean;
      event_seen?: boolean;
      task_seen?: boolean;
    } = {};
    const byId = Object.fromEntries(organizerProgress.steps.map((s) => [s.id, s.completed]));

    if (byId.profile && !currentSteps.profile_seen) stepPatch.profile_seen = true;
    if (byId.team && !currentSteps.team_seen) stepPatch.team_seen = true;
    if (byId.event && !currentSteps.event_seen) stepPatch.event_seen = true;
    if (byId.task && !currentSteps.task_seen) stepPatch.task_seen = true;

    const shouldSetStarted = !state?.started_at;
    const hasStepPatch = Object.keys(stepPatch).length > 0;

    if (!shouldSetStarted && !hasStepPatch) return;

    organizerPatchInFlight.current = true;
    void (async () => {
      try {
        await patchOrganizerOnboardingState({
          started_at: state?.started_at ?? new Date().toISOString(),
          steps: hasStepPatch ? stepPatch : undefined,
        });
      } finally {
        organizerPatchInFlight.current = false;
      }
    })();
  }, [
    organizerOrgs.length,
    organizerProgress.steps,
    organizerShouldShow,
    patchOrganizerOnboardingState,
    user,
  ]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch("/auth/me", { nombre: displayName, bio });
      return data as {
        id: string;
        email: string;
        nombre: string;
        estado: boolean;
        tipo?: "voluntario" | "organizador";
        is_super_admin?: boolean;
        avatar_url?: string;
        bio?: string;
        ubicacion?: { lat?: number; lon?: number; ciudad?: string };
        perfil_extra?: { disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta"; preferencias?: string[] };
      };
    },
    onSuccess: (data) => {
      if (token && user) {
        setAuth(token, {
          ...user,
          nombre: data.nombre,
          avatar_url: data.avatar_url ?? user.avatar_url,
          bio: data.bio ?? bio,
          ubicacion: data.ubicacion ?? user.ubicacion,
          perfil_extra: data.perfil_extra ?? user.perfil_extra,
        });
      }
      toast.success("Perfil guardado");
    },
    onError: () => toast.error("No se pudo guardar tu perfil."),
  });

  const updateAvatar = useMutation({
    mutationFn: async (avatar_url: string) => {
      const { data } = await apiClient.patch("/auth/me", { avatar_url });
      return data as {
        avatar_url?: string;
        ubicacion?: { lat?: number; lon?: number; ciudad?: string };
      };
    },
    onSuccess: (data) => {
      if (token && user) {
        setAuth(token, {
          ...user,
          avatar_url: data.avatar_url ?? user.avatar_url,
          ubicacion: data.ubicacion ?? user.ubicacion,
        });
      }
      toast.success("Foto actualizada");
    },
    onError: () => toast.error("No se pudo actualizar tu foto."),
  });

  const updateUbicacion = useMutation({
    mutationFn: async (ubicacion: { lat: number; lon: number; ciudad?: string }) => {
      const { data } = await apiClient.patch("/auth/me", { ubicacion });
      return data as {
        ubicacion?: { lat?: number; lon?: number; ciudad?: string };
        perfil_extra?: { disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta"; preferencias?: string[] };
      };
    },
    onSuccess: (data) => {
      if (token && user) {
        setAuth(token, {
          ...user,
          ubicacion: data.ubicacion ?? user.ubicacion,
          perfil_extra: data.perfil_extra ?? user.perfil_extra,
        });
      }
      toast.success("Ubicación guardada");
    },
    onError: () => toast.error("No se pudo guardar tu ubicación."),
  });

  const updatePerfilExtra = useMutation({
    mutationFn: async (perfil_extra: { disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta"; preferencias?: string[] }) => {
      const { data } = await apiClient.patch("/auth/me", { perfil_extra });
      return data as {
        perfil_extra?: { disponibilidad_estado?: "disponible" | "no_disponible" | "previo_consulta"; preferencias?: string[] };
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

  const addSkillMutation = useMutation({
    mutationFn: (skillId: string) => skillsApi.addUserSkill(user!.id, skillId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userSkills", user?.id] });
    },
    onError: () => toast.error("No se pudo agregar la habilidad."),
  });

  const removeSkillMutation = useMutation({
    mutationFn: (skillId: string) => skillsApi.removeUserSkill(user!.id, skillId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userSkills", user?.id] });
    },
    onError: () => toast.error("No se pudo quitar la habilidad."),
  });

  const joinOrgMutation = useMutation({
    mutationFn: ({ orgId, acceptedTerms, message }: { orgId: string; acceptedTerms: boolean; message?: string }) =>
      organizationsApi.solicitarUnirse(orgId, acceptedTerms, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis-solicitudes"] });
      toast.success("Solicitud enviada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo enviar la solicitud.");
    },
  });

  const handleAvatarChange = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    uploadImage(file)
      .then((res) => updateAvatar.mutate(res.url))
      .catch(() => toast.error("No se pudo subir la imagen."));
  };

  const handleUsarMiUbicacion = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateUbicacion.mutate({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => toast.error("No se pudo obtener tu ubicación."),
      { enableHighAccuracy: true }
    );
  };

  if (!user) return null;

  if (user.tipo === "voluntario") {
    return (
      <VolunteerOnboardingWizard
        user={user}
        progress={progress}
        displayName={displayName}
        setDisplayName={setDisplayName}
        bio={bio}
        setBio={setBio}
        onSaveProfile={() => updateProfile.mutate()}
        saveProfilePending={updateProfile.isPending}
        onAvatarFile={handleAvatarChange}
        avatarPending={updateAvatar.isPending}
        onUseLocation={handleUsarMiUbicacion}
        locationPending={updateUbicacion.isPending}
        disponibilidadEstado={disponibilidadEstado}
        onChangeDisponibilidad={(value) => {
          setDisponibilidadEstado(value);
          updatePerfilExtra.mutate({ disponibilidad_estado: value });
        }}
        userSkills={userSkills}
        allSkills={allSkills}
        loadingSkills={loadingUserSkills}
        loadingAllSkills={loadingAllSkills}
        addSkillPending={addSkillMutation.isPending}
        removeSkillPending={removeSkillMutation.isPending}
        onAddSkill={(skillId) => addSkillMutation.mutate(skillId)}
        onRemoveSkill={(skillId) => removeSkillMutation.mutate(skillId)}
        orgs={orgs}
        orgsLoading={orgsLoading}
        misSolicitudes={misSolicitudes}
        misOrgs={misOrgs}
        joinPending={joinOrgMutation.isPending}
        onJoinOrg={(orgId, acceptedTerms, message) => joinOrgMutation.mutate({ orgId, acceptedTerms, message })}
        onWelcomeSeen={() => updateVolunteerOnboarding({ welcomeSeen: true })}
        onPlatformSeen={() => updateVolunteerOnboarding({ platformSeen: true })}
        onOrganizationsSeen={() => {
          if (!volunteerOnboarding.orgExplorerSeen) {
            updateVolunteerOnboarding({ orgExplorerSeen: true });
          }
        }}
        onExit={(completed) => {
          if (completed) {
            updateVolunteerOnboarding({ completedAt: new Date().toISOString() });
          }
          router.push("/dashboard");
        }}
      />
    );
  }

  if (user.tipo === "organizador" && organizerOrgs.length > 0 && organizerShouldShow) {
    return (
      <OrganizerOnboardingWizard
        progress={organizerProgress}
        onExit={() => router.push("/dashboard")}
        onComplete={async () => {
          try {
            await patchOrganizerOnboardingState({ completed_at: new Date().toISOString() });
            toast.success("Onboarding completado");
          } catch {
            toast.error("No se pudo guardar el estado final del onboarding.");
          } finally {
            router.push("/dashboard");
          }
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 transition-colors duration-200"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="pointer-events-none fixed top-[10%] left-1/2 -translate-x-1/2 w-[40%] h-[30%] rounded-full blur-[120px] -z-10"
           style={{ background: "var(--glow-a)" }} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
               style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
            <Building2 className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Crea tu organización</h1>
          <p style={{ color: "var(--text-muted)" }}>Es tu espacio de trabajo. Podrás invitar miembros después.</p>
        </div>

        <div className="rounded-3xl p-8 sm:p-10"
             style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {createMutation.isError && (
            <div className="mb-5 p-3.5 rounded-xl text-sm text-red-500"
                 style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)" }}>
              No se pudo crear la organización. Inténtalo de nuevo.
            </div>
          )}
          <div className="space-y-4">
            <Field label="Nombre de la organización *">
              <Input
                data-testid="org-nombre-input"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Fundación Esperanza"
              />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-colors"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="Breve descripción de tu organización..."
              />
            </Field>
            <button
              data-testid="create-org-btn"
              onClick={() => createMutation.mutate({ nombre, descripcion })}
              disabled={!nombre.trim() || createMutation.isPending}
              className="w-full py-3 rounded-full font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              {createMutation.isPending ? "Creando…" : "Crear y continuar →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
