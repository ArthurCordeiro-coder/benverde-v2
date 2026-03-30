import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasValidJwtPayload(token: string): boolean {
  try {
    const payloadChunk = token.split(".")[1];
    if (!payloadChunk) {
      return false;
    }

    const normalizedPayload = payloadChunk.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    JSON.parse(atob(paddedPayload));
    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get("benverde_token")?.value;
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

  if (!hasValidJwtPayload(token)) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("benverde_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
