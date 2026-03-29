# Volunteer Management SaaS — Frontend

Next.js 16 + React 19, Tailwind CSS 4, TanStack Query, Zustand.

## Requisitos

- Node.js 20+
- Backend corriendo en `http://localhost:8000` (o configurar `NEXT_PUBLIC_API_URL`)

## Quick Start

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno (opcional)
# Crear .env.local con:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Desarrollo
npm run dev
```

Abre http://localhost:3001 (puerto por defecto del proyecto).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 3001) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Tests E2E con Playwright |
| `npm run test:e2e:live` | Carril E2E real (sin mocks) para integración crítica |
| `npm run test:e2e:stripe` | Humo: login + redirect suscripciones + API `publishable-key` (vídeo con contenido) |
| `npm run test:e2e:stripe:full` | Checkout Stripe real con tarjeta 4242… (`E2E_STRIPE=1` + `LIVE_AGENT_*`) |
| `npm run test:e2e:ui` | Playwright en modo UI |
| `npm run test:e2e:report` | Ver reporte de tests |

## Estructura principal

```
src/
├── app/                    # App Router (Next.js)
│   ├── (dashboard)/        # Rutas autenticadas
│   │   └── dashboard/     # Organizaciones, eventos, tareas, gamificación, etc.
│   ├── (public)/         # Login, registro, onboarding, org pública
│   └── layout.tsx
├── features/              # Lógica por dominio (auth, events, tasks, badges, etc.)
├── shared/                # API client, store, hooks, UI, tipos
└── widgets/               # Componentes compuestos
```

## Rutas principales

- `/login`, `/register` — Autenticación
- `/dashboard` — Panel principal
- `/dashboard/organizaciones` — Gestión de organizaciones
- `/dashboard/events` — Eventos
- `/dashboard/tasks` — Tareas
- `/dashboard/gamification` — Medallas, ranking, certificados
- `/dashboard/perfil/[userId]` — Perfil de voluntario
- `/org/[slug]` — Vista pública de organización

## Integración con Backend

- Base URL: `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)
- Autenticación: JWT en header `Authorization: Bearer <token>`
- Protección de rutas: cookie `auth-session` con el JWT real para `proxy.ts`
- Persistencia cliente: `localStorage` (`auth-storage`) para mantener sesión entre pestañas
- Header `X-Org-Id` para contexto de organización en endpoints multi-tenant

## E2E real (local + staging)

Para el carril live usa credenciales reales de un organizador con plan activo:

```bash
# PowerShell
$env:E2E_MODE="real"
$env:E2E_TARGET="local" # o staging
$env:E2E_BASE_URL="http://localhost:3001" # o URL staging frontend
$env:E2E_BACKEND_URL="http://localhost:8000" # o URL staging backend
$env:LIVE_AGENT_EMAIL="organizer.live@lacausa.dev"
$env:LIVE_AGENT_PASSWORD="***"
$env:LIVE_AGENT_ORG_ID="uuid-org"
npm run test:e2e:live
```

Notas:
- En `E2E_TARGET=staging` Playwright no levanta `next dev`; usa la URL remota.
- Este carril valida `login -> dashboard -> /dashboard/agent` contra backend y LLM reales, sin interceptores `page.route`.

### E2E Stripe

**Humo (siempre):** backend en `:8000`, luego `npm run test:e2e:stripe` — abre `/login` y `/dashboard/subscriptions` (sin credenciales). Si el `.webm` se ve “vacío”, sube la cadencia: `$env:E2E_SLOW_MO="450"` y `$env:E2E_VIDEO_PAUSE_MS="5000"` (pausa final antes de cerrar el navegador).

**Checkout completo:** `backend/STRIPE_LOCAL_TEST.md` §6. Requiere variables y `npm run test:e2e:stripe:full`:

```powershell
$env:E2E_STRIPE="1"
$env:LIVE_AGENT_EMAIL="..."
$env:LIVE_AGENT_PASSWORD="..."
$env:LIVE_AGENT_ORG_ID="uuid-org"
npm run test:e2e:stripe:full
```
