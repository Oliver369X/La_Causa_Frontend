import { create } from "zustand";
import type { CelebrationData } from "@/shared/ui/CelebrationModal";

interface CelebrationState {
  open: boolean;
  data: CelebrationData | undefined;
  show: (data?: CelebrationData) => void;
  close: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  open: false,
  data: undefined,
  show: (data) => set({ open: true, data }),
  close: () => set({ open: false }),
}));
