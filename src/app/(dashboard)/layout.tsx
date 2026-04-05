import { Sidebar } from "@/shared/ui/Sidebar";
import { CelebrationProvider } from "@/shared/ui/CelebrationProvider";
import { DashboardMain } from "./DashboardMain";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Sidebar />
      <DashboardMain>{children}</DashboardMain>
      <CelebrationProvider />
    </div>
  );
}
