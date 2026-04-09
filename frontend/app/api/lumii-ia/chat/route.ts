import { NextResponse } from "next/server";

import { type DashboardScope } from "@/lib/dashboard/access";
import { requireDashboardScope } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";
import { chatWithLumii } from "@/lib/server/lumii";

function resolveScope(value: unknown): DashboardScope {
  if (
    value === "overview" ||
    value === "estoque" ||
    value === "caixas" ||
    value === "precos" ||
    value === "lumii-ia" ||
    value === "mita-ai"
  ) {
    return value;
  }

  badRequest("Escopo da Lumii invalido.");
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<Record<string, unknown>>(request);
    const scope = resolveScope(payload.scope);
    await requireDashboardScope(scope);
    return NextResponse.json(await chatWithLumii(payload, scope));
  } catch (error) {
    return toErrorResponse(error);
  }
}
