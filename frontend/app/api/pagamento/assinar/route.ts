import { NextRequest, NextResponse } from "next/server";
import { Preference } from "mercadopago";

import {
  getMpClient,
  getCheckoutUrl,
  isFrequencyKey,
  LUMII_PLAN,
} from "@/lib/mercadopago";
import { hashPassword } from "@/lib/server/auth";
import { criarAssinaturaPendente } from "@/lib/server/assinaturas";
import { badRequest, serviceUnavailable, toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function randomHex(bytes = 16): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Inicia a assinatura da Lumii a partir do checkout público:
 *  1. cria o cadastro pendente (e-mail + senha) gravando o hash;
 *  2. cria, no Mercado Pago, uma única preferência de Checkout Pro com TODOS
 *     os métodos disponíveis (cartão + Pix + Boleto + Saldo), carregando
 *     `external_reference` com o id do cadastro pendente para reconciliar no
 *     webhook. Cobrança única do ciclo selecionado;
 *  3. devolve `{ checkoutUrl }` para o frontend redirecionar.
 *
 * O acesso só é liberado quando o webhook confirma o pagamento.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await readJsonBody<Record<string, unknown>>(req);
    const email = String(payload.email ?? "").trim();
    const password = String(payload.password ?? "");
    const frequency = payload.frequency;

    if (!EMAIL_REGEX.test(email)) badRequest("E-mail inválido.");
    if (password.length < 6) badRequest("Senha deve ter pelo menos 6 caracteres.");
    if (!isFrequencyKey(frequency)) badRequest(`Frequência inválida: ${String(frequency)}`);

    const plan = LUMII_PLAN[frequency];
    const origin = req.nextUrl.origin;
    const useAutoReturn = origin.startsWith("https://");

    const salt = randomHex(32);
    const senhaHash = await hashPassword(salt, password);
    const externalRef = await criarAssinaturaPendente({
      email,
      salt,
      senhaHash,
      plano: frequency,
      metodo: "payment",
    });

    // ── Checkout Pro único: cartão + Pix + Boleto + Saldo no mesmo checkout ──
    // Cobrança única do ciclo selecionado. Sem `excluded_payment_types`, o MP
    // oferece todos os métodos juntos. O `external_reference` reconcilia o
    // cadastro pendente no webhook (fonte de verdade do acesso).
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
        payer: { email },
        external_reference: externalRef,
        back_urls: {
          success: `${origin}/pagamento?status=success`,
          failure: `${origin}/pagamento?status=failure`,
          pending: `${origin}/pagamento?status=pending`,
        },
        ...(useAutoReturn ? { auto_return: "approved" as const } : {}),
        statement_descriptor: "LUMII",
      },
    });

    const checkoutUrl = getCheckoutUrl(result);
    if (!checkoutUrl) {
      serviceUnavailable("Mercado Pago não retornou uma URL de checkout.");
    }

    return NextResponse.json({ checkoutUrl, externalReference: externalRef });
  } catch (error) {
    console.error("[pagamento/assinar] error:", error);
    return toErrorResponse(error, "Não foi possível iniciar a assinatura.");
  }
}
