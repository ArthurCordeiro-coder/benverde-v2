"use client";

import api from "@/lib/api";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  Banana,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Tags,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PriceSnapshotItem = {
  produto?: string;
  prices?: Record<string, number | null>;
  statuses?: Record<string, string>;
  matches?: Record<string, string>;
};

type PriceDateOption = {
  key: string;
  label: string;
};

type PriceOverviewResponse = {
  dates?: PriceDateOption[];
  markets?: string[];
  snapshots?: Record<string, PriceSnapshotItem[]>;
};

type BaseRow = {
  produto: string;
  prices: Record<string, number | null>;
  statuses: Record<string, string>;
  matches: Record<string, string>;
  sampleCounts: Record<string, number>;
};

type DisplayRow = BaseRow & {
  minPrice: number | null;
  bestCompetitor: string | null;
  bestCompetitorPrice: number | null;
  averagePrice: number | null;
  semarGapPercent: number;
};

type SortDirection = "ascending" | "descending";

type SortConfig = {
  key: string;
  direction: SortDirection;
};

type RowStatus = {
  label: string;
  className: string;
  priority: number;
};

const GENERAL_KEY = "GERAL";
const STATUS_CLASSNAMES = {
  ganhando: "border border-green-500/20 bg-green-500/10 text-green-400",
  perdendo: "border border-red-500/20 bg-red-500/10 text-red-300",
  semCotacao: "border border-white/10 bg-white/5 text-gray-400",
} as const;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, current) => sum + current, 0);
  return Number((total / values.length).toFixed(2));
}

function enrichRow(baseRow: BaseRow): DisplayRow {
  const availableEntries = Object.entries(baseRow.prices).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
  );
  const minPrice = availableEntries.length > 0 ? Math.min(...availableEntries.map((entry) => entry[1])) : null;
  const semarPrice = baseRow.prices.Semar;
  const competitorEntries = availableEntries.filter((entry) => entry[0] !== "Semar");

  let bestCompetitor: string | null = null;
  let bestCompetitorPrice: number | null = null;
  if (competitorEntries.length > 0) {
    const best = competitorEntries.reduce((left, right) => (left[1] <= right[1] ? left : right));
    bestCompetitor = best[0];
    bestCompetitorPrice = best[1];
  }

  const averagePrice =
    availableEntries.length > 0
      ? Number((availableEntries.reduce((sum, entry) => sum + entry[1], 0) / availableEntries.length).toFixed(2))
      : null;

  const semarGapPercent =
    typeof semarPrice === "number" && minPrice !== null && semarPrice > minPrice
      ? ((semarPrice - minPrice) / minPrice) * 100
      : 0;

  return {
    ...baseRow,
    minPrice,
    bestCompetitor,
    bestCompetitorPrice,
    averagePrice,
    semarGapPercent,
  };
}

function getRowStatus(row: DisplayRow): RowStatus {
  const semarPrice = row.prices.Semar;

  if (semarPrice === null) {
    return {
      label: "Sem cotacao",
      className: STATUS_CLASSNAMES.semCotacao,
      priority: 2,
    };
  }

  if (row.bestCompetitorPrice === null || semarPrice <= row.bestCompetitorPrice) {
    return {
      label: "Ganhando",
      className: STATUS_CLASSNAMES.ganhando,
      priority: 0,
    };
  }

  return {
    label: "Perdendo",
    className: STATUS_CLASSNAMES.perdendo,
    priority: 1,
  };
}

function getSortIcon(sortConfig: SortConfig, key: string) {
  if (sortConfig.key !== key) {
    return <ChevronsUpDown size={14} className="opacity-30" />;
  }

  return sortConfig.direction === "ascending" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
}

function sortRows(rows: DisplayRow[], sortConfig: SortConfig): DisplayRow[] {
  const result = [...rows];

  result.sort((left, right) => {
    let comparison = 0;

    if (sortConfig.key === "produto") {
      comparison = left.produto.localeCompare(right.produto, "pt-BR");
    } else if (sortConfig.key === "status") {
      comparison = getRowStatus(left).priority - getRowStatus(right).priority;
    } else if (sortConfig.key === "media") {
      const safeLeft = left.averagePrice === null ? Number.POSITIVE_INFINITY : left.averagePrice;
      const safeRight = right.averagePrice === null ? Number.POSITIVE_INFINITY : right.averagePrice;
      comparison = safeLeft - safeRight;
    } else {
      const leftValue = left.prices[sortConfig.key];
      const rightValue = right.prices[sortConfig.key];
      const safeLeft = leftValue === null ? Number.POSITIVE_INFINITY : leftValue;
      const safeRight = rightValue === null ? Number.POSITIVE_INFINITY : rightValue;
      comparison = safeLeft - safeRight;
    }

    if (comparison === 0) {
      comparison = left.produto.localeCompare(right.produto, "pt-BR");
    }

    return sortConfig.direction === "ascending" ? comparison : -comparison;
  });

  return result;
}

