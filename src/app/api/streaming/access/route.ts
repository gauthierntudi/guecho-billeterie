import { NextResponse } from "next/server";
import { z } from "zod";
import { grantStreamAccess, heartbeatStreamViewerSession } from "@/lib/streaming";
import {
  clearStreamAccessCookie,
  createStreamAccessToken,
  getRequestIp,
  rateLimit,
  setStreamAccessCookie,
} from "@/lib/stream-security";

export const dynamic = "force-dynamic";

const accessSchema = z
  .object({
    ticketCode: z.string().min(4).max(32).optional(),
    phone: z.string().min(6).max(32).optional(),
    sessionId: z.string().min(8).max(64).optional(),
    slug: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.ticketCode?.trim() || data.phone?.trim()),
    { message: "Code ou téléphone requis" },
  );

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const ipLimit = rateLimit({
      key: `stream-access:ip:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${ipLimit.retryAfterSec}s.` },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        },
      );
    }

    const body = await request.json();
    const parsed = accessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Code billet ou numéro invalide" },
        { status: 400 },
      );
    }

    const identityKey = (
      parsed.data.ticketCode?.trim().toUpperCase() ||
      parsed.data.phone?.trim() ||
      "unknown"
    ).slice(0, 64);

    const idLimit = rateLimit({
      key: `stream-access:id:${identityKey}`,
      limit: 8,
      windowMs: 60_000,
    });
    if (!idLimit.ok) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${idLimit.retryAfterSec}s.` },
        {
          status: 429,
          headers: { "Retry-After": String(idLimit.retryAfterSec) },
        },
      );
    }

    const result = await grantStreamAccess({
      ticketCode: parsed.data.ticketCode,
      phone: parsed.data.phone,
      slug: parsed.data.slug,
      sessionId: parsed.data.sessionId,
    });

    if (!result.success) {
      await clearStreamAccessCookie();
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    // Waiting room: ticket OK but not live yet — no cookie/slot playback.
    if (!result.isLive || !result.playbackUrl || !result.sessionId) {
      await clearStreamAccessCookie();
      return NextResponse.json(
        {
          isLive: result.isLive,
          title: result.title,
          eventTitle: result.eventTitle,
          ticketCode: result.ticketCode,
          attendeeName: result.attendeeName,
          sessionId: null,
          hasPlayback: false,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // Keep session warm and mint httpOnly access cookie (no raw playback URL).
    await heartbeatStreamViewerSession(result.sessionId, result.ticketCode);
    const token = createStreamAccessToken({
      sessionId: result.sessionId,
      ticketCode: result.ticketCode,
    });
    await setStreamAccessCookie(token);

    return NextResponse.json(
      {
        isLive: true,
        title: result.title,
        eventTitle: result.eventTitle,
        ticketCode: result.ticketCode,
        attendeeName: result.attendeeName,
        sessionId: result.sessionId,
        hasPlayback: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de vérifier l'accès streaming" },
      { status: 500 },
    );
  }
}
