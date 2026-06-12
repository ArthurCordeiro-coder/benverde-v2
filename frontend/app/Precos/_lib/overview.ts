// Transforms the real /api/precos/overview payload into the structures the
// ported design screens expect (products, flat rows, date options) and exposes
// price lookup helpers over the real data.
import { classify } from "./classify";
import type {
  DateOption,
  FlatRow,
  PriceOverview,
  Produto,
} from "./types";

// ---- formatting --------------------------------------------------------

export function fmtBRL(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Backend date keys are "DD-MM-YYYY".
export function keyToIso(key: string): string {
  const parts = key.split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // already ISO-ish or unknown — return as-is
  return key;
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function fmtDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.includes("-") && value.split("-")[0].length === 4 ? value : keyToIso(value);
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDateBRShort(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.includes("-") && value.split("-")[0].length === 4 ? value : keyToIso(value);
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthLabel(d: Date): string {
  return d
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

// ---- price helpers -----------------------------------------------------

export function lowestMarket(
  prices: Record<string, number | null>,
  exclude?: string,
): { market: string | null; price: number | null } {
  let best: string | null = null;
  let bestPrice = Infinity;
  for (const [m, p] of Object.entries(prices)) {
    if (exclude && m === exclude) continue;
    if (p !== null && Number.isFinite(p) && p < bestPrice) {
      best = m;
      bestPrice = p;
    }
  }
  return { market: best, price: best ? bestPrice : null };
}

// ---- derived dataset ---------------------------------------------------

export type OverviewData = {
  markets: string[];
  dates: DateOption[]; // ascending by date
  latestKey: string | null;
  produtos: Produto[]; // sorted by name
  flatRows: FlatRow[];
  pricesOn: (produto: string, dateKey: string) => Record<string, number | null>;
  averagePrices: (produto: string, isoFrom: string, isoTo: string) => Record<string, number | null>;
  productMean: (produto: string) => number | null;
};

export function buildOverviewData(raw: PriceOverview | null | undefined): OverviewData {
  const markets = raw?.markets?.length ? raw.markets : ["Semar"];
  const snapshots = raw?.snapshots ?? {};

  // Date options, parsed and sorted ascending.
  const dates: DateOption[] = (raw?.dates ?? [])
    .map((d) => {
      const iso = keyToIso(d.key);
      return { key: d.key, label: d.label, iso, date: isoToDate(iso) };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const latestKey = dates.length ? dates[dates.length - 1].key : raw?.latestDate ?? null;

  // Index: dateKey → produto → prices.
  const byDate = new Map<string, Map<string, Record<string, number | null>>>();
  const productNames = new Set<string>();
  for (const opt of dates) {
    const items = snapshots[opt.key] ?? [];
    const map = new Map<string, Record<string, number | null>>();
    for (const item of items) {
      const name = String(item.produto ?? "").trim();
      if (!name) continue;
      productNames.add(name);
      map.set(name, item.prices ?? {});
    }
    byDate.set(opt.key, map);
  }

  const pricesOn = (produto: string, dateKey: string): Record<string, number | null> => {
    return byDate.get(dateKey)?.get(produto) ?? {};
  };

  const averagePrices = (produto: string, isoFrom: string, isoTo: string): Record<string, number | null> => {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const m of markets) sums[m] = { total: 0, count: 0 };
    for (const opt of dates) {
      if (opt.iso < isoFrom || opt.iso > isoTo) continue;
      const prices = pricesOn(produto, opt.key);
      for (const m of markets) {
        const p = prices[m];
        if (typeof p === "number" && Number.isFinite(p) && p > 0) {
          sums[m].total += p;
          sums[m].count += 1;
        }
      }
    }
    const out: Record<string, number | null> = {};
    for (const m of markets) {
      out[m] = sums[m].count > 0 ? Number((sums[m].total / sums[m].count).toFixed(2)) : null;
    }
    return out;
  };

  // Per-product overall mean (all markets, all dates) — base for Δ vs. variação.
  const meanCache = new Map<string, number | null>();
  const productMean = (produto: string): number | null => {
    if (meanCache.has(produto)) return meanCache.get(produto) ?? null;
    let total = 0;
    let count = 0;
    for (const opt of dates) {
      const prices = pricesOn(produto, opt.key);
      for (const m of markets) {
        const p = prices[m];
        if (typeof p === "number" && Number.isFinite(p) && p > 0) {
          total += p;
          count += 1;
        }
      }
    }
    const mean = count > 0 ? Number((total / count).toFixed(2)) : null;
    meanCache.set(produto, mean);
    return mean;
  };

  const produtos: Produto[] = Array.from(productNames)
    .map((name) => {
      const c = classify(name);
      return {
        id: name,
        produto: name,
        categoria: c.categoria,
        unidade: c.unidade,
        art: c.art,
      };
    })
    .sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));

  const produtoMeta = new Map(produtos.map((p) => [p.produto, p]));

  // Flat rows: produto × data × concorrente (non-null prices only).
  const flatRows: FlatRow[] = [];
  for (const opt of dates) {
    const dayMap = byDate.get(opt.key);
    if (!dayMap) continue;
    for (const [produto, prices] of dayMap.entries()) {
      const meta = produtoMeta.get(produto);
      const best = lowestMarket(prices);
      const mean = productMean(produto);
      for (const m of markets) {
        const preco = prices[m];
        if (typeof preco !== "number" || !Number.isFinite(preco) || preco <= 0) continue;
        flatRows.push({
          id: `${produto}__${opt.key}__${m}`,
          data: opt.key,
          iso: opt.iso,
          produto,
          categoria: meta?.categoria ?? "Outros",
          unidade: meta?.unidade ?? "kg",
          concorrente: m,
          preco,
          melhorPreco: best.price,
          isBest: m === best.market,
          variacao: mean && mean > 0 ? ((preco - mean) / mean) * 100 : 0,
        });
      }
    }
  }

  return {
    markets,
    dates,
    latestKey,
    produtos,
    flatRows,
    pricesOn,
    averagePrices,
    productMean,
  };
}
