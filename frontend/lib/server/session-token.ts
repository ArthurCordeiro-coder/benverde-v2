const encoder = new TextEncoder();

export const SESSION_COOKIE_NAME = "benverde_token";

export type SessionPayload = {
  sub: string;
  role: string;
  exp: number;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET_KEY precisa estar definido no ambiente.");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signHmacSha256(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function decodePayload(token: string): SessionPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  try {
    const payloadJson = new TextDecoder().decode(fromBase64Url(segments[1]));
    const payload = JSON.parse(payloadJson) as Partial<SessionPayload>;
    if (!payload || typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return null;
    }

    return {
      sub: payload.sub,
      role: typeof payload.role === "string" ? payload.role : "operacional",
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function createSessionToken(input: {
  username: string;
  role: string;
  expiresInSeconds: number;
}): Promise<string> {
  const header = toBase64Url(
    encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        sub: input.username,
        role: input.role,
        exp: Math.floor(Date.now() / 1000) + input.expiresInSeconds,
      }),
    ),
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = await signHmacSha256(unsignedToken, getJwtSecret());
  return `${unsignedToken}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const payload = decodePayload(token);
  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const expectedSignature = await signHmacSha256(`${segments[0]}.${segments[1]}`, getJwtSecret());
  if (!safeEqual(expectedSignature, segments[2])) {
    return null;
  }

  return payload;
}
