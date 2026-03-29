/**
 * Centralised API endpoint paths.
 * Base URL is configured in the Axios client (NEXT_PUBLIC_API_URL = http://localhost:8000).
 *
 * All paths are at root — the backend registers routers with NO global prefix.
 * Only ml (/api/...) and agent (/api/agent/...) have their own prefixes.
 */

export const EP = {
  // ── Auth ────────────────────────────────────────────────────────────
  AUTH_REGISTER:       "/auth/register",
  AUTH_LOGIN:          "/auth/login",
  AUTH_ME:             "/auth/me",
  AUTH_FORGOT_PASSWORD: "/auth/forgot-password",
  AUTH_RESET_PASSWORD:  "/auth/reset-password",

  // ── Organizations ───────────────────────────────────────────────────
  ORGS:                "/organizaciones",
  ORGS_PUBLICAS:       "/organizaciones/publicas",
  ORG_PUBLIC_BY_SLUG:  (slug: string) => `/organizaciones/publicas/by-slug/${slug}`,
  ORG_PUBLIC:          (id: string) => `/organizaciones/publicas/${id}`,
  ORG:                 (id: string) => `/organizaciones/${id}`,
  ORG_SOLICITUDES:     (orgId: string) => `/organizaciones/${orgId}/solicitudes`,
  SOLICITUDES_MIS:     "/solicitudes-membresia/mis",
  SOLICITUD_REVIEW:    (id: string) => `/solicitudes-membresia/${id}`,
  ORG_MEMBERS:         (id: string) => `/organizaciones/${id}/miembros`,
  ORG_MEMBER:          (orgId: string, userId: string) => `/organizaciones/${orgId}/miembros/${userId}`,
  ORG_SUBSCRIPTION:    (id: string) => `/organizaciones/${id}/suscripcion`,

  // ── Roles ───────────────────────────────────────────────────────────
  ROLES:               "/roles",
  ROLES_ASSIGN:        "/roles/asignar",
  PERMISOS_MIS:        (orgId: string) => `/permisos/mis?organizacion_id=${orgId}`,

  // ── Plans / Subscriptions / Stripe ────────────────────────────────────
  PLANS:               "/planes",
  SUBSCRIPTIONS:       "/suscripciones",
  STRIPE_CHECKOUT:     "/stripe/checkout",
  STRIPE_SYNC_CHECKOUT:  "/stripe/sync-checkout",
  STRIPE_PUBLISHABLE_KEY: "/stripe/publishable-key",

  // ── Uploads ─────────────────────────────────────────────────────────
  UPLOAD_IMAGE:        "/uploads/imagen",

  // ── Events ──────────────────────────────────────────────────────────
  EVENTS:              "/eventos",
  EVENT:               (id: string) => `/eventos/${id}`,
  EVENT_APPLICATIONS:  (eventId: string) => `/eventos/${eventId}/solicitudes`,
  APPLICATION:         (id: string) => `/solicitudes/${id}`,

  // ── Tasks ───────────────────────────────────────────────────────────
  TASKS:               "/tareas",
  TASKS_AVAILABLE:     "/tareas/disponibles",
  TASK:                (id: string) => `/tareas/${id}`,

  // ── Assignments ─────────────────────────────────────────────────────
  TASK_ASSIGNMENTS:     (taskId: string) => `/tareas/${taskId}/asignaciones`,
  ASSIGNMENT:           (id: string) => `/asignaciones/${id}`,
  MY_ASSIGNMENTS:       "/asignaciones/mis",
  ASSIGNMENT_DELIVERY:  (id: string) => `/asignaciones/${id}/entregas`,
  ASSIGNMENT_DELIVERIES: (id: string) => `/asignaciones/${id}/entregas`,
  DELIVERY_REVIEW:      (id: string) => `/entregas/${id}/revision`,

  // ── Teams ───────────────────────────────────────────────────────────
  TEAMS:               "/equipos",
  TEAM:                (id: string) => `/equipos/${id}`,
  TEAM_MEMBERS:        (id: string) => `/equipos/${id}/miembros`,

  // ── Gamification ────────────────────────────────────────────────────
  PROFILE_COMPETITIVE: (userId: string) => `/perfil/${userId}/competitivo`,
  PROFILE_BADGES:      (userId: string) => `/perfil/${userId}/insignias`,
  PROFILE_DISPONIBILIDAD: (userId: string, orgId: string) => `/perfil/${userId}/disponibilidad?organizacion_id=${orgId}`,
  MEDALS:              "/medallas",
  RANKING:             "/ranking",
  RANKING_HISTORY:     (seasonId: string) => `/ranking/historico/${seasonId}`,
  CERTIFICATES:        "/certificados",
  CERTIFICATE:         (id: string) => `/certificados/${id}`,
  CERTIFICATE_VERIFY:  (code: string) => `/certificados/validar/${code}`,
  CERTIFICATE_SHARE:   (id: string) => `/certificados/${id}/compartir`,
  PLANTILLAS_CERT:     (orgId: string) => `/organizaciones/${orgId}/plantillas-certificado`,
  CONFIG_GAMIFICACION: (orgId: string) => `/organizaciones/${orgId}/config-gamificacion`,
  PLANTILLA_CERT:      (id: string) => `/plantillas-certificado/${id}`,
  PLANTILLA_PREVIEW:   (id: string) => `/plantillas-certificado/${id}/preview`,
  BADGE_SHARE:         (perfilInsigniaId: string) => `/perfil-insignia/${perfilInsigniaId}/compartir`,
  PROFILE_SHARE:       (userId: string) => `/perfil/${userId}/compartir`,
  SEASONS:             "/temporadas",
  SEASON_CLOSE:        (id: string) => `/temporadas/${id}/cerrar`,
  EVENT_MEDALS:        (eventId: string) => `/eventos/${eventId}/medallas`,
  EVENT_MEDALS_AWARD:  (eventId: string) => `/eventos/${eventId}/medallas/otorgar`,

  // ── Incidencias ───────────────────────────────────────────────────────
  INCIDENCIAS:         "/incidencias",
  ELO_RANGES:          "/elo-rangos",
  SKILLS:              "/habilidades",
  USER_SKILLS:         (userId: string) => `/perfil/${userId}/habilidades`,
  USER_SKILL_REMOVE:   (userId: string, skillId: string) => `/perfil/${userId}/habilidades/${skillId}`,

  // ── ML ─────────────────────────────────────────────────────────────
  ML_MATCH:             "/api/match",
  ML_STATUS:            "/api/ml/status",
  ML_RETRAIN:           (phase: 2 | 3) => `/api/retrain/${phase}`,
  ML_SYNTHETIC_GENERATE: "/api/ml/synthetic/generate",
  ML_FEEDBACK_INFERENCE: "/api/ml/feedback-inference",

  // ── Intelligence ────────────────────────────────────────────────────
  NOTIFICATIONS:       "/notificaciones",
  NOTIFICATION_READ:   (id: string) => `/notificaciones/${id}/leer`,
  ANALYTICS_DASHBOARD: (orgId: string) => `/analytics/dashboard/${orgId}`,
  AUDIT_LOG:           (orgId: string) => `/auditoria/${orgId}`,
} as const;
