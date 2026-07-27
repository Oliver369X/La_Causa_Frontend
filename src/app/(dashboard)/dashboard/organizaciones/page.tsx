"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "@/features/organizations/api/organizationsApi";
import { useAuthStore } from "@/shared/store/authStore";
import { TopBar } from "@/shared/ui/Sidebar";
import { OrganizationDiscoveryPanel } from "@/features/organizations/ui/OrganizationDiscoveryPanel";
import { toast } from "sonner";
import { usePermissions } from "@/shared/hooks/usePermissions";

export default function ExplorarOrganizacionesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { isVolunteerExperience } = usePermissions();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["orgs-publicas"],
    queryFn: () => organizationsApi.listPublic(),
  });

  const { data: misSolicitudes = [] } = useQuery({
    queryKey: ["mis-solicitudes"],
    queryFn: () => organizationsApi.listMySolicitudes(),
    enabled: !!user?.id,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const { data: misOrgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => organizationsApi.list(),
    enabled: !!user?.id,
  });

  const unirseMutation = useMutation({
    mutationFn: ({ orgId, acceptedTerms, message }: { orgId: string; acceptedTerms: boolean; message?: string }) =>
      organizationsApi.solicitarUnirse(orgId, acceptedTerms, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis-solicitudes"] });
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast.success("Solicitud enviada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al enviar la solicitud.");
    },
  });

  const dejarOrgMutation = useMutation({
    mutationFn: (orgId: string) => organizationsApi.leaveOrganization(orgId, user!.id),
    onSuccess: (_data, orgId) => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      qc.invalidateQueries({ queryKey: ["orgs-publicas"] });
      const { activeOrgId, setActiveOrg } = useAuthStore.getState();
      if (activeOrgId === orgId) setActiveOrg(null);
      toast.success("Saliste de la organización");
    },
    onError: () => toast.error("No se pudo salir de la organización."),
  });

  return (
    <>
      <TopBar title="Explorar organizaciones" />
      <div className="flex-1 p-5 md:p-8">
        <OrganizationDiscoveryPanel
          orgs={orgs}
          isLoading={isLoading}
          misSolicitudes={misSolicitudes}
          misOrgs={misOrgs}
          joinPending={unirseMutation.isPending}
          leavingPending={dejarOrgMutation.isPending}
          isVolunteer={isVolunteerExperience}
          description="Explora organizaciones de voluntariado y solicita unirte. Deberás aceptar sus términos y políticas."
          onJoin={(orgId, acceptedTerms, message) =>
            unirseMutation.mutate({ orgId, acceptedTerms, message })
          }
          onLeave={(orgId) => dejarOrgMutation.mutate(orgId)}
        />
      </div>
    </>
  );
}
