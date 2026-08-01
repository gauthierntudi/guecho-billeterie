import { NextResponse } from "next/server";
import { z } from "zod";
import {
  heartbeatStreamViewerSession,
  releaseStreamViewerSession,
} from "@/lib/streaming";

export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  sessionId: z.string().min(8).max(64),
  ticketCode: z.string().min(4).max(32),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Session invalide" }, { status: 400 });
    }

    const result = await heartbeatStreamViewerSession(
      parsed.data.sessionId,
      parsed.data.ticketCode,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de maintenir la session" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Session invalide" }, { status: 400 });
    }

    await releaseStreamViewerSession(
      parsed.data.sessionId,
      parsed.data.ticketCode,
    );

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Impossible de libérer la session" },
      { status: 500 },
    );
  }
}
