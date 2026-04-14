import "server-only";






import {
  formatQualifiedIdentifier,
  queryRows,
  tableExists,
} from "@/lib/server/db";
import {
  coercePositivePrice,
  formatDateKey,
  formatDateLabel,
  normalizeColumnName,
  normalizeText,
  parseDateValue,
  roundNumber,
} from "@/lib/server/normalization";

type PriceRow = Record<string, unknown>;
type PriceTableMatch = {
  table_schema?: string;
  table_name?: string;
};

export type PriceSnapshotItem = {
  produto: string;
  prices: Record<string, number | null>;
  statuses: Record<string, string>;
  matches: Record<string, string>;
};

export type PriceOverview = {
  latestDate: string | null;
  dates: Array<{ key: string; label: string }>;
  markets: string[];
  snapshots: Record<string, PriceSnapshotItem[]>;
};


function canonicalMarketName(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const normalized = normalizeColumnName(text);
  if (normalized.includes("semar")) {
    return "Semar";
  }

  return /^[\x00-\x7F]*$/.test(normalized)
    ? normalized
        .split(" ")
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(" ")
    : text;
}

function extractMarketName(columnName: unknown): string | null {
  const raw = String(columnName ?? "").trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(/\(([^)]+)\)/);
  if (match?.[1]) {
    return canonicalMarketName(match[1]);
  }

  return canonicalMarketName(raw);
}

function isMissingStatus(value: unknown): boolean {
  const normalized = normalizeColumnName(value);
  return normalized === "nao encontrado" || normalized === "não encontrado" || normalized === "sem match";
}

function cleanPriceRows(rows: PriceRow[]): PriceRow[] {
  if (rows.length === 0) {
    return [];
  }

  const firstColumn = Object.keys(rows[0] ?? {})[0];
  const statusColumns = Object.keys(rows[0] ?? {}).filter((column) =>
    normalizeColumnName(column).startsWith("status"),
  );

  return rows
    .filter((row) =>
      Object.values(row).some((value) => String(value ?? "").trim() !== ""),
    )
    .filter((row) => {
      if (!firstColumn) {
        return true;
      }
      return !String(row[firstColumn] ?? "").includes("Busca gerada em");
    })
    .filter((row) => {
      if (statusColumns.length === 0) {
        return true;
      }
      return !statusColumns.every((column) => isMissingStatus(row[column]));
    });
}


function parsePriceDatasetDate(value: unknown): Date | null {
  return parseDateValue(value);
}

    "dt",
    "dt pesquisa",
    "data_pesquisa",
    "data_coleta",
    "created at",
    "created_at",
    "updated at",
    "updated_at",
    "imported at",
    "imported_at",
    "timestamp",
  ]);
  const fileMatches = new Set([
    "arquivo",
    "nome arquivo",
    "arquivo origem",
    "source file",
    "file name",
    "filename",
  ]);

  for (const column of columns) {
    if (dateMatches.has(normalizeColumnName(column))) {
      return column;
    }
  }

  const prefixedDateColumn =
    columns.find((column) => normalizeColumnName(column).startsWith("data ")) ?? null;
  if (prefixedDateColumn) {
    return prefixedDateColumn;
  }

  for (const column of columns) {
    if (fileMatches.has(normalizeColumnName(column))) {
      return column;
    }
  }

  return null;
}

function getPricesTableName(): string {
  return process.env.PRECOS_TABLE?.trim() || "precos";
}

