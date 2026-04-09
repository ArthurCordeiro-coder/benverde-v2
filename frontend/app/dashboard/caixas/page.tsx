"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import {
  asArray,
  coerceNumber,
  coerceString,
  getApiErrorMessage,
  isRecord,
} from "@/lib/dashboard/client";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import {
  Banana,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Leaf,
  PackageSearch,
  RefreshCw,
  Store,
  TrendingUp,
  X,
} from "lucide-react";

type CaixaRegistro = {
  id: number;
  data: string | null;
  loja: string | null;
  n_loja: number;
  caixas_benverde: number;
  caixas_ccj: number;
  ccj_banca: number;
  ccj_mercadoria: number;
  ccj_retirada: number;
  caixas_bananas: number;
  total: number;
  entregue: "sim" | "nao";
};

type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: "up" | "neutral";
  iconColor?: string;
};

type Feedback = {
  tone: "success" | "error";
  text: string;
} | null;

function normalizeEntregue(value: unknown): "sim" | "nao" {
  return String(value ?? "").trim().toLowerCase() === "sim" ? "sim" : "nao";
}

function sanitizeCaixaRegistro(raw: unknown): CaixaRegistro | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = Math.trunc(coerceNumber(raw.id));
  if (id <= 0) {
    return null;
  }

  return {
    id,
    data: coerceString(raw.data) || null,
    loja: coerceString(raw.loja) || null,
    n_loja: Math.trunc(coerceNumber(raw.n_loja)),
    caixas_benverde: Math.trunc(coerceNumber(raw.caixas_benverde)),
    caixas_ccj: Math.trunc(coerceNumber(raw.caixas_ccj)),
    ccj_banca: Math.trunc(coerceNumber(raw.ccj_banca)),
    ccj_mercadoria: Math.trunc(coerceNumber(raw.ccj_mercadoria)),
    ccj_retirada: Math.trunc(coerceNumber(raw.ccj_retirada)),
    caixas_bananas: Math.trunc(coerceNumber(raw.caixas_bananas)),
    total: Math.trunc(coerceNumber(raw.total)),
    entregue: normalizeEntregue(raw.entregue),
  };
}

function GlassCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  iconColor = "text-emerald-400",
}: GlassCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-2xl border border-white/5 bg-white/5 p-3 shadow-inner ${iconColor}`}>
          {icon}
        </div>
        {trend === "up" && <TrendingUp size={20} className="text-green-400" />}
        {trend === "neutral" && (
          <TrendingUp size={20} className="text-gray-500 opacity-30" />
        )}
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-gray-400">{title}</p>
        <h3 className="mb-2 text-3xl font-bold tracking-tight text-white">{value}</h3>
        <p className="text-xs font-medium text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default function CaixasPage() {
  const [registros, setRegistros] = useState<CaixaRegistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Campos do formulÃ¡rio
  const [loja, setLoja] = useState("");
  const [data, setData] = useState("");
  const [quantidade, setQuantidade] = useState("");

  // Filtros
  const [filterData, setFilterData] = useState("Todas");
  const [filterLoja, setFilterLoja] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");

  // Menu de exportaÃ§Ã£o
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const tableSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const carregarRegistros = async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await api.get("/api/caixas");
      const registrosSanitizados = asArray(response.data)
        .map(sanitizeCaixaRegistro)
        .filter((item): item is CaixaRegistro => item !== null);
      setRegistros(registrosSanitizados);
      setFeedback(null);
    } catch (error) {
      console.error("Erro ao carregar caixas:", error);
      setFeedback({
        tone: "error",
        text: getApiErrorMessage(error, "NÃ£o foi possÃ­vel carregar os registros de caixas."),
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void carregarRegistros("initial");
  }, []);

  const toggleStatus = async (row: CaixaRegistro) => {
    const nextStatus = row.entregue === "sim" ? "nao" : "sim";
    setUpdatingStatusId(row.id);
    try {
      const response = await api.patch(`/api/caixas/${row.id}`, { entregue: nextStatus });
      const updatedRecord = sanitizeCaixaRegistro(
        isRecord(response.data) ? response.data.item : null,
      );

      setRegistros((current) =>
        current.map((item) =>
          item.id === row.id ? updatedRecord ?? { ...item, entregue: nextStatus } : item,
        ),
      );
      setFeedback({
        tone: "success",
        text:
          nextStatus === "sim"
            ? "Status atualizado para entregue."
            : "Status atualizado para nÃ£o entregue.",
      });
    } catch (error) {
      console.error("Erro ao atualizar status da caixa:", error);
      setFeedback({
        tone: "error",
        text: getApiErrorMessage(error, "NÃ£o foi possÃ­vel atualizar o status da caixa."),
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const metrics = useMemo(() => {
    const naoEntregues = registros.filter((d) => d.entregue !== "sim");
    const totalLUMII = naoEntregues.reduce(
      (acc, curr) => acc + (curr.caixas_benverde ?? 0),
      0,
    );
    const totalCCJ = naoEntregues.reduce((acc, curr) => acc + (curr.caixas_ccj ?? 0), 0);
    const totalBananas = naoEntregues.reduce(
      (acc, curr) => acc + (curr.caixas_bananas ?? 0),
      0,
    );

    const storeTotals = naoEntregues.reduce<Record<string, number>>((acc, curr) => {
      if (curr.loja) {
        acc[curr.loja] = (acc[curr.loja] ?? 0) + (curr.total ?? 0);
      }
      return acc;
    }, {});

    const topStore =
      Object.entries(storeTotals).sort((a, b) => b[1] - a[1])[0] ?? ["Nenhuma", 0];

    return { totalLUMII, totalCCJ, totalBananas, topStore };
  }, [registros]);

  const uniqueDates = [
    ...new Set(registros.map((d) => d.data).filter(Boolean)),
  ] as string[];

  const uniqueStores = [
    ...new Set(registros.map((d) => d.loja).filter(Boolean)),
  ] as string[];

  const filteredRows = useMemo(() => {
    return registros.filter((row) => {
      const matchData = filterData === "Todas" || row.data === filterData;
      const matchLoja = filterLoja === "Todas" || row.loja === filterLoja;
      const matchStatus = filterStatus === "Todos" || row.entregue === filterStatus;
      return matchData && matchLoja && matchStatus;
    });
  }, [registros, filterData, filterLoja, filterStatus]);

  const exportarExcel = () => {
    const dataParaExcel = filteredRows.map((row) => ({
      Data: formatarData(row.data),
      Loja: row.loja ?? "-",
      "NÂº Loja": row.n_loja ?? "",
      LUMII: row.caixas_benverde ?? 0,
      CCJ: row.caixas_ccj ?? 0,
      "CCJ Banca": row.ccj_banca ?? 0,
      "CCJ Mercadoria": row.ccj_mercadoria ?? 0,
      "CCJ Retirada": row.ccj_retirada ?? 0,
      Bananas: row.caixas_bananas ?? 0,
      Total: row.total ?? 0,
      Status: row.entregue === "sim" ? "Entregue" : "NÃ£o entregue",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataParaExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Caixas das Lojas");

    // Ajusta largura das colunas automaticamente
    const colWidths = Object.keys(dataParaExcel[0] ?? {}).map((key) => ({
      wch: Math.max(key.length, 12),
    }));
    worksheet["!cols"] = colWidths;

    const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    XLSX.writeFile(workbook, `caixas-lojas-${dataHoje}.xlsx`);
    setIsExportOpen(false);
  };

  const exportarPNG = async () => {
    if (!tableSectionRef.current) return;
    setIsExportOpen(false);

    // Pequeno delay para o dropdown fechar antes de capturar
    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(tableSectionRef.current, {
      backgroundColor: "#0b1f15",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    link.download = `caixas-lojas-${dataHoje}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const formatarData = (valor?: string | null) => {
    if (!valor) return "-";
    const parts = valor.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return valor;
  };

  const handleSalvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const qtd = Number(quantidade);
    if (!loja.trim() || !data || !qtd || qtd <= 0) return;

    setSalvando(true);
    try {
      await api.post("/api/caixas", {
        loja: loja.trim(),
        data,
        total: qtd,
        caixas_benverde: qtd,
      });
      setModalAberto(false);
      setLoja("");
      setData("");
      setQuantidade("");
      setFeedback({ tone: "success", text: "Registro de caixa salvo com sucesso." });
      await carregarRegistros("refresh");
    } catch (error) {
      console.error("Erro ao salvar registro de caixa:", error);
      setFeedback({
        tone: "error",
        text: getApiErrorMessage(error, "NÃ£o foi possÃ­vel salvar o registro de caixa."),
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Lumii */}
      <header className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-tr from-green-500 to-emerald-300 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a1f12]">
              <Leaf size={20} className="text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Oie! Eu sou a Lumii, sua gerente de dados.
            </h2>
            <p className="text-sm text-gray-400">
              Como posso te ajudar hoje com as caixas das lojas?
            </p>
          </div>
        </div>

        <div className="flex w-full gap-3 md:w-auto">
          <button
            type="button"
            onClick={() => void carregarRegistros("refresh")}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-green-300 shadow-[0_0_15px_rgba(74,222,128,0.1)] backdrop-blur-lg transition-all hover:bg-white/10 hover:shadow-[0_0_25px_rgba(74,222,128,0.2)] md:flex-none"
            disabled={isRefreshing}
          >
            {isRefreshing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-2.5 text-sm font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 md:flex-none"
          >
            + Novo Registro
          </button>
        </div>
      </header>

      {feedback ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-400/30 bg-red-500/10 text-red-200"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      {/* Cards de MÃ©tricas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard
          title="LUMII Pendentes"
          value={`${metrics.totalLUMII} un`}
          subtitle="Caixas plÃ¡sticas LUMII."
          icon={<PackageSearch size={24} />}
          trend="up"
          iconColor="text-blue-400"
        />
        <GlassCard
          title="Caixas CCJ"
          value={`${metrics.totalCCJ} un`}
          subtitle="Aguardando retorno."
          icon={<Store size={24} />}
          trend="neutral"
          iconColor="text-amber-500"
        />
        <GlassCard
          title="Caixas Bananas"
          value={`${metrics.totalBananas} un`}
          subtitle="Modelos especÃ­ficos."
          icon={<Banana size={24} />}
          trend="neutral"
          iconColor="text-yellow-400"
        />
        <GlassCard
          title="Maior ConcentraÃ§Ã£o"
          value={String(metrics.topStore[0]).split(" ").pop() ?? "â€”"}
          subtitle={`${metrics.topStore[1]} caixas nesta loja.`}
          icon={<TrendingUp size={24} />}
          trend="up"
          iconColor="text-emerald-400"
        />
      </div>

      {/* SeÃ§Ã£o da Tabela */}
      <section ref={tableSectionRef} className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-2xl">
        {/* Barra de Filtros */}
        <div className="flex flex-col gap-4 border-b border-white/5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <PackageSearch size={20} className="text-green-400" />
            <h3 className="text-lg font-semibold text-white">Registros Atuais</h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Filtro por Data */}
            <div className="relative">
              <select
                value={filterData}
                onChange={(e) => setFilterData(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-green-500/50 [&>option]:bg-[#0b1f15] [&>option]:text-white"
              >
                <option value="Todas">Todas as Datas</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {formatarData(d)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
              />
            </div>

            {/* Filtro por Loja */}
            <div className="relative">
              <select
                value={filterLoja}
                onChange={(e) => setFilterLoja(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-green-500/50 [&>option]:bg-[#0b1f15] [&>option]:text-white"
              >
                <option value="Todas">Todas as Lojas</option>
                {uniqueStores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
              />
            </div>

            {/* Filtro por Status */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-green-500/50 [&>option]:bg-[#0b1f15] [&>option]:text-white"
              >
                <option value="Todos">Todos os Status</option>
                <option value="sim">Entregue</option>
                <option value="nao">NÃ£o Entregue</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
              />
            </div>

            {/* BotÃ£o Exportar com Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-white/10 ${
                  isExportOpen ? "border-green-500/30 bg-white/10 text-green-300" : ""
                }`}
              >
                <Download size={16} />
                Exportar
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1f15]/95 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={exportarExcel}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-300 transition-all hover:bg-white/5 hover:text-green-400"
                  >
                    <FileSpreadsheet size={16} />
                    Exportar como Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportarPNG()}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-300 transition-all hover:bg-white/5 hover:text-green-400"
                  >
                    <ImageIcon size={16} />
                    Exportar como PNG
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Data
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Loja
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  LUMII
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  CCJ
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Bananas
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Total
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500" colSpan={7}>
                    Carregando registros...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500" colSpan={7}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className="group transition-all hover:bg-white/[0.04]"
                    >
                      <td className="px-6 py-5">
                        <span className="font-mono text-sm text-gray-400">
                          {formatarData(row.data)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-gray-100 transition-colors group-hover:text-green-400">
                          {row.loja ?? "-"}
                        </div>
                        {row.n_loja != null && (
                          <div className="text-[10px] font-medium text-gray-500">
                            Loja NÂº {row.n_loja}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-gray-300">
                        {row.caixas_benverde ?? 0}
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-gray-300">
                        {row.caixas_ccj ?? 0}
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-gray-300">
                        {row.caixas_bananas ?? 0}
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-green-400">
                        {row.total ?? 0}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          type="button"
                          onClick={() => void toggleStatus(row)}
                          disabled={updatingStatusId === row.id}
                          className={`inline-flex min-w-[90px] items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                            row.entregue === "sim"
                              ? "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20"
                              : "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {updatingStatusId === row.id ? (
                            "Atualizando..."
                          ) : row.entregue === "sim" ? (
                            <>
                              <Check size={12} /> Sim
                            </>
                          ) : (
                            <>
                              <X size={12} /> NÃ£o
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer da Tabela */}
        <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] p-6 text-[10px] font-bold uppercase tracking-widest text-gray-600">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            Total de Registros: {filteredRows.length}
          </div>
          <div>Lumii Gerenciamento Inteligente</div>
        </div>
      </section>

      {/* Modal de Novo Registro */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0b1f15]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-5">
              <h2 className="text-lg font-semibold text-white">Novo Registro de Caixa</h2>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSalvar}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Loja</label>
                <input
                  type="text"
                  value={loja}
                  onChange={(e) => setLoja(e.target.value)}
                  placeholder="Ex: Semar Centro"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

