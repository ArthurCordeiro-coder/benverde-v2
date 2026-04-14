import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { getPriceOverview } from "@/lib/server/precos";

export async function GET() {
  try {
    await requireDashboardScope("precos");
    const overview = await getPriceOverview();
    console.warn("[OVERVIEW] dates returned:", overview.dates.map((d) => d.key));
    return NextResponse.json(overview);
  } catch (error) {
    return toErrorResponse(error);
  }
}
