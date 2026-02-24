"use client";

import { CelebrationModal } from "./CelebrationModal";
import { useCelebrationStore } from "@/shared/store/celebrationStore";

export function CelebrationProvider() {
  const { open, data, close } = useCelebrationStore();
  return <CelebrationModal open={open} data={data} onClose={close} />;
}
