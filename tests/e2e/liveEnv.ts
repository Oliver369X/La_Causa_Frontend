export function requireLiveVar(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta variable requerida para E2E real: ${name}`);
  }
  return value;
}

export function liveConfig() {
  return {
    backendUrl: process.env.E2E_BACKEND_URL || "http://localhost:8000",
    email: requireLiveVar("LIVE_AGENT_EMAIL"),
    password: requireLiveVar("LIVE_AGENT_PASSWORD"),
    orgId: requireLiveVar("LIVE_AGENT_ORG_ID"),
  };
}
