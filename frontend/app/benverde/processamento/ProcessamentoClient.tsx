"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";

import api from "@/lib/api";
import { carregarRegistrosUpload } from "./_lib/parser";
import { extrairPaginas } from "./_lib/pdf-text";
import { extrairPdfsDeZip } from "./_lib/zip";
import type { RegistroPedido } from "./_lib/types";

type LinhaExtraida = RegistroPedido & { _id: number; sel: boolean };

type ProgressoArquivo = {
  nome: string;
  estado: "processando" | "ok" | "vazio" | "erro";
  itens: number;
  detalhe?: string;
};

type Feedback = { tone: "success" | "error"; text: string };

type EnvioResponse = { inseridos?: number; ignorados?: number };

type ApiErrorShape = { response?: { status?: number; data?: { detail?: string } } };

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorShape | undefined;
  if (err?.response?.status === 401) {
    return "Sua sessão expirou. Faça login novamente para continuar.";
  }
  const detail = err?.response?.data?.detail;
  return typeof detail === "string" && detail.trim() ? detail : fallback;
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default function ProcessamentoClient() {
  const [linhas, setLinhas] = useState<LinhaExtraida[]>([]);
  const [progresso, setProgresso] = useState<ProgressoArquivo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const idSeq = useRef(0);
  const nextId = () => ++idSeq.current;

  const selecionadas = linhas.filter((l) => l.sel);
  const todasSelecionadas = linhas.length > 0 && selecionadas.length === linhas.length;

  const handleFiles = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;
    const entrada = Array.from(lista);
    const temEntradaValida = entrada.some((f) => {
      const nome = f.name.toLowerCase();
      return nome.endsWith(".pdf") || nome.endsWith(".zip");
    });
    if (!temEntradaValida) {
      setFeedback({ tone: "error", text: "Selecione arquivos PDF ou um ZIP com PDFs dentro." });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    // Expande os .zip em PDFs (no navegador) antes de processar.
    const arquivos: File[] = [];
    const errosZip: string[] = [];
    for (const f of entrada) {
      const nome = f.name.toLowerCase();
      if (nome.endsWith(".zip")) {
        try {
          const internos = await extrairPdfsDeZip(f);
          if (internos.length === 0) errosZip.push(`${f.name}: nenhum PDF encontrado dentro do ZIP.`);
          arquivos.push(...internos);
        } catch {
          errosZip.push(`${f.name}: não foi possível abrir o ZIP.`);
        }
      } else if (nome.endsWith(".pdf")) {
        arquivos.push(f);
      }
    }

    if (arquivos.length === 0) {
      setIsProcessing(false);
      setFeedback({
        tone: "error",
        text: errosZip.length
          ? errosZip.join(" ")
          : "Nenhum PDF para processar.",
      });
      return;
    }

    setProgresso(
      arquivos.map((f) => ({ nome: f.name, estado: "processando", itens: 0 })),
    );

    const novas: LinhaExtraida[] = [];

    for (let i = 0; i < arquivos.length; i++) {
      const file = arquivos[i];
      try {
        const paginas = await extrairPaginas(file);
        if (paginas.length === 0 || paginas.every((p) => !p.texto)) {
          setProgresso((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? { ...p, estado: "vazio", detalhe: "Sem camada de texto (PDF escaneado?)" }
                : p,
            ),
          );
          continue;
        }

        const registros = carregarRegistrosUpload(file.name, paginas);
        for (const r of registros) {
          novas.push({ ...r, _id: nextId(), sel: true });
        }
        setProgresso((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? {
                  ...p,
                  estado: registros.length ? "ok" : "vazio",
                  itens: registros.length,
                  detalhe: registros.length ? undefined : "Nenhum item reconhecido",
                }
              : p,
          ),
        );
      } catch (error) {
        setProgresso((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? {
                  ...p,
                  estado: "erro",
                  detalhe: error instanceof Error ? error.message : "Falha ao ler o PDF",
                }
              : p,
          ),
        );
      }
    }

    setLinhas((prev) => [...prev, ...novas]);
    setIsProcessing(false);
    if (novas.length === 0) {
      setFeedback({
        tone: "error",
        text: "Os arquivos foram lidos, mas nenhum item válido foi reconhecido.",
      });
    } else {
      setFeedback({
        tone: "success",
        text: `${novas.length} item(ns) extraído(s) no seu navegador. Revise e envie ao banco.`,
      });
    }
  };

  const toggleTodas = () => {
    const novo = !todasSelecionadas;
    setLinhas((prev) => prev.map((l) => ({ ...l, sel: novo })));
  };

  const toggleLinha = (id: number) => {
    setLinhas((prev) => prev.map((l) => (l._id === id ? { ...l, sel: !l.sel } : l)));
  };

  const removerSelecionadas = () => {
    setLinhas((prev) => prev.filter((l) => !l.sel));
  };

  const limparTudo = () => {
    setLinhas([]);
    setProgresso([]);
    setFeedback(null);
  };

  const enviarParaBanco = async () => {
    if (selecionadas.length === 0) {
      setFeedback({ tone: "error", text: "Selecione ao menos uma linha para enviar." });
      return;
    }
    setIsSending(true);
    setFeedback(null);
    try {
      const registros: RegistroPedido[] = selecionadas.map((l) => ({
        ARQUIVO: l.ARQUIVO,
        Data: l.Data,
        Loja: l.Loja,
        Produto: l.Produto,
        UNID: l.UNID,
        QUANT: l.QUANT,
        "VALOR TOTAL": l["VALOR TOTAL"],
        "VALOR UNIT": l["VALOR UNIT"],
      }));
      const res = await api.post<EnvioResponse>("/api/pedidos", { registros });
      const inseridos = res.data?.inseridos ?? 0;
      const ignorados = res.data?.ignorados ?? 0;
      setLinhas((prev) => prev.filter((l) => !l.sel));
      setFeedback({
        tone: "success",
        text: `${inseridos} registro(s) gravado(s) no banco${
          ignorados ? ` · ${ignorados} ignorado(s)` : ""
        }.`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getErrorMessage(error, "Não foi possível enviar os registros ao banco."),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_38%),_#070d09] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Cabeçalho */}
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Cpu className="text-emerald-400" /> Processamento de PDFs
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Extrai os itens de DANFE/NF-e e pedidos Semar e envia o resultado para o banco. O
            servidor só grava — nenhum PDF é processado nele.
          </p>
        </div>

        {feedback && (
          <div
            className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-sm ${
              feedback.tone === "success"
                ? "border-green-500/20 bg-green-500/10 text-green-300"
                : "border-red-500/20 bg-red-500/10 text-red-200"
            }`}
          >
            {feedback.tone === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {feedback.text}
          </div>
        )}

        {/* Upload */}
        <div className="relative overflow-hidden rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center">
          {isProcessing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300">Processando no navegador...</p>
            </div>
          )}
          <UploadCloud className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="mb-4 text-sm text-gray-300">
            Selecione um ou mais PDFs — ou um arquivo ZIP com vários PDFs dentro (NF-e/DANFE ou
            pedido Semar) para extração automática
          </p>
          <input
            type="file"
            accept=".pdf,.zip"
            multiple
            disabled={isProcessing}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
            className="block w-full cursor-pointer text-sm text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-300 hover:file:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Progresso por arquivo */}
        {progresso.length > 0 && (
          <div className="space-y-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-md">
            {progresso.map((p) => (
              <div key={p.nome} className="flex items-center gap-3 text-sm">
                {p.estado === "processando" ? (
                  <Loader2 size={16} className="animate-spin text-emerald-400" />
                ) : p.estado === "ok" ? (
                  <CheckCircle2 size={16} className="text-green-400" />
                ) : (
                  <AlertCircle size={16} className="text-yellow-400" />
                )}
                <FileText size={16} className="text-gray-500" />
                <span className="flex-1 truncate text-gray-200">{p.nome}</span>
                <span className="text-gray-400">
                  {p.estado === "ok"
                    ? `${p.itens} item(ns)`
                    : p.detalhe ?? p.estado}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tabela de revisão */}
        {linhas.length > 0 && (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                Itens extraídos ({selecionadas.length}/{linhas.length} selecionados)
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={removerSelecionadas}
                  className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/20"
                >
                  <Trash2 size={14} /> Remover selecionadas
                </button>
                <button
                  type="button"
                  onClick={limparTudo}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10"
                >
                  Limpar tudo
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-500">
                  <tr>
                    <th className="pb-3">
                      <input
                        type="checkbox"
                        checked={todasSelecionadas}
                        onChange={toggleTodas}
                        className="h-4 w-4 rounded border-white/10 bg-black/20 accent-emerald-500"
                      />
                    </th>
                    <th className="pb-3 font-semibold">Arquivo</th>
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Loja</th>
                    <th className="pb-3 font-semibold">Produto</th>
                    <th className="pb-3 font-semibold">Un</th>
                    <th className="pb-3 text-right font-semibold">Qtd</th>
                    <th className="pb-3 text-right font-semibold">V. Unit</th>
                    <th className="pb-3 text-right font-semibold">V. Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {linhas.map((l) => (
                    <tr key={l._id} className="hover:bg-white/5">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={l.sel}
                          onChange={() => toggleLinha(l._id)}
                          className="h-4 w-4 rounded border-white/10 bg-black/20 accent-emerald-500"
                        />
                      </td>
                      <td className="max-w-[140px] truncate py-2 text-gray-400" title={l.ARQUIVO}>
                        {l.ARQUIVO}
                      </td>
                      <td className="py-2">
                        {l.Data ? new Date(l.Data).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-2">{l.Loja || "—"}</td>
                      <td className="py-2 font-medium text-white">{l.Produto}</td>
                      <td className="py-2">{l.UNID}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(l.QUANT)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(l["VALOR UNIT"])}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(l["VALOR TOTAL"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void enviarParaBanco()}
                disabled={isSending || selecionadas.length === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                Enviar {selecionadas.length} para o banco
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
