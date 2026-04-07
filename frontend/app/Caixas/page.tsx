"use client";

import api from "@/lib/api";
import { buildLojaOptions, getLojaByLabel, LOJAS_SISTEMA } from "@/lib/lojas";
import {
  AlertCircle,
  Box,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Store,
} from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

type CaixaRegistro = {
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
  entregue: string;
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

type CaixaFormState = {
  loja: string;
  data: string;
  caixasBenverde: string;
  caixasBananas: string;
  caixasCcj: string;
  ccjBanca: string;
  ccjMercadoria: string;
  ccjRetirada: string;
};

function createInitialForm(): CaixaFormState {
  return {
    loja: "",
    data: new Date().toISOString().slice(0, 10),
    caixasBenverde: "",
    caixasBananas: "",
    caixasCcj: "",
    ccjBanca: "",
    ccjMercadoria: "",
    ccjRetirada: "",
  };
}

function parseWholeNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.trunc(parsed);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
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

export default function CaixasPage() {
  const [registros, setRegistros] = useState<CaixaRegistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pageError, setPageError] = useState("");
  const [filterLoja, setFilterLoja] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [form, setForm] = useState<CaixaFormState>(() => createInitialForm());

  const carregarRegistros = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await api.get<CaixaRegistro[]>("/api/caixas");
      const dados = Array.isArray(response.data) ? response.data : [];
      dados.sort((left, right) => {
        const leftValue = left.data ?? "";
        const rightValue = right.data ?? "";
        if (leftValue === rightValue) {
          return String(left.loja ?? "").localeCompare(String(right.loja ?? ""), "pt-BR");
        }
        return rightValue.localeCompare(leftValue);
      });
      setRegistros(dados);
    } catch (error) {
      setPageError(getErrorMessage(error, "Não foi possível carregar os registros de caixas."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarRegistros();
  }, [carregarRegistros]);

  const lojaOptions = useMemo(
    () => buildLojaOptions(registros.map((registro) => registro.loja)),
    [registros],
  );

  const totalsFromForm = useMemo(() => {
    const caixasBenverde = parseWholeNumber(form.caixasBenverde);
    const caixasBananas = parseWholeNumber(form.caixasBananas);
    const caixasCcj = parseWholeNumber(form.caixasCcj);
    const ccjBanca = parseWholeNumber(form.ccjBanca);
    const ccjMercadoria = parseWholeNumber(form.ccjMercadoria);
    const ccjRetirada = parseWholeNumber(form.ccjRetirada);

    return {
      caixasBenverde,
      caixasBananas,
      caixasCcj,
      ccjBanca,
      ccjMercadoria,
      ccjRetirada,
      total: caixasBenverde + caixasBananas + caixasCcj,
      ccjDistribuido: ccjBanca + ccjMercadoria + ccjRetirada,
    };
  }, [form]);

  const filteredRegistros = useMemo(
    () =>
      registros.filter((registro) => {
        const matchLoja = filterLoja === "Todas" || registro.loja === filterLoja;
        const matchStatus =
          filterStatus === "Todos" ||
          (filterStatus === "sim" ? registro.entregue === "sim" : registro.entregue !== "sim");
        return matchLoja && matchStatus;
      }),
    [filterLoja, filterStatus, registros],
  );

  const metrics = useMemo(() => {
    const pendentes = registros.filter((registro) => registro.entregue !== "sim");
    const totalGeral = registros.reduce((total, registro) => total + Number(registro.total ?? 0), 0);
    const totalPendentes = pendentes.reduce(
      (total, registro) => total + Number(registro.total ?? 0),
      0,
    );
    const stores = new Map<string, number>();

    for (const registro of pendentes) {
      const loja = String(registro.loja ?? "").trim();
      if (!loja) {
        continue;
      }
      stores.set(loja, (stores.get(loja) ?? 0) + Number(registro.total ?? 0));
    }

    const topStore =
      Array.from(stores.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;

    return {
      totalRegistros: registros.length,
      totalGeral,
      totalPendentes,
      topStore,
    };
  }, [registros]);

  const updateFormField = (field: keyof CaixaFormState, value: string) => {
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
      setFeedback({ tone: "error", text: "Selecione uma loja válida para salvar o registro." });
      return;
    }

    if (!form.data) {
      setFeedback({ tone: "error", text: "Informe a data do fechamento das caixas." });
      return;
    }

    if (totalsFromForm.total <= 0) {
      setFeedback({ tone: "error", text: "Informe pelo menos uma quantidade maior que zero." });
      return;
    }

    if (totalsFromForm.ccjDistribuido > totalsFromForm.caixasCcj) {
      setFeedback({
        tone: "error",
        text: "A soma da distribuição CCJ não pode ser maior que o total de caixas CCJ.",
      });
      return;
    }

    setIsSaving(true);

    try {
      await api.post("/api/caixas", {
        data: form.data,
        loja: loja.label,
        n_loja: loja.id,
        caixas_benverde: totalsFromForm.caixasBenverde,
        caixas_bananas: totalsFromForm.caixasBananas,
        caixas_ccj: totalsFromForm.caixasCcj,
        ccj_banca: totalsFromForm.ccjBanca,
        ccj_mercadoria: totalsFromForm.ccjMercadoria,
        ccj_retirada: totalsFromForm.ccjRetirada,
        total: totalsFromForm.total,
        entregue: "não",
      });

      setFeedback({ tone: "success", text: "Registro de caixas salvo com sucesso." });
      resetForm();
      await carregarRegistros();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error, "Não foi possível salvar o registro de caixas."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_38%),_#07130d] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-emerald-300">
                  <Boxes size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                    Operação Real
                  </p>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Registro de Caixas
                  </h1>
                </div>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-gray-300">
                Esta página agora salva e consulta dados reais pela rota
                {" "}
                <code className="rounded bg-black/20 px-1.5 py-0.5 text-emerald-200">/api/caixas</code>
                {" "}
                do app, usando a mesma base do restante do sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void carregarRegistros()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar dados
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
            title="Registros"
            value={String(metrics.totalRegistros)}
            subtitle="Fechamentos cadastrados na base."
            icon={<ClipboardList size={20} />}
          />
          <MetricCard
            title="Total de Caixas"
            value={String(metrics.totalGeral)}
            subtitle="Soma consolidada de todos os registros."
            icon={<Box size={20} />}
          />
          <MetricCard
            title="Pendentes"
            value={String(metrics.totalPendentes)}
            subtitle="Caixas marcadas como não entregues."
            icon={<Store size={20} />}
          />
          <MetricCard
            title="Maior Pendência"
            value={metrics.topStore?.[0] ?? "Sem pendências"}
            subtitle={
              metrics.topStore ? `${metrics.topStore[1]} caixas aguardando baixa.` : "Nenhuma loja pendente."
            }
            icon={<CalendarDays size={20} />}
          />
        </section>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-300">
                <Boxes size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Novo fechamento</h2>
                <p className="text-sm text-gray-400">
                  Grave o fechamento usando a lista oficial de lojas do sistema.
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
                    Data
                  </label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(event) => updateFormField("data", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Caixas Benverde
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.caixasBenverde}
                    onChange={(event) => updateFormField("caixasBenverde", event.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Caixas Bananas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.caixasBananas}
                    onChange={(event) => updateFormField("caixasBananas", event.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Caixas CCJ
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.caixasCcj}
                    onChange={(event) => updateFormField("caixasCcj", event.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Distribuição de CCJ</h3>
                    <p className="text-xs text-gray-400">
                      Use os campos abaixo para detalhar as caixas CCJ já contabilizadas.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                      Distribuído
                    </p>
                    <p className="text-lg font-bold text-white">
                      {totalsFromForm.ccjDistribuido}/{totalsFromForm.caixasCcj}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                      Na banca
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.ccjBanca}
                      onChange={(event) => updateFormField("ccjBanca", event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                      Com mercadoria
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.ccjMercadoria}
                      onChange={(event) => updateFormField("ccjMercadoria", event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                      Para retirada
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.ccjRetirada}
                      onChange={(event) => updateFormField("ccjRetirada", event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/80">
                    Total calculado
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">{totalsFromForm.total}</p>
                  <p className="text-sm text-emerald-100/70">
                    Benverde + Bananas + CCJ. A distribuição CCJ não entra duas vezes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-[#082015] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Salvar fechamento
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-300">
                  <Store size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Lojas cadastradas</h2>
                  <p className="text-sm text-gray-400">
                    Lista fixa aplicada nesta página conforme a operação atual.
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
                Consulte o histórico por loja e situação atual de entrega.
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
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  >
                    <option value="Todos">Todos</option>
                    <option value="sim">Entregue</option>
                    <option value="nao">Não entregue</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 p-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Histórico de caixas</h2>
              <p className="text-sm text-gray-400">
                {filteredRegistros.length} registro(s) visíveis com os filtros atuais.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead className="border-b border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Loja</th>
                  <th className="px-6 py-4 text-center">Benverde</th>
                  <th className="px-6 py-4 text-center">Bananas</th>
                  <th className="px-6 py-4 text-center">CCJ</th>
                  <th className="px-6 py-4 text-center">Total</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-400" colSpan={7}>
                      Carregando registros...
                    </td>
                  </tr>
                ) : filteredRegistros.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-400" colSpan={7}>
                      Nenhum registro encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredRegistros.map((registro, index) => (
                    <tr key={`${registro.data ?? "sem-data"}-${registro.loja ?? "sem-loja"}-${index}`} className="hover:bg-white/[0.03]">
                      <td className="px-6 py-4 font-mono text-xs text-gray-300">
                        {formatDate(registro.data)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{registro.loja ?? "-"}</div>
                        {registro.n_loja > 0 ? (
                          <div className="text-xs text-gray-500">Loja Nº {registro.n_loja}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-center">{registro.caixas_benverde}</td>
                      <td className="px-6 py-4 text-center">{registro.caixas_bananas}</td>
                      <td className="px-6 py-4 text-center">
                        <div>{registro.caixas_ccj}</div>
                        {(registro.ccj_banca || registro.ccj_mercadoria || registro.ccj_retirada) > 0 ? (
                          <div className="text-xs text-gray-500">
                            {registro.ccj_banca}/{registro.ccj_mercadoria}/{registro.ccj_retirada}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-300">
                        {registro.total}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            registro.entregue === "sim"
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {registro.entregue === "sim" ? "Entregue" : "Não entregue"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
