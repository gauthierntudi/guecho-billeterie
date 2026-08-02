import { NextResponse } from "next/server";
import { grantStreamAccessByTicketCode } from "@/lib/streaming";
import {
  STREAM_ACCESS_TTL_SEC,
  STREAM_COOKIE_NAME,
  createStreamAccessToken,
} from "@/lib/stream-security";

export const dynamic = "force-dynamic";

/**
 * After a paid streaming purchase while live: claim a seat, set the
 * httpOnly access cookie, then send the buyer straight into the player.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const slug = searchParams.get("slug")?.trim() || undefined;

  const target = new URL("/streaming", request.url);

  if (code.length < 4) {
    return NextResponse.redirect(target);
  }

  target.searchParams.set("code", code);
  target.searchParams.set("auto", "1");

  const access = await grantStreamAccessByTicketCode(code, slug);

  if (!access.success || !access.sessionId) {
    if (!access.success) {
      target.searchParams.set("error", access.error.slice(0, 120));
    }
    return NextResponse.redirect(target);
  }

  const token = createStreamAccessToken({
    sessionId: access.sessionId,
    ticketCode: access.ticketCode,
  });

  const response = NextResponse.redirect(target);
  response.cookies.set(STREAM_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STREAM_ACCESS_TTL_SEC,
  });

  return response;
}
