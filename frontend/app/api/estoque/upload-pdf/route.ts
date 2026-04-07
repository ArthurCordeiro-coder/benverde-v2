import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { badRequest, serviceUnavailable, toErrorResponse } from "@/lib/server/errors";
import { createSessionToken } from "@/lib/server/session-token";

function getBackendApiBaseUrl(): string {
  return (process.env.BACKEND_API_URL?.trim() || "http://127.0.0.1:8000").replace(/\/+$/, "");
}

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf");
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.formData();
    const file = body.get("file");

    if (!(file instanceof File) || !isPdfFile(file)) {
      badRequest("Envie um arquivo PDF valido.");
    }

    const token = await createSessionToken({
      username: user.username,
      role: user.role,
      expiresInSeconds: 5 * 60,
    });

    const forwardData = new FormData();
    forwardData.append("file", file, file.name);

    let response: Response;
    try {
      response = await fetch(`${getBackendApiBaseUrl()}/api/upload/pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: forwardData,
        cache: "no-store",
      });
    } catch {
      serviceUnavailable("Nao foi possivel acessar o servico de leitura de PDF.");
    }

    const rawText = await response.text();
    let payload: unknown = {};

    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = rawText ? { detail: rawText } : {};
    }

    if (!response.ok) {
      const detail =
        payload &&
        typeof payload === "object" &&
        "detail" in payload &&
        typeof payload.detail === "string" &&
        payload.detail.trim()
          ? payload.detail
          : "Falha ao processar o PDF.";

      return NextResponse.json({ detail }, { status: response.status });
    }

    return NextResponse.json(payload);
  } catch (error) {
    return toErrorResponse(error);
  }
}
