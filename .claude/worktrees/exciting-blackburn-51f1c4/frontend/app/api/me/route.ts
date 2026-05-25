import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(user);
  } catch (error) {
    return toErrorResponse(error);
  }
}
