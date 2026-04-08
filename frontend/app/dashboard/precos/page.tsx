"use client";

import api from "@/lib/api";
import {
  asArray,
  coerceNumber,
  coerceString,
  getApiErrorMessage,
  isRecord,
  normalizeDashboardText,
} from "@/lib/dashboard/client";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertCircle,
  Banana,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Leaf,
  Loader2,
  MessageCircleMore,
  RefreshCw,
  Search,
  SendHorizonal,
  Sparkles,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  latestDate?: string | null;
  dates?: PriceDateOption[];
  markets?: string[];
  snapshots?: Record<string, PriceSnapshotItem[]>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MitaResponse = {
  answer?: string;
  history?: ChatMessage[];
};

type BaseRow = {
  produto: string;
  prices: Record<string, number | null>;
  statuses: Record<string, string>;
  matches: Record<string, string>;
  sampleCounts: Record<string, number>;
};

type DisplayRow = BaseRow & {
  leaderMarkets: string[];
  minPrice: number | null;
  maxPrice: number | null;
  semarGapPercent: number;
  bestCompetitor: string | null;
  bestCompetitorPrice: number | null;
  averagePrice: number | null;
};

type SortDirection = "ascending" | "descending";

type SortConfig = {
  key: string;
  direction: SortDirection;
};

type StatTrend = "up" | "down" | "neutral";

type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend: StatTrend;
};

type RowStatus = {
  label: string;
  className: string;
  priority: number;
};

const GENERAL_KEY = "GERAL";
const QUICK_QUESTIONS = [
  "Qual concorrente está com o preço mais agressivo hoje?",
  "Quais produtos o Semar está perdendo em preço?",
  "Compare o preço das bananas entre as lojas e sugira uma mudança.",
];
const MARKET_BAR_CLASSES = [
  "bg-emerald-500/80",
  "bg-yellow-500/80",
  "bg-orange-500/80",
  "bg-sky-500/80",
  "bg-fuchsia-500/80",
];
const MARKET_TEXT_CLASSES = [
  "text-emerald-300",
  "text-yellow-300",
  "text-orange-300",
  "text-sky-300",
  "text-fuchsia-300",
];
const MARKET_DOT_CLASSES = [
  "bg-emerald-500/80",
  "bg-yellow-500/80",
  "bg-orange-500/80",
  "bg-sky-500/80",
  "bg-fuchsia-500/80",
];
const STATUS_CLASSNAMES = {
  ganhando: "border border-green-500/20 bg-green-500/10 text-green-400",
  perdendo: "border border-red-500/20 bg-red-500/10 text-red-300",
  semCotacao: "border border-white/10 bg-white/5 text-gray-400",
} as const;

function GlassCard({ title, value, subtitle, icon, trend }: GlassCardProps) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-3 shadow-inner">{icon}</div>
        {trend === "up" ? <TrendingUp size={20} className="text-green-400" /> : null}
        {trend === "down" ? <TrendingDown size={20} className="text-red-400" /> : null}
        {trend === "neutral" ? <Activity size={20} className="text-blue-400" /> : null}
      </div>
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
        <h3 className="mb-2 text-3xl font-bold tracking-tight text-white">{value}</h3>
        <p className="text-xs font-medium text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

function normalizeText(value: string): string {
  return normalizeDashboardText(value);
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

function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

function getAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, current) => sum + current, 0);
  return Number((total / values.length).toFixed(2));
}

function bubbleClass(role: ChatMessage["role"]) {
  return role === "assistant"
    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-50 shadow-sm"
    : "border border-white/10 bg-white/10 text-white";
}

function sanitizeDateOption(raw: unknown): PriceDateOption | null {
  if (!isRecord(raw)) {
    return null;
  }

  const key = coerceString(raw.key).trim();
  if (!key) {
    return null;
  }

  return {
    key,
    label: coerceString(raw.label).trim() || key,
  };
}

function sanitizeStringMap(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw)
      .map(([key, value]) => [key, coerceString(value).trim()])
      .filter((entry) => entry[1] !== ""),
  );
}

function sanitizePriceMap(raw: unknown): Record<string, number | null> {
  if (!isRecord(raw)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => {
      const numericValue = coerceNumber(value, Number.NaN);
      return [
        key,
        Number.isFinite(numericValue) && numericValue > 0
          ? Number(numericValue.toFixed(2))
          : null,
      ];
    }),
  );
}

