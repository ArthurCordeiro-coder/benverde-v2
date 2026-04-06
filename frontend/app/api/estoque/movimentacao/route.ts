import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { readJsonBody } from "@/lib/server/http";
import { saveMovimentacoes } from "@/lib/server/estoque";
import { toErrorResponse } from "@/lib/server/errors";

export async function POST(request: Request) {
  try {
    await requireUser();
    const payload = await readJsonBody(request);
    const saved = await saveMovimentacoes(payload);
    return NextResponse.json({ success: true, saved });
  } catch (error) {
    return toErrorResponse(error);
  }
}
