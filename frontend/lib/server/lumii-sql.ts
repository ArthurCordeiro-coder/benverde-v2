import "server-only";

import { queryRows } from "@/lib/server/db";

/**
 * Tabelas permitidas para o agente Lumii executar SELECT.
 * Whitelist é a única forma de garantir que o agente não toque em tabelas
 * sensíveis como `users`, `pending`, `lockouts`, `lumii_conversations`, etc.
 */
export const ALLOWED_TABLES = [
  "precos",
  "estoque_manual",
  "caixas_lojas",
  "metas_local",
  "cache_pedidos",
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

const FORBIDDEN_OPS =
  /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|comment|vacuum|analyze|reindex|cluster|lock|listen|notify|prepare|execute|deallocate|do|call)\b/i;

const MAX_ROWS = 1000;

export type SqlQueryResult = {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
};

function stripCommentsAndNormalize(sql: string): string {
  // Remove line comments and block comments for safer validation
  return sql
    .replace(/--[^\n]*\n?/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim();
}

function validateSelectOnly(sql: string): void {
  const lower = sql.toLowerCase();
  if (!lower.startsWith("select") && !lower.startsWith("with")) {
    throw new Error("Apenas queries SELECT ou WITH são permitidas.");
  }
}

function validateNoForbiddenOps(sql: string): void {
  if (FORBIDDEN_OPS.test(sql)) {
    throw new Error(
      "Operações destrutivas (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, etc) não são permitidas.",
    );
  }
}

function validateSingleStatement(sql: string): void {
  // Allow at most a trailing semicolon
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  if (statements.length > 1) {
    throw new Error("Apenas uma statement por query.");
  }
}

function extractTableNames(sql: string): string[] {
  const tables = new Set<string>();
  const re = /\b(?:from|join)\s+("?)([a-zA-Z_][\w]*)(?:\s*\.\s*("?)([a-zA-Z_][\w]*))?\1?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql))) {
    const candidate = (match[4] || match[2]).toLowerCase();
    tables.add(candidate);
  }
  return [...tables];
}

function validateAllowedTables(sql: string, allowed: readonly string[]): void {
  const tables = extractTableNames(sql);
  if (tables.length === 0) {
    // Pure expression like SELECT 1 — fine.
    return;
  }
  const denied = tables.filter(
    (t) => !allowed.includes(t) && !t.startsWith("information_schema"),
  );
  if (denied.length > 0) {
    throw new Error(
      `Tabelas não permitidas: ${denied.join(", ")}. Permitidas: ${allowed.join(", ")}.`,
    );
  }
}

function applyRowLimit(sql: string): string {
  if (/\blimit\s+\d+/i.test(sql)) return sql;
  return `${sql.replace(/;\s*$/, "")} LIMIT ${MAX_ROWS}`;
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  return value;
}

function serializeRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = serializeValue(value);
    }
    return out;
  });
}

export async function executeSafeQuery(
  rawSql: string,
  allowed: readonly string[] = ALLOWED_TABLES,
): Promise<SqlQueryResult> {
  if (typeof rawSql !== "string" || !rawSql.trim()) {
    throw new Error("Query SQL vazia ou inválida.");
  }

  const cleaned = stripCommentsAndNormalize(rawSql);
  validateSelectOnly(cleaned);
  validateNoForbiddenOps(cleaned);
  validateSingleStatement(cleaned);
  validateAllowedTables(cleaned, allowed);

  const finalSql = applyRowLimit(cleaned);

  const rows = await queryRows<Record<string, unknown>>(finalSql);
  return {
    rows: serializeRows(rows),
    rowCount: rows.length,
    truncated: rows.length >= MAX_ROWS,
  };
}
