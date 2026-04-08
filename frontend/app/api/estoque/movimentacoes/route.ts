import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { getMovimentacoes } from "@/lib/server/estoque";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    await requireDashboardScope("estoque");
    return NextResponse.json(await getMovimentacoes());
  } catch (error) {
    return toErrorResponse(error);
  }
}
