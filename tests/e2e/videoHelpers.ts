import type { Page } from "@playwright/test";

/** Pausa al final del test para que el .webm capture frames finales (evita cierre instantáneo = vídeo “vacío”). */
export async function pauseForVideoRecording(page: Page, ms?: number) {
  const fromEnv = parseInt(process.env.E2E_VIDEO_PAUSE_MS || "", 10);
  const delay = ms ?? (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 3200);
  await page.waitForTimeout(delay);
}

/** Espera a que Next/React haya pintado algo útil (evita grabar solo blanco al inicio). */
export async function waitForAppPaint(page: Page) {
  await page.waitForLoadState("load");
  try {
    await page.waitForLoadState("networkidle", { timeout: 12_000 });
  } catch {
    /* dev server puede mantener conexiones abiertas */
  }
}
