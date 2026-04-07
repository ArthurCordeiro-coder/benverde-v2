"use client";

import api from "@/lib/api";
import { buildLojaOptions, getLojaByLabel, LOJAS_SISTEMA } from "@/lib/lojas";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banana,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Store,
  Trash2,
} from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

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

type EstoqueResponse = {
  saldo: number;
  historico: Movimentacao[];
};

type Feedback = {
  tone: "success" | "error";
  text: string;
} | null;

type ApiError = {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
};

type EstoqueFormState = {
  loja: string;
  produto: string;
  quantidade: string;
  tipo: "entrada" | "saida";
};

function createInitialForm(): EstoqueFormState {
  return {
    loja: "",
    produto: "",
    quantidade: "",
    tipo: "entrada",
  };
}

function normalizeTipo(value: string | null | undefined): "entrada" | "saida" | "desconhecido" {
  const tipo = String(value ?? "").trim().toLowerCase();
  if (tipo === "entrada" || tipo === "saida") {
    return tipo;
  }
  return "desconhecido";
}

function formatQuantity(value: number, unit = "kg"): string {
  const hasDecimals = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return `${formatted} ${unit}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
}

function getErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as ApiError | undefined)?.response?.data?.detail;
  const status = (error as ApiError | undefined)?.response?.status;

  if (status === 401) {
    return "Sua sessão expirou. Faça login novamente para continuar.";
  }

  return typeof detail === "string" && detail.trim() ? detail : fallback;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-md">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-emerald-300">
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
    </div>
  );
}

export default function EstoquePage() {
  const [saldo, setSaldo] = useState(0);
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pageError, setPageError] = useState("");
  const [filterLoja, setFilterLoja] = useState("Todas");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [form, setForm] = useState<EstoqueFormState>(() => createInitialForm());

  const carregarEstoque = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await api.get<EstoqueResponse>("/api/estoque/saldo");
      const saldoAtual = Number(response.data?.saldo ?? 0);
      const historicoAtual = Array.isArray(response.data?.historico) ? response.data.historico : [];

      historicoAtual.sort((left, right) => {
        const rightTime = new Date(right.data ?? "").getTime();
        const leftTime = new Date(left.data ?? "").getTime();

        if (Number.isNaN(rightTime) && Number.isNaN(leftTime)) {
          return (right.id ?? 0) - (left.id ?? 0);
        }
        if (Number.isNaN(rightTime)) {
          return -1;
        }
        if (Number.isNaN(leftTime)) {
          return 1;
        }

        return rightTime - leftTime;
      });

      setSaldo(Number.isFinite(saldoAtual) ? saldoAtual : 0);
      setHistorico(historicoAtual);
    } catch (error) {
      setPageError(getErrorMessage(error, "Não foi possível carregar o estoque."));
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

  const metrics = useMemo(() => {
    const entradas = historico
      .filter((item) => normalizeTipo(item.tipo) === "entrada")
      .reduce((total, item) => total + Number(item.quant ?? 0), 0);

    const saidas = historico
      .filter((item) => normalizeTipo(item.tipo) === "saida")
      .reduce((total, item) => total + Number(item.quant ?? 0), 0);

    const ranking = new Map<string, number>();
    for (const item of historico) {
      const nome = String(item.produto ?? "").trim();
      if (!nome) {
        continue;
      }

      const sinal = normalizeTipo(item.tipo) === "saida" ? -1 : 1;
      ranking.set(nome, (ranking.get(nome) ?? 0) + Number(item.quant ?? 0) * sinal);
    }

    const topProduct =
      Array.from(ranking.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;

    const lojasAtivas = new Set(
      historico
        .map((item) => String(item.loja ?? "").trim())
        .filter((item) => item.length > 0),
    ).size;

    return {
      entradas,
      saidas,
      lojasAtivas,
      topProduct,
    };
  }, [historico]);

  const updateFormField = (field: keyof EstoqueFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(createInitialForm());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const loja = getLojaByLabel(form.loja);
    if (!loja) {
      setFeedback({ tone: "error", text: "Selecione a loja da movimentação." });
      return;
    }

    const produto = form.produto.trim();
    if (!produto) {
      setFeedback({ tone: "error", text: "Informe o produto movimentado." });
      return;
    }

    const quant = Number(form.quantidade);
    if (!Number.isFinite(quant) || quant <= 0) {
      setFeedback({ tone: "error", text: "Informe uma quantidade válida maior que zero." });
      return;
    }

    setIsSaving(true);

    try {
      await api.post("/api/estoque/movimentacao", {
        loja: loja.label,
        produto,
        quant,
        tipo: form.tipo,
        unidade: "KG",
        arquivo: "manual",
      });

      setFeedback({ tone: "success", text: "Movimentação salva com sucesso." });
      resetForm();
      await carregarEstoque();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error, "Não foi possível salvar a movimentação."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja remover esta movimentação manual?")) {
      return;
    }

    setDeleteId(id);
    setFeedback(null);

    try {
      await api.delete(`/api/estoque/movimentacao/${id}`);
      setFeedback({ tone: "success", text: "Movimentação removida com sucesso." });
      await carregarEstoque();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error, "Não foi possível remover a movimentação."),
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
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-3 text-yellow-300">
                  <Banana size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-300">
                    Operação Real
                  </p>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Registro de Estoque
                  </h1>
                </div>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-gray-300">
                Esta página agora consulta e grava dados reais usando as rotas
                {" "}
                <code className="rounded bg-black/20 px-1.5 py-0.5 text-emerald-200">/api/estoque/saldo</code>
                {" "}
                e
                {" "}
                <code className="rounded bg-black/20 px-1.5 py-0.5 text-emerald-200">/api/estoque/movimentacao</code>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={() => void carregarEstoque()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sincronizar estoque
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

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Saldo Atual"
            value={isLoading ? "..." : formatQuantity(saldo)}
            subtitle="Saldo consolidado na tabela de estoque manual."
            icon={<Banana size={20} />}
          />
          <MetricCard
            title="Entradas"
            value={formatQuantity(metrics.entradas)}
            subtitle="Volume acumulado de entradas registradas."
            icon={<ArrowUpRight size={20} />}
          />
          <MetricCard
            title="Saídas"
            value={formatQuantity(metrics.saidas)}
            subtitle="Volume acumulado de saídas registradas."
            icon={<ArrowDownRight size={20} />}
          />
          <MetricCard
            title="Lojas Ativas"
            value={String(metrics.lojasAtivas)}
            subtitle={
              metrics.topProduct
                ? `${metrics.topProduct[0]} lidera com ${formatQuantity(metrics.topProduct[1])}.`
                : "Sem variedade líder no momento."
            }
            icon={<Store size={20} />}
          />
        </section>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-emerald-300">
                <ArrowUpRight size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Nova movimentação</h2>
                <p className="text-sm text-gray-400">
                  O formulário salva direto na base real usada pelo restante do sistema.
                </p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Loja
                  </label>
                  <select
                    value={form.loja}
                    onChange={(event) => updateFormField("loja", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  >
                    <option value="">Selecione uma loja</option>
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
                    value={form.tipo}
                    onChange={(event) => updateFormField("tipo", event.target.value as "entrada" | "saida")}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Produto
                  </label>
                  <input
                    value={form.produto}
                    onChange={(event) => updateFormField("produto", event.target.value)}
                    placeholder="Ex: Banana Nanica"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Quantidade (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantidade}
                    onChange={(event) => updateFormField("quantidade", event.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/80">
                    Destino da operação
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {form.loja || "Selecione uma loja para registrar a movimentação"}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-[#082015] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Salvar movimentação
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-yellow-300">
                  <Store size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Lojas cadastradas</h2>
                  <p className="text-sm text-gray-400">
                    Lista fixa usada nos selects e filtros desta página.
                  </p>
                </div>
              </div>

              <div className="flex max-h-[360px] flex-wrap gap-2 overflow-y-auto pr-1">
                {LOJAS_SISTEMA.map((loja) => (
                  <span
                    key={loja.id}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200"
                  >
                    {loja.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-lg font-bold text-white">Filtros rápidos</h2>
              <p className="mt-1 text-sm text-gray-400">
                Consulte o histórico por loja e tipo de movimentação.
              </p>

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
                    <option value="saida">Saída</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Histórico de estoque</h2>
              <p className="text-sm text-gray-400">
                {filteredHistorico.length} movimentação(ões) visíveis com os filtros atuais.
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
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-400" colSpan={7}>
                      Carregando histórico...
                    </td>
                  </tr>
                ) : filteredHistorico.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-400" colSpan={7}>
                      Nenhuma movimentação encontrada para os filtros selecionados.
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
                            {deleteId === item.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
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
