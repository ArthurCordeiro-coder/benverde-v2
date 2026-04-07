"use client";

import api from "@/lib/api";
import { buildLojaOptions, getLojaByLabel } from "@/lib/lojas";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banana,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

type Movimentacao = {
  id: number;
  data: string | null;
  tipo: string | null;
  produto: string | null;
  quant: number;
  unidade: string | null;
  loja: string | null;
  arquivo: string | null;
};

type EstoqueResponse = { saldo: number; historico: Movimentacao[] };
type UploadPdfResponse = {
  arquivo?: string;
  processamento?: "mita-ai";
  resultado?: Array<{ produto?: string; quant?: number }>;
};
type Feedback = { tone: "success" | "error"; text: string } | null;
type ApiError = { response?: { status?: number; data?: { detail?: string } } };
type Row = {
  id: number;
  sel: boolean;
  produto: string;
  quant: string;
  loja: string;
  tipo: "entrada" | "saida";
  origem: string;
};

const DEFAULT_PRODUCTS = ["BANANA NANICA", "BANANA DA TERRA", "BANANA PRATA", "BANANA MACA"];
const ENTRADA_LABEL = "Entrada";

const resolveLojaByTipo = (tipo: Row["tipo"], loja = "") => (tipo === "entrada" ? ENTRADA_LABEL : loja);

const createRow = (overrides: Partial<Row> = {}): Row => {
  const base: Row = {
    id: Date.now() + Math.floor(Math.random() * 100000),
    sel: false,
    produto: "",
    quant: "",
    loja: "",
    tipo: "entrada",
    origem: "manual",
    ...overrides,
  };

  return {
    ...base,
    loja: resolveLojaByTipo(base.tipo, base.loja),
  };
};

const createRows = (count: number, overrides: Partial<Row> = {}) =>
  Array.from({ length: count }, () => createRow(overrides));

const isFilledRow = (row: Row) => Boolean(row.produto.trim() || row.quant.trim());

const normalizeTipo = (value: string | null | undefined) => {
  const tipo = String(value ?? "").trim().toLowerCase();
  return tipo === "entrada" || tipo === "saida" ? tipo : "desconhecido";
};

const formatQuantity = (value: number, unit = "kg") => {
  const decimals = Math.abs(value % 1) > 0.001;
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals ? 1 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })} ${unit}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("pt-BR");
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const detail = (error as ApiError | undefined)?.response?.data?.detail;
  const status = (error as ApiError | undefined)?.response?.status;
  if (status === 401) return "Sua sessao expirou. Faca login novamente para continuar.";
  return typeof detail === "string" && detail.trim() ? detail : fallback;
};

