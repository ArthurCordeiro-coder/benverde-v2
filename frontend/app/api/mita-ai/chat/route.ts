import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";
import { chatWithMita } from "@/lib/server/mita";

export async function POST(request: Request) {
  try {
    await requireUser();
    const payload = await readJsonBody(request);
    return NextResponse.json(await chatWithMita(payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
