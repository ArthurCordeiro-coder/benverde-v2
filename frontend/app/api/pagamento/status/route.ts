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

    // NOTE: this endpoint is public (the checkout runs before the buyer has a
    // benverde session). We must NOT echo the full Mercado Pago object back —
    // it contains payer PII (e-mail, document) and would allow anyone to
    // enumerate payment IDs. Only the minimal status flags are returned.
    if (type === "preapproval") {
      const pa = new PreApproval(client);
      const result = await pa.get({ id: id as string });
      return NextResponse.json({
        status: result.status,
        paid: result.status === "authorized",
      });
    }

    const p = new Payment(client);
    const result = await p.get({ id: id as string });
    return NextResponse.json({
      status: result.status,
      paid: result.status === "approved",
    });
  } catch (error) {
    console.error("[pagamento/status] error:", error);
    return toErrorResponse(error, "Não foi possível consultar o status do pagamento.");
  }
}
