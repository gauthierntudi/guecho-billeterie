import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { requireAdminEvent } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { buildAuthorizedPlaybackUrl } from "@/lib/ivs-playback-token";
import { STREAM_PLAYBACK_TOKEN_TTL_SEC } from "@/lib/stream-security";

export const dynamic = "force-dynamic";

/**
 * Admin-only short-lived IVS playback URL.
 * Needed when the channel has playback authorization enabled —
 * the raw playbackUrl no longer works without a signed token.
 * Preview works even when the public live flag is off.
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const stream = await prisma.streamConfig.findUnique({
      where: { eventId: event.id },
    });

    if (!stream?.playbackUrl || !stream.channelArn) {
      return NextResponse.json(
        { error: "Canal IVS non configuré" },
        { status: 400 },
      );
    }

    const headerOrigin = request.headers.get("origin")?.trim();
    let refererOrigin: string | undefined;
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        // ignore malformed referer
      }
    }

    const authorized = await buildAuthorizedPlaybackUrl({
      playbackUrl: stream.playbackUrl,
      channelArn: stream.channelArn,
      ttlSec: STREAM_PLAYBACK_TOKEN_TTL_SEC,
      allowedOrigin: headerOrigin || refererOrigin,
    });

    return NextResponse.json(
      {
        playbackUrl: authorized.playbackUrl,
        expiresIn: authorized.expiresIn,
        authorized: authorized.authorized,
        title: stream.title,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de délivrer le preview",
      },
      { status: 500 },
    );
  }
}
