import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3001";
const runAgainstStaging = process.env.E2E_TARGET === "staging";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["line"],
  ],

  use: {
    baseURL,

    // ── Video & evidencia visual ───────────────────────────────────────
    // Graba video de TODOS los tests para dejar evidencia clara
    video: { mode: "on", size: { width: 1280, height: 800 } },
    // Captura screenshot al inicio y al final de cada test
    screenshot: "on",
    // Guarda el trace completo de toda la sesión
    trace: "on",

    // ── Cadencia visual ────────────────────────────────────────────────
    // 200 ms de pausa entre cada acción → videos legibles, se ve la interacción
    actionTimeout: 15_000,
    navigationTimeout: 20_000,

    // ── Viewport ──────────────────────────────────────────────────────
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        // slowMo hace que cada click/tipo sea visible en el video
        launchOptions: { slowMo: 120 },
      },
    },
  ],

  // Levanta Next.js antes de los tests
  webServer: runAgainstStaging
    ? undefined
    : {
        command: "npm run dev -- --port 3001",
        url: "http://localhost:3001",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
