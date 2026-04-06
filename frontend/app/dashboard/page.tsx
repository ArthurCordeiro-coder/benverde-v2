"use client";

import api from "@/lib/api";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  Banana,
  BarChart3,
  Bot,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Edit2,
  FileSpreadsheet,
  Filter,
  Image as ImageIcon,
  Leaf,
  Loader2,
  MessageCircleMore,
  PackageSearch,
  Save,
  Search,
  SendHorizonal,
  Sparkles,
  Tags,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type DashboardSummary = {
  saldoEstoque: number;
  caixasDisponiveis: number;
  precoMedio: number;
  caixasRegistradas: number;
  precosRegistrados: number;
  metasAtivas: number;
  mediaEntrega: number;
  pedidosImportados: number;
};

type DashboardMetaStatus = "Atingida" | "Próxima" | "Pendente";
type DashboardCategory = "Frutas" | "Legumes" | "Verduras";

type DashboardMeta = {
  id: number;
  produto: string;
  categoria: DashboardCategory;
  meta: number;
  pedido: number;
  progresso: number;
  status: DashboardMetaStatus;
};

type DashboardResponse = {
  summary?: Partial<DashboardSummary>;
  metas?: Array<Record<string, unknown>>;
};

type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend: "up" | "down" | "neutral";
};

type SortableKey = "produto" | "meta" | "pedido" | "progresso" | "status";
type SortDirection = "ascending" | "descending";
type FilterValue = string | number;
type FiltersState = Partial<Record<SortableKey, FilterValue[]>>;

type SortConfig = {
  key: SortableKey | null;
  direction: SortDirection;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MitaResponse = {
  answer?: string;
  history?: ChatMessage[];
};

type Feedback = {
  tone: "success" | "error";
  text: string;
} | null;

type ImportedMeta = {
  produto: string;
  categoria: DashboardCategory;
  meta: number;
};

const CATEGORY_OPTIONS: DashboardCategory[] = ["Frutas", "Legumes", "Verduras"];
const EMPTY_SUMMARY: DashboardSummary = {
  saldoEstoque: 0,
  caixasDisponiveis: 0,
  precoMedio: 0,
  caixasRegistradas: 0,
  precosRegistrados: 0,
  metasAtivas: 0,
  mediaEntrega: 0,
  pedidosImportados: 0,
};

function GlassCard({ title, value, subtitle, icon, trend }: GlassCardProps) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-3 shadow-inner">{icon}</div>
        {trend === "up" ? <TrendingUp size={20} className="text-green-400" /> : null}
        {trend === "down" ? (
          <TrendingUp size={20} className="rotate-180 transform text-red-400" />
        ) : null}
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-gray-400">{title}</p>
        <h3 className="mb-2 text-3xl font-bold tracking-tight text-white">{value}</h3>
        <p className="text-xs font-medium text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function inferCategory(produto: string, categoria?: string): DashboardCategory {
  const normalizedCategory = normalizeText(categoria ?? "");
  if (normalizedCategory === "LEGUMES" || normalizedCategory === "LEGUME") {
    return "Legumes";
  }
  if (normalizedCategory === "VERDURAS" || normalizedCategory === "VERDURA") {
    return "Verduras";
  }
  if (normalizedCategory === "FRUTAS" || normalizedCategory === "FRUTA") {
    return "Frutas";
  }

  const normalizedProduct = normalizeText(produto);
  const categoryMatchers: Array<[DashboardCategory, string[]]> = [
    [
      "Legumes",
      ["BATATA", "CENOURA", "BERINJELA", "MANDIOCA", "BETERRABA", "ABOBORA", "ABOBRINHA", "CEBOLA", "PEPINO", "TOMATE", "INHAME"],
    ],
    [
      "Verduras",
      ["ALFACE", "MANJERICAO", "MOSTARDA", "RUCULA", "COUVE", "ESPINAFRE", "AGRIAO", "ALMEIRAO", "SALSINHA", "CEBOLINHA"],
    ],
  ];

  const matchedCategory = categoryMatchers.find(([, keywords]) =>
    keywords.some((keyword) => normalizedProduct.includes(keyword)),
  )?.[0];

  return matchedCategory ?? "Frutas";
}

function parseNumericValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return 0;
  }

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;

  if (hasComma && hasDot) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = raw.replace(",", ".");
  }

  const result = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(result) ? result : 0;
}

function statusFromValue(value: unknown): DashboardMetaStatus {
  const normalizedStatus = normalizeText(String(value ?? ""));
  if (normalizedStatus === "ATINGIDA") {
    return "Atingida";
  }
  if (normalizedStatus === "PROXIMA") {
    return "Próxima";
  }
  return "Pendente";
}

