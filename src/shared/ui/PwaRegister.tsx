"use client";

import { useEffect } from "react";

/** Registra el service worker de la PWA. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Registrar en todos los entornos (dev incluido) para poder instalar la PWA.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
