"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { analyticsApi } from "@/features/analytics/api/analyticsApi";
import { TopBar } from "@/shared/ui/Sidebar";
import { GamificationPanel, ReporteDinamicoWidget, TaskAssignmentWidget } from "@/widgets";
import { BarChart3, CheckSquare, Calendar, Users } from "lucide-react";

export default function DashboardPage() {
  const { activeOrgId, user } = useAuthStore();
  const isVolunteer = user?.tipo === "voluntario";

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", activeOrgId],
    queryFn: () => analyticsApi.dashboard(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const statCards = [
    { label: "Voluntarios", value: stats?.total_volunteers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Eventos", value: stats?.total_events ?? 0, icon: Calendar, color: "text-purple-400" },
    { label: "Tareas", value: stats?.total_tasks ?? 0, icon: CheckSquare, color: "text-green-400" },
    { label: "Completadas", value: stats?.tasks_completed ?? 0, icon: BarChart3, color: "text-amber-400" },
  ];

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 p-8">
        {isVolunteer ? (
          <div className="space-y-6">
            <div
              className="p-6 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-lg font-semibold mb-2">Panel de Voluntario</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Aquí verás tus tareas, progreso, certificados y ranking personal.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GamificationPanel />
              <TaskAssignmentWidget />
            </div>
          </div>
        ) : !activeOrgId ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                 style={{ background: "var(--accent-soft)" }}>
              <BarChart3 className="w-8 h-8" style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sin organización activa</h2>
            <p className="mb-6 max-w-sm" style={{ color: "var(--text-muted)" }}>
              Selecciona o crea una organización para ver las métricas.
            </p>
            <a
              href="/onboarding"
              className="px-6 py-3 rounded-full font-medium hover:opacity-80 transition-opacity"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Crear organización
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="p-5 rounded-2xl transition-colors hover:opacity-90"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{card.label}</p>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-3xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Widgets row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <GamificationPanel />
              <TaskAssignmentWidget />
              <ReporteDinamicoWidget />
            </div>
          </>
        )}
      </div>
    </>
  );
}
