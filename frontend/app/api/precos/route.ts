import { NextResponse } from "next/server";

import { requireFuncionalidade } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { listPrecosConsolidados } from "@/lib/server/precos";

export async function GET() {
  try {
    await requireFuncionalidade("busca de precos");
    return NextResponse.json(await listPrecosConsolidados());
  } catch (error) {
    return toErrorResponse(error);
  }
}
