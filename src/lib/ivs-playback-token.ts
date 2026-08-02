import { SignJWT, importPKCS8 } from "jose";

/**
 * IVS private playback tokens (ES384).
 * Requires:
 * - IVS_PLAYBACK_PRIVATE_KEY: PKCS8 PEM of the ECDSA P-384 private key
 * - Channel created/updated with authorized: true
 * - Public key imported in IVS console (Playback keys)
 */
export function isIvsPlaybackAuthConfigured() {
  return Boolean(process.env.IVS_PLAYBACK_PRIVATE_KEY?.trim());
}

function normalizePem(raw: string) {
  const trimmed = raw.trim();
  // Allow single-line env values with \n escapes.
  if (trimmed.includes("\\n")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  return trimmed;
}

export async function createIvsPlaybackToken(input: {
  channelArn: string;
  /** Seconds until expiry (IVS recommends short). */
  ttlSec?: number;
  /** Browser origin restriction, e.g. https://guecho.cd */
  allowedOrigin?: string;
}) {
  const pem = process.env.IVS_PLAYBACK_PRIVATE_KEY
    ? normalizePem(process.env.IVS_PLAYBACK_PRIVATE_KEY)
    : "";
  if (!pem) {
    throw new Error("IVS_PLAYBACK_PRIVATE_KEY manquant");
  }

  const key = await importPKCS8(pem, "ES384");
  const now = Math.floor(Date.now() / 1000);
  const ttl = input.ttlSec ?? 120;

  const payload: Record<string, string | number> = {
    "aws:channel-arn": input.channelArn,
    exp: now + ttl,
  };

  const origin =
    input.allowedOrigin?.trim() ||
    process.env.IVS_PLAYBACK_ALLOWED_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (origin) {
    payload["aws:access-control-allow-origin"] = origin.replace(/\/$/, "");
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "ES384", typ: "JWT" })
    .sign(key);
}

export async function buildAuthorizedPlaybackUrl(input: {
  playbackUrl: string;
  channelArn: string;
  ttlSec?: number;
  /** Override JWT origin claim (useful for admin preview on localhost). */
  allowedOrigin?: string;
}) {
  if (!isIvsPlaybackAuthConfigured()) {
    return {
      playbackUrl: input.playbackUrl,
      expiresIn: input.ttlSec ?? 120,
      authorized: false as const,
    };
  }

  const token = await createIvsPlaybackToken({
    channelArn: input.channelArn,
    ttlSec: input.ttlSec,
    allowedOrigin: input.allowedOrigin,
  });

  const joiner = input.playbackUrl.includes("?") ? "&" : "?";
  return {
    playbackUrl: `${input.playbackUrl}${joiner}token=${encodeURIComponent(token)}`,
    expiresIn: input.ttlSec ?? 120,
    authorized: true as const,
  };
}
