import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  detail: string;
  headers?: Record<string, string>;

  constructor(status: number, detail: string, headers?: Record<string, string>) {
    super(detail);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
    this.headers = headers;
  }
}

export function badRequest(detail: string): never {
  throw new HttpError(400, detail);
}

export function unauthorized(detail: string, headers?: Record<string, string>): never {
  throw new HttpError(401, detail, headers);
}

export function forbidden(detail: string): never {
  throw new HttpError(403, detail);
}

export function notFound(detail: string): never {
  throw new HttpError(404, detail);
}

export function serviceUnavailable(detail: string): never {
  throw new HttpError(503, detail);
}

export function toErrorResponse(
  error: unknown,
  fallbackMessage = "Erro interno do servidor.",
): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { detail: error.detail },
      { status: error.status, headers: error.headers },
    );
  }

  const detail = error instanceof Error && error.message ? error.message : fallbackMessage;
  return NextResponse.json({ detail }, { status: 500 });
}
