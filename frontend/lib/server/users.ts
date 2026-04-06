import "server-only";

import { asDate, execute, queryOne, queryRows } from "@/lib/server/db";

export type UserRow = {
  username: string;
  nome: string | null;
  email: string | null;
  salt: string;
  senha_hash: string;
  is_admin: boolean | null;
  criado_em: Date | null;
  funcionalidade: string | null;
  role: string | null;
};

export type PendingUserRow = {
  username: string;
  nome: string | null;
  email: string | null;
  salt: string;
  senha_hash: string;
  solicitado_em: Date | null;
  funcionalidade: string | null;
};

export type LockoutRow = {
  username: string;
  tentativas: number;
  bloqueado_ate: Date | null;
};

export type PublicUser = {
  username: string;
  nome: string | null;
  email: string | null;
  role: string;
  is_admin: boolean;
  funcionalidade: string;
};

function mapUserRow(row: Record<string, unknown> | null): UserRow | null {
  if (!row?.username) {
    return null;
  }

  return {
    username: String(row.username),
    nome: row.nome ? String(row.nome) : null,
    email: row.email ? String(row.email) : null,
    salt: String(row.salt ?? ""),
    senha_hash: String(row.senha_hash ?? ""),
    is_admin: row.is_admin === true,
    criado_em: asDate(row.criado_em),
    funcionalidade: row.funcionalidade ? String(row.funcionalidade) : null,
    role: row.role ? String(row.role) : null,
  };
}

function mapPendingRow(row: Record<string, unknown> | null): PendingUserRow | null {
  if (!row?.username) {
    return null;
  }

  return {
    username: String(row.username),
    nome: row.nome ? String(row.nome) : null,
    email: row.email ? String(row.email) : null,
    salt: String(row.salt ?? ""),
    senha_hash: String(row.senha_hash ?? ""),
    solicitado_em: asDate(row.solicitado_em),
    funcionalidade: row.funcionalidade ? String(row.funcionalidade) : null,
  };
}

export function normalizeRole(role: string | null | undefined, isAdmin = false): string {
  if (role === "admin" || role === "operacional") {
    return role;
  }
  return isAdmin ? "admin" : "operacional";
}

export function toPublicUser(user: UserRow): PublicUser {
  const role = normalizeRole(user.role, Boolean(user.is_admin));
  return {
    username: user.username,
    nome: user.nome,
    email: user.email,
    role,
    is_admin: role === "admin",
    funcionalidade: user.funcionalidade || "administracao geral",
  };
}

export async function countUsers(): Promise<number> {
  const row = await queryOne<{ total?: number | string }>("SELECT COUNT(*) AS total FROM users");
  return Number(row?.total ?? 0);
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  return mapUserRow(
    await queryOne(
      `SELECT username, nome, email, salt, senha_hash, is_admin, criado_em, funcionalidade, role
       FROM users
       WHERE username = $1`,
      [username],
    ),
  );
}

export async function findPendingUserByUsername(username: string): Promise<PendingUserRow | null> {
  return mapPendingRow(
    await queryOne(
      `SELECT username, nome, email, salt, senha_hash, solicitado_em, funcionalidade
       FROM pending
       WHERE username = $1`,
      [username],
    ),
  );
}

export async function usernameExists(username: string): Promise<boolean> {
  const row = await queryOne<{ exists?: boolean }>("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) AS exists", [
    username,
  ]);
  return Boolean(row?.exists);
}

export async function pendingUsernameExists(username: string): Promise<boolean> {
  const row = await queryOne<{ exists?: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pending WHERE username = $1) AS exists",
    [username],
  );
  return Boolean(row?.exists);
}

export async function emailExists(email: string): Promise<boolean> {
  const row = await queryOne<{ exists?: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = $1) AS exists",
    [email],
  );
  return Boolean(row?.exists);
}

export async function pendingEmailExists(email: string): Promise<boolean> {
  const row = await queryOne<{ exists?: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pending WHERE lower(email) = $1) AS exists",
    [email],
  );
  return Boolean(row?.exists);
}

export async function insertAdminUser(input: {
  username: string;
  nome: string;
  email: string;
  salt: string;
  senhaHash: string;
  funcionalidade: string;
}): Promise<void> {
  await execute(
    `INSERT INTO users (
      username, nome, email, salt, senha_hash, is_admin, criado_em, funcionalidade, role
    ) VALUES ($1, $2, $3, $4, $5, TRUE, now(), $6, 'admin')`,
    [input.username, input.nome, input.email, input.salt, input.senhaHash, input.funcionalidade],
  );
}

export async function insertPendingUser(input: {
  username: string;
  nome: string;
  email: string;
  salt: string;
  senhaHash: string;
  funcionalidade: string;
}): Promise<void> {
  await execute(
    `INSERT INTO pending (
      username, nome, email, salt, senha_hash, solicitado_em, funcionalidade
    ) VALUES ($1, $2, $3, $4, $5, now(), $6)`,
    [input.username, input.nome, input.email, input.salt, input.senhaHash, input.funcionalidade],
  );
}

export async function listPendingUsers(): Promise<PendingUserRow[]> {
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT username, nome, email, salt, senha_hash, solicitado_em, funcionalidade
     FROM pending
     ORDER BY username`,
  );
  return rows.map((row) => mapPendingRow(row)).filter(Boolean) as PendingUserRow[];
}

export async function approvePendingUser(username: string): Promise<boolean> {
  const pendingUser = await findPendingUserByUsername(username);
  if (!pendingUser) {
    return false;
  }

  await execute(
    `INSERT INTO users (
      username, nome, email, salt, senha_hash, is_admin, criado_em, funcionalidade, role
    ) VALUES ($1, $2, $3, $4, $5, FALSE, now(), $6, 'operacional')`,
    [
      pendingUser.username,
      pendingUser.nome || pendingUser.username,
      pendingUser.email,
      pendingUser.salt,
      pendingUser.senha_hash,
      pendingUser.funcionalidade || "administracao geral",
    ],
  );

  await execute("DELETE FROM pending WHERE username = $1", [username]);
  return true;
}

export async function rejectPendingUser(username: string): Promise<boolean> {
  const pendingUser = await findPendingUserByUsername(username);
  if (!pendingUser) {
    return false;
  }

  await execute("DELETE FROM pending WHERE username = $1", [username]);
  return true;
}

export async function getLockout(username: string): Promise<LockoutRow | null> {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT username, tentativas, bloqueado_ate FROM lockouts WHERE username = $1",
    [username],
  );
  if (!row?.username) {
    return null;
  }

  return {
    username: String(row.username),
    tentativas: Number(row.tentativas ?? 0),
    bloqueado_ate: asDate(row.bloqueado_ate),
  };
}

export async function upsertLockout(
  username: string,
  tentativas: number,
  bloqueadoAte: Date | null,
): Promise<void> {
  await execute(
    `INSERT INTO lockouts (username, tentativas, bloqueado_ate)
     VALUES ($1, $2, $3)
     ON CONFLICT (username)
     DO UPDATE SET tentativas = EXCLUDED.tentativas, bloqueado_ate = EXCLUDED.bloqueado_ate`,
    [username, tentativas, bloqueadoAte],
  );
}
