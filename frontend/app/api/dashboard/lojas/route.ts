import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { getLojasData } from "@/lib/server/dashboard";
import { toErrorResponse } from "@/lib/server/errors";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireDashboardScope("lojas");
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes");
    return NextResponse.json(await getLojasData(mes || undefined));
  } catch (error) {
    return toErrorResponse(error);
  }
}
