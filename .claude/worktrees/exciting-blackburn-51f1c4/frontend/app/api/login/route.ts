import { NextResponse } from "next/server";

import {
  loginWithPassword,
  setSessionCookie,
} from "@/lib/server/auth";
import { readJsonBody } from "@/lib/server/http";
import { toErrorResponse } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<Record<string, unknown>>(request);
    const session = await loginWithPassword({
      username: String(payload.username ?? ""),
      password: String(payload.password ?? ""),
    });

    const response = NextResponse.json({
      success: true,
      user: session.user,
    });
    setSessionCookie(response, session.token);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
