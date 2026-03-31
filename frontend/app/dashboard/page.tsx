"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Banana,
  Leaf,
  PackageSearch,
  Sparkles,
  Tags,
  TrendingUp,
  UploadCloud,
} from "lucide-react";

import api from "@/lib/api";

type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend: "up" | "down" | "neutral";
};

type DashboardSummary = {
  saldoEstoque: number;
  caixasDisponiveis: number;
  precoMedio: number;
  caixasRegistradas: number;
  precosRegistrados: number;
};

type ImportJobStatus = "queued" | "processing" | "completed" | "failed";

type ImportJobResponse = {
  job_id: string;
  status: ImportJobStatus;
  total_files: number;
  processed_files: number;
  remaining_files: number;
  saved_records: number;
  progress_percent: number;
  eta_seconds: number | null;
  elapsed_seconds: number | null;
  current_file: string | null;
  error_message: string | null;
  recent_logs: string[];
  started_at: string | null;
  last_heartbeat_at: string | null;
  finished_at: string | null;
};

type ImportJobState = {
  jobId: string | null;
  status: ImportJobStatus | null;
  progressPercent: number;
  processedFiles: number;
  totalFiles: number;
  etaSeconds: number | null;
  elapsedSeconds: number | null;
  savedRecords: number;
  currentFile: string | null;
  lastSuccessfulPollAt: number | null;
  errorMessage: string | null;
  recentLogs: string[];
  startedAt: string | null;
  networkError: string | null;
};

const POLL_INTERVAL_MS = 4000;
const NETWORK_ERROR_COOLDOWN_MS = 15 * 60 * 1000;

const INITIAL_IMPORT_JOB_STATE: ImportJobState = {
  jobId: null,
  status: null,
  progressPercent: 0,
  processedFiles: 0,
  totalFiles: 0,
  etaSeconds: null,
  elapsedSeconds: null,
  savedRecords: 0,
  currentFile: null,
  lastSuccessfulPollAt: null,
  errorMessage: null,
  recentLogs: [],
  startedAt: null,
  networkError: null,
};

