import { NextResponse } from "next/server";

import { registerUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<Record<string, unknown>>(request);
    const status = await registerUser({
      username: String(payload.username ?? ""),
      nome: String(payload.nome ?? ""),
      email: String(payload.email ?? ""),
      password: String(payload.password ?? ""),
      funcionalidade: String(payload.funcionalidade ?? ""),
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return toErrorResponse(error);
  }
}
