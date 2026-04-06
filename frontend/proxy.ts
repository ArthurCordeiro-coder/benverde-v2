import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/server/session-token";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isLegacyOperationalRoute =
    pathname === "/registro" ||
    pathname.startsWith("/registro/") ||
    pathname === "/registro-caixas" ||
    pathname.startsWith("/registro-caixas/") ||
    pathname === "/dashboard/registro" ||
    pathname.startsWith("/dashboard/registro/");

  if (isLegacyOperationalRoute) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (isDashboardRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!isDashboardRoute || !token) {
    return NextResponse.next();
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
