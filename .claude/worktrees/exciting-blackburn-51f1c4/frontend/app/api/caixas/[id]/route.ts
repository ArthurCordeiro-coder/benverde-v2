import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { updateCaixaEntregue } from "@/lib/server/caixas";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireDashboardScope("caixas");
    const { id } = await context.params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      badRequest("ID inválido.");
    }

    const payload = await readJsonBody(request);
    const item = await updateCaixaEntregue(parsedId, payload);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    return toErrorResponse(error);
  }
}
