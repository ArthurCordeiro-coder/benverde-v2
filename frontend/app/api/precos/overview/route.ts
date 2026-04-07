import { NextResponse } from "next/server";

import { requireFuncionalidade } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { getPriceOverview } from "@/lib/server/precos";

export async function GET() {
  try {
    await requireFuncionalidade("busca de precos");
    return NextResponse.json(await getPriceOverview());
  } catch (error) {
    return toErrorResponse(error);
  }
}
