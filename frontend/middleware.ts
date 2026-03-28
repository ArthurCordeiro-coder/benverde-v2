import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Buffer } from "buffer";

type JwtPayload = {
  role?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadChunk = token.split(".")[1];
    if (!payloadChunk) {
      return null;
    }

    const normalizedPayload = payloadChunk.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );
    return JSON.parse(Buffer.from(paddedPayload, "base64").toString());
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
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

  const payload = decodeJwtPayload(token);
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("benverde_token");
    return response;
  }

  if (payload.role === "operacional" && !isOperationalAllowedRoute) {
    const registroUrl = new URL("/registro", request.url);
    return NextResponse.redirect(registroUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