function sanitizeSnapshotItem(raw: unknown): PriceSnapshotItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const produto = coerceString(raw.produto).trim();
  if (!produto) {
    return null;
  }

  return {
    produto,
    prices: sanitizePriceMap(raw.prices),
    statuses: sanitizeStringMap(raw.statuses),
    matches: sanitizeStringMap(raw.matches),
  };
}

function sanitizeSnapshots(raw: unknown): Record<string, PriceSnapshotItem[]> {
  if (!isRecord(raw)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      asArray(value)
        .map(sanitizeSnapshotItem)
        .filter((item): item is PriceSnapshotItem => item !== null),
    ]),
  );
}

function enrichRow(baseRow: BaseRow): DisplayRow {
  const availableEntries = Object.entries(baseRow.prices).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
  );
  const minPrice = availableEntries.length > 0 ? Math.min(...availableEntries.map((entry) => entry[1])) : null;
  const maxPrice = availableEntries.length > 0 ? Math.max(...availableEntries.map((entry) => entry[1])) : null;
  const leaderMarkets =
    minPrice === null
      ? []
      : availableEntries.filter((entry) => entry[1] === minPrice).map((entry) => entry[0]);
  const semarPrice = baseRow.prices.Semar;
  const semarGapPercent =
    typeof semarPrice === "number" && minPrice !== null && semarPrice > minPrice
      ? ((semarPrice - minPrice) / minPrice) * 100
      : 0;

  // Best competitor (excluding Semar)
  const competitorEntries = availableEntries.filter((entry) => entry[0] !== "Semar");
  let bestCompetitor: string | null = null;
  let bestCompetitorPrice: number | null = null;
  if (competitorEntries.length > 0) {
    const best = competitorEntries.reduce((a, b) => (a[1] <= b[1] ? a : b));
    bestCompetitor = best[0];
    bestCompetitorPrice = best[1];
  }

  // Average of all available prices
  const averagePrice =
    availableEntries.length > 0
      ? Number((availableEntries.reduce((sum, e) => sum + e[1], 0) / availableEntries.length).toFixed(2))
      : null;

  return {
    ...baseRow,
    leaderMarkets,
    minPrice,
    maxPrice,
    semarGapPercent,
    bestCompetitor,
    bestCompetitorPrice,
    averagePrice,
  };
}

