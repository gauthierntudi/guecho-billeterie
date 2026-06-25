import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "guecho_admin_session";
const SESSION_VALUE = "guecho-admin-authenticated";

export function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password || null;
}

export function createSessionToken(): string {
  const password = getAdminPassword();
  if (!password) {
    throw new Error("ADMIN_PASSWORD non configuré");
  }

  return createHmac("sha256", password).update(SESSION_VALUE).digest("hex");
}

export function verifyPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;

  try {
    if (password.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !getAdminPassword()) return false;

  try {
    const expected = createSessionToken();
    if (token.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
