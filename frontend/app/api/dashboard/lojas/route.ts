import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { getLojasData } from "@/lib/server/dashboard";
import { toErrorResponse } from "@/lib/server/errors";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireDashboardScope("lojas");
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get("inicio") || searchParams.get("mes");
    const fim = searchParams.get("fim");
    return NextResponse.json(await getLojasData(inicio || undefined, fim || undefined));
  } catch (error) {
    return toErrorResponse(error);
  }
}