function getRowStatus(row: DisplayRow): RowStatus {
  const semarPrice = row.prices.Semar;
  if (semarPrice === null) {
    return {
      label: "Sem cotação",
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
  return sortConfig.direction === "ascending" ? (
    <ChevronUp size={14} />
  ) : (
    <ChevronDown size={14} />
  );
}

function sortRows(rows: DisplayRow[], sortConfig: SortConfig): DisplayRow[] {
  const result = [...rows];
  result.sort((left, right) => {
    let comparison = 0;

    if (sortConfig.key === "produto") {
      comparison = left.produto.localeCompare(right.produto);
    } else if (sortConfig.key === "status") {
      comparison = getRowStatus(left).priority - getRowStatus(right).priority;
    } else if (sortConfig.key === "gap") {
      comparison = left.semarGapPercent - right.semarGapPercent;
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
      comparison = left.produto.localeCompare(right.produto);
    }

    return sortConfig.direction === "ascending" ? comparison : -comparison;
  });
  return result;
}

export default function PrecosPage() {
  const mitaEndpoint = "/api/mita-ai/chat";

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

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMitaTyping, setIsMitaTyping] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [showHeaderMitaMenu, setShowHeaderMitaMenu] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const headerMitaRef = useRef<HTMLDivElement | null>(null);
  const tableSectionRef = useRef<HTMLDivElement | null>(null);
  const chartSectionRef = useRef<HTMLDivElement | null>(null);

  const loadOverview = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await api.get<PriceOverviewResponse>("/api/precos/overview");
      const payload = isRecord(response.data) ? response.data : {};
      const nextDates = asArray(payload.dates)
        .map(sanitizeDateOption)
        .filter((item): item is PriceDateOption => item !== null);
      const nextMarkets = asArray(payload.markets)
        .map((market) => coerceString(market).trim())
        .filter(Boolean);
      const nextSnapshots = sanitizeSnapshots(payload.snapshots);

      setDateOptions(nextDates);
      setMarkets(nextMarkets.length > 0 ? nextMarkets : ["Semar"]);
      setSnapshots(nextSnapshots);
      setSelectedDate((current) => {
        if (current === GENERAL_KEY) {
          return GENERAL_KEY;
        }
        const available = new Set(nextDates.map((item) => item.key));
        return available.has(current) ? current : GENERAL_KEY;
      });
      setPageError("");
    } catch (error) {
      console.error("Erro ao carregar precos:", error);
      setPageError(
        getApiErrorMessage(error, "Não foi possível carregar os dados de preços concorrentes."),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview("initial");
  }, [loadOverview]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isMitaTyping]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerMitaRef.current && !headerMitaRef.current.contains(event.target as Node)) {
        setShowHeaderMitaMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            statuses: Object.fromEntries(
              markets.map((market) => [market, String(statusMap[market] ?? "").trim()]),
            ),
            matches: Object.fromEntries(
              markets.map((market) => [market, String(matchMap[market] ?? "").trim()]),
            ),
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
          prices: Object.fromEntries(
            markets.map((market) => [market, getAverage(current.prices[market] ?? [])]),
          ),
          statuses: Object.fromEntries(
            markets.map((market) => [market, current.statuses[market] ?? ""]),
          ),
          matches: Object.fromEntries(
            markets.map((market) => [market, current.matches[market] ?? ""]),
          ),
          sampleCounts: Object.fromEntries(
            markets.map((market) => [market, (current.prices[market] ?? []).length]),
          ),
        }),
      )
      .sort((left, right) => left.produto.localeCompare(right.produto));
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
      const matchesSearch = normalizedSearch
        ? normalizeText(row.produto).includes(normalizedSearch)
        : true;
      const matchesBanana = onlyBananas ? normalizeText(row.produto).includes("BANANA") : true;
      return matchesSearch && matchesBanana;
    });
    return sortRows(filteredRows, sortConfig);
  }, [onlyBananas, searchTerm, selectedRows, sortConfig]);

  const competitorMarkets = useMemo(
    () => markets.filter((market) => market !== "Semar"),
    [markets],
  );

  const selectedDateLabel = useMemo(() => {
    if (selectedDate === GENERAL_KEY) {
      return "Média geral";
    }
    return dateOptions.find((option) => option.key === selectedDate)?.label ?? selectedDate;
  }, [dateOptions, selectedDate]);

  const stats = useMemo(() => {
    const comparableRows = selectedRows.filter((row) => row.minPrice !== null);
    if (comparableRows.length === 0) {
      return {
        winPerc: "0%",
        competitor: "-",
        competitorPerc: "0%",
        variationText: "0.0%",
        trend: "neutral" as StatTrend,
      };
    }

    const semarWins = comparableRows.filter((row) => row.leaderMarkets.includes("Semar")).length;
    const competitorWins = new Map<string, number>();
    for (const row of comparableRows) {
      const leaders = row.leaderMarkets.filter((market) => market !== "Semar");
      if (leaders.length === 0) {
        continue;
      }

      const share = 1 / leaders.length;
      for (const market of leaders) {
        competitorWins.set(market, (competitorWins.get(market) ?? 0) + share);
      }
    }

    const bestCompetitorEntry =
      Array.from(competitorWins.entries()).sort((left, right) => right[1] - left[1])[0] ??
      (competitorMarkets[0] ? [competitorMarkets[0], 0] : ["-", 0]);

    let variationText = "0.0%";
    let trend: StatTrend = "neutral";

    if (dateOptions.length >= 2) {
      const latestRows = normalizedSnapshots[dateOptions[0].key] ?? [];
      const previousRows = normalizedSnapshots[dateOptions[1].key] ?? [];
      const latestAverage = getAverage(
        latestRows
          .map((row) => row.prices.Semar)
          .filter((value): value is number => typeof value === "number"),
      );
      const previousAverage = getAverage(
        previousRows
          .map((row) => row.prices.Semar)
          .filter((value): value is number => typeof value === "number"),
      );

      if (latestAverage !== null && previousAverage !== null && previousAverage > 0) {
        const diff = ((latestAverage - previousAverage) / previousAverage) * 100;
        variationText = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
        trend = diff > 0.05 ? "up" : diff < -0.05 ? "down" : "neutral";
      }
    }

    return {
      winPerc: formatPercent((semarWins / comparableRows.length) * 100, 0),
      competitor: String(bestCompetitorEntry[0] ?? "-"),
      competitorPerc: formatPercent((Number(bestCompetitorEntry[1]) / comparableRows.length) * 100, 0),
      variationText,
      trend,
    };
  }, [competitorMarkets, dateOptions, normalizedSnapshots, selectedRows]);

  const bananaRows = useMemo(
    () => selectedRows.filter((row) => normalizeText(row.produto).includes("BANANA")),
    [selectedRows],
  );

  const chartMarkets = useMemo(
    () =>
      markets.filter((market) =>
        bananaRows.some((row) => typeof row.prices[market] === "number"),
      ),
    [bananaRows, markets],
  );

  const maxPriceForChart = useMemo(() => {
    const values = bananaRows.flatMap((row) =>
      chartMarkets.map((market) => row.prices[market] ?? 0),
    );
    return Math.max(...values, 1);
  }, [bananaRows, chartMarkets]);

  const marketVisuals = useMemo(
    () =>
      Object.fromEntries(
        markets.map((market, index) => [
          market,
          {
            barClass: MARKET_BAR_CLASSES[index % MARKET_BAR_CLASSES.length],
            textClass: MARKET_TEXT_CLASSES[index % MARKET_TEXT_CLASSES.length],
            dotClass: MARKET_DOT_CLASSES[index % MARKET_DOT_CLASSES.length],
          },
        ]),
      ) as Record<string, { barClass: string; textClass: string; dotClass: string }>,
    [markets],
  );

  const exportRows = useMemo(
    () =>
      visibleRows.map((row) => ({
        Produto: row.produto,
        "Preço Semar": row.prices.Semar ?? "",
        "Melhor Concorrente": row.bestCompetitor ?? "",
        "Preço Concorrente": row.bestCompetitorPrice ?? "",
        Média: row.averagePrice ?? "",
        Status: getRowStatus(row).label,
      })),
    [visibleRows],
  );

  const exportTable = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Preços Concorrentes");
    XLSX.writeFile(
      workbook,
      `precos-concorrentes-${selectedDate === GENERAL_KEY ? "geral" : selectedDate}.xlsx`,
    );
  };

  const exportGraph = async () => {
    if (!chartSectionRef.current) {
      return;
    }

    const canvas = await html2canvas(chartSectionRef.current, {
      backgroundColor: "#07130d",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = `grafico-precos-banana-${selectedDate === GENERAL_KEY ? "geral" : selectedDate}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const buildFallbackMitaResponse = useCallback(
    (question: string) => {
      const normalizedQuestion = normalizeText(question);
      const lossRows = selectedRows
        .filter(
          (row) =>
            typeof row.prices.Semar === "number" &&
            row.minPrice !== null &&
            !row.leaderMarkets.includes("Semar"),
        )
        .sort((left, right) => right.semarGapPercent - left.semarGapPercent);
      const bananaLossRows = lossRows.filter((row) =>
        normalizeText(row.produto).includes("BANANA"),
      );

      if (normalizedQuestion.includes("AGRESSIVO") || normalizedQuestion.includes("CONCORRENTE")) {
        return `Hoje o concorrente mais agressivo em ${selectedDateLabel.toLowerCase()} é ${stats.competitor}, liderando em ${stats.competitorPerc} dos itens comparáveis. A liderança do Semar está em ${stats.winPerc}.`;
      }

      if (
        normalizedQuestion.includes("PERDENDO") ||
        normalizedQuestion.includes("BAIXAR") ||
        normalizedQuestion.includes("PRECO")
      ) {
        if (lossRows.length === 0) {
          return `No recorte atual de ${selectedDateLabel.toLowerCase()}, o Semar não aparece atrasado em nenhum item com preço comparável.`;
        }
        return `Os maiores gaps do Semar estão em ${lossRows
          .slice(0, 3)
          .map((row) => `${row.produto} (${row.semarGapPercent.toFixed(0)}% acima do líder)`)
          .join(", ")}. Esses são os primeiros candidatos para ajuste.`;
      }

      if (normalizedQuestion.includes("BANANA")) {
        if (bananaLossRows.length === 0 && bananaRows.length > 0) {
          return `Nas bananas, o Semar está competitivo no recorte atual. A melhor oportunidade agora é sustentar margem sem perder a liderança.`;
        }
        if (bananaLossRows.length === 0) {
          return `Não encontrei itens de banana na base atual de ${selectedDateLabel.toLowerCase()}.`;
        }
        const topBanana = bananaLossRows[0];
        const leader = topBanana.leaderMarkets.find((market) => market !== "Semar") ?? stats.competitor;
        return `Em bananas, o principal ajuste está em ${topBanana.produto}, onde ${leader} lidera o preço e o Semar está ${topBanana.semarGapPercent.toFixed(0)}% acima do menor valor.`;
      }

      if (
        normalizedQuestion.includes("RELATORIO") ||
        normalizedQuestion.includes("ANALISE") ||
        normalizedQuestion.includes("ESTRATEG")
      ) {
        const firstGap = lossRows[0];
        return `Resumo estratégico: o Semar lidera em ${stats.winPerc} dos itens comparáveis. O maior risco competitivo hoje é ${stats.competitor}. ${firstGap ? `A principal oportunidade de ajuste está em ${firstGap.produto}.` : "Não há um gap crítico evidente no recorte atual."} A variação recente da cesta Semar está em ${stats.variationText}.`;
      }

      return `Consigo comparar o Semar com ${competitorMarkets.join(", ") || "os concorrentes"} em ${selectedDateLabel.toLowerCase()}, apontar perdas de preço e priorizar ajustes por produto.`;
    },
    [bananaRows, competitorMarkets, selectedDateLabel, selectedRows, stats],
  );

  const sendMitaMessage = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || isMitaTyping) {
        return;
      }

      setIsChatOpen(true);
      setShowHeaderMitaMenu(false);
      setCurrentInput("");

      const previousMessages = [...chatMessages];
      const optimisticMessages = [...previousMessages, { role: "user" as const, content: question }];
      setChatMessages(optimisticMessages);
      setIsMitaTyping(true);

      try {
        const response = await api.post<MitaResponse>(mitaEndpoint, {
          message: question,
          history: previousMessages,
          scope: "precos",
        });

        const payload = isRecord(response.data) ? response.data : {};
        const history = asArray(payload.history).filter(
          (item): item is ChatMessage =>
            isRecord(item) &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string",
        );

        if (history.length > 0) {
          setChatMessages(history);
        } else {
          const answer = coerceString(payload.answer).trim() || buildFallbackMitaResponse(question);
          setChatMessages([...optimisticMessages, { role: "assistant", content: answer }]);
        }
      } catch (error) {
        console.error("Erro ao consultar Mita AI, usando resposta local:", error);
        setChatMessages([
          ...optimisticMessages,
          { role: "assistant", content: buildFallbackMitaResponse(question) },
        ]);
      } finally {
        setIsMitaTyping(false);
      }
    },
    [buildFallbackMitaResponse, chatMessages, isMitaTyping, mitaEndpoint],
  );

  const generateAIReport = () => {
    void sendMitaMessage(
      "Faça uma análise estratégica completa da nossa competitividade atual. Quem é nosso maior risco? Em quais produtos devemos baixar o preço?",
    );
  };

  const insightText = useMemo(() => {
    const biggestGapRow = selectedRows
      .filter((row) => row.semarGapPercent > 0)
      .sort((left, right) => right.semarGapPercent - left.semarGapPercent)[0];

    if (!biggestGapRow) {
      return `No recorte atual de ${selectedDateLabel.toLowerCase()}, o Semar sustenta boa competitividade. Vale proteger margem e manter monitoramento contínuo da cesta.`;
    }

    const leader =
      biggestGapRow.leaderMarkets.find((market) => market !== "Semar") ?? stats.competitor;
    return `Detectamos pressão competitiva em ${biggestGapRow.produto}. ${leader} lidera esse item e o Semar está ${biggestGapRow.semarGapPercent.toFixed(0)}% acima do menor preço disponível.`;
  }, [selectedDateLabel, selectedRows, stats.competitor]);

  const selectedDateOptions = useMemo(
    () => [{ key: GENERAL_KEY, label: "Média de todas" }, ...dateOptions],
    [dateOptions],
  );

  return (
    <section className="mx-auto max-w-7xl space-y-8 pb-24 text-gray-100">
      <header className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-tr from-green-500 to-emerald-300 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a1f12]">
              <Leaf size={20} className="text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              Mita AI Ativa
              <Sparkles size={18} className="text-yellow-400" />
            </h2>
            <p className="text-sm text-gray-400">
              Pronta para analisar dados reais e sugerir estratégias.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <button
            type="button"
            onClick={generateAIReport}
            disabled={isLoading || selectedRows.length === 0}
            className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-2.5 text-sm font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <BrainCircuit size={16} />
            Relatório Estratégico
          </button>
          <button
            type="button"
            onClick={() => void loadOverview("refresh")}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </header>

      {pageError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GlassCard
          title="Semar Ganhando"
          value={isLoading ? "Carregando..." : stats.winPerc}
          subtitle="Produtos com menor preço."
          icon={<Zap className="text-yellow-400" size={24} />}
          trend="up"
        />
        <GlassCard
          title="Melhor Competidor"
          value={isLoading ? "Carregando..." : stats.competitor}
          subtitle={`Líder em ${stats.competitorPerc} dos itens.`}
          icon={<Target className="text-blue-400" size={24} />}
          trend="neutral"
        />
        <GlassCard
          title="Variação Recente"
          value={isLoading ? "Carregando..." : stats.variationText}
          subtitle="Inflação média da cesta Semar."
          icon={<Activity className="text-emerald-400" size={24} />}
          trend={stats.trend}
        />
      </div>

      <section className="space-y-6 pb-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-green-400 shadow-inner">
              <Tags size={24} />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">Tabela de Comparação</h3>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row">
            <div className="relative flex" ref={headerMitaRef}>
              <button
                type="button"
                onClick={() => setShowHeaderMitaMenu((current) => !current)}
                className="flex h-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-green-400"
              >
                <MessageCircleMore size={18} />
                Perguntar a Mita
              </button>

              {showHeaderMitaMenu ? (
                <div className="absolute left-0 top-full z-[60] mt-2 w-72 overflow-hidden rounded-2xl border border-white/15 bg-[#0b1f15]/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
                  <div className="py-2">
                    {QUICK_QUESTIONS.map((question, index) => {
                      const icons: LucideIcon[] = [Zap, TrendingDown, Banana];
                      const Icon = icons[index] ?? MessageCircleMore;
                      const accentClass =
                        index === 0
                          ? "text-yellow-400"
                          : index === 1
                            ? "text-red-400"
                            : "text-yellow-400";

                      return (
                        <button
                          key={question}
                          type="button"
                          onClick={() => void sendMitaMessage(question)}
                          className="flex w-full items-center gap-2 border-b border-white/5 px-4 py-3 text-left text-[11px] text-gray-300 transition-colors last:border-0 hover:bg-white/5 hover:text-green-400"
                        >
                          <Icon size={14} className={accentClass} />
                          {question}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
              <div className="flex flex-col">
                <label className="mb-1 px-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                  Data da Pesquisa
                </label>
                <select
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="cursor-pointer bg-transparent pr-4 text-sm font-bold text-white outline-none"
                >
                  {selectedDateOptions.map((option) => (
                    <option key={option.key} value={option.key} className="bg-[#0b1f15]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="group relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-green-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-sm text-white outline-none transition-all focus:border-green-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyBananas((current) => !current)}
            className={`flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm font-bold transition-all ${
              onlyBananas
                ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <Banana size={18} />
            Só Bananas
          </button>
        </div>

        <div
          ref={tableSectionRef}
          className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-md"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f5922] text-white">
                <tr>
                  <th className="border-r border-white/5 p-5 text-[10px] font-bold uppercase tracking-widest">
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
                      className="flex items-center gap-1"
                    >
                      Produto
                      {getSortIcon(sortConfig, "produto")}
                    </button>
                  </th>
                  <th className="border-r border-white/5 p-5 text-right text-[10px] font-bold uppercase tracking-widest">
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
                      className="ml-auto flex items-center gap-1"
                    >
                      Preço Semar
                      {getSortIcon(sortConfig, "Semar")}
                    </button>
                  </th>
                  <th className="border-r border-white/5 p-5 text-[10px] font-bold uppercase tracking-widest">
                    Melhor Concorrente
                  </th>
                  <th className="border-r border-white/5 p-5 text-right text-[10px] font-bold uppercase tracking-widest">
                    Preço Concorrente
                  </th>
                  <th className="border-r border-white/5 p-5 text-right text-[10px] font-bold uppercase tracking-widest">
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
                      className="ml-auto flex items-center gap-1"
                    >
                      Média
                      {getSortIcon(sortConfig, "media")}
                    </button>
                  </th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest">
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
                      className="flex items-center gap-1"
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
                    <td colSpan={6} className="p-5 text-gray-400">
                      Carregando preços...
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-5 text-gray-400">
                      Nenhum produto encontrado para esse filtro.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const rowStatus = getRowStatus(row);
                    const isBanana = normalizeText(row.produto).includes("BANANA");

                    return (
                      <tr
                        key={`${selectedDate}-${row.produto}`}
                        className={`group transition-colors ${
                          isBanana
                            ? "bg-yellow-500/[0.03] hover:bg-yellow-500/[0.06]"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="border-r border-white/5 p-5 font-medium">
                          <div className="flex items-center gap-3">
                            {isBanana ? (
                              <Banana size={14} className="animate-pulse text-yellow-400" />
                            ) : null}
                            <p className={isBanana ? "text-yellow-50" : "text-white"}>
                              {row.produto}
                            </p>
                          </div>
                        </td>

                        <td className="border-r border-white/5 p-5 text-right tabular-nums">
                          {row.prices.Semar !== null ? (
                            <span className="font-medium text-white">
                              {formatCurrency(row.prices.Semar)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        <td className="border-r border-white/5 p-5">
                          {row.bestCompetitor ? (
                            <span className="text-sm text-white">{row.bestCompetitor}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        <td className="border-r border-white/5 p-5 text-right tabular-nums">
                          {row.bestCompetitorPrice !== null ? (
                            <span className={
                              row.prices.Semar !== null && row.bestCompetitorPrice < row.prices.Semar
                                ? "font-medium text-red-400"
                                : "text-white"
                            }>
                              {formatCurrency(row.bestCompetitorPrice)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        <td className="border-r border-white/5 p-5 text-right tabular-nums">
                          {row.averagePrice !== null ? (
                            <span className="text-gray-300">
                              {formatCurrency(row.averagePrice)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        <td className="p-5">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${rowStatus.className}`}
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
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={exportTable}
                disabled={visibleRows.length === 0}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-all hover:bg-white/10 hover:text-green-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={14} />
                Exportar Tabela
              </button>
            </div>

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
                Sem cotação
              </div>
            </div>
          </div>
        </div>

        <div
          ref={chartSectionRef}
          className="rounded-[32px] border border-white/10 bg-white/[0.02] p-8 shadow-xl backdrop-blur-md"
        >
          <h3 className="mb-12 flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-white">
            <BarChart3 size={18} className="text-green-400" />
            Variação de Preço Médio - Bananas
          </h3>

          {bananaRows.length === 0 || chartMarkets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-400">
              Nenhum item de banana disponível para o gráfico nesse recorte.
            </div>
          ) : (
            <>
              <div className="relative flex h-64 items-end gap-8 px-4">
                {bananaRows.map((row) => (
                  <div
                    key={`chart-${row.produto}`}
                    className="relative flex h-full flex-1 items-end justify-center gap-3"
                  >
                    {chartMarkets.map((market) => {
                      const value = row.prices[market];
                      const visuals = marketVisuals[market];
                      const heightPercent =
                        typeof value === "number" ? (value / maxPriceForChart) * 100 : 0;

                      return (
                        <div
                          key={`${row.produto}-${market}`}
                          className="group/bar relative flex h-full w-full max-w-[42px] flex-col items-center justify-end"
                        >
                          {typeof value === "number" ? (
                            <div
                              className={`absolute whitespace-nowrap rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black opacity-0 backdrop-blur-md transition-all duration-500 group-hover/bar:opacity-100 ${visuals.textClass}`}
                              style={{ bottom: `calc(${heightPercent}% + 12px)` }}
                            >
                              {formatCurrency(value)}
                            </div>
                          ) : null}
                          <div
                            className={`w-full rounded-t-lg shadow-lg transition-all duration-700 hover:scale-x-110 ${visuals.barClass}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                      );
                    })}

                    <div className="absolute -bottom-8 text-[10px] font-bold text-gray-500 transition-colors">
                      {row.produto.replace(/^BANANA\s+/i, "")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-col gap-4 border-t border-white/5 px-2 pt-10 lg:flex-row lg:items-center lg:justify-between">
                <button
                  type="button"
                  onClick={() => void exportGraph()}
                  disabled={bananaRows.length === 0}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-all hover:bg-white/10 hover:text-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={14} />
                  Exportar Gráfico
                </button>

                <div className="flex flex-wrap justify-center gap-8">
                  {chartMarkets.map((market) => (
                    <div
                      key={`legend-${market}`}
                      className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-400"
                    >
                      <div className={`h-3 w-3 rounded-sm ${marketVisuals[market].dotClass}`} />
                      {market}
                    </div>
                  ))}
                </div>

                <div className="hidden w-[120px] lg:block" />
              </div>
            </>
          )}
        </div>

        <div className="group relative overflow-hidden rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg">
          <div className="absolute right-0 top-0 p-2 opacity-20 transition-opacity group-hover:opacity-40">
            <MessageCircleMore size={60} className="text-emerald-500" />
          </div>

          <div className="relative z-10 flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-400">
              <Sparkles size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-emerald-300">Mita Inteligência</h4>
              <p className="max-w-3xl text-xs italic leading-relaxed text-emerald-100/70">
                {insightText}
              </p>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setIsChatOpen((current) => !current)}
        className="fixed bottom-8 right-8 z-[110] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all hover:scale-110"
      >
        <div className="animate-ping-3 absolute inset-0 rounded-full bg-green-400/20" />
        {isChatOpen ? <X size={28} className="relative z-10" /> : <Bot size={32} className="relative z-10" />}
      </button>

      {isChatOpen ? (
        <div className="fixed bottom-28 right-8 z-[100] flex h-[550px] w-[400px] flex-col overflow-hidden rounded-[32px] border border-white/15 bg-[#07130d]/95 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-8 duration-300">
          <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-transparent p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-2 text-emerald-200">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Mita Inteligência</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-400">
                  IA conectada
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </header>

          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-6 text-sm font-medium">
            {chatMessages.length === 0 ? (
              <div className="space-y-4 pt-10 text-center">
                <Sparkles className="mx-auto text-yellow-400" size={32} />
                <p className="px-4 text-xs text-gray-400">
                  Posso analisar esses preços agora mesmo e sugerir ajustes estratégicos para o Semar.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void sendMitaMessage("Qual mercado está com as bananas mais baratas?")}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] transition-all hover:bg-white/10"
                  >
                    Analisar Bananas
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendMitaMessage("Faça um resumo de competitividade.")}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] transition-all hover:bg-white/10"
                  >
                    Resumo Estratégico
                  </button>
                </div>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[85%] rounded-[24px] px-4 py-3 leading-relaxed ${bubbleClass(message.role)}`}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {message.role === "assistant" ? "Mita" : "Você"}
                    </p>
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {isMitaTyping ? (
              <div className="flex justify-start animate-pulse">
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/10 bg-emerald-500/5 px-4 py-3 text-xs font-medium italic text-emerald-200">
                  <Activity size={14} className="animate-spin" />
                  Mita está processando os dados...
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2 border-t border-white/10 bg-black/20 p-4">
            <input
              value={currentInput}
              onChange={(event) => setCurrentInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMitaMessage(currentInput);
                }
              }}
              placeholder="Pergunte à IA sobre os preços..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-green-500"
            />
            <button
              type="button"
              onClick={() => void sendMitaMessage(currentInput)}
              disabled={isMitaTyping || !currentInput.trim()}
              className="rounded-xl bg-emerald-500 p-2 text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        @keyframes ping-three-times {
          0% {
            transform: scale(1);
            opacity: 1;
          }

          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-ping-3 {
          animation: ping-three-times 1.5s cubic-bezier(0, 0, 0.2, 1) 3 forwards;
        }
      `}</style>
    </section>
  );
}