function mapMetaItem(raw: Record<string, unknown>, index: number): DashboardMeta {
  const produto = String(raw.produto ?? raw.Produto ?? "").trim();
  const meta = parseNumericValue(raw.meta ?? raw.Meta);
  const pedido = parseNumericValue(raw.pedido ?? raw.Pedido);
  const progresso = parseNumericValue(raw.progresso ?? raw.Progresso);

  return {
    id: Number(raw.id ?? index + 1),
    produto,
    categoria: inferCategory(produto, String(raw.categoria ?? raw.Categoria ?? "Frutas")),
    meta,
    pedido,
    progresso,
    status: statusFromValue(raw.status ?? raw.Status),
  };
}

function roundProgress(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatQuantity(value: number, suffix?: string): string {
  const hasDecimals = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function parseMetasFile(file: File): Promise<ImportedMeta[]> {
  const normalizedExtension = file.name.split(".").pop()?.toLowerCase();
  if (normalizedExtension && ["png", "jpg", "jpeg", "webp"].includes(normalizedExtension)) {
    throw new Error("A importacao automatica suporta planilhas Excel ou CSV neste projeto.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const preferredSheet =
    workbook.SheetNames.find((sheetName) => normalizeText(sheetName).includes("META")) ??
    workbook.SheetNames[0];

  if (!preferredSheet) {
    throw new Error("Nenhuma aba valida foi encontrada no arquivo enviado.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[preferredSheet], {
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error("A planilha enviada esta vazia.");
  }

  const availableKeys = Object.keys(rows[0] ?? {});
  const productKey =
    availableKeys.find((key) => normalizeText(key).includes("PRODUTO")) ??
    availableKeys.find((key) => normalizeText(key).includes("ITEM"));
  const metaKey = availableKeys.find((key) => normalizeText(key).includes("META"));
  const categoryKey = availableKeys.find((key) => normalizeText(key).includes("CATEGORIA"));

  if (!productKey || !metaKey) {
    throw new Error("A planilha precisa ter colunas de produto e meta.");
  }

  const deduped = new Map<string, ImportedMeta>();
  for (const row of rows) {
    const produto = String(row[productKey] ?? "").trim();
    const meta = Math.round(parseNumericValue(row[metaKey]));
    if (!produto || meta <= 0) {
      continue;
    }

    deduped.set(normalizeText(produto), {
      produto,
      meta,
      categoria: inferCategory(produto, String(row[categoryKey ?? ""] ?? "")),
    });
  }

  if (deduped.size === 0) {
    throw new Error("Nenhuma meta valida foi encontrada na planilha.");
  }

  return Array.from(deduped.values());
}

function mergeImportedMetas(currentMetas: DashboardMeta[], importedMetas: ImportedMeta[]): DashboardMeta[] {
  const merged = new Map<string, DashboardMeta>();

  for (const item of currentMetas) {
    merged.set(normalizeText(item.produto), item);
  }

  for (const item of importedMetas) {
    const key = normalizeText(item.produto);
    const current = merged.get(key);
    merged.set(key, {
      id: current?.id ?? Date.now() + merged.size,
      produto: item.produto,
      categoria: item.categoria,
      meta: item.meta,
      pedido: current?.pedido ?? 0,
      progresso: current?.pedido && item.meta > 0 ? (current.pedido / item.meta) * 100 : 0,
      status:
        current?.pedido && item.meta > 0
          ? current.pedido / item.meta >= 1
            ? "Atingida"
            : current.pedido / item.meta >= 0.8
              ? "Próxima"
              : "Pendente"
          : "Pendente",
    });
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.produto.localeCompare(right.produto, "pt-BR"),
  );
}

function getFilterComparable(meta: DashboardMeta, key: SortableKey): FilterValue {
  if (key === "progresso") {
    return roundProgress(meta.progresso);
  }
  return meta[key];
}

function getExportRows(rows: DashboardMeta[]) {
  return rows.map((row) => ({
    Produto: row.produto,
    Categoria: row.categoria,
    Meta: row.meta,
    Pedido: row.pedido,
    Progresso: `${row.progresso.toFixed(1)}%`,
    Status: row.status,
  }));
}

function bubbleClass(role: ChatMessage["role"]) {
  return role === "assistant"
    ? "bg-emerald-500/10 border border-emerald-400/20 text-emerald-50"
    : "bg-white/10 border border-white/10 text-white";
}

export default function DashboardHome() {
  const mitaEndpoint = "/api/mita-ai/chat";
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [metas, setMetas] = useState<DashboardMeta[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });
  const [filters, setFilters] = useState<FiltersState>({});
  const [activeFilter, setActiveFilter] = useState<SortableKey | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMitaMenu, setShowMitaMenu] = useState(false);
  const [mitaSubmenu, setMitaSubmenu] = useState<"evolucao" | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMitaTyping, setIsMitaTyping] = useState(false);
  const [currentInput, setCurrentInput] = useState("");

  const [showMetasModal, setShowMetasModal] = useState(false);
  const [isSavingMetas, setIsSavingMetas] = useState(false);
  const [isExtractingMetas, setIsExtractingMetas] = useState(false);
  const [selectedMetaFile, setSelectedMetaFile] = useState<File | null>(null);
  const [metasFeedback, setMetasFeedback] = useState<Feedback>(null);
  const [formId, setFormId] = useState<number | null>(null);
  const [formProduto, setFormProduto] = useState("");
  const [formMeta, setFormMeta] = useState(0);
  const [formCategoria, setFormCategoria] = useState<DashboardCategory>("Frutas");

  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const mitaMenuRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const tableSectionRef = useRef<HTMLDivElement | null>(null);

  const loadDashboardData = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setIsLoadingDashboard(true);
    } else {
      setIsRefreshingDashboard(true);
    }

    try {
      const response = await api.get<DashboardResponse>("/api/dashboard/summary");
      const nextSummary = {
        ...EMPTY_SUMMARY,
        ...(response.data?.summary ?? {}),
      };
      const nextMetas = Array.isArray(response.data?.metas)
        ? response.data.metas.map((item, index) => mapMetaItem(item, index))
        : [];

      setSummary(nextSummary);
      setMetas(nextMetas);
      setDashboardError("");
    } catch (error) {
      console.error("Erro ao carregar o dashboard:", error);
      setDashboardError("Nao foi possivel carregar o resumo do dashboard.");
    } finally {
      setIsLoadingDashboard(false);
      setIsRefreshingDashboard(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData("initial");
  }, [loadDashboardData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (mitaMenuRef.current && !mitaMenuRef.current.contains(event.target as Node)) {
        setShowMitaMenu(false);
        setMitaSubmenu(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isMitaTyping]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...metas];

    (Object.keys(filters) as SortableKey[]).forEach((key) => {
      const activeValues = filters[key];
      if (!activeValues || activeValues.length === 0) {
        return;
      }

      result = result.filter((item) => activeValues.includes(getFilterComparable(item, key)));
    });

    if (sortConfig.key) {
      result.sort((left, right) => {
        const leftValue = left[sortConfig.key as keyof DashboardMeta];
        const rightValue = right[sortConfig.key as keyof DashboardMeta];

        if (typeof leftValue === "string" && typeof rightValue === "string") {
          return sortConfig.direction === "ascending"
            ? leftValue.localeCompare(rightValue, "pt-BR")
            : rightValue.localeCompare(leftValue, "pt-BR");
        }

        const safeLeft = Number(leftValue ?? 0);
        const safeRight = Number(rightValue ?? 0);
        return sortConfig.direction === "ascending" ? safeLeft - safeRight : safeRight - safeLeft;
      });
    }

    return result;
  }, [filters, metas, sortConfig]);

  const top5 = useMemo(
    () => [...metas].sort((left, right) => right.progresso - left.progresso).slice(0, 5),
    [metas],
  );

  const categoriasProgresso = useMemo(() => {
    const categoriesInData = Array.from(new Set(metas.map((item) => item.categoria)));
    const orderedCategories = [
      ...CATEGORY_OPTIONS.filter((category) => categoriesInData.includes(category)),
      ...categoriesInData.filter((category) => !CATEGORY_OPTIONS.includes(category)),
    ];
    const categories = orderedCategories.length > 0 ? orderedCategories : CATEGORY_OPTIONS;

    return categories.map((categoria) => {
      const categoryItems = metas.filter((item) => item.categoria === categoria);
      const progressoMedio =
        categoryItems.length > 0
          ? categoryItems.reduce((total, item) => total + item.progresso, 0) /
            categoryItems.length
          : 0;

      return {
        categoria,
        progresso: progressoMedio,
      };
    });
  }, [metas]);

  const getUniqueValues = useCallback(
    (key: SortableKey) =>
      Array.from(new Set(metas.map((item) => getFilterComparable(item, key)))).sort((left, right) =>
        typeof left === "string" && typeof right === "string"
          ? left.localeCompare(right, "pt-BR")
          : Number(left) - Number(right),
      ),
    [metas],
  );

  const requestSort = (key: SortableKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "ascending" ? "descending" : "ascending",
    }));
  };

  const toggleFilterOption = (key: SortableKey, value: FilterValue) => {
    setFilters((current) => {
      const activeValues = current[key] ?? [];
      const updatedValues = activeValues.includes(value)
        ? activeValues.filter((item) => item !== value)
        : [...activeValues, value];

      return {
        ...current,
        [key]: updatedValues.length > 0 ? updatedValues : undefined,
      };
    });
  };

  const persistMetas = useCallback(
    async (nextMetas: DashboardMeta[], successText: string) => {
      setIsSavingMetas(true);
      setMetasFeedback(null);

      try {
        await api.put("/api/dashboard/metas", {
          items: nextMetas.map((item) => ({
            produto: item.produto,
            categoria: item.categoria,
            meta: item.meta,
          })),
        });

        await loadDashboardData("refresh");
        setMetasFeedback({ tone: "success", text: successText });
      } catch (error: unknown) {
        console.error("Erro ao salvar metas:", error);
        const detail = (
          error as { response?: { data?: { detail?: string } } } | undefined
        )?.response?.data?.detail;
        setMetasFeedback({
          tone: "error",
          text:
            typeof detail === "string" && detail.trim()
              ? detail
              : "Nao foi possivel salvar as metas.",
        });
      } finally {
        setIsSavingMetas(false);
      }
    },
    [loadDashboardData],
  );

  const resetForm = () => {
    setFormId(null);
    setFormProduto("");
    setFormMeta(0);
    setFormCategoria("Frutas");
  };

  const handleSaveMeta = async () => {
    const produto = formProduto.trim();
    if (!produto || formMeta <= 0) {
      setMetasFeedback({
        tone: "error",
        text: "Preencha um produto e uma meta maior que zero.",
      });
      return;
    }

    const nextMetas: DashboardMeta[] = formId
      ? metas.map((item) =>
          item.id === formId
            ? {
                ...item,
                produto,
                categoria: formCategoria,
                meta: formMeta,
              }
            : item,
        )
      : [
          ...metas,
          {
            id: Date.now(),
            produto,
            categoria: formCategoria,
            meta: formMeta,
            pedido: 0,
            progresso: 0,
            status: "Pendente",
          },
        ];

    await persistMetas(nextMetas, formId ? "Meta atualizada com sucesso." : "Meta adicionada com sucesso.");
    resetForm();
  };

  const handleDeleteMeta = async (id: number) => {
    const nextMetas = metas.filter((item) => item.id !== id);
    await persistMetas(nextMetas, "Meta removida com sucesso.");
    if (formId === id) {
      resetForm();
    }
  };

  const handleEditClick = (meta: DashboardMeta) => {
    setFormId(meta.id);
    setFormProduto(meta.produto);
    setFormMeta(meta.meta);
    setFormCategoria(meta.categoria);
    document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMetaFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedMetaFile(event.target.files?.[0] ?? null);
    setMetasFeedback(null);
  };

  const handleExtractMetas = async () => {
    if (!selectedMetaFile) {
      return;
    }

    setIsExtractingMetas(true);
    setMetasFeedback(null);

    try {
      const importedMetas = await parseMetasFile(selectedMetaFile);
      const mergedMetas = mergeImportedMetas(metas, importedMetas);
      await persistMetas(mergedMetas, `${importedMetas.length} meta(s) importada(s) com sucesso.`);
      setSelectedMetaFile(null);
    } catch (error) {
      console.error("Erro ao importar metas:", error);
      setMetasFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Nao foi possivel importar a planilha de metas.",
      });
    } finally {
      setIsExtractingMetas(false);
    }
  };

  const exportTableToExcel = () => {
    const exportRows = getExportRows(filteredAndSortedData);
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo e Metas");
    XLSX.writeFile(workbook, `dashboard-benverde-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExportMenu(false);
  };

  const exportTableToPng = async () => {
    if (!tableSectionRef.current) {
      return;
    }

    setShowExportMenu(false);
    await new Promise((resolve) => window.setTimeout(resolve, 120));

    const canvas = await html2canvas(tableSectionRef.current, {
      backgroundColor: "#07130d",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = `dashboard-benverde-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const buildFallbackMitaResponse = useCallback(
    (question: string) => {
      const normalizedQuestion = normalizeText(question);
      const totalPedidos = metas.reduce((total, item) => total + item.pedido, 0);
      const bestProduct = top5[0]?.produto ?? "Nenhum produto";

      if (normalizedQuestion.includes("RESUMO")) {
        return `Hoje temos ${metas.length} meta(s) ativa(s), ${formatQuantity(totalPedidos, "kg")} associados as metas e media global de ${summary.mediaEntrega.toFixed(1)}% de atingimento. O melhor desempenho atual e ${bestProduct}.`;
      }

      if (normalizedQuestion.includes("EVOLUCAO DE")) {
        const category = categoriasProgresso.find((item) =>
          normalizedQuestion.includes(normalizeText(item.categoria)),
        );
        if (category) {
          return `A categoria ${category.categoria} está com ${category.progresso.toFixed(1)}% de progresso médio. Vale olhar com atenção os itens abaixo de 80% para fechar o mês com mais conforto.`;
        }
      }

      if (normalizedQuestion.includes("TOP 5") || normalizedQuestion.includes("CINCO PRODUTOS")) {
        return `Os 5 produtos com maior avanço agora são ${top5.map((item) => item.produto).join(", ")}. ${top5.length > 0 ? `O líder atual é ${top5[0].produto} com ${top5[0].progresso.toFixed(1)}% da meta.` : ""}`;
      }

      if (normalizedQuestion.includes("ESTOQUE")) {
        return `O saldo atual de estoque está em ${formatQuantity(summary.saldoEstoque, "kg")}. Esse número vem do consolidado real de movimentações da operação.`;
      }

      if (normalizedQuestion.includes("PRECO")) {
        return `O preço médio consolidado está em ${formatCurrency(summary.precoMedio)} com ${summary.precosRegistrados} registro(s) válidos na base atual.`;
      }

      return `A operação está com ${summary.mediaEntrega.toFixed(1)}% de média de entrega, ${summary.caixasRegistradas} registro(s) de caixas e ${summary.precosRegistrados} preço(s) consolidados. Posso detalhar metas atrasadas, evolução por categoria ou situação de estoque.`;
    },
    [categoriasProgresso, metas, summary, top5],
  );

  const sendMitaMessage = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || isMitaTyping) {
        return;
      }

      setIsChatOpen(true);
      setShowMitaMenu(false);
      setMitaSubmenu(null);
      setCurrentInput("");

      const previousMessages = [...chatMessages];
      const optimisticMessages = [...previousMessages, { role: "user" as const, content: question }];
      setChatMessages(optimisticMessages);
      setIsMitaTyping(true);

      try {
        const response = await api.post<MitaResponse>(mitaEndpoint, {
          message: question,
          history: previousMessages,
        });

        if (Array.isArray(response.data?.history) && response.data.history.length > 0) {
          setChatMessages(
            response.data.history.filter(
              (item): item is ChatMessage =>
                (item.role === "user" || item.role === "assistant") &&
                typeof item.content === "string",
            ),
          );
        } else {
          const answer =
            typeof response.data?.answer === "string" && response.data.answer.trim()
              ? response.data.answer.trim()
              : buildFallbackMitaResponse(question);
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

  const totalPedidosMetas = metas.reduce((total, item) => total + item.pedido, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8 text-gray-100">
      <header className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-tr from-green-500 to-emerald-300 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a1f12]">
              <Leaf size={20} className="text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Oie! Eu sou a Mita, sua gerente de dados.</h2>
            <p className="text-sm text-gray-400">Como posso te ajudar hoje na Benverde?</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboardData("refresh")}
          disabled={isRefreshingDashboard}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-green-300 shadow-[0_0_15px_rgba(74,222,128,0.1)] transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshingDashboard ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Atualizar Dados
        </button>
      </header>

      <div className="flex flex-col items-start gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200 shadow-[0_8px_32px_rgba(245,158,11,0.05)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <AlertCircle size={24} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-sm font-medium">
            Este resumo consolida estoque, metas, caixas, precos e indicadores operacionais ativos do sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-50/80">
          <span className="rounded-full border border-amber-300/20 bg-black/10 px-3 py-1">
            {summary.caixasRegistradas} caixas
          </span>
          <span className="rounded-full border border-amber-300/20 bg-black/10 px-3 py-1">
            {summary.precosRegistrados} precos
          </span>
        </div>
      </div>

      {dashboardError ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {dashboardError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GlassCard
          title="Saldo de Estoque"
          value={isLoadingDashboard ? "Carregando..." : formatQuantity(summary.saldoEstoque, "kg")}
          subtitle="Consolidado real das movimentacoes registradas."
          icon={<Banana className="text-yellow-400" size={24} />}
          trend={summary.saldoEstoque > 0 ? "up" : "down"}
        />
        <GlassCard
          title="Metas Ativas"
          value={isLoadingDashboard ? "Carregando..." : `${summary.metasAtivas} un`}
          subtitle="Metas salvas no banco e acompanhadas no painel."
          icon={<PackageSearch className="text-blue-400" size={24} />}
          trend="neutral"
        />
        <GlassCard
          title="Media de Entrega"
          value={isLoadingDashboard ? "Carregando..." : `${summary.mediaEntrega.toFixed(1)}%`}
          subtitle={`${formatQuantity(totalPedidosMetas, "kg")} ja associado(s) as metas.`}
          icon={<Tags className="text-emerald-400" size={24} />}
          trend={summary.mediaEntrega >= 80 ? "up" : summary.mediaEntrega > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setShowMetasModal(true)}
          className="group flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] py-5 text-gray-300 backdrop-blur-xl transition-all hover:bg-white/[0.06] hover:text-white"
        >
          <div className="rounded-full bg-white/5 p-3 transition-colors group-hover:bg-green-500/20 group-hover:text-green-400">
            <UploadCloud size={24} />
          </div>
          <span className="font-semibold text-sm">Importar metas</span>
        </button>

        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu((current) => !current)}
            className="group flex h-full w-full flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] py-5 text-gray-300 backdrop-blur-xl transition-all hover:bg-white/[0.06] hover:text-white"
          >
            <div className="rounded-full bg-white/5 p-3 transition-colors group-hover:bg-green-500/20 group-hover:text-green-400">
              <Download size={24} />
            </div>
            <span className="font-semibold text-sm">Exportar tabela</span>
          </button>

          {showExportMenu ? (
            <div className="absolute bottom-[110%] left-0 z-50 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b1f15]/95 shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={exportTableToExcel}
                className="flex w-full items-center gap-3 border-b border-white/5 px-6 py-4 text-sm text-gray-300 transition-colors hover:bg-white/10"
              >
                <FileSpreadsheet size={18} className="text-green-400" />
                Excel
              </button>
              <button
                type="button"
                onClick={() => void exportTableToPng()}
                className="flex w-full items-center gap-3 px-6 py-4 text-sm text-gray-300 transition-colors hover:bg-white/10"
              >
                <ImageIcon size={18} className="text-green-400" />
                PNG
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative" ref={mitaMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowMitaMenu((current) => !current);
              setMitaSubmenu(null);
            }}
            className="group flex h-full w-full flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] py-5 text-gray-300 backdrop-blur-xl transition-all hover:bg-white/[0.06] hover:text-white"
          >
            <div className="rounded-full bg-white/5 p-3 transition-colors group-hover:bg-green-500/20 group-hover:text-green-400">
              <MessageCircleMore size={24} />
            </div>
            <span className="font-semibold text-sm">Perguntar a Mita</span>
          </button>

          {showMitaMenu ? (
            <div className="absolute bottom-[110%] right-0 z-[60] w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1f15]/95 shadow-2xl backdrop-blur-xl">
              {mitaSubmenu === null ? (
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => void sendMitaMessage("Faça-me um resumo de todas as metas desse mês.")}
                    className="flex w-full items-center gap-2 border-b border-white/5 px-4 py-3 text-left text-[11px] text-gray-300 transition-colors hover:bg-white/5 hover:text-green-400"
                  >
                    <Sparkles size={14} />
                    Resumo das metas do mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setMitaSubmenu("evolucao")}
                    className="flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left text-[11px] text-gray-300 transition-colors hover:bg-white/5 hover:text-green-400"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingUp size={14} />
                      Como anda a evolução...
                    </span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendMitaMessage("Qual foi a evolução dos cinco produtos que mais estão vendendo?")}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[11px] text-gray-300 transition-colors hover:bg-white/5 hover:text-green-400"
                  >
                    <PackageSearch size={14} />
                    Top 5 produtos mais vendidos
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => setMitaSubmenu(null)}
                    className="flex w-full items-center gap-2 border-b border-white/5 px-4 py-2 text-left text-[10px] font-bold uppercase text-gray-500 transition-colors hover:text-white"
                  >
                    ← Voltar
                  </button>
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => void sendMitaMessage(`Como anda a evolução de ${category.toLowerCase()}`)}
                      className="w-full border-b border-white/5 px-4 py-3 text-left text-[11px] capitalize text-gray-300 transition-colors last:border-0 hover:bg-white/5 hover:text-green-400"
                    >
                      {category.toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={tableSectionRef}
        className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md"
      >
        <div className="overflow-x-auto rounded-3xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f5922] text-white">
              <tr>
                {(["produto", "meta", "pedido", "progresso", "status"] as SortableKey[]).map((key) => (
                  <th key={key} className="relative border-r border-white/10 p-4 last:border-0">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
                      <button type="button" onClick={() => requestSort(key)} className="flex items-center gap-1">
                        <span>{key === "status" ? "Status" : key}</span>
                        {sortConfig.key === key ? (
                          sortConfig.direction === "ascending" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )
                        ) : (
                          <ChevronsUpDown size={14} className="opacity-30" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveFilter((current) => (current === key ? null : key))}
                        className={`transition-colors ${filters[key] ? "text-green-300" : "text-white/30 hover:text-white"}`}
                      >
                        <Filter size={14} />
                      </button>
                    </div>

                    {activeFilter === key ? (
                      <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-[#0b1f15] p-3 shadow-2xl backdrop-blur-xl">
                        {getUniqueValues(key).map((option) => (
                          <label
                            key={`${key}-${String(option)}`}
                            className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-white/20 bg-transparent text-green-500"
                              checked={(filters[key] ?? []).includes(option)}
                              onChange={() => toggleFilterOption(key, option)}
                            />
                            <span className="text-xs normal-case text-gray-200">
                              {typeof option === "number" && key === "progresso"
                                ? `${option.toFixed(1)}%`
                                : String(option)}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingDashboard ? (
                <tr>
                  <td className="p-6 text-sm text-gray-400" colSpan={5}>
                    Carregando resumo do dashboard...
                  </td>
                </tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td className="p-6 text-sm text-gray-400" colSpan={5}>
                    Nenhuma meta encontrada.
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="p-4 font-medium text-white">{row.produto}</td>
                    <td className="p-4 text-gray-400">{formatQuantity(row.meta)}</td>
                    <td className="p-4 text-gray-400">{formatQuantity(row.pedido)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-green-400 transition-all duration-500"
                            style={{ width: `${Math.min(row.progresso, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-200">{row.progresso.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          row.status === "Atingida"
                            ? "border border-green-500/20 bg-green-500/20 text-green-400"
                            : row.status === "Próxima"
                              ? "border border-yellow-500/20 bg-yellow-500/20 text-yellow-400"
                              : "border border-red-500/20 bg-red-500/20 text-red-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex h-80 flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-md">
          <h3 className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
            <TrendingUp size={18} className="text-green-400" />
            Top 5 Progresso
          </h3>
          <div className="flex flex-1 items-end justify-between px-4">
            {top5.length === 0 ? (
              <div className="flex w-full items-center justify-center text-sm text-gray-500">
                Nenhuma meta ativa para comparar.
              </div>
            ) : (
              top5.map((item) => (
                <div
                  key={item.id}
                  className="group flex h-full w-12 flex-col items-center justify-end gap-2"
                >
                  <div className="text-[10px] font-bold text-green-400 opacity-0 transition-opacity group-hover:opacity-100">
                    {item.progresso.toFixed(0)}%
                  </div>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-green-600 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all duration-700"
                    style={{ height: `${Math.max(6, Math.min(item.progresso, 100))}%` }}
                  />
                  <div className="w-full truncate text-center text-[10px] font-medium text-gray-500">
                    {item.produto}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex h-80 flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-md">
          <h3 className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
            <BarChart3 size={18} className="text-green-400" />
            Media por Categoria
          </h3>
          <div className="flex flex-1 items-end justify-around px-4">
            {categoriasProgresso.map((item, index) => (
              <div
                key={item.categoria}
                className="group relative flex h-full w-24 flex-col items-center justify-end gap-2"
              >
                <div
                  className={`mb-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black opacity-0 transition-opacity group-hover:opacity-100 ${
                    index === 0 ? "text-blue-400" : index === 1 ? "text-orange-400" : "text-emerald-400"
                  }`}
                >
                  {item.progresso.toFixed(1)}%
                </div>
                <div
                  className={`relative w-16 rounded-t-2xl shadow-2xl transition-all duration-1000 ${
                    index === 0 ? "bg-blue-500/80" : index === 1 ? "bg-orange-500/80" : "bg-emerald-500/80"
                  }`}
                  style={{ height: `${Math.max(6, Math.min(item.progresso, 100))}%` }}
                >
                  <div className="absolute inset-0 rounded-t-2xl bg-white/10 opacity-50" />
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-300">
                  {item.categoria}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsChatOpen((current) => !current)}
        className="group fixed bottom-8 right-8 z-[110] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all hover:scale-110 hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] active:scale-95"
      >
        <div className="animate-ping-3 absolute inset-0 rounded-full bg-green-400/20" />
        {isChatOpen ? <X size={28} className="relative z-10" /> : <Bot size={32} className="relative z-10" />}
      </button>

      {isChatOpen ? (
        <div className="fixed bottom-28 right-8 z-[100] flex h-[600px] w-[calc(100vw-2rem)] max-w-[450px] flex-col overflow-hidden rounded-[32px] border border-white/15 bg-[#07130d]/95 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-transparent p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-2 text-emerald-200">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white">Chat da Mita</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-400">Online Agora</p>
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

          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
            {chatMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-3xl border border-emerald-400/10 bg-emerald-500/10 p-4">
                  <Sparkles className="text-emerald-400" size={32} />
                </div>
                <p className="max-w-xs text-sm font-medium text-gray-400">
                  Ola! Eu sou a Mita. Selecione uma pergunta rapida ou digite abaixo para analisarmos sua operacao.
                </p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-sm ${bubbleClass(message.role)}`}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {message.role === "assistant" ? "Mita" : "Voce"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}

            {isMitaTyping ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/5 px-4 py-3 text-xs font-medium italic text-emerald-200">
                  Mita esta analisando os dados...
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-2">
              <textarea
                rows={2}
                value={currentInput}
                onChange={(event) => setCurrentInput(event.target.value)}
                placeholder="Ex: Como está o estoque hoje?"
                className="resize-none border-none bg-transparent p-2 text-sm text-white outline-none placeholder:text-gray-600"
              />
              <div className="flex justify-end px-2 pb-2">
                <button
                  type="button"
                  onClick={() => void sendMitaMessage(currentInput)}
                  disabled={isMitaTyping || !currentInput.trim()}
                  className="rounded-xl bg-emerald-500 p-2 text-[#062010] shadow-lg transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-emerald-950/60"
                >
                  <SendHorizonal size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showMetasModal ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isExtractingMetas && !isSavingMetas) {
              setShowMetasModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0b1f15] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2 text-green-400">
                  <BarChart3 size={20} />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">Gerenciar Metas</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMetasModal(false)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="custom-scrollbar max-h-[70vh] space-y-8 overflow-y-auto pr-2">
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <ImageIcon size={16} className="text-green-400" />
                  Importar planilha
                </h3>
                <div className="space-y-4">
                  <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 p-6 transition-all hover:border-green-500/30">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={handleMetaFileChange}
                    />
                    <UploadCloud
                      className={`mb-2 ${selectedMetaFile ? "text-green-400" : "text-gray-500"}`}
                      size={28}
                    />
                    <p className="text-xs text-gray-400">
                      {selectedMetaFile ? selectedMetaFile.name : "Clique ou arraste uma planilha"}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Excel e CSV funcionam automaticamente. Imagens ainda nao tem OCR neste fluxo.
                    </p>
                  </label>

                  {selectedMetaFile ? (
                    <button
                      type="button"
                      onClick={() => void handleExtractMetas()}
                      disabled={isExtractingMetas || isSavingMetas}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 font-bold text-black transition-all hover:bg-green-600 disabled:opacity-50"
                    >
                      {isExtractingMetas ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Importar metas
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </section>

              {metasFeedback ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    metasFeedback.tone === "success"
                      ? "border-green-500/20 bg-green-500/10 text-green-300"
                      : "border-red-500/20 bg-red-500/10 text-red-200"
                  }`}
                >
                  {metasFeedback.text}
                </div>
              ) : null}

              <div className="h-px bg-white/5" />

              <section id="form-section">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">
                  {formId ? "Editando Meta" : "Adicao Manual"}
                </h3>
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Produto</label>
                    <input
                      type="text"
                      value={formProduto}
                      onChange={(event) => setFormProduto(event.target.value)}
                      placeholder="Ex: Banana Nanica"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Meta (kg)</label>
                    <input
                      type="number"
                      min="0"
                      value={formMeta}
                      onChange={(event) => setFormMeta(Number(event.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-green-500"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveMeta()}
                      disabled={isSavingMetas || isExtractingMetas}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-bold transition-all ${
                        formId
                          ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                          : "border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isSavingMetas ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {formId ? "Salvar" : "Adicionar"}
                    </button>
                  </div>
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Categoria</label>
                    <select
                      value={formCategoria}
                      onChange={(event) => setFormCategoria(event.target.value as DashboardCategory)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-green-500"
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <div className="h-px bg-white/5" />

              <section className="pb-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-100">
                  <Search size={16} className="mr-2 inline text-green-400" />
                  Metas ({metas.length})
                </h3>
                <div className="space-y-2">
                  {metas.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-gray-400">
                      Nenhuma meta cadastrada ainda.
                    </div>
                  ) : (
                    metas.map((meta) => (
                      <div
                        key={meta.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{meta.produto}</p>
                          <p className="text-xs text-gray-400">{formatQuantity(meta.meta, "kg")} • {meta.categoria}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(meta)}
                            className="rounded-lg bg-white/5 p-2 text-gray-400 transition-colors hover:text-yellow-400"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteMeta(meta.id)}
                            className="rounded-lg bg-white/5 p-2 text-gray-400 transition-colors hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
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
          animation: ping-three-times 1.5s cubic-bezier(0, 0, 0.2, 1) 3;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}
