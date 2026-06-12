import "server-only";

import { asDate, execute, queryOne } from "@/lib/server/db";
import { criarUsuarioDeAssinatura } from "@/lib/server/users";
import { isFrequencyKey, LUMII_PLAN } from "@/lib/mercadopago";

function periodoFimPadrao(plano: string): Date | null {
  if (!isFrequencyKey(plano)) {
    return null;
  }
  const fim = new Date();
  fim.setMonth(fim.getMonth() + LUMII_PLAN[plano].months);
  return fim;
}

export type AssinaturaMetodo = "preapproval" | "payment";
export type AssinaturaStatus = "pendente" | "ativa" | "cancelada" | "falha";

export type AssinaturaRow = {
  id: string;
  email: string;
  salt: string;
  senha_hash: string;
  plano: string;
  metodo: AssinaturaMetodo;
  status: AssinaturaStatus;
  mp_id: string | null;
  username: string | null;
  periodo_fim: Date | null;
};

function mapRow(row: Record<string, unknown> | null): AssinaturaRow | null {
  if (!row?.id) {
    return null;
  }
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    salt: String(row.salt ?? ""),
    senha_hash: String(row.senha_hash ?? ""),
    plano: String(row.plano ?? ""),
    metodo: String(row.metodo ?? "payment") as AssinaturaMetodo,
    status: String(row.status ?? "pendente") as AssinaturaStatus,
    mp_id: row.mp_id ? String(row.mp_id) : null,
    username: row.username ? String(row.username) : null,
    periodo_fim: asDate(row.periodo_fim),
  };
}

export async function criarAssinaturaPendente(input: {
  email: string;
  salt: string;
  senhaHash: string;
  plano: string;
  metodo: AssinaturaMetodo;
}): Promise<string> {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO lumii_assinaturas (id, email, salt, senha_hash, plano, metodo, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pendente')`,
    [id, input.email, input.salt, input.senhaHash, input.plano, input.metodo],
  );
  return id;
}

export async function getAssinaturaPorId(id: string): Promise<AssinaturaRow | null> {
  return mapRow(
    await queryOne<Record<string, unknown>>(
      `SELECT id, email, salt, senha_hash, plano, metodo, status, mp_id, username, periodo_fim
       FROM lumii_assinaturas WHERE id = $1`,
      [id],
    ),
  );
}

export async function marcarAssinaturaMpId(id: string, mpId: string): Promise<void> {
  await execute(
    `UPDATE lumii_assinaturas SET mp_id = $2, updated_at = now() WHERE id = $1`,
    [id, mpId],
  );
}

/**
 * Confirma uma assinatura/pagamento: cria (ou reaproveita) o usuário em `users`
 * e marca a assinatura como ativa. Idempotente — chamadas repetidas do webhook
 * não recriam o usuário nem duplicam efeitos.
 */
export async function ativarAssinaturaPorId(
  id: string,
  options: { mpId?: string | null; periodoFim?: Date | null } = {},
): Promise<{ ok: boolean; username: string | null; alreadyActive: boolean }> {
  const assinatura = await getAssinaturaPorId(id);
  if (!assinatura) {
    return { ok: false, username: null, alreadyActive: false };
  }
  if (assinatura.status === "ativa" && assinatura.username) {
    return { ok: true, username: assinatura.username, alreadyActive: true };
  }

  const username = await criarUsuarioDeAssinatura({
    email: assinatura.email,
    salt: assinatura.salt,
    senhaHash: assinatura.senha_hash,
  });

  const periodoFim = options.periodoFim ?? periodoFimPadrao(assinatura.plano);

  await execute(
    `UPDATE lumii_assinaturas
     SET status = 'ativa', username = $2, mp_id = COALESCE($3, mp_id),
         periodo_fim = COALESCE($4, periodo_fim), updated_at = now()
     WHERE id = $1`,
    [id, username, options.mpId ?? null, periodoFim],
  );

  return { ok: true, username, alreadyActive: false };
}

/**
 * Reconcilia uma assinatura de cartão pelo e-mail do pagador. Necessário porque
 * o checkout de assinaturas hospedado do MP não repassa o `external_reference`.
 * Casa o cadastro pendente (metodo=preapproval) mais recente daquele e-mail.
 */
export async function ativarAssinaturaPendentePorEmail(
  email: string,
  options: { mpId?: string | null } = {},
): Promise<{ ok: boolean; username: string | null; alreadyActive: boolean } | null> {
  const row = await queryOne<{ id?: string }>(
    `SELECT id FROM lumii_assinaturas
     WHERE lower(email) = lower($1) AND status = 'pendente' AND metodo = 'preapproval'
     ORDER BY created_at DESC LIMIT 1`,
    [email],
  );
  if (!row?.id) {
    return null;
  }
  return ativarAssinaturaPorId(String(row.id), options);
}

export async function marcarAssinaturaFalha(id: string): Promise<void> {
  await execute(
    `UPDATE lumii_assinaturas SET status = 'falha', updated_at = now()
     WHERE id = $1 AND status <> 'ativa'`,
    [id],
  );
}
