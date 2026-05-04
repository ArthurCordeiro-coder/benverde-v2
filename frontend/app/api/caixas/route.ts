import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { createCaixa, getCaixas } from "@/lib/server/caixas";
import { toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireDashboardScope("caixas");
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes");
    return NextResponse.json(await getCaixas(mes || undefined));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireDashboardScope("caixas");
    const payload = await readJsonBody(request);
    const id = await createCaixa(payload);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