export default function EstoqueClient() {
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [rows, setRows] = useState<Row[]>(() => createRows(5));
  const [bulkLoja, setBulkLoja] = useState("");
  const [bulkTipo, setBulkTipo] = useState<"entrada" | "saida">("entrada");
  const [filterLoja, setFilterLoja] = useState("Todas");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pageError, setPageError] = useState("");

  const carregarEstoque = useCallback(async () => {
    setIsLoading(true);
    setPageError("");
    try {
      const response = await api.get<EstoqueResponse>("/api/estoque/saldo");
      const nextHistorico = Array.isArray(response.data?.historico) ? response.data.historico : [];
      nextHistorico.sort((left, right) => {
        const rightTime = new Date(right.data ?? "").getTime();
        const leftTime = new Date(left.data ?? "").getTime();
        if (Number.isNaN(rightTime) && Number.isNaN(leftTime)) return right.id - left.id;
        if (Number.isNaN(rightTime)) return -1;
        if (Number.isNaN(leftTime)) return 1;
        return rightTime - leftTime;
      });
      setHistorico(nextHistorico);
    } catch (error) {
      setPageError(getErrorMessage(error, "Nao foi possivel carregar o historico de estoque."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarEstoque();
  }, [carregarEstoque]);

  const lojaOptions = useMemo(
    () => buildLojaOptions(historico.map((item) => item.loja)),
    [historico],
  );
  const saidaLojaOptions = useMemo(
    () => lojaOptions.filter((loja) => loja !== ENTRADA_LABEL),
    [lojaOptions],
  );

  const productOptions = useMemo(() => {
    const unique = new Set(DEFAULT_PRODUCTS);
    historico.forEach((item) => {
      const produto = String(item.produto ?? "").trim();
      if (produto) unique.add(produto);
    });
    return Array.from(unique).sort((left, right) => left.localeCompare(right, "pt-BR"));
  }, [historico]);

  const filteredHistorico = useMemo(
    () =>
      historico.filter((item) => {
        const tipo = normalizeTipo(item.tipo);
        const matchLoja = filterLoja === "Todas" || item.loja === filterLoja;
        const matchTipo = filterTipo === "Todos" || tipo === filterTipo;
        return matchLoja && matchTipo;
      }),
    [filterLoja, filterTipo, historico],
  );

  const selAll = rows.length > 0 && rows.every((row) => row.sel);

  const updateRow = (id: number, field: keyof Row, value: string | boolean) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;

        if (field === "tipo") {
          const tipo = value as Row["tipo"];
          return {
            ...row,
            tipo,
            loja: tipo === "entrada" ? ENTRADA_LABEL : row.loja === ENTRADA_LABEL ? bulkLoja : row.loja,
          };
        }

        if (field === "loja") {
          return {
            ...row,
            loja: row.tipo === "entrada" ? ENTRADA_LABEL : String(value),
          };
        }

        return { ...row, [field]: value };
      }),
    );
  };

  const handleToggleAll = () => {
    const nextValue = !selAll;
    setRows((current) => current.map((row) => ({ ...row, sel: nextValue })));
  };

  const handleBulkLoja = (value: string) => {
    setBulkLoja(value);
    setRows((current) =>
      current.map((row) => ({
        ...row,
        loja: row.tipo === "entrada" ? ENTRADA_LABEL : value,
      })),
    );
  };

  const handleBulkTipo = (value: "entrada" | "saida") => {
    setBulkTipo(value);
    setRows((current) =>
      current.map((row) => ({
        ...row,
        tipo: value,
        loja: value === "entrada" ? ENTRADA_LABEL : row.loja === ENTRADA_LABEL ? bulkLoja : row.loja,
      })),
    );
  };

  const addRow = () => {
    setRows((current) => [...current, createRow({ loja: bulkLoja, tipo: bulkTipo })]);
  };

  const removeSelected = () => {
    const remaining = rows.filter((row) => !row.sel);
    if (remaining.length === rows.length) {
      setFeedback({ tone: "error", text: "Selecione ao menos uma linha para remover." });
      return;
    }
    setRows(remaining.length > 0 ? remaining : createRows(5, { loja: bulkLoja, tipo: bulkTipo }));
    setFeedback(null);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post<UploadPdfResponse>("/api/estoque/upload-pdf", formData);
      const resultado = Array.isArray(response.data?.resultado) ? response.data.resultado : [];
      if (resultado.length === 0) {
        setFeedback({
          tone: "error",
          text: "O PDF foi lido, mas nenhuma linha valida de banana foi encontrada.",
        });
        return;
      }

      const origemUpload = response.data?.arquivo ? `mita-ai:${response.data.arquivo}` : "mita-ai";

      const importedRows = resultado.map((item) =>
        createRow({
          produto: String(item.produto ?? "").trim(),
          quant: item.quant != null ? String(item.quant) : "",
          loja: ENTRADA_LABEL,
          tipo: "entrada",
          origem: origemUpload,
        }),
      );

      const nextRows = [...rows.filter(isFilledRow), ...importedRows];
      const padding = nextRows.length >= 5 ? [] : createRows(5 - nextRows.length, { loja: bulkLoja, tipo: bulkTipo });
      setRows([...nextRows, ...padding]);
      setShowUpload(false);
      setFeedback({
        tone: "success",
        text: `${importedRows.length} linha(s) carregada(s) pela MITA-I. Confira e salve as movimentacoes.`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error, "Nao foi possivel processar o arquivo PDF."),
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const salvarMovimentacoes = async () => {
    setFeedback(null);
    const filledRows = rows.filter(isFilledRow);
    if (filledRows.length === 0) {
      setFeedback({ tone: "error", text: "Nenhuma linha preenchida para salvar." });
      return;
    }

    const invalidRows = filledRows.filter((row) => {
      const quant = Number(row.quant);
      if (!row.produto.trim() || !Number.isFinite(quant) || quant <= 0) {
        return true;
      }
      if (row.tipo === "entrada") {
        return false;
      }
      return !getLojaByLabel(row.loja);
    });

    if (invalidRows.length > 0) {
      setFeedback({
        tone: "error",
        text: "Preencha produto e quantidade em todas as linhas usadas. Nas saidas, selecione uma loja valida.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await api.post(
        "/api/estoque/movimentacao",
        filledRows.map((row) => ({
          loja: row.tipo === "entrada" ? ENTRADA_LABEL : getLojaByLabel(row.loja)?.label ?? row.loja.trim(),
          produto: row.produto.trim(),
          quant: Number(row.quant),
          tipo: row.tipo,
          unidade: "KG",
          arquivo: row.origem || "manual",
        })),
      );

      setRows(createRows(5, { loja: bulkLoja, tipo: bulkTipo }));
      setFeedback({
        tone: "success",
        text: `${filledRows.length} movimentacao(oes) salva(s) com sucesso.`,
      });
      await carregarEstoque();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error, "Nao foi possivel salvar as movimentacoes."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja remover esta movimentacao manual?")) return;
    setDeleteId(id);
    setFeedback(null);
    try {
      await api.delete(`/api/estoque/movimentacao/${id}`);
      setFeedback({ tone: "success", text: "Movimentacao removida com sucesso." });
      await carregarEstoque();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error, "Nao foi possivel remover a movimentacao."),
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.18),_transparent_35%),_#07130d] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-3 text-yellow-300">
                <Banana size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Registro de Estoque</h1>
                <p className="text-sm text-gray-300">
                  Registre entradas e saidas em lote ou use a MITA-I para montar as linhas a partir do PDF.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void carregarEstoque()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar historico
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
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm ${
              feedback.tone === "success"
                ? "border-green-500/25 bg-green-500/10 text-green-200"
                : "border-red-500/25 bg-red-500/10 text-red-200"
            }`}
          >
            {feedback.tone === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {feedback.text}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Movimentacoes em lote</h2>
                <p className="text-sm text-gray-400">Preencha varias linhas e salve tudo de uma vez.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowUpload((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500/20"
              >
                <FileText size={16} />
                Importar PDF
              </button>
            </div>

            {showUpload ? (
              <div className="mb-6 rounded-3xl border border-dashed border-white/15 bg-black/20 p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-300">
                    <UploadCloud size={20} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Leitura de PDF</h3>
                      <p className="text-sm text-gray-400">
                        Envie uma NF-e em PDF. A MITA-I le o arquivo e preenche automaticamente as
                        linhas de entrada.
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(event) => void handleUpload(event)}
                      disabled={isUploading}
                      className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-200 hover:file:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    {isUploading ? (
                      <div className="inline-flex items-center gap-2 text-sm text-emerald-200">
                        <Loader2 size={16} className="animate-spin" />
                        Processando PDF...
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-black/20">
              <div className="grid grid-cols-1 gap-4 border-b border-white/10 p-4 md:grid-cols-[auto_1fr_220px_180px] md:items-end">
                <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={selAll}
                    onChange={handleToggleAll}
                    className="h-4 w-4 rounded border-white/20 bg-black/20 accent-emerald-500"
                  />
                  Selecionar todas
                </label>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Loja (todas as linhas)
                  </label>
                  <select
                    value={bulkTipo === "entrada" ? ENTRADA_LABEL : bulkLoja}
                    onChange={(event) => handleBulkLoja(event.target.value)}
                    disabled={bulkTipo === "entrada"}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <option value={bulkTipo === "entrada" ? ENTRADA_LABEL : ""}>
                      {bulkTipo === "entrada" ? ENTRADA_LABEL : "Escolha uma loja"}
                    </option>
                    {saidaLojaOptions.map((loja) => (
                      <option key={loja} value={loja} className="bg-[#07130d]">
                        {loja}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Tipo (todas as linhas)
                  </label>
                  <select
                    value={bulkTipo}
                    onChange={(event) => handleBulkTipo(event.target.value as "entrada" | "saida")}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saida</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                  {rows.filter(isFilledRow).length} linha(s) preenchida(s)
                </div>
              </div>

              <datalist id="estoque-produtos">
                {productOptions.map((produto) => (
                  <option key={produto} value={produto} />
                ))}
              </datalist>

              <div className="space-y-3 p-4">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[auto_2.2fr_1fr_2fr_1.2fr] md:items-center"
                  >
                    <label className="inline-flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={row.sel}
                        onChange={(event) => updateRow(row.id, "sel", event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/20 accent-emerald-500"
                      />
                      <span className="md:hidden">Selecionar</span>
                    </label>

                    <div>
                      <input
                        list="estoque-produtos"
                        value={row.produto}
                        onChange={(event) => updateRow(row.id, "produto", event.target.value)}
                        placeholder="Ex: Banana Nanica"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400"
                      />
                      <p className="mt-2 text-xs text-gray-500">Origem: {row.origem}</p>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.quant}
                      onChange={(event) => updateRow(row.id, "quant", event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    />

                    <select
                      value={row.tipo === "entrada" ? ENTRADA_LABEL : row.loja}
                      onChange={(event) => updateRow(row.id, "loja", event.target.value)}
                      disabled={row.tipo === "entrada"}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {row.tipo === "entrada" ? (
                        <option value={ENTRADA_LABEL}>{ENTRADA_LABEL}</option>
                      ) : (
                        <>
                          <option value="">Selecione uma loja</option>
                          {saidaLojaOptions.map((loja) => (
                            <option key={loja} value={loja} className="bg-[#07130d]">
                              {loja}
                            </option>
                          ))}
                        </>
                      )}
                    </select>

                    <select
                      value={row.tipo}
                      onChange={(event) => updateRow(row.id, "tipo", event.target.value as Row["tipo"])}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saida</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
              >
                <Plus size={16} />
                Adicionar linha
              </button>

              <button
                type="button"
                onClick={removeSelected}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
              >
                <Trash2 size={16} />
                Remover selecionadas
              </button>

              <button
                type="button"
                onClick={() => void salvarMovimentacoes()}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-[#082015] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar movimentacoes
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-lg font-bold text-white">Filtro rapido</h2>
            <p className="mt-1 text-sm text-gray-400">Consulte o historico por loja e por tipo.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Loja
                </label>
                <select
                  value={filterLoja}
                  onChange={(event) => setFilterLoja(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  <option value="Todas">Todas as lojas</option>
                  {lojaOptions.map((loja) => (
                    <option key={loja} value={loja} className="bg-[#07130d]">
                      {loja}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Tipo
                </label>
                <select
                  value={filterTipo}
                  onChange={(event) => setFilterTipo(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  <option value="Todos">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saida</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Historico de estoque</h2>
              <p className="text-sm text-gray-400">
                {filteredHistorico.length} movimentacao(oes) visiveis com os filtros atuais.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead className="border-b border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Loja</th>
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4 text-center">Tipo</th>
                  <th className="px-6 py-4 text-center">Quantidade</th>
                  <th className="px-6 py-4 text-center">Origem</th>
                  <th className="px-6 py-4 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-400" colSpan={7}>
                      Carregando historico...
                    </td>
                  </tr>
                ) : filteredHistorico.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-400" colSpan={7}>
                      Nenhuma movimentacao encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredHistorico.map((item) => {
                    const tipo = normalizeTipo(item.tipo);
                    const isEntrada = tipo === "entrada";

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.03]">
                        <td className="px-6 py-4 font-mono text-xs text-gray-300">
                          {formatDateTime(item.data)}
                        </td>
                        <td className="px-6 py-4">{item.loja || "-"}</td>
                        <td className="px-6 py-4 font-semibold text-white">{item.produto || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                              isEntrada
                                ? "border-green-500/30 bg-green-500/10 text-green-300"
                                : "border-red-500/30 bg-red-500/10 text-red-300"
                            }`}
                          >
                            {isEntrada ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {tipo === "desconhecido" ? "Desconhecido" : tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-300">
                          {formatQuantity(Number(item.quant ?? 0), item.unidade || "KG")}
                        </td>
                        <td className="px-6 py-4 text-center">{item.arquivo || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={deleteId === item.id}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deleteId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
