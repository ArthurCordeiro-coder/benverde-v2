import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { listPrecosConsolidados } from "@/lib/server/precos";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await listPrecosConsolidados());
  } catch (error) {
    return toErrorResponse(error);
  }
}
