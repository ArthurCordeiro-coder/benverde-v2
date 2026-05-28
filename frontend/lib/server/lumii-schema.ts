import "server-only";

import { queryRows } from "@/lib/server/db";
import { ALLOWED_TABLES } from "@/lib/server/lumii-sql";

type TableMeta = {
  description: string;
  columnHints?: Record<string, string>;
};

/**
 * Metadata de negócio sobre as tabelas — orientações que o modelo precisa
 * para gerar SQL corretas. NUNCA expor tabelas que não estejam em ALLOWED_TABLES.
 */
const TABLE_METADATA: Record<string, TableMeta> = {
  precos: {
    description:
      "Preços de produtos coletados em concorrentes (Semar, Carrefour, Rossi, Shibata, Alabarce, etc) por data.",
    columnHints: {
      // Esses hints só aparecem se as colunas existirem no schema real (descoberto via information_schema)
    },
  },
  estoque_manual: {
    description:
      "Movimentações de estoque (entradas e saídas) registradas manualmente, em KG/UN/CX.",
    columnHints: {
      tipo: 'valores comuns: "entrada", "saida"',
      unidade: 'valores comuns: "KG", "UN", "CX"',
    },
  },
  caixas_lojas: {
    description:
      "Caixas de produtos enviadas às lojas por data. Inclui status de entrega.",
    columnHints: {
      entregue: 'valores comuns: "sim", "nao"',
    },
  },
  metas_local: {
    description:
      "Metas de pedido por produto. Coluna meta é a meta total em KG (BIGINT).",
  },
  cache_pedidos: {
    description:
      "Cache de pedidos processados de PDFs, agrupados por produto/loja/data.",
  },
};

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
};

let schemaCache: { value: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchAllowedColumns(): Promise<ColumnRow[]> {
  const tablesArray = `{${ALLOWED_TABLES.join(",")}}`;
  return queryRows<ColumnRow>(
    `SELECT table_name, column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])
     ORDER BY table_name, ordinal_position`,
    [tablesArray],
  );
}

function quoteIfNeeded(columnName: string): string {
  // Quote column names that have uppercase, spaces, or non-alphanumeric chars
  if (/[A-Z\s\W]/.test(columnName) && !/^[a-z_][a-z0-9_]*$/.test(columnName)) {
    return `"${columnName}"`;
  }
  return columnName;
}

function describeTable(tableName: string, columns: ColumnRow[]): string {
  const meta = TABLE_METADATA[tableName];
  const header = meta
    ? `### ${tableName} — ${meta.description}`
    : `### ${tableName}`;
  const lines: string[] = [header];

  for (const col of columns) {
    const quoted = quoteIfNeeded(col.column_name);
    const usageNote = quoted !== col.column_name ? ` [usar como ${quoted}]` : "";
    const hint = meta?.columnHints?.[col.column_name];
    const hintStr = hint ? ` — ${hint}` : "";
    lines.push(`  • ${col.column_name} (${col.data_type})${usageNote}${hintStr}`);
  }

  return lines.join("\n");
}

export async function getSchemaForPrompt(force = false): Promise<string> {
  const now = Date.now();
  if (!force && schemaCache && schemaCache.expiresAt > now) {
    return schemaCache.value;
  }

  let rows: ColumnRow[];
  try {
    rows = await fetchAllowedColumns();
  } catch (error) {
    console.error("Falha ao introspecionar schema para Lumii.", error);
    return "Schema indisponível no momento.";
  }

  const byTable = new Map<string, ColumnRow[]>();
  for (const row of rows) {
    const list = byTable.get(row.table_name) ?? [];
    list.push(row);
    byTable.set(row.table_name, list);
  }

  const sections: string[] = [];
  for (const tableName of ALLOWED_TABLES) {
    const cols = byTable.get(tableName);
    if (!cols || cols.length === 0) continue;
    sections.push(describeTable(tableName, cols));
  }

  const value = sections.length > 0 ? sections.join("\n\n") : "Nenhuma tabela disponível.";
  schemaCache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export function clearSchemaCache(): void {
  schemaCache = null;
}
