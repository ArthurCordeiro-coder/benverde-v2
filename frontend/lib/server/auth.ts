import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

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

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

export async function hashPassword(salt: string, password: string): Promise<string> {
  return sha256Hex(`${salt}${password}`);
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

  const hashedPassword = await hashPassword(user.salt, password);
  if (hashedPassword !== user.senha_hash) {
    unauthorized(await registerFailedLogin(username), { "WWW-Authenticate": "Bearer" });
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
