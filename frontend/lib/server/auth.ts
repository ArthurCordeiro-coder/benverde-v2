import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { canAccessDashboardScope, type DashboardScope } from "@/lib/dashboard/access";
import { badRequest, forbidden, unauthorized } from "@/lib/server/errors";
import { normalizeEmail } from "@/lib/server/normalization";
import {
  countUsers,
  emailExists,
  findUserByUsername,
  getLockout,
  insertAdminUser,
  insertPendingUser,
  normalizeRole,
  pendingEmailExists,
  pendingUsernameExists,
  toPublicUser,
  type PublicUser,
  updateUserPasswordHash,
  upsertLockout,
  usernameExists,
} from "@/lib/server/users";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/server/session-token";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SESSION_DURATION_SECONDS = 60 * 60;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;
const encoder = new TextEncoder();

// PBKDF2-HMAC-SHA256 com key-stretching (OWASP: >= 210k iterações).
// Hashes novos são armazenados como `pbkdf2$<iteracoes>$<hashHex>`; o hash
// SHA-256 legado (sem stretching) ainda é aceito no login e re-hasheado.
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_PREFIX = "pbkdf2";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(hash));
}

async function pbkdf2Hex(salt: string, password: string, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/**
 * Verifica a senha contra o hash armazenado, suportando o formato legado
 * SHA-256. `needsRehash` indica que o valor guardado deve ser regravado no
 * formato PBKDF2 atual (hash legado ou contagem de iterações desatualizada).
 */
export async function verifyPassword(
  stored: string,
  salt: string,
  password: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (stored.startsWith(`${PBKDF2_PREFIX}$`)) {
    const [, iterationsRaw, expectedHash] = stored.split("$");
    const iterations = Number(iterationsRaw);
    if (!Number.isInteger(iterations) || iterations <= 0 || !expectedHash) {
      return { ok: false, needsRehash: false };
    }
    const actual = await pbkdf2Hex(salt, password, iterations);
    return {
      ok: constantTimeEqual(actual, expectedHash),
      needsRehash: iterations < PBKDF2_ITERATIONS,
    };
  }

  // Formato legado: SHA-256(salt + senha), sem key-stretching.
  const legacy = await sha256Hex(`${salt}${password}`);
  return { ok: constantTimeEqual(legacy, stored), needsRehash: true };
}

function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Gera o valor armazenado em `users.senha_hash` para credenciais novas. */
export async function hashPassword(salt: string, password: string): Promise<string> {
  const hash = await pbkdf2Hex(salt, password, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${hash}`;
}

export async function getUserFromToken(token: string | null | undefined): Promise<PublicUser | null> {
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const user = await findUserByUsername(payload.sub);
  return user ? toPublicUser(user) : null;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getUserFromToken(token);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized("Credenciais invalidas", { "WWW-Authenticate": "Bearer" });
  }
  return user;
}

export async function requireAdminUser(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.is_admin !== true) {
    forbidden("Apenas administradores podem executar esta acao.");
  }
  return user;
}

export async function requireFuncionalidade(
  funcionalidades: string | string[],
): Promise<PublicUser> {
  const user = await requireUser();
  const allowedFuncionalidades = Array.isArray(funcionalidades)
    ? funcionalidades
    : [funcionalidades];
  const normalizedCurrent = user.funcionalidade.trim().toLowerCase();
  const isAllowed = allowedFuncionalidades.some(
    (item) => item.trim().toLowerCase() === normalizedCurrent,
  );

  if (!isAllowed) {
    forbidden("Voce nao tem permissao para acessar esta area.");
  }

  return user;
}

export async function requireDashboardScope(scope: DashboardScope): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role === "admin" || user.is_admin === true) {
    return user;
  }

  if (!canAccessDashboardScope(user.funcionalidade, scope)) {
    forbidden("Você não tem permissão para acessar esta área.");
  }

  return user;
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, buildCookieOptions(SESSION_DURATION_SECONDS));
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...buildCookieOptions(0),
    expires: new Date(0),
  });
}

function formatBlockedUntil(value: Date): string {
  return value.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

async function registerFailedLogin(username: string): Promise<string> {
  const currentLockout = await getLockout(username);
  let tentativas = (currentLockout?.tentativas ?? 0) + 1;
  let bloqueadoAte: Date | null = null;

  if (tentativas >= LOCKOUT_MAX_ATTEMPTS) {
    bloqueadoAte = new Date(Date.now() + LOCKOUT_WINDOW_MINUTES * 60 * 1000);
    tentativas = 0;
  }

  await upsertLockout(username, tentativas, bloqueadoAte);

  if (bloqueadoAte) {
    return "Muitas tentativas. Usuario bloqueado por 15 minutos.";
  }

  return `Usuario ou senha invalidos (${tentativas} de 5)`;
}

export async function loginWithPassword(input: {
  username: string;
  password: string;
}): Promise<{ user: PublicUser; token: string }> {
  const username = input.username.trim();
  const password = input.password;
  const currentLockout = await getLockout(username);
  const now = new Date();

  if (currentLockout?.bloqueado_ate && now < currentLockout.bloqueado_ate) {
    unauthorized(`Usuario bloqueado ate ${formatBlockedUntil(currentLockout.bloqueado_ate)}`, {
      "WWW-Authenticate": "Bearer",
    });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    unauthorized(await registerFailedLogin(username), { "WWW-Authenticate": "Bearer" });
  }

  const { ok, needsRehash } = await verifyPassword(user.senha_hash, user.salt, password);
  if (!ok) {
    unauthorized(await registerFailedLogin(username), { "WWW-Authenticate": "Bearer" });
  }

  // Migra hashes legados (SHA-256) para PBKDF2 de forma transparente no login.
  if (needsRehash) {
    try {
      await updateUserPasswordHash(user.username, await hashPassword(user.salt, password));
    } catch (error) {
      console.error("[auth] Falha ao re-hashear senha do usuario:", error);
    }
  }

  await upsertLockout(username, 0, null);
  const publicUser = toPublicUser(user);
  const token = await createSessionToken({
    username: publicUser.username,
    role: publicUser.role,
    funcionalidade: publicUser.funcionalidade,
    expiresInSeconds: SESSION_DURATION_SECONDS,
  });

  return { user: publicUser, token };
}

function randomHex(bytes = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function registerUser(input: {
  username: string;
  nome?: string | null;
  email: string;
  password: string;
  funcionalidade?: string | null;
}): Promise<"admin_criado" | "pendente"> {
  const username = input.username.trim();
  if (!USERNAME_REGEX.test(username)) {
    badRequest("Username deve ter 3-20 caracteres (letras, numeros e _)");
  }

  const email = normalizeEmail(input.email);
  if (!EMAIL_REGEX.test(email)) {
    badRequest("Email invalido");
  }

  if (input.password.length < 6) {
    badRequest("Senha deve ter pelo menos 6 caracteres");
  }

  if (await usernameExists(username)) {
    badRequest("Username ja cadastrado");
  }

  if (await emailExists(email)) {
    badRequest("Email ja cadastrado");
  }

  if (await pendingUsernameExists(username)) {
    badRequest("Username ja aguarda aprovacao");
  }

  if (await pendingEmailExists(email)) {
    badRequest("Email ja aguarda aprovacao");
  }

  const nome = input.nome?.trim() || username;
  const funcionalidade = input.funcionalidade?.trim() || "administracao geral";
  const salt = randomHex();
  const senhaHash = await hashPassword(salt, input.password);

  if ((await countUsers()) === 0) {
    await insertAdminUser({
      username,
      nome,
      email,
      salt,
      senhaHash,
      funcionalidade,
    });
    return "admin_criado";
  }

  await insertPendingUser({
    username,
    nome,
    email,
    salt,
    senhaHash,
    funcionalidade,
  });

  return "pendente";
}

export function normalizeSessionRole(role: string | null | undefined, isAdmin = false): string {
  return normalizeRole(role, isAdmin);
}
