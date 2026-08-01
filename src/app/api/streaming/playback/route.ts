import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { heartbeatStreamViewerSession } from "@/lib/streaming";
import { buildAuthorizedPlaybackUrl } from "@/lib/ivs-playback-token";
import {
  getRequestIp,
  rateLimit,
  readStreamAccessCookie,
  STREAM_PLAYBACK_TOKEN_TTL_SEC,
  verifyStreamAccessToken,
} from "@/lib/stream-security";

export const dynamic = "force-dynamic";

/**
 * Issues a short-lived playback URL only if the signed httpOnly cookie
 * matches an active viewer session. Never expose the long-lived raw URL
 * from the public access endpoint.
 */
export async function GET(request: Request) {
  try {
    const ip = getRequestIp(request);
    const limited = rateLimit({
      key: `stream-playback:ip:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Trop de requêtes. Réessayez dans ${limited.retryAfterSec}s.` },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const token = await readStreamAccessCookie();
    const claims = verifyStreamAccessToken(token);
    if (!claims) {
      return NextResponse.json(
        { error: "Session streaming invalide ou expirée" },
        { status: 401 },
      );
    }

    const alive = await heartbeatStreamViewerSession(
      claims.sessionId,
      claims.ticketCode,
    );
    if (!alive.success) {
      return NextResponse.json({ error: alive.error }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: claims.ticketCode },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                event: { include: { streamConfig: true } },
              },
            },
          },
        },
      },
    });

    const stream = ticket?.orderItem.order.event.streamConfig;
    if (
      !stream?.isLive ||
      !stream.playbackUrl ||
      !stream.channelArn
    ) {
      return NextResponse.json(
        { error: "Le live n'est pas disponible" },
        { status: 403 },
      );
    }

    const authorized = await buildAuthorizedPlaybackUrl({
      playbackUrl: stream.playbackUrl,
      channelArn: stream.channelArn,
      ttlSec: STREAM_PLAYBACK_TOKEN_TTL_SEC,
    });

    return NextResponse.json(
      {
        playbackUrl: authorized.playbackUrl,
        expiresIn: authorized.expiresIn,
        authorized: authorized.authorized,
        title: stream.title,
        ticketCode: claims.ticketCode,
        sessionId: claims.sessionId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de délivrer le flux" },
      { status: 500 },
    );
  }
}
