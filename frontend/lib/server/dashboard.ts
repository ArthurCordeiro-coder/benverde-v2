import "server-only";

import { badRequest } from "@/lib/server/errors";
import { execute, queryRows } from "@/lib/server/db";
import { getCaixas } from "@/lib/server/caixas";
import { getSaldoEstoque } from "@/lib/server/estoque";
import { listPrecosConsolidados } from "@/lib/server/precos";
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

export async function fetchPedidosImportados(): Promise<Array<Record<string, unknown>>> {
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT key, payload
     FROM pedidos_importados
     WHERE payload IS NOT NULL
     ORDER BY updated_at ASC NULLS LAST, key ASC`,
  );

  const registros: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const key = String(row.key ?? "");
    const payload = row.payload;
    if (key === "default" && Array.isArray(payload)) {
      payload.forEach((item) => {
        if (item && typeof item === "object") {
          registros.push(item as Record<string, unknown>);
        }
      });
      continue;
    }

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      registros.push(payload as Record<string, unknown>);
    }
  }

  return registros;
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

function metaMatchesProduct(metaName: string, importedProduct: string): boolean {
  if (!metaName || !importedProduct) {
    return false;
  }
  if (metaName === importedProduct) {
    return true;
  }
  if (importedProduct.startsWith(`${metaName} `)) {
    return true;
  }
  if (` ${importedProduct} `.includes(` ${metaName} `)) {
    return true;
  }
  return metaName.startsWith(`${importedProduct} `);
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

    const normalizedProduct = normalizeText(produto);
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
  const targets = [...baseItems]
    .map((item) => [item.normalized, item.produto] as const)
    .sort((left, right) => right[0].length - left[0].length);

  const pedidosImportados = await fetchPedidosImportados();
  for (const pedidoImportado of pedidosImportados) {
    const normalizedProduct = normalizeText(
      pedidoImportado.Produto ?? pedidoImportado.produto ?? "",
    );
    const quantity = Number(pedidoImportado.QUANT ?? pedidoImportado.quant ?? 0);
    if (!normalizedProduct || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const matchedMeta = targets.find(([normalizedMeta]) =>
      metaMatchesProduct(normalizedMeta, normalizedProduct),
    )?.[0];
    if (!matchedMeta) {
      continue;
    }

    aggregatedOrders[matchedMeta] += quantity;
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
}> {
  const [{ saldo }, caixas, precos, metas, pedidosImportados] = await Promise.all([
    getSaldoEstoque(),
    getCaixas(),
    listPrecosConsolidados(),
    buildDashboardMetaItems(),
    fetchPedidosImportados(),
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
  };
}
