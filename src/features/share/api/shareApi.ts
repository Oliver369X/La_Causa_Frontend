import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import type { UUID } from "@/shared/types";

export type ShareCanal = "whatsapp" | "facebook" | "x" | "linkedin" | "telegram" | "copy_link" | "native";

export interface ShareResult {
  url: string;
  canal: string;
  mensaje_sugerido: string;
}

export const shareApi = {
  certificate: async (certificadoId: UUID, canal: ShareCanal): Promise<ShareResult> => {
    const { data } = await apiClient.post<ShareResult>(EP.CERTIFICATE_SHARE(certificadoId), { canal });
    return data;
  },

  badge: async (perfilInsigniaId: UUID, canal: ShareCanal): Promise<ShareResult> => {
    const { data } = await apiClient.post<ShareResult>(EP.BADGE_SHARE(perfilInsigniaId), { canal });
    return data;
  },

  profile: async (userId: UUID, canal: ShareCanal): Promise<ShareResult> => {
    const { data } = await apiClient.post<ShareResult>(EP.PROFILE_SHARE(userId), { canal });
    return data;
  },
};
