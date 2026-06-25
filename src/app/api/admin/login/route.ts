import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  getAdminPassword,
  getSessionCookieOptions,
  verifyPassword,
} from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/admin-validators";

export async function POST(request: Request) {
  if (!getAdminPassword()) {
    return NextResponse.json(
      { error: "Administration non configurée (ADMIN_PASSWORD)" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const parsed = adminLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  if (!verifyPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createSessionToken(), getSessionCookieOptions());

  return NextResponse.json({ success: true });
}
