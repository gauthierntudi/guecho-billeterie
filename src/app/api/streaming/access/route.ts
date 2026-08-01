import { NextResponse } from "next/server";
import { z } from "zod";
import { grantStreamAccess } from "@/lib/streaming";

export const dynamic = "force-dynamic";

const accessSchema = z
  .object({
    ticketCode: z.string().min(4).max(32).optional(),
    phone: z.string().min(6).max(32).optional(),
    slug: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.ticketCode?.trim() || data.phone?.trim()),
    { message: "Code ou téléphone requis" },
  );

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = accessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Code billet ou numéro invalide" },
        { status: 400 },
      );
    }

    const result = await grantStreamAccess({
      ticketCode: parsed.data.ticketCode,
      phone: parsed.data.phone,
      slug: parsed.data.slug,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json(
      {
        isLive: result.isLive,
        playbackUrl: result.playbackUrl,
        title: result.title,
        eventTitle: result.eventTitle,
        ticketCode: result.ticketCode,
        attendeeName: result.attendeeName,
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
