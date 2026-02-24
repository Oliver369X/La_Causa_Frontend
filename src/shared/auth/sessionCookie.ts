const ONE_DAY_SECONDS = 60 * 60 * 24;

export function setAuthSessionCookie(): void {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureFlag = secure ? "; Secure" : "";

  document.cookie = `auth-session=1; path=/; max-age=${ONE_DAY_SECONDS}; SameSite=Lax${secureFlag}`;
}

export function clearAuthSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "auth-session=; path=/; max-age=0; SameSite=Lax";
}
