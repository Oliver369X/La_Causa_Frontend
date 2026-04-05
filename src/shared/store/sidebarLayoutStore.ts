import { create } from "zustand";

interface SidebarLayoutState {
  /** Escritorio (md+): barra lateral oculta. Sin persist: evita carreras con la hidratación. */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  toggleMobileNav: () => void;
}

export const useSidebarLayoutStore = create<SidebarLayoutState>()((set) => ({
  collapsed: false,
  setCollapsed: (v: boolean) => set({ collapsed: v }),
  mobileNavOpen: false,
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
}));
