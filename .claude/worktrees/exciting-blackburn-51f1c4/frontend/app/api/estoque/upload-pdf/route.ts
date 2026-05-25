import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { extractBananasFromPdfWithLumii } from "@/lib/server/lumii-pdf";

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf");
}

export async function POST(request: Request) {
  try {
    await requireDashboardScope("estoque");
    const body = await request.formData();
    const file = body.get("file");

    if (!(file instanceof File) || !isPdfFile(file)) {
      badRequest("Envie um arquivo PDF valido.");
    }

    return NextResponse.json(await extractBananasFromPdfWithLumii(file));
  } catch (error) {
    return toErrorResponse(error);
  }
}
