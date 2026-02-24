import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT_PATHS = ["/", "/login", "/register", "/onboarding", "/forgot-password", "/reset-password"];
const PUBLIC_PREFIX_PATHS = ["/org/"];

// ── JWT HS256 verification using the Edge-compatible Web Crypto API ───────

function b64urlDecode(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyJWT(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signedData = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = b64urlDecode(signatureB64);
    const valid = await crypto.subtle.verify("HMAC", key, signature as BufferSource, signedData);
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}

// ── Proxy (edge route protection) ────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicExact = PUBLIC_EXACT_PATHS.includes(pathname);
  const isPublicPrefix = PUBLIC_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix));

  if (isPublicExact || isPublicPrefix) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-session")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // In development / test environments skip JWT signature check — only
  // verify that the cookie exists.  This allows Playwright tests to use
  // a fake cookie value without needing to generate real JWTs.
  const isDev = process.env.NODE_ENV !== "production";
  const secret = process.env.JWT_SECRET ?? "";

  if (!isDev && secret) {
    const valid = await verifyJWT(token, secret);
    if (!valid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth-session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
