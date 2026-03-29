import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get("benverde_token")?.value;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isRegistroRoute = pathname === "/registro" || pathname.startsWith("/registro/");
  const isRegistroCaixasRoute =
    pathname === "/registro-caixas" || pathname.startsWith("/registro-caixas/");
  const isLegacyRegistroRoute =
    pathname === "/dashboard/registro" || pathname.startsWith("/dashboard/registro/");
  const isOperationalAllowedRoute = isRegistroRoute || isRegistroCaixasRoute;
  const isProtectedRoute = isDashboardRoute || isOperationalAllowedRoute;

  if (isLegacyRegistroRoute) {
    const registroUrl = new URL("/registro", request.url);
    return NextResponse.redirect(registroUrl);
  }

  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!token) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
