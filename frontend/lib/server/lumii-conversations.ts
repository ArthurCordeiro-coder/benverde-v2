import "server-only";

import { execute, queryOne, queryRows } from "@/lib/server/db";

export type LumiiMessageRole = "user" | "assistant";

export type LumiiConversationRow = {
  id: string;
  username: string;
  title: string;
  created_at: Date | null;
  updated_at: Date | null;
};

export type LumiiMessageRow = {
  id: number;
  conversation_id: string;
  role: LumiiMessageRole;
  content: string;
  created_at: Date | null;
};

export function generateConversationId(): string {
  return crypto.randomUUID();
}

function deriveTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Nova conversa";
  const max = 80;
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 1)}…`;
}

export async function ensureConversation(
  conversationId: string,
  username: string,
  firstMessage: string,
): Promise<void> {
  const title = deriveTitle(firstMessage);
  await execute(
    `INSERT INTO lumii_conversations (id, username, title)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
    [conversationId, username, title],
  );
}

export async function appendMessage(
  conversationId: string,
  role: LumiiMessageRole,
  content: string,
): Promise<void> {
  await execute(
    `INSERT INTO lumii_messages (conversation_id, role, content) VALUES ($1, $2, $3)`,
    [conversationId, role, content],
  );
  await execute(
    `UPDATE lumii_conversations SET updated_at = now() WHERE id = $1`,
    [conversationId],
  );
}

export async function listConversations(username: string): Promise<LumiiConversationRow[]> {
  return queryRows<LumiiConversationRow>(
    `SELECT id, username, title, created_at, updated_at
     FROM lumii_conversations
     WHERE username = $1
     ORDER BY updated_at DESC
     LIMIT 100`,
    [username],
  );
}

export async function getConversation(
  conversationId: string,
  username: string,
): Promise<LumiiConversationRow | null> {
  return queryOne<LumiiConversationRow>(
    `SELECT id, username, title, created_at, updated_at
     FROM lumii_conversations
     WHERE id = $1 AND username = $2`,
    [conversationId, username],
  );
}

export async function getConversationMessages(
  conversationId: string,
): Promise<LumiiMessageRow[]> {
  return queryRows<LumiiMessageRow>(
    `SELECT id, conversation_id, role, content, created_at
     FROM lumii_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC, id ASC`,
    [conversationId],
  );
}

export async function deleteConversation(
  conversationId: string,
  username: string,
): Promise<boolean> {
  const existing = await getConversation(conversationId, username);
  if (!existing) return false;
  await execute(`DELETE FROM lumii_conversations WHERE id = $1`, [conversationId]);
  return true;
}

export async function renameConversation(
  conversationId: string,
  username: string,
  title: string,
): Promise<boolean> {
  const existing = await getConversation(conversationId, username);
  if (!existing) return false;
  const cleaned = title.trim().slice(0, 200) || "Nova conversa";
  await execute(
    `UPDATE lumii_conversations SET title = $1, updated_at = now() WHERE id = $2`,
    [cleaned, conversationId],
  );
  return true;
}
