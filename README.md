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
- Header `X-Org-Id` para contexto de organización en endpoints multi-tenant
