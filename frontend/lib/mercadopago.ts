import { MercadoPagoConfig } from "mercadopago";

/**
 * Shared Mercado Pago SDK client. Lazily instantiated so the module
 * can be imported even when MP_ACCESS_TOKEN is not yet configured —
 * the routes themselves throw a clear error in that case.
 */

let _client: MercadoPagoConfig | null = null;

export function getMpAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MP_ACCESS_TOKEN não está definido. Adicione-o em frontend/.env.local e reinicie o servidor.",
    );
  }
  return token;
}

export function getMpClient(): MercadoPagoConfig {
  const token = getMpAccessToken();
  if (!_client) {
    _client = new MercadoPagoConfig({
      accessToken: token,
      options: { timeout: 10_000 },
    });
  }
  return _client;
}

/**
 * True when the configured access token is a TEST credential (`TEST-…`).
 * Drives the test-vs-production checkout URL choice in one place, so the
 * frontend never has to know about sandbox URLs. Swapping the token to a
 * production `APP_USR-…` credential flips the whole flow with no code change.
 */
export function isTestMode(): boolean {
  return (process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-");
}

/**
 * Picks the right checkout URL from an MP API result. In test mode the
 * `sandbox_init_point` routes the buyer through a test-buyer session; in
 * production only `init_point` is populated.
 */
export function getCheckoutUrl(result: {
  init_point?: string | null;
  sandbox_init_point?: string | null;
}): string | null {
  if (isTestMode()) {
    return result.sandbox_init_point ?? result.init_point ?? null;
  }
  return result.init_point ?? null;
}

/**
 * Per-cycle pricing for the Lumii subscription. Single source of truth shared
 * by the backend (preference amount) and mirrored by the frontend FREQ_PLANS.
 * Values in BRL (reais), per the design.
 */
export const LUMII_PLAN = {
  monthly: { months: 1,  amount: 99.99,  label: "Mensal" },
  quarter: { months: 3,  amount: 269.97, label: "Trimestral" },
  annual:  { months: 12, amount: 959.90, label: "Anual" },
} as const;

export type FrequencyKey = keyof typeof LUMII_PLAN;

export function isFrequencyKey(v: unknown): v is FrequencyKey {
  return typeof v === "string" && v in LUMII_PLAN;
}

/**
 * Mercado Pago preapproval_plan id per cycle (the recurring subscription plan
 * created in the MP panel / via API). Read server-side so we can create the
 * preapproval with an external_reference. Falls back to the legacy
 * NEXT_PUBLIC_* vars so an already-configured monthly plan keeps working.
 */
export function getPreapprovalPlanId(frequency: FrequencyKey): string | undefined {
  const map: Record<FrequencyKey, string | undefined> = {
    monthly:
      process.env.MP_PREAPPROVAL_PLAN_MONTHLY ??
      process.env.NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_MONTHLY,
    quarter:
      process.env.MP_PREAPPROVAL_PLAN_QUARTER ??
      process.env.NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_QUARTER,
    annual:
      process.env.MP_PREAPPROVAL_PLAN_ANNUAL ??
      process.env.NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_ANNUAL,
  };
  return map[frequency];
}
