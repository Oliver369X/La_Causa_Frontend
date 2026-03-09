/**
 * Motion presets for gamification UX.
 * Durations: micro 120-180ms, tab 220-280ms, progress 600-900ms, reorder 450-650ms, modal 280-420ms, celebration 900-1400ms.
 */

export const motionSpring = {
  /** Progress bars, badges, leaderboard */
  progress: { type: "spring" as const, damping: 22, stiffness: 200 },
  /** Celebrations, modals */
  celebration: { type: "spring" as const, damping: 18, stiffness: 180 },
  /** Tabs, filters */
  tab: { type: "spring" as const, damping: 25, stiffness: 300 },
  /** Reorder, list shifts */
  reorder: { type: "spring" as const, damping: 24, stiffness: 220 },
};

export const motionTween = {
  micro: { duration: 0.15, ease: "easeOut" as const },
  tab: { duration: 0.25, ease: "easeOut" as const },
  progress: { duration: 0.75, ease: "easeOut" as const },
  reorder: { duration: 0.55, ease: "easeInOut" as const },
  modal: { duration: 0.35, ease: "easeOut" as const },
  celebration: { duration: 1.2, ease: "easeOut" as const },
};

export const staggerFast = 0.04;
export const staggerMedium = 0.08;
export const staggerSlow = 0.12;
