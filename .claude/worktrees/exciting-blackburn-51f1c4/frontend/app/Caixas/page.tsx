"use client";

import api from "@/lib/api";
import React, { useState, useEffect, useCallback, FormEvent } from "react";
import {
  Box,
  History,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Loader2,
} from "lucide-react";

const LOJAS_CAIXAS = [
  { id: 1,  nome: "SUZANO" },
  { id: 4,  nome: "SÃO PAULO" },
  { id: 5,  nome: "GUAIANAZES" },
  { id: 6,  nome: "MAUA" },
  { id: 7,  nome: "MOGI DAS CRUZES" },
  { id: 8,  nome: "MOGI DAS CRUZES" },
  { id: 10, nome: "TAUBATE" },
  { id: 11, nome: "PINDAMONHANGABA" },
  { id: 12, nome: "SÃO SEBASTIÃO" },
  { id: 13, nome: "CARAGUATATUBA" },
  { id: 14, nome: "UBATUBA" },
  { id: 16, nome: "PINDAMONHANGABA" },
  { id: 17, nome: "POÁ" },
  { id: 18, nome: "TAUBATE" },
  { id: 19, nome: "NOVA LORENA" },
  { id: 20, nome: "GUARATINGUETA" },
  { id: 21, nome: "BERTIOGA" },
  { id: 22, nome: "MOGI DAS CRUZES" },
  { id: 23, nome: "FERRAZ DE VASCONCELOS" },
  { id: 25, nome: "SÃO SEBASTIÃO" },
  { id: 26, nome: "UBATUBA" },
  { id: 27, nome: "SUZANO" },
  { id: 29, nome: "ARUJA" },
  { id: 30, nome: "SÃO JOSÉ DOS CAMPOS" },
  { id: 31, nome: "SUZANO" },
  { id: 32, nome: "ITAQUAQUECETUBA" },
  { id: 33, nome: "ITAQUAQUECETUBA" },
];

type CaixaRegistro = {
  data: string | null;
  loja: string | null;
  n_loja: number;
  caixas_benverde: number;
  caixas_ccj: number;
  caixas_bananas: number;
  total: number;
};

type ApiError = { response?: { status?: number; data?: { detail?: string } } };

const getErrorMessage = (error: unknown, fallback: string) => {
  const detail = (error as ApiError | undefined)?.response?.data?.detail;
  const status = (error as ApiError | undefined)?.response?.status;
  if (status === 401) return "Sua sessão expirou. Faça login novamente para continuar.";
  return typeof detail === "string" && detail.trim() ? detail : fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
};

