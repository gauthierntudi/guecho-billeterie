import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

function isTruthyEnv(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function shouldRedirectHomeToStreaming() {
  return isTruthyEnv(process.env.REDIRECT_HOME_TO_STREAMING);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    shouldRedirectHomeToStreaming() &&
    (pathname === "/" || pathname === "/home")
  ) {
    return NextResponse.redirect(new URL("/streaming", request.url));
  }

  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }

      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/home", "/admin/:path*", "/api/admin/:path*"],
};
