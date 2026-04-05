"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * La retroalimentación ML vive por evento (`/dashboard/events/[id]/feedback-ml`).
 * Esta ruta redirige para no mantener un ítem huérfano en el menú.
 */
export default function RetrospectivesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/events");
  }, [router]);
  return (
    <div className="p-8 text-sm" style={{ color: "var(--text-muted)" }}>
      Redirigiendo a eventos…
    </div>
  );
}
