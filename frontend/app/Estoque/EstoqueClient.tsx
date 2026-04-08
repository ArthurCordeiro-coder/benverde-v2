"use client";

import api from "@/lib/api";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Banana,
  FileText,
  History,
  UploadCloud,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

const LOJAS_ESTOQUE = [
  "Loja 01", "Loja 02", "Loja 03", "Loja 04", "Loja 05",
  "Loja 06", "Loja 07", "Loja 08", "Loja 09", "Loja 10",
  "Loja 11", "Loja 12", "Loja 13", "Loja 14", "Loja 15",
  "Loja 16", "Loja 17", "Loja 18", "Loja 19", "Loja 20",
  "Frutas/Legumes", "Outra",
];

const VARIEDADES = [
  "BANANA NANICA",
  "BANANA DA TERRA",
  "BANANA PRATA",
  "BANANA MAÇÃ",
];

const TIPOS = ["entrada", "saida", "bonificação"];

type Movimentacao = {
  id: number;
  data: string | null;
  tipo: string | null;
  produto: string | null;
  quant: number;
  unidade: string | null;
  loja: string | null;
};

type EstoqueResponse = { saldo: number; historico: Movimentacao[] };

type UploadPdfResponse = {
  arquivo?: string;
  resultado?: Array<{ produto?: string; quant?: number }>;
};

type Linha = {
  id: number;
  sel: boolean;
  variedade: string;
  quant: number;
  loja: string;
  tipo: string;
};

type RegistroHoje = {
  id: number;
  hora: string;
  tipo: string;
  produto: string;
  quant: number;
  unidade: string;
  loja: string;
};

type ApiError = { response?: { status?: number; data?: { detail?: string } } };

const getErrorMessage = (error: unknown, fallback: string) => {
  const detail = (error as ApiError | undefined)?.response?.data?.detail;
  const status = (error as ApiError | undefined)?.response?.status;
  if (status === 401) return "Sua sessão expirou. Faça login novamente para continuar.";
  return typeof detail === "string" && detail.trim() ? detail : fallback;
};

