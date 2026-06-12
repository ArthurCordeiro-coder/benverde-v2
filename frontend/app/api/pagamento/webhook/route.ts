import { NextRequest, NextResponse } from "next/server";
import { Payment, PreApproval } from "mercadopago";

import { getMpClient } from "@/lib/mercadopago";
import {
  ativarAssinaturaPendentePorEmail,
  ativarAssinaturaPorId,
} from "@/lib/server/assinaturas";

/**
 * Mercado Pago webhook (notification) receiver — fonte de verdade do acesso.
 *
 * 1. Valida o header `x-signature` (HMAC-SHA256) com `MP_WEBHOOK_SECRET`.
 *    Sem secret, cai em modo teste: apenas avisa no log (para o ngrok local).
 * 2. Consulta o recurso na API do MP (pagamento ou assinatura).
 * 3. Se aprovado/autorizado, ativa a assinatura pelo `external_reference`
 *    (cria/ativa o usuário em `users` → login passa a funcionar).
 *
 * Doc: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 */

const encoder = new TextEncoder();

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function verifySignature(req: NextRequest, dataId: string | null): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn(
      "[pagamento/webhook] MP_WEBHOOK_SECRET não configurado — assinatura NÃO verificada (modo teste).",
    );
    return true;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k.trim(), rest.join("=").trim()];
    }),
  ) as Record<string, string>;

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `${dataId ? `id:${dataId.toLowerCase()};` : ""}request-id:${xRequestId};ts:${ts};`;
  const expected = await hmacSha256Hex(manifest, secret);
  return safeEqual(expected, v1);
}

/** Extrai {type, id} de uma notificação (query string e/ou corpo). */
function readNotification(
  req: NextRequest,
  body: Record<string, unknown>,
): { type: string | null; id: string | null } {
  const sp = req.nextUrl.searchParams;
  const type =
    sp.get("type") ??
    sp.get("topic") ??
    (typeof body.type === "string" ? body.type : null) ??
    (typeof body.action === "string" ? String(body.action).split(".")[0] : null);

  const data = (body.data ?? {}) as Record<string, unknown>;
  const id =
    sp.get("data.id") ??
    sp.get("id") ??
    (data.id != null ? String(data.id) : null);

  return { type, id };
}

async function processNotification(type: string | null, id: string | null): Promise<void> {
  if (!type || !id) return;
  const client = getMpClient();

  if (type.includes("payment")) {
    const payment = await new Payment(client).get({ id });
    if (payment.status === "approved" && payment.external_reference) {
      const r = await ativarAssinaturaPorId(payment.external_reference, { mpId: String(payment.id) });
      console.log("[pagamento/webhook] payment aprovado → assinatura ativada:", {
        externalRef: payment.external_reference,
        username: r.username,
        alreadyActive: r.alreadyActive,
      });
    }
    return;
  }

  if (type.includes("preapproval") || type.includes("subscription")) {
    const pa = await new PreApproval(client).get({ id });
    if (pa.status === "authorized") {
      // O checkout hospedado não repassa external_reference → casa por e-mail.
      const r = pa.external_reference
        ? await ativarAssinaturaPorId(pa.external_reference, { mpId: String(pa.id) })
        : pa.payer_email
          ? await ativarAssinaturaPendentePorEmail(pa.payer_email, { mpId: String(pa.id) })
          : null;
      console.log("[pagamento/webhook] preapproval autorizado → assinatura ativada:", {
        externalRef: pa.external_reference ?? null,
        payerEmail: pa.payer_email ?? null,
        username: r?.username ?? null,
        matched: r != null,
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { type, id } = readNotification(req, body);

  if (!(await verifySignature(req, id))) {
    console.warn("[pagamento/webhook] Assinatura inválida — notificação rejeitada.");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  console.log("[pagamento/webhook] POST", { timestamp: new Date().toISOString(), type, id });

  try {
    await processNotification(type, id);
  } catch (error) {
    // Logamos mas devolvemos 200: o MP reenvia em caso de erro, e queremos
    // evitar reentregas infinitas por falhas transitórias já tratadas.
    console.error("[pagamento/webhook] Falha ao processar notificação:", error);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  console.log("[pagamento/webhook] GET", { timestamp: new Date().toISOString(), params });
  return NextResponse.json({ ok: true });
}
