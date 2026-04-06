import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { getDashboardData } from "@/lib/server/dashboard";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    return toErrorResponse(error);
  }
}
