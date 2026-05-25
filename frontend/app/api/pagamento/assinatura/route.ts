import { NextRequest, NextResponse } from "next/server";
import { PreApproval } from "mercadopago";

import { getMpClient, LUMII_PLAN, isFrequencyKey } from "@/lib/mercadopago";
import { toErrorResponse, badRequest } from "@/lib/server/errors";

/**
 * Create a recurring subscription (Mercado Pago PreApproval) using a card token
 * generated client-side by the MP JS SDK v2 (`mp.createCardToken(...)`).
 *
 * Body: { cardTokenId, payerEmail, frequency }
 * Returns: { id, status, initPoint }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { cardTokenId, payerEmail, frequency } = body as {
      cardTokenId?: string;
      payerEmail?: string;
      frequency?: string;
    };

    if (!cardTokenId) badRequest("Faltou o token do cartão (cardTokenId).");
    if (!payerEmail)  badRequest("Faltou o e-mail do pagador (payerEmail).");
    if (!isFrequencyKey(frequency)) badRequest(`Frequência inválida: ${String(frequency)}`);

    const plan = LUMII_PLAN[frequency];
    const origin = req.nextUrl.origin;

    const preApproval = new PreApproval(getMpClient());
    const result = await preApproval.create({
      body: {
        reason: `Plano Lumii · ${plan.label}`,
        auto_recurring: {
          frequency: plan.months,
          frequency_type: "months",
          transaction_amount: plan.amount,
          currency_id: "BRL",
        },
        back_url: `${origin}/pagamento?status=success`,
        payer_email: payerEmail,
        card_token_id: cardTokenId,
        status: "authorized",
      },
    });

    return NextResponse.json({
      id: result.id,
      status: result.status,
      initPoint: result.init_point,
    });
  } catch (error) {
    console.error("[pagamento/assinatura] error:", error);
    return toErrorResponse(error, "Não foi possível criar a assinatura.");
  }
}
