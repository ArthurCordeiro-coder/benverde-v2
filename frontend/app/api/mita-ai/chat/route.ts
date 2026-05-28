import { NextResponse } from "next/server";

import { type DashboardScope } from "@/lib/dashboard/access";
import { requireDashboardScope } from "@/lib/server/auth";
import { badRequest, toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";
import { chatWithLumii } from "@/lib/server/mita";
import {
  appendMessage,
  ensureConversation,
  generateConversationId,
} from "@/lib/server/lumii-conversations";

function resolveScope(value: unknown): DashboardScope {
  if (
    value === "overview" ||
    value === "estoque" ||
    value === "caixas" ||
    value === "precos" ||
    value === "mita-ai"
  ) {
    return value;
  }

  badRequest("Escopo da Lumii inválido.");
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<Record<string, unknown>>(request);
    const scope = resolveScope(payload.scope);
    const user = await requireDashboardScope(scope);

    // Conversation persistence: client may pass conversation_id to continue
    // an existing conversation. If absent, we mint a new id and create the row.
    const incomingId =
      typeof payload.conversation_id === "string" && payload.conversation_id.trim()
        ? payload.conversation_id.trim()
        : null;

    const userMessage = String(payload.message ?? "").trim();
    if (!userMessage) {
      badRequest("Mensagem vazia.");
    }

    const conversationId = incomingId ?? generateConversationId();
    await ensureConversation(conversationId, user.username, userMessage);

    // Save user message before calling xAI so it persists even on API failure
    await appendMessage(conversationId, "user", userMessage);

    const result = await chatWithLumii(payload, scope, conversationId);

    // Save assistant response after success
    if (result.answer) {
      await appendMessage(conversationId, "assistant", result.answer);
    }

    return NextResponse.json({ ...result, conversation_id: conversationId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