function GlassCard({ title, value, subtitle, icon, trend }: GlassCardProps) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

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

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "Calculando...";
  }

  if (seconds <= 0) {
    return "Menos de 1 min";
  }

  const totalMinutes = Math.ceil(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${totalMinutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function mapImportJobResponse(
  payload: ImportJobResponse,
  lastSuccessfulPollAt: number,
): ImportJobState {
  return {
    jobId: payload.job_id,
    status: payload.status,
    progressPercent: Number(payload.progress_percent ?? 0),
    processedFiles: Number(payload.processed_files ?? 0),
    totalFiles: Number(payload.total_files ?? 0),
    etaSeconds: payload.eta_seconds ?? null,
    elapsedSeconds: payload.elapsed_seconds ?? null,
    savedRecords: Number(payload.saved_records ?? 0),
    currentFile: payload.current_file ?? null,
    lastSuccessfulPollAt,
    errorMessage: payload.error_message ?? null,
    recentLogs: Array.isArray(payload.recent_logs) ? payload.recent_logs : [],
    startedAt: payload.started_at ?? null,
    networkError: null,
  };
}

export default function DashboardHome() {
  const [saldoEstoque, setSaldoEstoque] = useState<number | null>(null);
  const [caixasDisponiveis, setCaixasDisponiveis] = useState<number | null>(null);
  const [precoMedio, setPrecoMedio] = useState<number | null>(null);
  const [caixasRegistradas, setCaixasRegistradas] = useState(0);
  const [precosRegistrados, setPrecosRegistrados] = useState(0);
  const [importJob, setImportJob] = useState<ImportJobState>(INITIAL_IMPORT_JOB_STATE);
  const handledTerminalStatusRef = useRef<ImportJobStatus | null>(null);

  const buscarResumo = useCallback(async (): Promise<DashboardSummary> => {
    const [estoqueResponse, caixasResponse, precosResponse] = await Promise.all([
      api.get("/api/estoque/saldo"),
      api.get("/api/caixas"),
      api.get("/api/precos"),
    ]);

    const saldo = Number(estoqueResponse.data?.saldo ?? 0);
    const saldoEstoqueAtual = Number.isFinite(saldo) ? saldo : 0;

    const caixas = Array.isArray(caixasResponse.data) ? caixasResponse.data : [];
    const caixasRegistradasAtual = caixas.length;
    const caixasDisponiveisAtual = caixas.reduce((acc: number, item: Record<string, unknown>) => {
      const quantidade = Number(
        item?.Quantidade ??
          item?.quantidade ??
          item?.caixas_benverde ??
          item?.total ??
          item?.caixas_bananas ??
          0,
      );
      return acc + (Number.isFinite(quantidade) ? quantidade : 0);
    }, 0);

    const precos = Array.isArray(precosResponse.data) ? precosResponse.data : [];
    const precosRegistradosAtual = precos.length;
    const valoresValidos = precos
      .map((item: Record<string, unknown>) => Number(item.Preco ?? item.preco ?? 0))
      .filter((valor: number) => Number.isFinite(valor));
    const precoMedioAtual =
      valoresValidos.length > 0
        ? valoresValidos.reduce((acc: number, valor: number) => acc + valor, 0) /
          valoresValidos.length
        : 0;

    return {
      saldoEstoque: saldoEstoqueAtual,
      caixasDisponiveis: caixasDisponiveisAtual,
      precoMedio: precoMedioAtual,
      caixasRegistradas: caixasRegistradasAtual,
      precosRegistrados: precosRegistradosAtual,
    };
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      const resumo = await buscarResumo();
      setSaldoEstoque(resumo.saldoEstoque);
      setCaixasDisponiveis(resumo.caixasDisponiveis);
      setPrecoMedio(resumo.precoMedio);
      setCaixasRegistradas(resumo.caixasRegistradas);
      setPrecosRegistrados(resumo.precosRegistrados);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    }
  }, [buscarResumo]);

  const isImportActive = importJob.status === "queued" || importJob.status === "processing";
  const isImportDelayed =
    isImportActive &&
    importJob.elapsedSeconds !== null &&
    importJob.elapsedSeconds >= NETWORK_ERROR_COOLDOWN_MS / 1000;

  const uploadButtonLabel =
    importJob.status === "queued"
      ? "Preparando importacao..."
      : importJob.status === "processing"
        ? "Importacao em andamento..."
        : "Importar Novo Pedido / Progresso";

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    handledTerminalStatusRef.current = null;
    setImportJob({
      ...INITIAL_IMPORT_JOB_STATE,
      status: "queued",
      progressPercent: 0,
      totalFiles: files.length,
    });

    try {
      const response = await api.post<ImportJobResponse>("/api/upload/pedidos", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setImportJob(mapImportJobResponse(response.data, Date.now()));
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { detail?: string } } } | undefined)
        ?.response;
      const detail = response?.data?.detail;
      console.error("Erro ao iniciar importacao de pedidos:", error);
      setImportJob(INITIAL_IMPORT_JOB_STATE);
      window.alert(typeof detail === "string" ? detail : "Nao foi possivel importar os arquivos.");
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    const carregarResumoInicial = async () => {
      try {
        const resumo = await buscarResumo();
        setSaldoEstoque(resumo.saldoEstoque);
        setCaixasDisponiveis(resumo.caixasDisponiveis);
        setPrecoMedio(resumo.precoMedio);
        setCaixasRegistradas(resumo.caixasRegistradas);
        setPrecosRegistrados(resumo.precosRegistrados);
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      }
    };

    void carregarResumoInicial();
  }, [buscarResumo]);

  useEffect(() => {
    if (!importJob.jobId || !isImportActive) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await api.get<ImportJobResponse>(`/api/upload/pedidos/${importJob.jobId}`);
        setImportJob(mapImportJobResponse(response.data, Date.now()));
      } catch (error) {
        console.error("Erro ao consultar status da importacao:", error);
        setImportJob((currentState) => {
          if (!currentState.jobId || (currentState.status !== "queued" && currentState.status !== "processing")) {
            return currentState;
          }

          const lastSuccess = currentState.lastSuccessfulPollAt ?? Date.now();
          const cooldownExceeded = Date.now() - lastSuccess >= NETWORK_ERROR_COOLDOWN_MS;

          return {
            ...currentState,
            networkError: cooldownExceeded
              ? "Sem resposta do servidor ha mais de 15 minutos. A importacao pode ainda estar rodando no backend."
              : null,
          };
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [importJob.jobId, isImportActive, importJob.status, importJob.lastSuccessfulPollAt]);

  useEffect(() => {
    if (importJob.status === "completed" && handledTerminalStatusRef.current !== "completed") {
      handledTerminalStatusRef.current = "completed";
      void carregarDados();
      window.alert(
        `Importacao concluida com sucesso. ${importJob.processedFiles} arquivo(s) processado(s) e ${importJob.savedRecords} registro(s) salvo(s).`,
      );
    }

    if (importJob.status === "failed" && handledTerminalStatusRef.current !== "failed") {
      handledTerminalStatusRef.current = "failed";
      window.alert(importJob.errorMessage || "Falha ao processar a importacao de pedidos.");
    }

    if (importJob.status === "queued" || importJob.status === "processing") {
      handledTerminalStatusRef.current = null;
    }
  }, [
    carregarDados,
    importJob.errorMessage,
    importJob.processedFiles,
    importJob.savedRecords,
    importJob.status,
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 text-gray-100">
      <header className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-tr from-green-500 to-emerald-300 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a1f12]">
              <Leaf size={20} className="text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Oie! Eu sou a Mita, sua gerente de dados.
            </h2>
            <p className="text-sm text-gray-400">Como posso te ajudar hoje na Benverde?</p>
          </div>
        </div>

        <div className="w-full text-left md:w-auto md:text-right">
          <button
            onClick={() => {
              void carregarDados();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-green-300 shadow-[0_0_15px_rgba(74,222,128,0.1)] backdrop-blur-lg transition-all hover:bg-white/10 hover:shadow-[0_0_25px_rgba(74,222,128,0.2)] md:w-auto"
          >
            <Sparkles size={16} />
            Atualizar Dados
          </button>
        </div>
      </header>

      <div className="flex flex-col items-start gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200 shadow-[0_8px_32px_rgba(245,158,11,0.05)] backdrop-blur-xl md:flex-row md:items-center">
        <AlertCircle size={24} className="shrink-0 text-amber-400" />
        <p className="text-sm font-medium">
          Este resumo consolida estoque, caixas e precos ja registrados. Para lancamentos e
          importacoes suportadas, use as telas especificas do dashboard.
        </p>
      </div>

      <input
        type="file"
        multiple
        accept=".pdf,.zip"
        className="hidden"
        id="upload-pedidos"
        onChange={handleUpload}
        disabled={isImportActive}
      />
      <label
        htmlFor="upload-pedidos"
        className={`group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-5 text-gray-300 shadow-sm backdrop-blur-xl transition-all hover:bg-white/[0.06] hover:text-white hover:shadow-lg ${
          isImportActive ? "pointer-events-none cursor-wait opacity-70" : "cursor-pointer"
        }`}
      >
        <div className="rounded-full bg-white/5 p-3 transition-colors group-hover:bg-green-500/20 group-hover:text-green-400">
          <UploadCloud size={24} />
        </div>
        <span className="font-medium">{uploadButtonLabel}</span>
      </label>

      {importJob.jobId ? (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Importacao #{importJob.jobId.slice(0, 8)}
              </p>
              <p className="text-sm text-gray-400">
                {importJob.processedFiles} de {importJob.totalFiles || 0} arquivo(s) concluido(s)
              </p>
            </div>
            <div className="text-sm text-gray-300">
              {importJob.status === "completed"
                ? "Concluida"
                : importJob.status === "failed"
                  ? "Falhou"
                  : "Em acompanhamento"}
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 via-emerald-400 to-lime-300 transition-all duration-500"
              style={{ width: `${Math.max(4, importJob.progressPercent || 0)}%` }}
            />
          </div>

          <div className="grid gap-3 text-sm text-gray-300 md:grid-cols-3">
            <p>Progresso: {importJob.progressPercent.toFixed(1)}%</p>
            <p>Registros salvos: {importJob.savedRecords}</p>
            <p>Tempo restante: {formatDuration(importJob.etaSeconds)}</p>
          </div>

          {importJob.currentFile ? (
            <p className="text-sm text-gray-400">Arquivo atual: {importJob.currentFile}</p>
          ) : null}

          {isImportDelayed ? (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Esta importacao ja passou de 15 minutos. Vamos continuar acompanhando ate o backend
              concluir.
            </p>
          ) : null}

          {importJob.networkError ? (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {importJob.networkError}
            </p>
          ) : null}

          {importJob.recentLogs.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-sm font-semibold text-white">Ultimos eventos</p>
              <div className="space-y-2 text-sm text-gray-400">
                {importJob.recentLogs.slice(-4).map((logLine) => (
                  <p key={logLine}>{logLine}</p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GlassCard
          title="Saldo de Estoque"
          value={
            saldoEstoque !== null ? `${saldoEstoque.toLocaleString("pt-BR")} kg` : "Carregando..."
          }
          subtitle="Calculado a partir das movimentacoes registradas."
          icon={<Banana className="text-yellow-400" size={24} />}
          trend="up"
        />
        <GlassCard
          title="Caixas Disponiveis"
          value={caixasDisponiveis !== null ? `${caixasDisponiveis} un` : "Carregando..."}
          subtitle={`${caixasRegistradas} registro(s) considerado(s) no consolidado.`}
          icon={<PackageSearch className="text-blue-400" size={24} />}
          trend="neutral"
        />
        <GlassCard
          title="Preco Medio"
          value={
            precoMedio !== null ? `R$ ${precoMedio.toFixed(2).replace(".", ",")}` : "Carregando..."
          }
          subtitle={`${precosRegistrados} item(ns) com preco valido na base atual.`}
          icon={<Tags className="text-emerald-400" size={24} />}
          trend="neutral"
        />
      </div>
    </div>
  );
}
