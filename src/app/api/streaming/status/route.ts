import { NextResponse } from "next/server";
import { getPublicStreamStatus } from "@/lib/streaming";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? undefined;

  const status = await getPublicStreamStatus(slug);
  if (!status) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
