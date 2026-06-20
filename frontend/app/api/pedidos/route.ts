import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { inserirPedidos, type RegistroPedidoInput } from "@/lib/server/pedidos";

const MAX_REGISTROS = 5000;

export async function POST(request: Request) {
  try {
    await requireDashboardScope("estoque");

    const body = (await request.json().catch(() => null)) as
      | { registros?: unknown }
      | null;

    const registros = body?.registros;
    if (!Array.isArray(registros)) {
      badRequest("Envie um corpo { registros: [...] } com os pedidos processados.");
    }

    if (registros.length > MAX_REGISTROS) {
      badRequest(`Limite de ${MAX_REGISTROS} registros por envio.`);
    }

    const resultado = await inserirPedidos(registros as RegistroPedidoInput[]);
    return NextResponse.json(resultado);
  } catch (error) {
    return toErrorResponse(error);
  }
}