export default function EstoqueClient() {
  const gerarLinhasVazias = (qtd: number): Linha[] =>
    Array.from({ length: qtd }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      sel: false,
      variedade: VARIEDADES[0],
      quant: 0,
      loja: "Entrada",
      tipo: "entrada",
    }));

  const [mostrarUpload, setMostrarUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [linhas, setLinhas] = useState<Linha[]>(() => gerarLinhasVazias(5));
  const [selAll, setSelAll] = useState(false);
  const [tipoAll, setTipoAll] = useState("─");
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const carregarEstoque = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<EstoqueResponse>("/api/estoque/saldo");
      setHistorico(Array.isArray(response.data?.historico) ? response.data.historico : []);
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error, "Não foi possível carregar os registros.") });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarEstoque();
  }, [carregarEstoque]);

  const registrosHoje = useMemo<RegistroHoje[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return historico
      .filter(item => item.data?.startsWith(today))
      .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
      .map(item => ({
        id: item.id,
        hora: item.data
          ? new Date(item.data).toLocaleTimeString("pt-BR", { hour12: false })
          : "-",
        tipo: item.tipo ?? "entrada",
        produto: item.produto ?? "-",
        quant: Number(item.quant ?? 0),
        unidade: item.unidade ?? "KG",
        loja: item.loja ?? "-",
      }));
  }, [historico]);

  const handleToggleSelAll = () => {
    const newVal = !selAll;
    setSelAll(newVal);
    setLinhas(linhas.map(l => ({ ...l, sel: newVal })));
  };

  const handleChangeTipoAll = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTipoAll(val);
    if (val !== "─") {
      setLinhas(linhas.map(l => ({
        ...l,
        tipo: val,
        loja: val === "entrada" ? "Entrada" : l.loja,
      })));
    }
  };

  const handleUpdateLinha = (id: number, field: string, value: string | number | boolean) => {
    setLinhas(linhas.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === "tipo" && value === "entrada") updated.loja = "Entrada";
      return updated;
    }));
  };

  const adicionarLinha = () => {
    setLinhas([...linhas, { id: Date.now(), sel: false, variedade: VARIEDADES[0], quant: 0, loja: "Entrada", tipo: "entrada" }]);
  };

  const removerSelecionadas = () => {
    const remaining = linhas.filter(l => !l.sel);
    setLinhas(remaining.length > 0 ? remaining : gerarLinhasVazias(1));
    setSelAll(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post<UploadPdfResponse>("/api/estoque/upload-pdf", formData);
      const resultado = Array.isArray(response.data?.resultado) ? response.data.resultado : [];

      if (resultado.length === 0) {
        setFeedback({ tone: "error", text: "O PDF foi lido, mas nenhuma linha válida de banana foi encontrada." });
        return;
      }

      const novasLinhas: Linha[] = resultado.map(item => ({
        id: Date.now() + Math.random(),
        sel: false,
        variedade: String(item.produto ?? VARIEDADES[0]).trim(),
        quant: Number(item.quant ?? 0),
        loja: "Entrada",
        tipo: "entrada",
      }));

      const linhasPreenchidas = linhas.filter(l => l.quant > 0);
      const padding = Math.max(0, 5 - linhasPreenchidas.length - novasLinhas.length);
      setLinhas([...linhasPreenchidas, ...novasLinhas, ...gerarLinhasVazias(padding)]);
      setMostrarUpload(false);
      setFeedback({ tone: "success", text: `${novasLinhas.length} linha(s) carregada(s) pelo PDF. Confira e salve.` });
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error, "Falha ao processar o arquivo PDF. Tente novamente.") });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const salvarMovimentacoes = async () => {
    const validas = linhas.filter(l => l.quant > 0);
    if (validas.length === 0) {
      setFeedback({ tone: "error", text: "Nenhuma linha com quantidade maior que zero para salvar." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await api.post(
        "/api/estoque/movimentacao",
        validas.map(l => ({
          loja: l.tipo === "entrada" ? "Entrada" : l.loja,
          produto: l.variedade,
          quant: l.quant,
          tipo: l.tipo,
          unidade: "KG",
          arquivo: "manual",
        })),
      );

      setFeedback({ tone: "success", text: `${validas.length} registro(s) salvo(s) com sucesso!` });
      setLinhas(gerarLinhasVazias(5));
      setSelAll(false);
      setTipoAll("─");
      await carregarEstoque();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error, "Não foi possível salvar as movimentações.") });
    } finally {
      setIsSaving(false);
    }
  };

  const deletarRegistro = async (id: number) => {
    if (!window.confirm("Deseja remover esta movimentação?")) return;
    setDeletingId(id);
    setFeedback(null);
    try {
      await api.delete(`/api/estoque/movimentacao/${id}`);
      setFeedback({ tone: "success", text: "Registro removido com sucesso." });
      await carregarEstoque();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error, "Não foi possível remover o registro.") });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.18),_transparent_35%),_#07130d] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-300">

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Banana className="text-yellow-400" /> Registro de Estoque
          </h1>
          <p className="text-sm text-gray-400 mt-1">Registro manual de entradas e saídas e extração de NFe.</p>
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

        <div>
          <button
            onClick={() => setMostrarUpload(!mostrarUpload)}
            className="flex items-center gap-2 rounded-xl border border-yellow-500/50 bg-yellow-500/20 px-6 py-3 text-sm font-bold text-yellow-300 transition-all hover:bg-yellow-500/30"
          >
            <FileText size={18} /> Enviar documento (NF-e ou Semar)
          </button>

          {mostrarUpload && (
            <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center animate-in slide-in-from-top-2 relative overflow-hidden">
              {isUploading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-sm font-semibold text-emerald-300">Processando PDF...</p>
                </div>
              )}
              <UploadCloud className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm text-gray-300 mb-4">Selecione o PDF para extração automática</p>
              <input
                type="file"
                accept=".pdf"
                onChange={e => void handleFileUpload(e)}
                disabled={isUploading}
                className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-300 hover:file:bg-emerald-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Linhas de Movimentação</h3>

          <div className="grid grid-cols-[auto_2fr_1fr_2fr_2fr] gap-4 mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 items-center">
            <input
              type="checkbox"
              checked={selAll}
              onChange={handleToggleSelAll}
              className="w-4 h-4 rounded bg-black/20 border-white/10 accent-emerald-500"
            />
            <span>Variedade</span>
            <span>Qtd (kg)</span>
            <span>Loja</span>
            <div className="flex items-center gap-2">
              <span>Tipo (Todos):</span>
              <select
                value={tipoAll}
                onChange={handleChangeTipoAll}
                className="bg-black/40 border border-white/10 rounded-md px-2 py-1 outline-none focus:border-green-500 text-white"
              >
                <option value="─">─</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {linhas.map(linha => (
              <div
                key={linha.id}
                className="grid grid-cols-[auto_2fr_1fr_2fr_2fr] gap-4 items-center bg-white/5 border border-white/10 rounded-xl p-3 hover:border-white/20 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={linha.sel}
                  onChange={e => handleUpdateLinha(linha.id, "sel", e.target.checked)}
                  className="w-4 h-4 rounded bg-black/20 border-white/10 accent-emerald-500"
                />
                <select
                  value={linha.variedade}
                  onChange={e => handleUpdateLinha(linha.id, "variedade", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                >
                  {VARIEDADES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={linha.quant || ""}
                  onChange={e => handleUpdateLinha(linha.id, "quant", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-green-500 tabular-nums"
                />
                <select
                  value={linha.loja}
                  onChange={e => handleUpdateLinha(linha.id, "loja", e.target.value)}
                  disabled={linha.tipo === "entrada"}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-green-500 disabled:opacity-50"
                >
                  {LOJAS_ESTOQUE.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="flex gap-2">
                  {TIPOS.map(t => (
                    <label key={t} className="flex items-center gap-1 text-xs cursor-pointer text-gray-300">
                      <input
                        type="radio"
                        name={`tipo-${linha.id}`}
                        value={t}
                        checked={linha.tipo === t}
                        onChange={e => handleUpdateLinha(linha.id, "tipo", e.target.value)}
                        className="accent-emerald-500"
                      />
                      <span className="capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            <button
              onClick={adicionarLinha}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:bg-white/10"
            >
              <Plus size={16} /> Adicionar linha
            </button>
            <button
              onClick={removerSelecionadas}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/20"
            >
              <Trash2 size={16} /> Remover selecionadas
            </button>
            <button
              onClick={() => void salvarMovimentacoes()}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Estoque
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white mb-6">
            <History size={18} className="text-green-400" /> Registros Salvos Hoje
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" /> Carregando registros...
            </div>
          ) : registrosHoje.length === 0 ? (
            <p className="text-sm text-gray-400 p-4 border border-white/5 rounded-xl text-center bg-black/20">
              Nenhum registro salvo hoje.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10">
                  <tr>
                    <th className="pb-3 font-semibold">Hora</th>
                    <th className="pb-3 font-semibold">Tipo</th>
                    <th className="pb-3 font-semibold">Produto</th>
                    <th className="pb-3 font-semibold">Qtd</th>
                    <th className="pb-3 font-semibold">Loja</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {registrosHoje.map(r => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3">{r.hora}</td>
                      <td className="py-3 capitalize">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          r.tipo === "entrada" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {r.tipo}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-white">{r.produto}</td>
                      <td className="py-3 tabular-nums">{r.quant.toFixed(1)} {r.unidade}</td>
                      <td className="py-3">{r.loja}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => void deletarRegistro(r.id)}
                          disabled={deletingId === r.id}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === r.id
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Trash2 size={16} />
                          }
                        </button>
                      </td>
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
