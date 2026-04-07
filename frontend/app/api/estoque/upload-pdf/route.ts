import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { extractBananasFromPdfWithMita } from "@/lib/server/mita-pdf";

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf");
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.formData();
    const file = body.get("file");

    if (!(file instanceof File) || !isPdfFile(file)) {
      badRequest("Envie um arquivo PDF valido.");
    }

    return NextResponse.json(await extractBananasFromPdfWithMita(file));
  } catch (error) {
    return toErrorResponse(error);
  }
}
