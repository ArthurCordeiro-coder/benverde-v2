import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { removeMovimentacao } from "@/lib/server/estoque";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      badRequest("ID invalido.");
    }

    await removeMovimentacao(parsedId);
    return NextResponse.json({ success: true, deleted_id: parsedId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