async function resolvePricesTableName(): Promise<string | null> {
  const configuredTableName = getPricesTableName();
  if (await tableExists(configuredTableName)) {
    return configuredTableName;
  }

  const unqualifiedTableName =
    configuredTableName.split(".").filter(Boolean).pop()?.trim() || configuredTableName;
  if (!unqualifiedTableName) {
    return null;
  }

  const matches = await queryRows<PriceTableMatch>(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_name = $1
     ORDER BY CASE WHEN table_schema = 'public' THEN 0 ELSE 1 END, table_schema, table_name
     LIMIT 1`,
    [unqualifiedTableName],
  );

  const matchedTable = matches[0];
  if (!matchedTable?.table_schema || !matchedTable.table_name) {
    console.warn(`Tabela de preços "${configuredTableName}" não encontrada no banco.`);
    return null;
  }

  const resolvedTableName = `${matchedTable.table_schema}.${matchedTable.table_name}`;
  console.warn(
    `Tabela de preços configurada como "${configuredTableName}" não encontrada; usando "${resolvedTableName}".`,
  );
  return resolvedTableName;
}

async function loadDbDatasets(): Promise<Record<string, PriceRow[]>> {
  let tableName = process.env.PRECOS_TABLE?.trim() || "precos";

  try {
    const resolvedTableName = await resolvePricesTableName();
    if (!resolvedTableName) {
      return {};
    }
    tableName = resolvedTableName;

    const qualifiedTableName = formatQualifiedIdentifier(tableName);
    const rows = await queryRows<PriceRow>(`SELECT * FROM ${qualifiedTableName}`);
    if (rows.length === 0) {
      return {};
    }

    const columns = Object.keys(rows[0] ?? {});
    const dateColumn = findDateColumn(columns);
    const grouped = new Map<string, { date: Date; rows: PriceRow[] }>();

    for (const row of rows) {
      const rawDate = dateColumn ? row[dateColumn] : null;
      const parsedDate = parsePriceDatasetDate(rawDate);
      if (!parsedDate) {
        continue;
      }
      const key = formatDateKey(parsedDate);
      const current = grouped.get(key);
      if (current) {
        current.rows.push(row);
      } else {
        grouped.set(key, { date: parsedDate, rows: [row] });
      }
    }

    return Array.from(grouped.entries())
      .sort((left, right) => right[1].date.getTime() - left[1].date.getTime())
      .reduce<Record<string, PriceRow[]>>((accumulator, [key, value]) => {
        accumulator[key] = cleanPriceRows(value.rows);
        return accumulator;
      }, {});
  } catch (error) {
    console.error(`Falha ao carregar precos da tabela "${tableName}".`, error);
    return {};
  }
}

function getSortedDatasetsEntries(datasets: Record<string, PriceRow[]>): [string, PriceRow[]][] {
  return Object.entries(datasets).sort((left, right) => {
    const dateLeft = parseDateValue(left[0].split("-").reverse().join("-"))?.getTime() ?? 0;
    const dateRight = parseDateValue(right[0].split("-").reverse().join("-"))?.getTime() ?? 0;
    return dateRight - dateLeft;
  });
}

export async function loadPriceDatasets(): Promise<Record<string, PriceRow[]>> {
  return loadDbDatasets();
}

function mergePriceItems(rawItems: PriceSnapshotItem[], markets: string[]): PriceSnapshotItem[] {
  const grouped = new Map<string, PriceSnapshotItem[]>();
  for (const item of rawItems) {
    grouped.set(item.produto, [...(grouped.get(item.produto) ?? []), item]);
  }

  return Array.from(grouped.entries())
    .map(([produto, items]) => {
      if (items.length === 1) {
        return items[0];
      }

      const prices = Object.fromEntries(
        markets.map((market) => {
          const values = items
            .map((item) => item.prices[market])
            .filter((value): value is number => typeof value === "number");
          return [market, values.length > 0 ? roundNumber(values.reduce((sum, value) => sum + value, 0) / values.length) : null];
        }),
      );

      const statuses = Object.assign({}, ...items.map((item) => item.statuses));
      const matches = Object.assign({}, ...items.map((item) => item.matches));
      return { produto, prices, statuses, matches };
    })
    .sort((left, right) => left.produto.localeCompare(right.produto, "pt-BR"));
}

export function buildPriceSnapshotItems(rows: PriceRow[]): {
  items: PriceSnapshotItem[];
  markets: string[];
} {
  if (rows.length === 0) {
    return { items: [], markets: ["Semar"] };
  }

  const columns = Object.keys(rows[0] ?? {});
  const productColumn =
    columns.find((column) => normalizeColumnName(column).includes("produto buscado")) ??
    columns.find((column) => normalizeColumnName(column).includes("produto")) ??
    null;

  if (!productColumn) {
    return { items: [], markets: ["Semar"] };
  }

  const marketColumn =
    columns.find((column) =>
      ["estabelecimento", "mercado", "loja", "concorrente"].includes(normalizeColumnName(column)),
    ) ?? null;
  const genericPriceColumn =
    columns.find((column) => ["preco", "valor", "price"].includes(normalizeColumnName(column))) ??
    null;
  const genericStatusColumn =
    columns.find((column) => normalizeColumnName(column) === "status") ?? null;
  const genericMatchColumn =
    columns.find((column) => normalizeColumnName(column).includes("produto encontrado")) ?? null;

  if (marketColumn && genericPriceColumn) {
    const groupedRows = new Map<
      string,
      {
        priceLists: Record<string, number[]>;
        statuses: Record<string, string>;
        matches: Record<string, string>;
      }
    >();
    const allMarkets = new Set<string>(["Semar"]);

    for (const row of rows) {
      const produto = String(row[productColumn] ?? "").trim().toUpperCase();
      const market = canonicalMarketName(row[marketColumn]);
      if (!produto || !market) {
        continue;
      }

      allMarkets.add(market);
      const current = groupedRows.get(produto) ?? {
        priceLists: {},
        statuses: {},
        matches: {},
      };

      const priceValue = coercePositivePrice(row[genericPriceColumn]);
      if (priceValue !== null) {
        current.priceLists[market] = [...(current.priceLists[market] ?? []), priceValue];
      }

      const statusValue = String(row[genericStatusColumn ?? ""] ?? "").trim();
      if (statusValue && !current.statuses[market]) {
        current.statuses[market] = statusValue;
      }

      const matchValue = String(row[genericMatchColumn ?? ""] ?? "").trim();
      if (matchValue && !current.matches[market]) {
        current.matches[market] = matchValue;
      }

      groupedRows.set(produto, current);
    }

    const markets = ["Semar", ...Array.from(allMarkets).filter((market) => market !== "Semar").sort()];
    const rawItems: PriceSnapshotItem[] = [];

    for (const [produto, payload] of groupedRows.entries()) {
      const prices = Object.fromEntries(
        markets.map((market) => {
          const values = payload.priceLists[market] ?? [];
          return [market, values.length > 0 ? roundNumber(values.reduce((sum, value) => sum + value, 0) / values.length) : null];
        }),
      ) as Record<string, number | null>;

      if (!Object.values(prices).some((value) => value !== null)) {
        continue;
      }

      rawItems.push({
        produto,
        prices,
        statuses: payload.statuses,
        matches: payload.matches,
      });
    }

    return { items: mergePriceItems(rawItems, markets), markets };
  }

  const priceColumns: Record<string, string> = {};
  const statusColumns: Record<string, string> = {};
  const matchColumns: Record<string, string> = {};

  for (const column of columns) {
    const normalized = normalizeColumnName(column);
    const market = extractMarketName(column);
    if (!market) {
      continue;
    }

    if (normalized.includes("preco")) {
      priceColumns[market] = column;
      continue;
    }
    if (normalized.startsWith("status")) {
      statusColumns[market] = column;
      continue;
    }
    if (normalized.includes("produto encontrado")) {
      matchColumns[market] = column;
    }
  }

  if (!priceColumns.Semar) {
    const fallbackSemarColumn = Object.entries(priceColumns).find(([market]) =>
      ["preco", "preco semar", "price", "valor"].includes(normalizeColumnName(market)),
    );
    if (fallbackSemarColumn) {
      priceColumns.Semar = fallbackSemarColumn[1];
    }
  }

  const markets = ["Semar", ...Object.keys(priceColumns).filter((market) => market !== "Semar").sort()];
  const rawItems: PriceSnapshotItem[] = [];

  for (const row of rows) {
    const produto = String(row[productColumn] ?? "").trim().toUpperCase();
    if (!produto) {
      continue;
    }

    const prices: Record<string, number | null> = {};
    const statuses: Record<string, string> = {};
    const matches: Record<string, string> = {};
    let hasAnyPrice = false;

    for (const market of markets) {
      const priceValue = coercePositivePrice(row[priceColumns[market]]);
      prices[market] = priceValue;
      if (priceValue !== null) {
        hasAnyPrice = true;
      }

      const statusValue = String(row[statusColumns[market]] ?? "").trim();
      if (statusValue) {
        statuses[market] = statusValue;
      }

      const matchValue = String(row[matchColumns[market]] ?? "").trim();
      if (matchValue) {
        matches[market] = matchValue;
      }
    }

    if (!hasAnyPrice) {
      continue;
    }

    rawItems.push({ produto, prices, statuses, matches });
  }

  return { items: mergePriceItems(rawItems, markets), markets };
}

export async function getPriceOverview(): Promise<PriceOverview> {
  const datasets = await loadPriceDatasets();
  const entries = getSortedDatasetsEntries(datasets);

  if (entries.length === 0) {
    return { latestDate: null, dates: [], markets: ["Semar"], snapshots: {} };
  }

  const snapshots: Record<string, PriceSnapshotItem[]> = {};
  const dateOptions: Array<{ key: string; label: string }> = [];
  const allMarkets = new Set<string>(["Semar"]);

  for (const [dateKey, rows] of entries) {
    const { items, markets } = buildPriceSnapshotItems(rows);
    snapshots[dateKey] = items;
    markets.forEach((market) => allMarkets.add(market));

    const parsedDate = parseDateValue(dateKey.split("-").reverse().join("-"));
    dateOptions.push({
      key: dateKey,
      label: parsedDate ? formatDateLabel(parsedDate) : dateKey,
    });
  }

  return {
    latestDate: dateOptions[0]?.key ?? null,
    dates: dateOptions,
    markets: ["Semar", ...Array.from(allMarkets).filter((market) => market !== "Semar").sort()],
    snapshots,
  };
}

export async function listPrecosConsolidados(): Promise<Array<Record<string, unknown>>> {
  const datasets = await loadPriceDatasets();
  const sortedEntries = getSortedDatasetsEntries(datasets);
  const latestRows = sortedEntries[0]?.[1] ?? [];
  if (latestRows.length === 0) {
    return [];
  }

  const columns = Object.keys(latestRows[0] ?? {});
  const produtoCol = columns.find((column) => normalizeColumnName(column).includes("produto")) ?? columns[0];
  const colunasPreco = columns.filter((column) => normalizeColumnName(column).includes("preco"));
  const mercadoCol =
    columns.find((column) =>
      ["estabelecimento", "mercado", "loja", "concorrente"].includes(normalizeColumnName(column)),
    ) ?? null;

  if (mercadoCol && colunasPreco.some((column) => normalizeColumnName(column) === "preco")) {
    const precoCol = colunasPreco.find((column) => normalizeColumnName(column) === "preco")!;
    const grouped = new Map<
      string,
      { semar: number[]; concorrentes: number[]; mercados: Set<string> }
    >();

    for (const row of latestRows) {
      const produto = String(row[produtoCol] ?? "").trim();
      const mercado = String(row[mercadoCol] ?? "").trim();
      const preco = coercePositivePrice(row[precoCol]);
      if (!produto || !mercado || preco === null) {
        continue;
      }

      const normalizedMarket = normalizeText(mercado);
      const current = grouped.get(produto) ?? {
        semar: [],
        concorrentes: [],
        mercados: new Set<string>(),
      };

      if (normalizedMarket.includes("SEMAR")) {
        current.semar.push(preco);
      } else {
        current.concorrentes.push(preco);
        current.mercados.add(mercado);
      }

      grouped.set(produto, current);
    }

    return Array.from(grouped.entries())
      .map(([produto, payload]) => {
        if (payload.semar.length === 0) {
          return null;
        }
        return {
          Produto: produto,
          Preco: roundNumber(payload.semar.reduce((sum, value) => sum + value, 0) / payload.semar.length),
          PrecoSemar: roundNumber(payload.semar.reduce((sum, value) => sum + value, 0) / payload.semar.length),
          PrecoConcorrentesMedia:
            payload.concorrentes.length > 0
              ? roundNumber(payload.concorrentes.reduce((sum, value) => sum + value, 0) / payload.concorrentes.length)
              : null,
          ConcorrentesCotados: payload.mercados.size,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
  }

  const precoCol =
    colunasPreco.find((column) => normalizeColumnName(column).includes("semar")) ??
    colunasPreco[0] ??
    null;

  if (!precoCol) {
    return [];
  }

  const concorrenteCols = colunasPreco.filter(
    (column) => column !== precoCol && !normalizeColumnName(column).includes("semar"),
  );

  return latestRows
    .map((row) => {
      const produto = String(row[produtoCol] ?? "").trim();
      const precoSemar = coercePositivePrice(row[precoCol]);
      if (!produto || precoSemar === null) {
        return null;
      }

      const concorrentes = concorrenteCols
        .map((column) => coercePositivePrice(row[column]))
        .filter((value): value is number => typeof value === "number");

      return {
        Produto: produto,
        Preco: precoSemar,
        PrecoSemar: precoSemar,
        PrecoConcorrentesMedia:
          concorrentes.length > 0
            ? roundNumber(concorrentes.reduce((sum, value) => sum + value, 0) / concorrentes.length)
            : null,
        ConcorrentesCotados: concorrentes.length,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

export async function summarizePricesForPrompt(maxDays = 3): Promise<string> {
  const overview = await getPriceOverview();
  if (!overview.latestDate) {
    return "Nenhum dado de precos disponivel.";
  }

  const lines: string[] = [];
  for (const dateOption of overview.dates.slice(0, maxDays)) {
    lines.push(`## Precos em ${dateOption.label}`);
    const snapshot = overview.snapshots[dateOption.key] ?? [];
    if (snapshot.length === 0) {
      lines.push("Sem itens consolidados.");
      continue;
    }

    for (const item of snapshot.slice(0, 25)) {
      const marketSummary = Object.entries(item.prices)
        .filter(([, value]) => typeof value === "number")
        .map(([market, value]) => `${market}: R$ ${Number(value).toFixed(2)}`)
        .join(" | ");
      lines.push(`- ${item.produto}: ${marketSummary}`);
    }
  }

  return lines.join("\n");
}
