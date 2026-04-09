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
  ArrowDownRight,
  ArrowUpRight,
  Banana,
  BarChart3,
  Bot,
  Box,
  ChevronRight,
  Download,
  FileSpreadsheet,
  History,
  Image as ImageIcon,
  Loader2,
  MessageCircleMore,
  PieChart,
  RefreshCw,
  SendHorizonal,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type HistoricoItem = {
  data?: string | null;
  tipo?: string;
  produto?: string;
  quant?: number;
  unidade?: string;
  loja?: string;
  arquivo?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type LumiiResponse = {
  answer?: string;
  history?: ChatMessage[];
};

type Feedback = {
  tone: "success" | "error";
  text: string;
} | null;

type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend: "up" | "down" | "neutral";
  colorClass?: string;
};

type ProdutoRanking = {
  nome: string;
  saldo: number;
};

const LUMII_QUESTIONS = [
  "Qual variedade corre mais risco de ruptura?",
  "Como estÃ¡ a tendÃªncia de saÃ­da semanal?",
  "Houve bonificaÃ§Ãµes nesta Ãºltima carga?",
];

function GlassCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = "text-emerald-400",
}: GlassCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-2xl border border-white/5 bg-white/5 p-3 shadow-inner ${colorClass}`}>
          {icon}
        </div>
        {trend === "up" ? <ArrowUpRight size={20} className="text-green-400" /> : null}
        {trend === "down" ? <ArrowDownRight size={20} className="text-red-400" /> : null}
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

function sanitizeHistoricoItem(raw: unknown): HistoricoItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    data: coerceString(raw.data) || null,
    tipo: coerceString(raw.tipo) || undefined,
    produto: coerceString(raw.produto) || undefined,
    quant: coerceNumber(raw.quant, 0),
    unidade: coerceString(raw.unidade) || undefined,
    loja: coerceString(raw.loja) || undefined,
    arquivo: coerceString(raw.arquivo) || undefined,
  };
}

function formatQuantity(value: number, unit = "kg"): string {
  const hasDecimals = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return `${formatted} ${unit}`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR");
  }

  if (value.includes("-")) {
    return value.split("-").reverse().join("/");
  }

  return value;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString("pt-BR");
  }

  return value;
}

function bubbleClass(role: ChatMessage["role"]) {
  return role === "assistant"
    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-50 shadow-lg shadow-emerald-500/5"
    : "border border-white/10 bg-white/10 text-white";
}

export default function EstoquePage() {
  const lumiiEndpoint = "/api/lumii-ia/chat";

  const [saldo, setSaldo] = useState(0);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [showLumiiMenu, setShowLumiiMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLumiiTyping, setIsLumiiTyping] = useState(false);
  const [currentInput, setCurrentInput] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [salvandoMovimentacao, setSalvandoMovimentacao] = useState(false);
  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const lumiiMenuRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);

  const buscarEstoque = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setCarregando(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await api.get("/api/estoque/saldo");
      const payload = isRecord(response.data) ? response.data : {};
      const saldoAtual = coerceNumber(payload.saldo, 0);
      const historicoAtual = asArray(payload.historico)
        .map(sanitizeHistoricoItem)
        .filter((item): item is HistoricoItem => item !== null);

      historicoAtual.sort((left: HistoricoItem, right: HistoricoItem) => {
        const leftTime = new Date(left.data ?? "").getTime();
        const rightTime = new Date(right.data ?? "").getTime();
        return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
      });

      setSaldo(Number.isFinite(saldoAtual) ? saldoAtual : 0);
      setHistorico(historicoAtual);
      setPageError("");
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
      setPageError(getApiErrorMessage(error, "NÃ£o foi possÃ­vel carregar os dados de estoque."));
    } finally {
      setCarregando(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void buscarEstoque("initial");
  }, [buscarEstoque]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLumiiTyping]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (lumiiMenuRef.current && !lumiiMenuRef.current.contains(event.target as Node)) {
        setShowLumiiMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stats = useMemo(() => {
    const totalEntradas = historico
      .filter((item) => normalizeText(item.tipo ?? "") === "ENTRADA")
      .reduce((total, item) => total + Number(item.quant ?? 0), 0);

    const totalSaidas = historico
      .filter((item) => normalizeText(item.tipo ?? "") === "SAIDA")
      .reduce((total, item) => total + Number(item.quant ?? 0), 0);

    const rankingMap = new Map<string, number>();
    for (const item of historico) {
      const nome = String(item.produto ?? "SEM PRODUTO").trim() || "SEM PRODUTO";
      const sinal = normalizeText(item.tipo ?? "") === "ENTRADA" ? 1 : -1;
      const quantidadeAtual = Number(item.quant ?? 0) * sinal;
      rankingMap.set(nome, (rankingMap.get(nome) ?? 0) + quantidadeAtual);
    }

    const ranking = Array.from(rankingMap.entries())
      .map<ProdutoRanking>(([nome, saldoItem]) => ({ nome, saldo: saldoItem }))
      .sort((left, right) => right.saldo - left.saldo);

    const topVariedade = ranking[0] ?? { nome: "Sem dados", saldo: 0 };
    const riscoVariedade =
      ranking.filter((item) => item.saldo > 0).sort((left, right) => left.saldo - right.saldo)[0] ??
      ranking[ranking.length - 1] ??
      topVariedade;

    const movimentosRecentes = historico.slice(0, 7);
    const saidaRecente = movimentosRecentes
      .filter((item) => normalizeText(item.tipo ?? "") === "SAIDA")
      .reduce((total, item) => total + Number(item.quant ?? 0), 0);

    return {
      saldoAtual: saldo,
      totalEntradas,
      totalSaidas,
      topVariedade,
      riscoVariedade,
      ranking,
      saidaRecente,
    };
  }, [historico, saldo]);

  const exportRows = useMemo(
    () =>
      historico.map((item) => ({
        Data: formatDateTime(item.data),
        Tipo: item.tipo ?? "-",
        Produto: item.produto ?? "-",
        Quantidade: Number(item.quant ?? 0),
        Unidade: item.unidade ?? "KG",
        Loja: item.loja ?? "-",
        Arquivo: item.arquivo ?? "-",
      })),
    [historico],
  );

  const handleSalvarMovimentacao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quant = Number(quantidade);

    if (!produto.trim() || !quant || quant <= 0) {
      setFeedback({
        tone: "error",
        text: "Preencha produto e quantidade vÃ¡lidos.",
      });
      return;
    }

    setSalvandoMovimentacao(true);
    setFeedback(null);

    try {
      await api.post("/api/estoque/movimentacao", {
        produto: produto.trim(),
        quant,
        tipo,
      });

      setModalAberto(false);
      setProduto("");
      setQuantidade("");
      setTipo("entrada");
      setFeedback({
        tone: "success",
        text: "MovimentaÃ§Ã£o registrada com sucesso.",
      });
      await buscarEstoque("refresh");
    } catch (error: unknown) {
      console.error("Erro ao salvar movimentacao:", error);
      setFeedback({
        tone: "error",
        text: getApiErrorMessage(error, "NÃ£o foi possÃ­vel salvar a movimentaÃ§Ã£o."),
      });
    } finally {
      setSalvandoMovimentacao(false);
    }
  };

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque de Bananas");
    XLSX.writeFile(workbook, `estoque-bananas-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExportMenu(false);
  };

  const exportarPng = async () => {
    if (!historySectionRef.current) {
      return;
    }

    setShowExportMenu(false);
    await new Promise((resolve) => window.setTimeout(resolve, 120));

    const canvas = await html2canvas(historySectionRef.current, {
      backgroundColor: "#07130d",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = `estoque-bananas-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const buildFallbackLumiiResponse = useCallback(
    (question: string) => {
      const normalizedQuestion = normalizeText(question);

      if (normalizedQuestion.includes("ESTOQUE") || normalizedQuestion.includes("SALDO")) {
        return `Temos ${formatQuantity(stats.saldoAtual)} em estoque. A variedade ${stats.topVariedade.nome} representa o maior volume disponÃ­vel agora.`;
      }

      if (normalizedQuestion.includes("RUPTURA") || normalizedQuestion.includes("RISCO") || normalizedQuestion.includes("TERRA")) {
        if (stats.riscoVariedade.saldo <= 0) {
          return `A variedade ${stats.riscoVariedade.nome} estÃ¡ sem saldo positivo. Recomendo revisar as Ãºltimas saÃ­das e programar reposiÃ§Ã£o imediata.`;
        }
        return `A variedade ${stats.riscoVariedade.nome} Ã© a que mais merece atenÃ§Ã£o agora, com ${formatQuantity(stats.riscoVariedade.saldo)} disponÃ­veis.`;
      }

      if (normalizedQuestion.includes("SAIDA") || normalizedQuestion.includes("TENDENCIA")) {
        return `Registramos ${formatQuantity(stats.totalSaidas)} em saÃ­das acumuladas no histÃ³rico atual. Nos movimentos mais recentes, saÃ­ram ${formatQuantity(stats.saidaRecente)}.`;
      }

      if (normalizedQuestion.includes("BONIFICAC")) {
        return "NÃ£o encontrei um indicador explÃ­cito de bonificaÃ§Ã£o nesse histÃ³rico. Hoje eu enxergo entradas, saÃ­das, produto, loja e arquivo de origem.";
      }

      return `Consigo analisar entradas, saÃ­das, risco de ruptura e distribuiÃ§Ã£o por variedade. Hoje o saldo total estÃ¡ em ${formatQuantity(stats.saldoAtual)}.`;
    },
    [stats],
  );

  const sendLumiiMessage = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || isLumiiTyping) {
        return;
      }

      setIsChatOpen(true);
      setShowLumiiMenu(false);
      setCurrentInput("");

      const previousMessages = [...chatMessages];
      const optimisticMessages = [...previousMessages, { role: "user" as const, content: question }];
      setChatMessages(optimisticMessages);
      setIsLumiiTyping(true);

      try {
        const response = await api.post<LumiiResponse>(lumiiEndpoint, {
          message: question,
          history: previousMessages,
          scope: "estoque",
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
              : buildFallbackLumiiResponse(question);
          setChatMessages([...optimisticMessages, { role: "assistant", content: answer }]);
        }
      } catch (error) {
        console.error("Erro ao consultar LUMII-IA, usando resposta local:", error);
        setChatMessages([
          ...optimisticMessages,
          { role: "assistant", content: buildFallbackLumiiResponse(question) },
        ]);
      } finally {
        setIsLumiiTyping(false);
      }
    },
    [buildFallbackLumiiResponse, chatMessages, isLumiiTyping, lumiiEndpoint],
  );

  const insightText =
    stats.riscoVariedade.saldo <= 0
      ? `Detectamos saldo zerado para ${stats.riscoVariedade.nome}. Vale priorizar reposiÃ§Ã£o imediata para evitar ruptura nas lojas.`
      : `Detectamos menor cobertura para ${stats.riscoVariedade.nome}. Com ${formatQuantity(stats.riscoVariedade.saldo)} disponÃ­veis, vale programar reposiÃ§Ã£o nas prÃ³ximas 48h.`;

  return (
    <section className="mx-auto max-w-7xl space-y-8 pb-20 text-gray-100">
      <header className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-tr from-yellow-500 to-green-300 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a1f12]">
              <Banana size={20} className="text-yellow-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Lumii Monitora: GestÃ£o de Estoque</h2>
            <p className="text-sm text-gray-400">Saldo e movimentaÃ§Ãµes de bananas em tempo real.</p>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-3 md:w-auto md:justify-end">
          <button
            type="button"
            onClick={() => void buscarEstoque("refresh")}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-green-300 transition-all hover:bg-white/10 shadow-[0_0_15px_rgba(74,222,128,0.1)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Sincronizar Carga
          </button>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition-all hover:bg-emerald-500/20"
          >
            Nova MovimentaÃ§Ã£o
          </button>
        </div>
      </header>

      {pageError ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm ${
            feedback.tone === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-300"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GlassCard
          title="Saldo em Estoque"
          value={carregando ? "Carregando..." : formatQuantity(stats.saldoAtual)}
          subtitle="Volume total consolidado."
          icon={<Box size={24} />}
          colorClass="text-yellow-400"
          trend={stats.saldoAtual >= 0 ? "up" : "down"}
        />
        <GlassCard
          title="SaÃ­das Recentes"
          value={carregando ? "Carregando..." : formatQuantity(stats.totalSaidas)}
          subtitle="Fluxo acumulado das saÃ­das registradas."
          icon={<ShoppingCart size={24} />}
          colorClass="text-orange-400"
          trend="neutral"
        />
        <GlassCard
          title="Variedade LÃ­der"
          value={stats.topVariedade.nome.split(" ").pop() ?? stats.topVariedade.nome}
          subtitle={`${formatQuantity(stats.topVariedade.saldo)} disponÃ­veis.`}
          icon={<Banana size={24} />}
          colorClass="text-emerald-400"
          trend="up"
        />
      </div>

      <section className="grid grid-cols-1 gap-8 pb-8 lg:grid-cols-2">
        <div
          ref={historySectionRef}
          className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md"
        >
          <h3 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
            <History size={18} className="text-green-400" />
            Fluxo de MovimentaÃ§Ã£o
          </h3>
          <div className="space-y-4">
            {carregando ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-400">
                Carregando movimentaÃ§Ãµes...
              </div>
            ) : historico.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-400">
                Nenhum movimento encontrado.
              </div>
            ) : (
              historico.map((item, index) => {
                const isEntrada = normalizeText(item.tipo ?? "") === "ENTRADA";
                return (
                  <div
                    key={`${item.data ?? "sem-data"}-${item.produto ?? "sem-produto"}-${index}`}
                    className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-xl p-2 ${
                          isEntrada
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {isEntrada ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white transition-colors group-hover:text-green-400">
                          {item.produto || "Sem produto"}
                        </p>
                        <p className="text-[10px] uppercase text-gray-500">
                          {(item.loja || item.arquivo || "OperaÃ§Ã£o manual").toString()} Â· {formatDate(item.data)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-black tabular-nums ${
                          isEntrada ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isEntrada ? "+" : "-"}
                        {formatQuantity(Number(item.quant ?? 0), item.unidade || "KG")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
              <PieChart size={18} className="text-yellow-400" />
              DistribuiÃ§Ã£o de Saldo
            </h3>
            <div className="space-y-6">
              {stats.ranking.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-400">
                  Sem variedades disponÃ­veis para comparar.
                </div>
              ) : (
                stats.ranking.map((item) => {
                  const percentage = stats.saldoAtual === 0 ? 0 : (item.saldo / stats.saldoAtual) * 100;
                  return (
                    <div key={item.nome} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-gray-400">{item.nome}</span>
                        <span className="font-mono text-white">{formatQuantity(item.saldo)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000"
                          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
 
          <div className="group relative overflow-hidden rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg">
            <div className="absolute right-0 top-0 p-2 opacity-20 transition-opacity group-hover:opacity-40">
              <MessageCircleMore size={60} className="text-emerald-500" />
            </div>

            <div className="relative z-10 mb-6 flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-400">
                <Sparkles size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-emerald-300">Lumii InteligÃªncia</h4>
                <p className="text-xs italic leading-relaxed text-emerald-100/70">{insightText}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/60">
                  Ãšltima atualizaÃ§Ã£o: {formatDateTime(historico[0]?.data)}
                </p>
              </div>
            </div>

            <div className="relative z-10 space-y-4 border-t border-emerald-500/10 pt-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="relative" ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu((prev) => !prev);
                      setShowLumiiMenu(false);
                    }}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-bold uppercase transition-all ${
                      showExportMenu
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        : "border-white/10 bg-white/5 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    }`}
                  >
                    <Download size={14} />
                    Exportar MovimentaÃ§Ãµes
                  </button>

                  {showExportMenu ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <button
                        type="button"
                        onClick={() => void exportarPng()}
                        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[10px] font-bold uppercase text-emerald-100/80 transition-all hover:bg-emerald-500/20"
                      >
                        <ImageIcon size={14} className="text-emerald-500" />
                        PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => void exportarExcel()}
                        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[10px] font-bold uppercase text-emerald-100/80 transition-all hover:bg-emerald-500/20"
                      >
                        <FileSpreadsheet size={14} className="text-emerald-500" />
                        Excel
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="relative" ref={lumiiMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLumiiMenu((prev) => !prev);
                      setShowExportMenu(false);
                    }}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-bold uppercase transition-all ${
                      showLumiiMenu
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        : "border-white/10 bg-white/5 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    }`}
                  >
                    <Bot size={14} />
                    Perguntar a Lumii
                  </button>

                  {showLumiiMenu ? (
                    <div className="mt-2 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      {LUMII_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => {
                            setIsChatOpen(true);
                            setShowLumiiMenu(false);
                            void sendLumiiMessage(question);
                          }}
                          className="group/q flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-left transition-all hover:bg-emerald-500/20"
                        >
                          <span className="text-[10px] font-semibold text-emerald-100/80 group-hover/q:text-emerald-100">
                            {question}
                          </span>
                          <ChevronRight
                            size={12}
                            className="shrink-0 text-emerald-500 transition-transform group-hover/q:translate-x-1"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                  <BarChart3 size={14} />
                  Leitura rÃ¡pida da operaÃ§Ã£o
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm text-gray-300 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Entradas</p>
                    <p className="mt-2 text-lg font-bold text-white">{formatQuantity(stats.totalEntradas)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">SaÃ­das</p>
                    <p className="mt-2 text-lg font-bold text-white">{formatQuantity(stats.totalSaidas)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Risco</p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {stats.riscoVariedade.nome === "Sem dados"
                        ? "Sem alerta"
                        : stats.riscoVariedade.nome.replace("BANANA ", "")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setIsChatOpen((prev) => !prev)}
        className="fixed bottom-8 right-8 z-[110] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-all hover:scale-110 active:scale-95"
      >
        <div className="animate-ping-3 absolute inset-0 rounded-full bg-green-400/20" />
        {isChatOpen ? <X size={28} className="relative z-10" /> : <Bot size={32} className="relative z-10" />}
      </button>

      {isChatOpen ? (
        <div className="fixed bottom-28 right-8 z-[100] flex h-[550px] w-[400px] flex-col overflow-hidden rounded-[32px] border border-white/15 bg-[#07130d]/95 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-8 duration-300">
          <header className="flex items-center justify-between border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-200">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Chat da Lumii</h2>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-400">
                  GestÃ£o de Estoque
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
              <div className="flex h-full flex-col items-center justify-center space-y-4 px-4 text-center">
                <div className="rounded-full border border-emerald-500/10 bg-emerald-500/5 p-4 text-emerald-400">
                  <Bot size={40} />
                </div>
                <p className="italic text-gray-500">
                  &quot;Lumii, como estÃ¡ o saldo de bananas hoje?&quot;
                </p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[85%] rounded-[20px] px-4 py-2 ${bubbleClass(message.role)}`}>
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {isLumiiTyping ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 animate-pulse">
                <Bot size={14} />
                Lumii estÃ¡ analisando...
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2 border-t border-white/10 bg-black/20 p-4">
            <input
              value={currentInput}
              onChange={(event) => setCurrentInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendLumiiMessage(currentInput);
                }
              }}
              placeholder="DÃºvidas sobre o estoque..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-green-500"
            />
            <button
              type="button"
              onClick={() => void sendLumiiMessage(currentInput)}
              className="rounded-xl bg-emerald-500 p-2 text-black transition-colors hover:bg-emerald-400 active:scale-95"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </div>
      ) : null}

      {modalAberto ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !salvandoMovimentacao && setModalAberto(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0b1f15] p-6 shadow-2xl animate-in zoom-in duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Registrar MovimentaÃ§Ã£o</h3>
                  <p className="text-xs text-gray-400">Atualize o estoque sem sair do dashboard.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={(event) => void handleSalvarMovimentacao(event)}>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Produto
                </label>
                <input
                  value={produto}
                  onChange={(event) => setProduto(event.target.value)}
                  placeholder="Ex: Banana Nanica"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Quantidade (kg)
                  </label>
                  <input
                    value={quantidade}
                    onChange={(event) => setQuantidade(event.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Tipo
                  </label>
                  <select
                    value={tipo}
                    onChange={(event) => setTipo(event.target.value as "entrada" | "saida")}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">SaÃ­da</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition-all hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoMovimentacao}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvandoMovimentacao ? "Salvando..." : "Salvar movimentaÃ§Ã£o"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
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

