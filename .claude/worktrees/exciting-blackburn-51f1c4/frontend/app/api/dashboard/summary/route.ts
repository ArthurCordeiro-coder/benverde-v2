import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { getDashboardData } from "@/lib/server/dashboard";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    await requireDashboardScope("overview");
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    return toErrorResponse(error);
  }
}
