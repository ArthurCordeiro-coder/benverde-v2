import { MercadoPagoConfig } from "mercadopago";

/**
 * Shared Mercado Pago SDK client. Lazily instantiated so the module
 * can be imported even when MP_ACCESS_TOKEN is not yet configured —
 * the routes themselves throw a clear error in that case.
 */

let _client: MercadoPagoConfig | null = null;

export function getMpClient(): MercadoPagoConfig {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MP_ACCESS_TOKEN não está definido. Adicione-o em frontend/.env.local e reinicie o servidor.",
    );
  }
  if (!_client) {
    _client = new MercadoPagoConfig({
      accessToken: token,
      options: { timeout: 10_000 },
    });
  }
  return _client;
}

/**
 * Per-cycle pricing for the Lumii subscription. Mirrors the FREQ_PLANS object
 * on the frontend (`app/pagamento/page.tsx`) — kept here so the backend
 * computes the authoritative amount instead of trusting the client.
 *
 * Values in BRL (reais), per the design.
 */
export const LUMII_PLAN = {
  monthly: { months: 1,  amount: 49.99,  label: "Mensal" },
  quarter: { months: 3,  amount: 134.97, label: "Trimestral" },
  annual:  { months: 12, amount: 479.88, label: "Anual" },
} as const;

export type FrequencyKey = keyof typeof LUMII_PLAN;

export function isFrequencyKey(v: unknown): v is FrequencyKey {
  return typeof v === "string" && v in LUMII_PLAN;
}
