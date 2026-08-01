import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const STREAM_COOKIE_NAME = "guecho_stream";
/** How long the signed access cookie remains valid. */
export const STREAM_ACCESS_TTL_SEC = 60 * 60 * 2; // 2 hours
/** How often the client should refresh the playback URL / IVS token. */
export const STREAM_PLAYBACK_TOKEN_TTL_SEC = 120; // 2 minutes

type StreamAccessClaims = {
  sessionId: string;
  ticketCode: string;
  iat: number;
  exp: number;
};

function getStreamSecret() {
  const secret =
    process.env.STREAM_ACCESS_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (secret && secret.length >= 16) return secret;

  // Dev fallback — production must set STREAM_ACCESS_SECRET.
  if (process.env.NODE_ENV !== "production") {
    return "guecho-dev-stream-secret-change-me";
  }

  throw new Error("STREAM_ACCESS_SECRET manquant");
}

function b64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64url");
}

function signPayload(payloadB64: string) {
  return createHmac("sha256", getStreamSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createStreamAccessToken(input: {
  sessionId: string;
  ticketCode: string;
  ttlSec?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const claims: StreamAccessClaims = {
    sessionId: input.sessionId,
    ticketCode: input.ticketCode.trim().toUpperCase(),
    iat: now,
    exp: now + (input.ttlSec ?? STREAM_ACCESS_TTL_SEC),
  };

  const payloadB64 = b64url(JSON.stringify(claims));
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyStreamAccessToken(
  token: string | undefined | null,
): StreamAccessClaims | null {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as StreamAccessClaims;

    if (
      !claims.sessionId ||
      !claims.ticketCode ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }

    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function setStreamAccessCookie(token: string) {
  const jar = await cookies();
  jar.set(STREAM_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STREAM_ACCESS_TTL_SEC,
  });
}

export async function clearStreamAccessCookie() {
  const jar = await cookies();
  jar.delete(STREAM_COOKIE_NAME);
}

export async function readStreamAccessCookie() {
  const jar = await cookies();
  return jar.get(STREAM_COOKIE_NAME)?.value ?? null;
}

/** Simple in-memory rate limiter (per serverless isolate). */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(input.key);

  if (!current || current.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return { ok: true, remaining: input.limit - 1 };
  }

  if (current.count >= input.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true, remaining: input.limit - current.count };
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function newOpaqueNonce() {
  return randomBytes(16).toString("hex");
}
