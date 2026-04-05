"use client";

import { useSidebarLayoutStore } from "@/shared/store/sidebarLayoutStore";
import { cn } from "@/shared/utils/utils";

/** Margen según sidebar colapsado; el control para volver a mostrarla está en Sidebar + TopBar. */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarLayoutStore((s) => s.collapsed);

  return (
    <main
      className={cn(
        "relative z-0 min-h-screen flex flex-col transition-[margin] duration-200 ease-out",
        "pt-14 md:pt-0",
        collapsed ? "md:ml-0" : "md:ml-64"
      )}
    >
      {children}
    </main>
  );
}
