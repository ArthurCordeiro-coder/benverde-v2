import { NextRequest, NextResponse } from "next/server";
import { Payment, PreApproval } from "mercadopago";

import { getMpClient } from "@/lib/mercadopago";
import { toErrorResponse, badRequest } from "@/lib/server/errors";

/**
 * Resolve the current status of a payment or subscription.
 *
 * Query: ?type=preapproval|payment & id=...
 * Returns: { status, paid, raw }
 */
export async function GET(req: NextRequest) {
  try {
    const type = (req.nextUrl.searchParams.get("type") ?? "payment") as "payment" | "preapproval";
    const id   = req.nextUrl.searchParams.get("id");

    if (!id) badRequest("Faltou o parâmetro 'id'.");
    if (type !== "payment" && type !== "preapproval") {
      badRequest(`Tipo inválido: ${type} (use 'payment' ou 'preapproval').`);
    }

    const client = getMpClient();

    if (type === "preapproval") {
      const pa = new PreApproval(client);
      const result = await pa.get({ id: id as string });
      return NextResponse.json({
        status: result.status,
        paid: result.status === "authorized",
        raw: result,
      });
    }

    const p = new Payment(client);
    const result = await p.get({ id: id as string });
    return NextResponse.json({
      status: result.status,
      paid: result.status === "approved",
      raw: result,
    });
  } catch (error) {
    console.error("[pagamento/status] error:", error);
    return toErrorResponse(error, "Não foi possível consultar o status do pagamento.");
  }
}
