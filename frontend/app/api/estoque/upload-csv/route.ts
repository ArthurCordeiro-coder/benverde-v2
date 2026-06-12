import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { parsePedidoCsv, validarItens } from "@/lib/server/pedido-csv";

const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || name.endsWith(".xls") || name.endsWith(".xlsx");
}

async function toCSVText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".csv")) return file.text();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(ws, { FS: ";" });
}

export async function POST(request: Request) {
  try {
    await requireDashboardScope("estoque");
    const body = await request.formData();
    const file = body.get("file");

    if (!(file instanceof File) || !isAcceptedFile(file)) {
      badRequest("Envie um arquivo CSV ou XLS valido.");
    }

    if (file.size > MAX_CSV_BYTES) {
      badRequest("Arquivo muito grande (limite de 5 MB).");
    }

    const conteudo = await toCSVText(file);
    const { ok, suspeitos } = validarItens(parsePedidoCsv(conteudo));

    return NextResponse.json({
      arquivo: file.name,
      processamento: "parser",
      resultado: ok,
      suspeitos,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
