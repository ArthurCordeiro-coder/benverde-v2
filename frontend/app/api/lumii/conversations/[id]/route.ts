import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { badRequest, notFound, toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";
import {
  deleteConversation,
  getConversation,
  getConversationMessages,
  renameConversation,
} from "@/lib/server/lumii-conversations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!id) badRequest("ID da conversa ausente.");

    const conversation = await getConversation(id, user.username);
    if (!conversation) notFound("Conversa não encontrada.");

    const messages = await getConversationMessages(id);
    return NextResponse.json({ conversation, messages });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!id) badRequest("ID da conversa ausente.");

    const removed = await deleteConversation(id, user.username);
    if (!removed) notFound("Conversa não encontrada.");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!id) badRequest("ID da conversa ausente.");

    const payload = await readJsonBody<Record<string, unknown>>(request);
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) badRequest("Título inválido.");

    const renamed = await renameConversation(id, user.username, title);
    if (!renamed) notFound("Conversa não encontrada.");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