export default function PrecosStandalonePage() {
  const [dateOptions, setDateOptions] = useState<PriceDateOption[]>([]);
  const [markets, setMarkets] = useState<string[]>(["Semar"]);
  const [snapshots, setSnapshots] = useState<Record<string, PriceSnapshotItem[]>>({});
  const [selectedDate, setSelectedDate] = useState(GENERAL_KEY);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyBananas, setOnlyBananas] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "produto",
    direction: "ascending",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadOverview = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await api.get<PriceOverviewResponse>("/api/precos/overview");
      const nextDates = Array.isArray(response.data?.dates) ? response.data.dates : [];
      const nextMarkets =
        Array.isArray(response.data?.markets) && response.data.markets.length > 0
          ? response.data.markets
          : ["Semar"];
      const nextSnapshots =
        response.data?.snapshots && typeof response.data.snapshots === "object"
          ? response.data.snapshots
          : {};

      setDateOptions(nextDates);
      setMarkets(nextMarkets);
      setSnapshots(nextSnapshots);
      setSelectedDate((current) => {
        if (current === GENERAL_KEY) {
          return GENERAL_KEY;
        }

        const availableKeys = new Set(nextDates.map((item) => item.key));
        return availableKeys.has(current) ? current : GENERAL_KEY;
      });
      setPageError("");
    } catch (error) {
      console.error("Erro ao carregar precos:", error);
      setPageError("Nao foi possivel carregar os dados de precos concorrentes.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview("initial");
  }, [loadOverview]);

  const normalizedSnapshots = useMemo(() => {
    const result: Record<string, DisplayRow[]> = {};

    for (const option of dateOptions) {
      const rawItems = Array.isArray(snapshots[option.key]) ? snapshots[option.key] : [];
      result[option.key] = rawItems
        .map((item) => {
          const product = String(item.produto ?? "").trim();
          const priceMap = item.prices ?? {};
          const statusMap = item.statuses ?? {};
          const matchMap = item.matches ?? {};

          const baseRow: BaseRow = {
            produto: product,
            prices: Object.fromEntries(
              markets.map((market) => {
                const rawValue = priceMap[market];
                const numericValue =
                  typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue > 0
                    ? Number(rawValue.toFixed(2))
                    : null;
                return [market, numericValue];
              }),
            ),
            statuses: Object.fromEntries(markets.map((market) => [market, String(statusMap[market] ?? "").trim()])),
            matches: Object.fromEntries(markets.map((market) => [market, String(matchMap[market] ?? "").trim()])),
            sampleCounts: Object.fromEntries(
              markets.map((market) => [
                market,
                typeof priceMap[market] === "number" && Number.isFinite(priceMap[market]) ? 1 : 0,
              ]),
            ),
          };

          return enrichRow(baseRow);
        })
        .filter((row) => row.produto);
    }

    return result;
  }, [dateOptions, markets, snapshots]);

  const generalRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        prices: Record<string, number[]>;
        statuses: Record<string, string>;
        matches: Record<string, string>;
      }
    >();

    for (const option of dateOptions) {
      const rows = normalizedSnapshots[option.key] ?? [];
      for (const row of rows) {
        const current = grouped.get(row.produto) ?? {
          prices: Object.fromEntries(markets.map((market) => [market, []])),
          statuses: {},
          matches: {},
        };

        for (const market of markets) {
          const price = row.prices[market];
          if (typeof price === "number") {
            current.prices[market].push(price);
          }
          if (!current.statuses[market] && row.statuses[market]) {
            current.statuses[market] = row.statuses[market];
          }
          if (!current.matches[market] && row.matches[market]) {
            current.matches[market] = row.matches[market];
          }
        }

        grouped.set(row.produto, current);
      }
    }

    return Array.from(grouped.entries())
      .map(([produto, current]) =>
        enrichRow({
          produto,
          prices: Object.fromEntries(markets.map((market) => [market, getAverage(current.prices[market] ?? [])])),
          statuses: Object.fromEntries(markets.map((market) => [market, current.statuses[market] ?? ""])),
          matches: Object.fromEntries(markets.map((market) => [market, current.matches[market] ?? ""])),
          sampleCounts: Object.fromEntries(markets.map((market) => [market, (current.prices[market] ?? []).length])),
        }),
      )
      .sort((left, right) => left.produto.localeCompare(right.produto, "pt-BR"));
  }, [dateOptions, markets, normalizedSnapshots]);

  const selectedRows = useMemo(() => {
    if (selectedDate === GENERAL_KEY) {
      return generalRows;
    }

    return normalizedSnapshots[selectedDate] ?? [];
  }, [generalRows, normalizedSnapshots, selectedDate]);

  const visibleRows = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    const filteredRows = selectedRows.filter((row) => {
      const matchesSearch = normalizedSearch ? normalizeText(row.produto).includes(normalizedSearch) : true;
      const matchesBanana = onlyBananas ? normalizeText(row.produto).includes("BANANA") : true;
      return matchesSearch && matchesBanana;
    });

    return sortRows(filteredRows, sortConfig);
  }, [onlyBananas, searchTerm, selectedRows, sortConfig]);

  const selectedDateLabel = useMemo(() => {
    if (selectedDate === GENERAL_KEY) {
      return "Media de todas";
    }

    return dateOptions.find((option) => option.key === selectedDate)?.label ?? selectedDate;
  }, [dateOptions, selectedDate]);

  const summary = useMemo(() => {
    const comparableRows = selectedRows.filter((row) => row.minPrice !== null);
    const semarWinning = comparableRows.filter((row) => getRowStatus(row).label === "Ganhando").length;
    const losingRows = comparableRows.filter((row) => getRowStatus(row).label === "Perdendo");
    const avgGap =
      losingRows.length > 0
        ? losingRows.reduce((sum, row) => sum + row.semarGapPercent, 0) / losingRows.length
        : 0;

    return {
      total: visibleRows.length,
      semarWinning,
      avgGap: avgGap.toFixed(1),
      bestCompetitor:
        losingRows
          .map((row) => row.bestCompetitor)
          .find((value): value is string => Boolean(value)) ?? "-",
    };
  }, [selectedRows, visibleRows]);

  const exportToExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      visibleRows.map((row) => ({
        Produto: row.produto,
        "Preco Semar": row.prices.Semar,
        "Melhor Concorrente": row.bestCompetitor,
        "Preco Concorrente": row.bestCompetitorPrice,
        Media: row.averagePrice,
        Status: getRowStatus(row).label,
      })),
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, "Precos");
    XLSX.writeFile(workbook, `precos-${selectedDate}.xlsx`);
  }, [selectedDate, visibleRows]);

  return (
    <section className="min-h-screen bg-[#07130d] px-4 py-6 text-gray-100 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10 text-green-400 shadow-inner">
              <Tags size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Tabela de Comparacao</h1>
              <p className="text-sm text-gray-400">Consulta isolada dos precos concorrentes.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadOverview("refresh")}
              disabled={isRefreshing}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-gray-400 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              title="Recarregar dados"
            >
              <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={exportToExcel}
              disabled={visibleRows.length === 0}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-300 transition-all hover:border-green-500/30 hover:bg-white/10 hover:text-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={18} />
              Exportar Excel
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-lg backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Data</p>
            <p className="mt-2 text-lg font-semibold text-white">{selectedDateLabel}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-lg backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Itens Visiveis</p>
            <p className="mt-2 text-lg font-semibold text-white">{summary.total}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-lg backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Semar Ganhando</p>
            <p className="mt-2 text-lg font-semibold text-green-400">{summary.semarWinning}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-lg backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Gap Medio</p>
            <p className="mt-2 text-lg font-semibold text-red-300">{summary.avgGap}%</p>
          </div>
        </div>

        {pageError ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle size={18} />
            {pageError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar produto..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-green-500/40"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Data da pesquisa
            </label>
            <select
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-transparent text-sm font-semibold text-white outline-none"
            >
              <option value={GENERAL_KEY} className="bg-[#0b1f15]">
                Media de todas
              </option>
              {dateOptions.map((option) => (
                <option key={option.key} value={option.key} className="bg-[#0b1f15]">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setOnlyBananas((current) => !current)}
            className={`flex items-center justify-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold transition-all ${
              onlyBananas
                ? "border-yellow-500/40 bg-yellow-500/20 text-yellow-200"
                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            }`}
          >
            <Banana size={18} className={onlyBananas ? "animate-bounce" : ""} />
            So Bananas
          </button>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gradient-to-r from-[#0f5922] to-[#0a3d17] text-white">
                <tr>
                  <th className="min-w-[240px] border-r border-white/5 p-5">
                    <button
                      type="button"
                      onClick={() =>
                        setSortConfig((current) => ({
                          key: "produto",
                          direction:
                            current.key === "produto" && current.direction === "ascending"
                              ? "descending"
                              : "ascending",
                        }))
                      }
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      Produto
                      {getSortIcon(sortConfig, "produto")}
                    </button>
                  </th>
                  <th className="border-r border-white/5 p-5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setSortConfig((current) => ({
                          key: "Semar",
                          direction:
                            current.key === "Semar" && current.direction === "ascending"
                              ? "descending"
                              : "ascending",
                        }))
                      }
                      className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      Preco Semar
                      {getSortIcon(sortConfig, "Semar")}
                    </button>
                  </th>
                  <th className="border-r border-white/5 p-5 text-[10px] font-black uppercase tracking-widest">
                    Melhor Concorrente
                  </th>
                  <th className="border-r border-white/5 p-5 text-right text-[10px] font-black uppercase tracking-widest">
                    Preco Concorrente
                  </th>
                  <th className="border-r border-white/5 p-5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setSortConfig((current) => ({
                          key: "media",
                          direction:
                            current.key === "media" && current.direction === "ascending"
                              ? "descending"
                              : "ascending",
                        }))
                      }
                      className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      Media
                      {getSortIcon(sortConfig, "media")}
                    </button>
                  </th>
                  <th className="p-5">
                    <button
                      type="button"
                      onClick={() =>
                        setSortConfig((current) => ({
                          key: "status",
                          direction:
                            current.key === "status" && current.direction === "ascending"
                              ? "descending"
                              : "ascending",
                        }))
                      }
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      Status
                      {getSortIcon(sortConfig, "status")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-green-500" size={36} />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">
                          Consultando base de dados...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-gray-500">
                      Nenhum registro encontrado para esse filtro.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const rowStatus = getRowStatus(row);
                    const isBanana = normalizeText(row.produto).includes("BANANA");

                    return (
                      <tr
                        key={`${selectedDate}-${row.produto}`}
                        className={`transition-colors ${
                          isBanana
                            ? "bg-yellow-500/[0.03] hover:bg-yellow-500/[0.06]"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="border-r border-white/5 p-5 font-medium">
                          <div className="flex items-center gap-3">
                            {isBanana ? <Banana size={14} className="text-yellow-400" /> : null}
                            <span className={isBanana ? "text-yellow-50" : "text-white"}>{row.produto}</span>
                          </div>
                        </td>
                        <td className="border-r border-white/5 p-5 text-right tabular-nums">
                          <span className="font-medium text-white">{formatCurrency(row.prices.Semar)}</span>
                        </td>
                        <td className="border-r border-white/5 p-5 text-gray-300">
                          {row.bestCompetitor ?? <span className="text-gray-500">-</span>}
                        </td>
                        <td className="border-r border-white/5 p-5 text-right tabular-nums">
                          <span
                            className={
                              row.prices.Semar !== null &&
                              row.bestCompetitorPrice !== null &&
                              row.bestCompetitorPrice < row.prices.Semar
                                ? "font-medium text-red-400"
                                : "text-white"
                            }
                          >
                            {formatCurrency(row.bestCompetitorPrice)}
                          </span>
                        </td>
                        <td className="border-r border-white/5 p-5 text-right tabular-nums text-gray-300">
                          {formatCurrency(row.averagePrice)}
                        </td>
                        <td className="p-5">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase ${rowStatus.className}`}
                          >
                            {rowStatus.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs text-gray-400">
              Melhor concorrente atual: <span className="font-semibold text-white">{summary.bestCompetitor}</span>
            </p>

            <div className="flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                Ganhando
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                Perdendo
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                Sem cotacao
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
