import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { getMovimentacoes } from "@/lib/server/estoque";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await getMovimentacoes());
  } catch (error) {
    return toErrorResponse(error);
  }
}
