"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Banana,
  Check,
  Clock3,
  Leaf,
  PackageSearch,
  ShieldAlert,
  Sparkles,
  Tags,
  TrendingUp,
  X,
} from "lucide-react";

import api from "@/lib/api";

type PendingUser = {
  username: string;
  nome: string;
  email: string;
  funcionalidade: string;
  solicitado_em: string;
};

type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
};

type ApiError = {
  message?: string;
  request?: unknown;
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
};

function getErrorDetail(error: unknown): string | undefined {
  return (error as ApiError | undefined)?.response?.data?.detail;
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as ApiError | undefined)?.response?.status;
}

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

function formatSolicitadoEm(value?: string) {
  if (!value) {
    return "-";
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardHome() {
  const [saldoEstoque, setSaldoEstoque] = useState<number | null>(null);
  const [caixasDisponiveis, setCaixasDisponiveis] = useState<number | null>(null);
  const [precoMedio, setPrecoMedio] = useState<number | null>(null);
  const [caixasRegistradas, setCaixasRegistradas] = useState(0);
  const [precosRegistrados, setPrecosRegistrados] = useState(0);

  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [pendingSuccess, setPendingSuccess] = useState("");
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      const [estoqueResponse, caixasResponse, precosResponse] = await Promise.all([
        api.get("/api/estoque/saldo"),
        api.get("/api/caixas"),
        api.get("/api/precos"),
      ]);

      const saldo = Number(estoqueResponse.data?.saldo ?? 0);
      setSaldoEstoque(Number.isFinite(saldo) ? saldo : 0);

      const caixas = Array.isArray(caixasResponse.data) ? caixasResponse.data : [];
      setCaixasRegistradas(caixas.length);
      const totalCaixas = caixas.reduce((acc: number, item: Record<string, unknown>) => {
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
      setCaixasDisponiveis(totalCaixas);

      const precos = Array.isArray(precosResponse.data) ? precosResponse.data : [];
      setPrecosRegistrados(precos.length);
      const valoresValidos = precos
        .map((item: Record<string, unknown>) => Number(item.Preco ?? item.preco ?? 0))
        .filter((valor: number) => Number.isFinite(valor));
      const media =
        valoresValidos.length > 0
          ? valoresValidos.reduce((acc: number, valor: number) => acc + valor, 0) /
            valoresValidos.length
          : 0;
      setPrecoMedio(media);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    }
  };

  const carregarPendentes = async () => {
    setPendingLoading(true);
    setPendingError("");
    try {
      const meResponse = await api.get("/api/me");
      const admin = Boolean(
        meResponse.data?.role === "admin" || meResponse.data?.is_admin === true,
      );
      setIsAdmin(admin);

      if (!admin) {
        setPendingUsers([]);
        return;
      }

      const pendingResponse = await api.get("/api/admin/pending");
      const pendingItems = Array.isArray(pendingResponse.data?.items)
        ? pendingResponse.data.items
        : [];
      setPendingUsers(pendingItems);
    } catch (error: unknown) {
      if (getErrorStatus(error) === 403) {
        setIsAdmin(false);
        setPendingUsers([]);
      } else {
        const detail = getErrorDetail(error);
        setPendingError(
          typeof detail === "string"
            ? detail
            : "Nao foi possivel carregar as solicitacoes pendentes.",
        );
      }
    } finally {
      setPendingLoading(false);
      setAuthChecked(true);
    }
  };

  const handlePendingAction = async (username: string, action: "approve" | "reject") => {
    setPendingActionKey(`${action}:${username}`);
    setPendingError("");
    setPendingSuccess("");
    try {
      await api.post(`/api/admin/pending/${encodeURIComponent(username)}/${action}`);
      setPendingSuccess(
        action === "approve"
          ? `Usuario ${username} aprovado com sucesso.`
          : `Solicitacao de ${username} rejeitada.`,
      );
      await carregarPendentes();
    } catch (error: unknown) {
      const detail = getErrorDetail(error);
      setPendingError(
        typeof detail === "string" ? detail : "Nao foi possivel processar essa solicitacao.",
      );
    } finally {
      setPendingActionKey(null);
    }
  };

  useEffect(() => {
    void carregarDados();
    void carregarPendentes();
  }, []);

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
              void carregarPendentes();
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

      {isAdmin ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
          <div className="mb-5 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Clock3 size={18} className="text-emerald-300" />
                Solicitacoes pendentes
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                Aprove ou rejeite cadastros de novos usuarios.
              </p>
            </div>
            <button
              onClick={() => void carregarPendentes()}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10"
            >
              Atualizar lista
            </button>
          </div>

          {pendingSuccess ? (
            <p className="mb-3 rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {pendingSuccess}
            </p>
          ) : null}
          {pendingError ? (
            <p className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {pendingError}
            </p>
          ) : null}

          {pendingLoading ? (
            <p className="text-sm text-slate-300">Carregando solicitacoes...</p>
          ) : pendingUsers.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
              Nenhuma solicitacao pendente no momento.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((pendingUser) => {
                const approveKey = `approve:${pendingUser.username}`;
                const rejectKey = `reject:${pendingUser.username}`;
                const actionInProgress =
                  pendingActionKey === approveKey || pendingActionKey === rejectKey;
                return (
                  <div
                    key={pendingUser.username}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">{pendingUser.nome}</p>
                      <p className="text-sm text-slate-300">
                        @{pendingUser.username} - {pendingUser.email}
                      </p>
                      <p className="text-xs text-slate-400">
                        Funcao: {pendingUser.funcionalidade} - Solicitado em:{" "}
                        {formatSolicitadoEm(pendingUser.solicitado_em)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void handlePendingAction(pendingUser.username, "approve")}
                        disabled={actionInProgress}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check size={14} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => void handlePendingAction(pendingUser.username, "reject")}
                        disabled={actionInProgress}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300/35 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X size={14} />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {authChecked && !isAdmin && !pendingLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          <ShieldAlert size={16} />
          Conta sem permissao de administrador para gerenciar solicitacoes de acesso.
        </div>
      ) : null}
    </div>
  );
}
