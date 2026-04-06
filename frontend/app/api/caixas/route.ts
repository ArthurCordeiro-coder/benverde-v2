import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { createCaixa, getCaixas } from "@/lib/server/caixas";
import { toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await getCaixas());
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const payload = await readJsonBody(request);
    await createCaixa(payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
