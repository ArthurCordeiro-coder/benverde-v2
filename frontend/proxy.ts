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

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const pathname = request.nextUrl.pathname;

  if (isMobile) {
    if (
      !pathname.startsWith("/mobile") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/login") &&
      !pathname.includes(".")
    ) {
      const MOBILE_SCREEN_MAP: Record<string, string> = {
        "/Caixas": "caixas",
        "/caixas": "caixas",
        "/estoque": "estoque",
        "/Estoque": "estoque",
        "/precos": "precos",
        "/Precos": "precos",
        "/lojas": "lojas",
        "/Lojas": "lojas",
        "/mita": "mita",
        "/Mita": "mita",
      };
      const url = request.nextUrl.clone();
      url.pathname = "/mobile";
      const mappedScreen = MOBILE_SCREEN_MAP[pathname];
      if (mappedScreen) {
        url.searchParams.set("screen", mappedScreen);
        return NextResponse.redirect(url);
      }
      return NextResponse.rewrite(url);
    }
  } else {
    if (pathname.startsWith("/mobile")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isMobileRoute = pathname.startsWith("/mobile");
  const isPriceRoute = pathname === "/precos" || pathname.startsWith("/precos/") || pathname === "/Precos" || pathname.startsWith("/Precos/");
  const isCaixasRoute = pathname === "/Caixas" || pathname.startsWith("/Caixas/") || pathname === "/caixas" || pathname.startsWith("/caixas/");
  const isProtectedRoute = isDashboardRoute || isPriceRoute || isMobileRoute || isCaixasRoute;
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
