import { NextRequest, NextResponse } from "next/server";

/**
 * Mercado Pago webhook (notification) receiver.
 *
 * **Stub for test mode.** Logs the payload + query params and ACKs with 200.
 *
 * To verify the signature in production (`x-signature` header HMAC-SHA256),
 * use `WebhookSignatureValidator` from the `mercadopago` SDK or the manual
 * recipe at https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks#editor_4
 *
 * For local testing:
 *   1. Run `ngrok http 3002` (or whatever port the dev server uses)
 *   2. Copy the public URL + `/api/pagamento/webhook`
 *   3. Paste it in MP Developer Panel → your app → Notifications → Webhooks
 *   4. Trigger a test event from the panel — the request body will appear
 *      in the dev server console.
 */
export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => ({}));
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const sig    = req.headers.get("x-signature");
  const reqId  = req.headers.get("x-request-id");

  console.log("[pagamento/webhook] POST", {
    timestamp: new Date().toISOString(),
    params,
    body,
    headers: { "x-signature": sig, "x-request-id": reqId },
  });

  // TODO: verify x-signature once production credentials are wired.
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  console.log("[pagamento/webhook] GET", { timestamp: new Date().toISOString(), params });
  return NextResponse.json({ ok: true });
}
