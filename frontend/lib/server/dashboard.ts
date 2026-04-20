import "server-only";

import { badRequest } from "@/lib/server/errors";
import { execute, queryRows } from "@/lib/server/db";
import { getCaixas } from "@/lib/server/caixas";
import { getSaldoEstoque } from "@/lib/server/estoque";
import { getPriceOverview, listPrecosConsolidados } from "@/lib/server/precos";
import { normalizeText } from "@/lib/server/normalization";

export type DashboardCategory = "Frutas" | "Legumes" | "Verduras";

export type DashboardMetaItem = {
  id: number;
  produto: string;
  categoria: DashboardCategory;
  meta: number;
  pedido: number;
  progresso: number;
  status: "Atingida" | "Proxima" | "Pendente";
};

type MetaRecord = {
  Produto: string;
  Meta: number;
  Categoria: string | null;
};

type PedidoCacheRecord = {
  produto: string;
  quant: number;
};

const CATEGORY_KEYWORDS: Record<DashboardCategory, string[]> = {
  Frutas: [
    "BANANA",
    "MACA",
    "MAMAO",
    "PERA",
    "UVA",
    "MELAO",
    "MELANCIA",
    "LARANJA",
    "LIMAO",
    "ABACATE",
    "ABACAXI",
    "MANGA",
    "MORANGO",
    "KIWI",
    "GOIABA",
  ],
  Legumes: [
    "BATATA",
    "CENOURA",
    "BERINJELA",
    "MANDIOCA",
    "BETERRABA",
    "ABOBORA",
    "ABOBRINHA",
    "CHUCHU",
    "PEPINO",
    "CEBOLA",
    "ALHO",
    "INHAME",
    "MANDIOQUINHA",
    "PIMENTAO",
    "TOMATE",
    "VAGEM",
    "MILHO",
  ],
  Verduras: [
    "ALFACE",
    "MANJERICAO",
    "MOSTARDA",
    "RUCULA",
    "COUVE",
    "ESPINAFRE",
    "AGRIAO",
    "ALMEIRAO",
    "SALSINHA",
    "CEBOLINHA",
    "COENTRO",
    "HORTELA",
    "REPOLHO",
    "ESCAROLA",
  ],
};

export async function loadMetas(): Promise<MetaRecord[]> {
  const rows = await queryRows<Record<string, unknown>>(
    "SELECT produto, meta, categoria FROM metas_local ORDER BY produto",
  );
  return rows.map((row) => ({
    Produto: String(row.produto ?? ""),
    Meta: Number(row.meta ?? 0),
    Categoria: row.categoria ? String(row.categoria) : null,
  }));
}

const PRODUCT_ALIASES = new Map<string, string>([
  ["GOIABA VERMELHA EMBALADA", "GOIABA VERMELHA"],
  ["LIMAO TAHITI", "LIMAO"],
  ["MACA GALA", "MACA GALA NACIONAL"],
  ["MACA GALA NACIONAL", "MACA GALA NACIONAL"],
  ["MACA GRAMSSMITH", "MACA GRANNY SMITH"],
  ["MAMAO PAPAIA", "MAMAO PAPAYA"],
  ["MANDIOCA A VACUO", "MANDIOCA"],
  ["MELANCIA BABY CEPI", "MELANCIA BABY"],
  ["MILHO VERDE", "MILHO VERDE BANDEJA"],
  ["PERA WILLIANS", "PERA WILLIAMS"],
  ["REPOLHO MIX FATIADO", "REPOLHO VERDE HIGIENIZADO FATIADO"],
  ["SALSA COM CEBOLINHA", "SALSA E CEBOLINHA"],
  ["TOMATE SWEETT GRAPE", "TOMATE SWEET GRAPE"],
  ["UVA VITORIA BANDEJA", "UVA VITORIA"],
]);

const COMPARISON_IGNORED_TOKENS = new Set(["BANDEJA", "EMBALADA", "KG", "UN"]);

function normalizeProductName(value: string): string {
  return normalizeText(value)
    .replace(/\bHIDROPONIC[OA]S?\b/g, "HIDROPONIC")
    .replace(/\bGRAMSSMITH\b/g, "GRANNY SMITH")
    .replace(/\bMORANGO BANDEJA\b/g, "MORANGO")
    .replace(/\bPAPAIA\b/g, "PAPAYA")
    .replace(/\bSWEETT\b/g, "SWEET")
    .replace(/\bWILLIANS\b/g, "WILLIAMS")
    .trim()
    .replace(/\s+/g, " ");
}

