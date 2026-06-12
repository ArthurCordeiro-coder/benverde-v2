import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { extractBananasFromPdfWithLumii } from "@/lib/server/mita-pdf";

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

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

    if (file.size > MAX_PDF_BYTES) {
      badRequest("Arquivo PDF muito grande (limite de 15 MB).");
    }

    return NextResponse.json(await extractBananasFromPdfWithLumii(file));
  } catch (error) {
    return toErrorResponse(error);
  }
}
