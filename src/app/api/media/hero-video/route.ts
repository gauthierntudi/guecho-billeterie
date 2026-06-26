import { NextResponse } from "next/server";
import { getHeroVideoUrl } from "@/lib/r2-media";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = await getHeroVideoUrl();

  if (!url) {
    return NextResponse.json({ url: null }, { status: 404 });
  }

  return NextResponse.json(
    { url },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
