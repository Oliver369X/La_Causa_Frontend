import { Sidebar } from "@/shared/ui/Sidebar";
import { CelebrationProvider } from "@/shared/ui/CelebrationProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Sidebar />
      {/* pt-14 on mobile (TopBar height), md:pt-0 md:ml-64 on desktop */}
      <main className="pt-14 md:pt-0 md:ml-64 min-h-screen flex flex-col">
        {children}
      </main>
      <CelebrationProvider />
    </div>
  );
}
