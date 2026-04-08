import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { getSaldoEstoque } from "@/lib/server/estoque";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    await requireDashboardScope("estoque");
    return NextResponse.json(await getSaldoEstoque());
  } catch (error) {
    return toErrorResponse(error);
  }
}
