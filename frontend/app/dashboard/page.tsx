"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Banana,
  Leaf,
  PackageSearch,
  Sparkles,
  Tags,
  TrendingUp,
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

export default function DashboardHome() {
  const [saldoEstoque, setSaldoEstoque] = useState<number | null>(null);
  const [caixasDisponiveis, setCaixasDisponiveis] = useState<number | null>(null);
  const [precoMedio, setPrecoMedio] = useState<number | null>(null);
  const [caixasRegistradas, setCaixasRegistradas] = useState(0);
  const [precosRegistrados, setPrecosRegistrados] = useState(0);

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
