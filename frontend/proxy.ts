import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  canAccessDashboardScope,
  getDefaultDashboardPath,
  isDashboardPathAllowed,
} from "@/lib/dashboard/access";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/server/session-token";

// Rotas totalmente bloqueadas: ninguém acessa, nem digitando a URL direto.
const BLOCKED_PATHS: string[] = [];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return new NextResponse(null, { status: 404 });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isDashboardRoute = pathname.startsWith("/benverde/dashboard");
  const isPriceRoute = pathname === "/precos" || pathname.startsWith("/precos/") || pathname === "/Precos" || pathname.startsWith("/Precos/");
  const isCaixasRoute = pathname === "/benverde/Caixas" || pathname.startsWith("/benverde/Caixas/") || pathname === "/benverde/caixas" || pathname.startsWith("/benverde/caixas/");
  const isProtectedRoute = isDashboardRoute || isPriceRoute || isCaixasRoute;
  const isLegacyOperationalRoute =
    pathname === "/registro" ||
    pathname.startsWith("/registro/") ||
    pathname === "/registro-caixas" ||
    pathname.startsWith("/registro-caixas/") ||
    pathname === "/benverde/dashboard/registro" ||
    pathname.startsWith("/benverde/dashboard/registro/");

  if (isLegacyOperationalRoute) {
    const dashboardUrl = new URL("/benverde/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname === "/precos" || pathname.startsWith("/precos/")) {
    const canonicalPath = pathname.replace(/^\/precos/, "/Precos");
    const canonicalUrl = new URL(canonicalPath, request.url);
    canonicalUrl.search = request.nextUrl.search;
    return NextResponse.redirect(canonicalUrl);
  }

  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!isProtectedRoute || !token) {
    return NextResponse.next();
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (isDashboardRoute && !isDashboardPathAllowed(payload.funcionalidade, pathname)) {
    const allowedUrl = new URL(getDefaultDashboardPath(payload.funcionalidade), request.url);
    return NextResponse.redirect(allowedUrl);
  }

  if (isPriceRoute && !canAccessDashboardScope(payload.funcionalidade, "precos")) {
    const allowedUrl = new URL(getDefaultDashboardPath(payload.funcionalidade), request.url);
    return NextResponse.redirect(allowedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