export default function RegistroCaixas() {
  const [lojaSelecionada, setLojaSelecionada] = useState(LOJAS_CAIXAS[0].id);
  const [caixasLUMII, setCaixasLUMII] = useState<number | "">("");
  const [caixasBananas, setCaixasBananas] = useState<number | "">("");
  const [caixasCCJ, setCaixasCCJ] = useState<number | "">("");
  const [ccjBanca, setCcjBanca] = useState<number | "">("");
  const [ccjMercadoria, setCcjMercadoria] = useState<number | "">("");
  const [ccjRetirada, setCcjRetirada] = useState<number | "">("");

  const [historico, setHistorico] = useState<CaixaRegistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Limpa o aviso de erro ao alterar os inputs CCJ após tentativa falha
  useEffect(() => {
    if (feedback?.tone === "error") {
      setFeedback(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caixasCCJ, ccjBanca, ccjMercadoria, ccjRetirada]);

  const carregarHistorico = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<CaixaRegistro[]>("/api/caixas");
      const todos = Array.isArray(response.data) ? response.data : [];
      const deLoja = todos
        .filter(r => r.n_loja === lojaSelecionada)
        .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
        .slice(0, 15);
      setHistorico(deLoja);
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error, "Não foi possível carregar o histórico.") });
    } finally {
      setIsLoading(false);
    }
  }, [lojaSelecionada]);

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const num = (v: number | "") => Number(v) || 0;
    const somaCcj = num(ccjBanca) + num(ccjMercadoria) + num(ccjRetirada);
    const totalCcj = num(caixasCCJ);

    if (somaCcj > totalCcj) {
      setFeedback({
        tone: "error",
        text: `A soma das categorias CCJ (${somaCcj}) não pode ser maior que o total de Caixas CCJ (${totalCcj}).`,
      });
      return;
    }

    const loja = LOJAS_CAIXAS.find(l => l.id === lojaSelecionada);
    if (!loja) return;

    const lumii = num(caixasLUMII);
    const bananas = num(caixasBananas);

    setIsSaving(true);
    setFeedback(null);
    try {
      await api.post("/api/caixas", {
        data: new Date().toISOString().slice(0, 10),
        loja: loja.nome,
        n_loja: loja.id,
      caixas_benverde: lumii,
        caixas_bananas: bananas,
        caixas_ccj: totalCcj,
        ccj_banca: num(ccjBanca),
        ccj_mercadoria: num(ccjMercadoria),
        ccj_retirada: num(ccjRetirada),
      total: lumii + bananas + totalCcj,
        entregue: "nao",
      });

      setFeedback({ tone: "success", text: "Registro de caixas salvo com sucesso!" });
      setCaixasLUMII(""); setCaixasBananas(""); setCaixasCCJ("");
      setCcjBanca(""); setCcjMercadoria(""); setCcjRetirada("");
      await carregarHistorico();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error, "Não foi possível salvar o registro.") });
    } finally {
      setIsSaving(false);
    }
  };

  const currentLojaNome = LOJAS_CAIXAS.find(l => l.id === lojaSelecionada)?.nome ?? "";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.15),_transparent_38%),_#07130d] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in duration-300">

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md text-center">
          <div className="mx-auto bg-blue-500/20 text-blue-400 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
            <Box size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Registro de Caixas</h1>
          <p className="text-sm text-gray-400">Informe o fechamento de caixas da sua loja</p>
        </div>

        <div className="relative">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Selecione sua Loja
          </label>
          <div className="relative">
            <select
              value={lojaSelecionada}
              onChange={e => setLojaSelecionada(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-4 text-base font-bold text-white outline-none focus:border-blue-400"
            >
              {LOJAS_CAIXAS.map(l => (
                <option key={l.id} value={l.id} className="bg-black text-white">
                  Loja {l.id} — {l.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
          </div>
        </div>

        {feedback && (
          <div className={`rounded-xl border px-5 py-4 text-sm flex items-center gap-3 ${
            feedback.tone === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-300"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}>
            {feedback.tone === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {feedback.text}
          </div>
        )}

        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
          <form onSubmit={e => void handleSubmit(e)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-400">Caixas LUMII</label>
                <input
                  type="number"
                  min="0"
                  value={caixasLUMII}
                  onChange={e => setCaixasLUMII(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg font-mono text-white outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-400">Caixas Bananas</label>
                <input
                  type="number"
                  min="0"
                  value={caixasBananas}
                  onChange={e => setCaixasBananas(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg font-mono text-white outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-400">Caixas CCJ</label>
                <input
                  type="number"
                  min="0"
                  value={caixasCCJ}
                  onChange={e => setCaixasCCJ(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg font-mono text-white outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Distribuição CCJ
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Na Banca</label>
                  <input
                    type="number"
                    min="0"
                    value={ccjBanca}
                    onChange={e => setCcjBanca(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">C/ Mercadoria</label>
                  <input
                    type="number"
                    min="0"
                    value={ccjMercadoria}
                    onChange={e => setCcjMercadoria(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">P/ Retirada</label>
                  <input
                    type="number"
                    min="0"
                    value={ccjRetirada}
                    onChange={e => setCcjRetirada(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold tracking-wide hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
              Salvar Caixas da Loja
            </button>
          </form>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white mb-6">
            <History size={18} className="text-blue-400" /> Últimos registros — {currentLojaNome}
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" /> Carregando...
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-gray-400 p-4 border border-white/5 rounded-xl text-center bg-black/20">
              Nenhum registro encontrado para esta loja.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10">
                  <tr>
                    <th className="pb-3">Data</th>
                    <th className="pb-3 text-center">LUMII</th>
                    <th className="pb-3 text-center">Bananas</th>
                    <th className="pb-3 text-center">CCJ</th>
                    <th className="pb-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historico.map((h, idx) => (
                    <tr key={`${h.data}-${idx}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 font-mono text-xs">{formatDate(h.data)}</td>
                      <td className="py-3 text-center">{h.caixas_benverde}</td>
                      <td className="py-3 text-center">{h.caixas_bananas}</td>
                      <td className="py-3 text-center">{h.caixas_ccj}</td>
                      <td className="py-3 font-bold text-white text-center">{h.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

