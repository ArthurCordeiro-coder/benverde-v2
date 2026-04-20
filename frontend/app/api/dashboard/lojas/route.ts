import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { getLojasData } from "@/lib/server/dashboard";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    await requireDashboardScope("lojas");
    return NextResponse.json(await getLojasData());
  } catch (error) {
    return toErrorResponse(error);
  }
}
