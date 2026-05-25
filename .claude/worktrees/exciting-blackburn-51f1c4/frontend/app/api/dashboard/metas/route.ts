import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";
import { validateAndReplaceMetas } from "@/lib/server/dashboard";

export async function PUT(request: Request) {
  try {
    await requireDashboardScope("overview");
    const payload = await readJsonBody(request);
    const items = await validateAndReplaceMetas(payload);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return toErrorResponse(error);
  }
}