function extractPackageMultiplier(tokens: string[]): number {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const compactMatch = token.match(/^(?:CX|CAIXA|SC|SACOLA)(\d+(?:[.,]\d+)?)KG?$/);
    if (compactMatch) {
      const parsed = Number(compactMatch[1].replace(",", "."));
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    if (!["CX", "CAIXA", "SC", "SACOLA"].includes(token)) {
      continue;
    }

    const numericToken = tokens[index + 1] === "KG" ? tokens[index + 2] : tokens[index + 1];
    if (!numericToken) {
      continue;
    }

    const strippedNumeric = numericToken.replace(/KG$/, "");
    if (!/^\d+(?:[.,]\d+)?$/.test(strippedNumeric)) {
      continue;
    }

    const parsed = Number(strippedNumeric.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

function toComparableProductKey(value: string): string {
  const normalized = normalizeProductName(value);
  if (!normalized) {
    return "";
  }

  const rawTokens = normalized.split(" ").filter(Boolean);
  const tokens: string[] = [];

  for (let index = 0; index < rawTokens.length; index += 1) {
    const token = rawTokens[index];
    if (/^(?:CX|CAIXA|SC|SACOLA)\d+(?:[.,]\d+)?KG?$/.test(token)) {
      continue;
    }

    if (["CX", "CAIXA", "SC", "SACOLA"].includes(token)) {
      const nextToken = rawTokens[index + 1];
      const afterNextToken = rawTokens[index + 2];
      if (nextToken === "KG") {
        index += afterNextToken ? 2 : 1;
      } else if (nextToken && /^\d+(?:[.,]\d+)?KG?$/.test(nextToken)) {
        index += 1;
        if (rawTokens[index + 1] === "KG") {
          index += 1;
        }
      }
      continue;
    }

    if (COMPARISON_IGNORED_TOKENS.has(token)) {
      continue;
    }

    tokens.push(token);
  }

  const cleaned = tokens.join(" ").trim();
  if (!cleaned) {
    return "";
  }

  const aliased = PRODUCT_ALIASES.get(cleaned) ?? cleaned;
  return aliased
    .split(" ")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"))
    .join(" ");
}

function getEffectivePedidoQuantity(produto: string, quant: unknown): number {
  const baseQuantity = Number(quant ?? 0);
  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) {
    return 0;
  }

  const multiplier = extractPackageMultiplier(normalizeProductName(produto).split(" ").filter(Boolean));
  return Math.round(baseQuantity * multiplier * 1000) / 1000;
}

export async function fetchPedidosImportados(): Promise<PedidoCacheRecord[]> {
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT produto, quant
     FROM cache_pedidos
     WHERE produto IS NOT NULL
       AND quant IS NOT NULL
     ORDER BY updated_at ASC NULLS LAST, id ASC`,
  );

  return rows
    .map((row) => ({
      produto: String(row.produto ?? "").trim(),
      quant: getEffectivePedidoQuantity(String(row.produto ?? ""), row.quant),
    }))
    .filter((row) => row.produto && row.quant > 0);
}

export function inferDashboardCategory(
  produto: string,
  categoria?: string | null,
): DashboardCategory {
  const normalizedCategory = normalizeText(categoria ?? "");
  if (normalizedCategory === "LEGUME" || normalizedCategory === "LEGUMES") {
    return "Legumes";
  }
  if (normalizedCategory === "VERDURA" || normalizedCategory === "VERDURAS") {
    return "Verduras";
  }
  if (normalizedCategory === "FRUTA" || normalizedCategory === "FRUTAS") {
    return "Frutas";
  }

  const normalizedProduct = normalizeText(produto);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [DashboardCategory, string[]]
  >) {
    if (keywords.some((keyword) => normalizedProduct.includes(keyword))) {
      return category;
    }
  }

  return "Frutas";
}

export async function buildDashboardMetaItems(): Promise<DashboardMetaItem[]> {
  const rawMetas = await loadMetas();
  const baseItems: Array<{
    id: number;
    produto: string;
    categoria: DashboardCategory;
    meta: number;
    normalized: string;
  }> = [];
  const seenProducts = new Set<string>();

  rawMetas.forEach((rawMeta, index) => {
    const produto = String(rawMeta.Produto ?? "").trim();
    if (!produto) {
      return;
    }

    const normalizedProduct = toComparableProductKey(produto);
    const metaValue = Math.trunc(Number(rawMeta.Meta ?? 0));
    if (!normalizedProduct || seenProducts.has(normalizedProduct) || metaValue <= 0) {
      return;
    }

    seenProducts.add(normalizedProduct);
    baseItems.push({
      id: index + 1,
      produto,
      categoria: inferDashboardCategory(produto, rawMeta.Categoria),
      meta: metaValue,
      normalized: normalizedProduct,
    });
  });

  if (baseItems.length === 0) {
    return [];
  }

  const aggregatedOrders = Object.fromEntries(
    baseItems.map((item) => [item.normalized, 0]),
  ) as Record<string, number>;

  const pedidosImportados = await fetchPedidosImportados();
  for (const pedidoImportado of pedidosImportados) {
    const normalizedProduct = toComparableProductKey(pedidoImportado.produto);
    const quantity = pedidoImportado.quant;
    if (!normalizedProduct || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    if (!(normalizedProduct in aggregatedOrders)) {
      continue;
    }

    aggregatedOrders[normalizedProduct] += quantity;
  }

  return baseItems.map((item) => {
    const pedido = Math.round((aggregatedOrders[item.normalized] ?? 0) * 100) / 100;
    const progresso = item.meta > 0 ? Math.round(((pedido / item.meta) * 100) * 100) / 100 : 0;
    let status: DashboardMetaItem["status"] = "Pendente";
    if (progresso >= 100) {
      status = "Atingida";
    } else if (progresso >= 80) {
      status = "Proxima";
    }

    return {
      id: item.id,
      produto: item.produto,
      categoria: item.categoria,
      meta: item.meta,
      pedido,
      progresso,
      status,
    };
  });
}

export async function replaceMetas(records: MetaRecord[]): Promise<void> {
  await execute("DELETE FROM metas_local");
  for (const record of records) {
    await execute(
      "INSERT INTO metas_local (produto, meta, categoria) VALUES ($1, $2, $3)",
      [record.Produto, record.Meta, record.Categoria],
    );
  }
}

export async function validateAndReplaceMetas(payload: unknown): Promise<DashboardMetaItem[]> {
  const items =
    Array.isArray(payload) ? payload : payload && typeof payload === "object" ? (payload as { items?: unknown }).items : null;

  if (!Array.isArray(items)) {
    badRequest("Envie uma lista de metas.");
  }

  const byProduct = new Map<string, MetaRecord>();
  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") {
      badRequest("Cada meta precisa ser um objeto JSON.");
    }

    const item = rawItem as Record<string, unknown>;
    const produto = String(item.produto ?? item.Produto ?? "").trim();
    if (!produto) {
      badRequest("Toda meta precisa informar o produto.");
    }

    const metaValue = Math.trunc(Number(item.meta ?? item.Meta ?? 0));
    if (!Number.isFinite(metaValue)) {
      badRequest(`Meta invalida para o produto ${produto}.`);
    }
    if (metaValue <= 0) {
      badRequest(`A meta do produto ${produto} deve ser maior que zero.`);
    }

    byProduct.set(normalizeText(produto), {
      Produto: produto,
      Meta: metaValue,
      Categoria: inferDashboardCategory(
        produto,
        String(item.categoria ?? item.Categoria ?? ""),
      ),
    });
  }

  await replaceMetas(Array.from(byProduct.values()));
  return buildDashboardMetaItems();
}

export async function getDashboardData(): Promise<{
  summary: {
    saldoEstoque: number;
    caixasDisponiveis: number;
    precoMedio: number;
    caixasRegistradas: number;
    precosRegistrados: number;
    metasAtivas: number;
    mediaEntrega: number;
    pedidosImportados: number;
  };
  metas: DashboardMetaItem[];
  faturamento: Array<{ produto: string; quant: number; valor: number }>;
  comprasPorLoja: Array<{ loja: string; valor: number }>;
  caixasLojas: Array<{ loja: string; total: number; status: string }>;
  tiposCaixa: Array<{ nome: string; valor: number }>;
  valorUnitario: Array<{ produto: string; valor: number }>;
  movimentacao: Array<{ categoria: string; valor: number }>;
  comparativoPrecos: Array<{ data: string; interno: number; mercado: number }>;
  produtoComparativo: string;
}> {
  const [{ saldo }, caixas, precos, metas, pedidosImportados, faturamentoRows, comprasRows, unitRows, overview] = await Promise.all([
    getSaldoEstoque(),
    getCaixas(),
    listPrecosConsolidados(),
    buildDashboardMetaItems(),
    fetchPedidosImportados(),
    queryRows<{ produto: string; quant: number; valor: number }>(
      `SELECT produto, SUM(quant) as quant, SUM(valor_total) as valor
       FROM cache_pedidos
       GROUP BY produto
       ORDER BY valor DESC
       LIMIT 5`
    ),
    queryRows<{ loja: string; valor: number }>(
      `SELECT loja, SUM(valor_total) as valor
       FROM cache_pedidos
       GROUP BY loja
       ORDER BY valor DESC
       LIMIT 5`
    ),
    queryRows<{ produto: string; valor: number }>(
      `SELECT produto, AVG(valor_unit) as valor
       FROM cache_pedidos
       GROUP BY produto
       ORDER BY valor DESC
       LIMIT 5`
    ),
    getPriceOverview(),
  ]);

  const caixasDisponiveis = caixas.reduce((total, item) => total + Number(item.total ?? 0), 0);
  const precoValores = precos
    .map((item) => Number(item.Preco ?? item.preco ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const precoMedio =
    precoValores.length > 0
      ? Math.round((precoValores.reduce((sum, value) => sum + value, 0) / precoValores.length) * 100) / 100
      : 0;
  const mediaEntrega =
    metas.length > 0
      ? Math.round((metas.reduce((sum, item) => sum + Number(item.progresso ?? 0), 0) / metas.length) * 100) / 100
      : 0;

  // Transform caixas for display
  const caixasLojas = caixas.slice(0, 5).map(c => ({
    loja: c.loja || `Loja ${c.n_loja}`,
    total: c.total || 0,
    status: c.entregue || "Pendente"
  }));

  // Aggregated box types
  const tiposCaixa = [
    { nome: "Benverde", valor: caixas.reduce((acc, c) => acc + (c.caixas_benverde || 0), 0) },
    { nome: "CCJ", valor: caixas.reduce((acc, c) => acc + (c.caixas_ccj || 0), 0) },
    { nome: "Bananas", valor: caixas.reduce((acc, c) => acc + (c.caixas_bananas || 0), 0) },
  ].filter(t => t.valor > 0);

  // Grouping by inferred category
  const movimentacao = categoriasProgresso(metas, faturamentoRows);

  let comparativoPrecos: Array<{ data: string; interno: number; mercado: number }> = [];
  let produtoComparativo = "-produto-";

  if (overview.dates && overview.dates.length > 0) {
    const latestDateKey = overview.dates[0].key;
    const latestSnapshot = overview.snapshots[latestDateKey] || [];
    
    const validProducts = latestSnapshot.filter(item => 
      item.prices["Semar"] !== null &&
      Object.keys(item.prices).some(k => k !== "Semar" && item.prices[k] !== null)
    );

    if (validProducts.length > 0) {
      const randomIndex = Math.floor(Math.random() * validProducts.length);
      const chosenProduct = validProducts[randomIndex].produto;
      produtoComparativo = chosenProduct;

      const historyDates = [...overview.dates].reverse();
      
      for (const d of historyDates) {
        const snap = overview.snapshots[d.key] || [];
        const prodData = snap.find(p => p.produto === chosenProduct);
        if (prodData && prodData.prices["Semar"] !== null) {
          const semarPrice = prodData.prices["Semar"] as number;
          const confPrices = Object.keys(prodData.prices)
            .filter(k => k !== "Semar" && prodData.prices[k] !== null)
            .map(k => prodData.prices[k] as number);

          const marketAvg = confPrices.length > 0 
            ? confPrices.reduce((a,b)=>a+b,0)/confPrices.length 
            : semarPrice;

          comparativoPrecos.push({
            data: d.label.substring(0, 5), // 'DD/MM/YYYY' -> 'DD/MM' or just use label
            interno: Number(semarPrice.toFixed(2)),
            mercado: Number(marketAvg.toFixed(2))
          });
        }
      }
    }
  }

  return {
    summary: {
      saldoEstoque: saldo,
      caixasDisponiveis,
      precoMedio,
      caixasRegistradas: caixas.length,
      precosRegistrados: precos.length,
      metasAtivas: metas.length,
      mediaEntrega,
      pedidosImportados: pedidosImportados.length,
    },
    metas,
    faturamento: faturamentoRows.map(r => ({
      produto: r.produto,
      quant: Number(r.quant),
      valor: Number(r.valor)
    })),
    comprasPorLoja: comprasRows.map(r => ({
      loja: r.loja,
      valor: Number(r.valor)
    })),
    caixasLojas,
    tiposCaixa,
    valorUnitario: unitRows.map(r => ({
      produto: r.produto,
      valor: Number(r.valor)
    })),
    movimentacao,
    comparativoPrecos,
    produtoComparativo,
  };
}

function categoriasProgresso(metas: DashboardMetaItem[], faturamento: any[]) {
  const cats = ["Frutas", "Legumes", "Verduras"];
  return cats.map(cat => ({
    categoria: cat,
    valor: faturamento
      .filter(f => inferDashboardCategory(f.produto) === cat)
      .reduce((acc, f) => acc + f.valor, 0)
  })).filter(c => c.valor > 0);
}
