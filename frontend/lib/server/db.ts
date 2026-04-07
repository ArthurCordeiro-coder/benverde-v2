import "server-only";

import { neon } from "@neondatabase/serverless";

import { parseDateValue } from "@/lib/server/normalization";

type QueryParam = string | number | boolean | Date | null;

type NeonClient = ReturnType<typeof neon>;

let client: NeonClient | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function getClient(): NeonClient {
  if (client) {
    return client;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL precisa estar definido no ambiente.");
  }

  client = neon(databaseUrl);
  return client;
}

async function runStatement(statement: string): Promise<void> {
  await getClient().query(statement);
}

export async function ensureDatabase(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          nome TEXT,
          email TEXT,
          salt TEXT,
          senha_hash TEXT,
          is_admin BOOLEAN,
          criado_em TIMESTAMPTZ,
          funcionalidade TEXT,
          role TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS pending (
          username TEXT PRIMARY KEY,
          nome TEXT,
          email TEXT,
          salt TEXT,
          senha_hash TEXT,
          solicitado_em TIMESTAMPTZ,
          funcionalidade TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS lockouts (
          username TEXT PRIMARY KEY,
          tentativas INTEGER,
          bloqueado_ate TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS metas_local (
          produto TEXT PRIMARY KEY,
          meta BIGINT,
          categoria TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS cache_pedidos (
          id SERIAL PRIMARY KEY,
          arquivo_pdf TEXT,
          data TIMESTAMPTZ,
          loja TEXT,
          produto TEXT,
          unidade TEXT,
          quant DOUBLE PRECISION,
          valor_total DOUBLE PRECISION,
          valor_unit DOUBLE PRECISION,
          key TEXT,
          payload JSONB,
          updated_at TIMESTAMPTZ DEFAULT now()
        )`,
        `CREATE TABLE IF NOT EXISTS estoque_manual (
          id SERIAL PRIMARY KEY,
          data TIMESTAMPTZ,
          tipo TEXT,
          produto TEXT,
          quant DOUBLE PRECISION,
          unidade TEXT,
          loja TEXT,
          arquivo TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS caixas_lojas (
          id SERIAL PRIMARY KEY,
          data DATE,
          loja TEXT,
          n_loja INTEGER,
          caixas_benverde INTEGER,
          caixas_ccj INTEGER,
          ccj_banca INTEGER,
          ccj_mercadoria INTEGER,
          ccj_retirada INTEGER,
          caixas_bananas INTEGER,
          total INTEGER,
          entregue TEXT
        )`,
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT",
        "ALTER TABLE pending ADD COLUMN IF NOT EXISTS email TEXT",
        "CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users ((lower(email)))",
        "CREATE UNIQUE INDEX IF NOT EXISTS pending_email_lower_idx ON pending ((lower(email)))",
        `UPDATE users
         SET role = CASE
           WHEN coalesce(role, '') IN ('admin', 'operacional') THEN role
           WHEN is_admin IS TRUE THEN 'admin'
           ELSE 'operacional'
         END`,
      ];

      for (const statement of statements) {
        await runStatement(statement);
      }
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}

export async function queryRows<T = Record<string, unknown>>(
  query: string,
  params: QueryParam[] = [],
): Promise<T[]> {
  await ensureDatabase();
  return (await getClient().query(query, params)) as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  query: string,
  params: QueryParam[] = [],
): Promise<T | null> {
  const rows = await queryRows<T>(query, params);
  return rows[0] ?? null;
}

export async function execute(query: string, params: QueryParam[] = []): Promise<void> {
  await queryRows(query, params);
}

export async function tableExists(tableName: string): Promise<boolean> {
  const row = await queryOne<{ regclass?: string | null }>("SELECT to_regclass($1) AS regclass", [
    tableName,
  ]);
  return Boolean(row?.regclass);
}

export function formatQualifiedIdentifier(value: string): string {
  const raw = value.trim();
  if (!raw) {
    throw new Error("Identificador de tabela invalido.");
  }

  const parts = raw.split(".");
  if (
    parts.some(
      (part) => !part || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part),
    )
  ) {
    throw new Error("Identificador de tabela invalido.");
  }

  return parts.map((part) => `"${part}"`).join(".");
}

export function asDate(value: unknown): Date | null {
  return parseDateValue(value);
}
