import { NextRequest, NextResponse } from "next/server";
import { Preference } from "mercadopago";

import { getMpClient, getCheckoutUrl, LUMII_PLAN, isFrequencyKey } from "@/lib/mercadopago";
import { toErrorResponse, badRequest } from "@/lib/server/errors";

/**
 * Create a Checkout Pro Preference for one-time payment via Pix / Boleto /
 * Saldo Mercado Pago. The frontend redirects the user to `init_point`
 * (or `sandboxInitPoint` in test mode) — MP handles the buyer flow and
 * returns the user to `/pagamento?status=...&payment_id=...` after payment.
 *
 * Body: { frequency, payerEmail? }
 * Returns: { id, initPoint, sandboxInitPoint }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { frequency, payerEmail } = body as { frequency?: string; payerEmail?: string };

    if (!isFrequencyKey(frequency)) badRequest(`Frequência inválida: ${String(frequency)}`);

    const plan = LUMII_PLAN[frequency];
    const origin = req.nextUrl.origin;
    const useAutoReturn = origin.startsWith("https://");

    const preference = new Preference(getMpClient());
    const result = await preference.create({
      body: {
        items: [
          {
            id: `lumii-${frequency}`,
            title: `Plano Lumii · ${plan.label}`,
            description: "Acesso completo · cobrança única do ciclo selecionado",
            quantity: 1,
            unit_price: plan.amount,
            currency_id: "BRL",
          },
        ],
        payer: payerEmail ? { email: payerEmail } : undefined,
        back_urls: {
          success: `${origin}/pagamento?status=success`,
          failure: `${origin}/pagamento?status=failure`,
          pending: `${origin}/pagamento?status=pending`,
        },
        // `auto_return` exige back_urls HTTPS — o MP rejeita localhost.
        ...(useAutoReturn ? { auto_return: "approved" as const } : {}),
        // Força a aba "outros métodos": exclui cartões para o usuário ver
        // apenas Pix / Boleto / Saldo no checkout do MP.
        payment_methods: {
          excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
        },
        statement_descriptor: "LUMII",
      },
    });

    return NextResponse.json({
      id: result.id,
      checkoutUrl: getCheckoutUrl(result),
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    });
  } catch (error) {
    console.error("[pagamento/preferencia] error:", error);
    return toErrorResponse(error, "Não foi possível criar a preferência de pagamento.");
  }
}
