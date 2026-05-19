"use client";

import api from "@/lib/api";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Banana,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Movimentacao = {
  id: number;
  data: string | null;
  tipo: string | null;
  produto: string | null;
  quant: number;
  unidade: string | null;
  loja: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

type ApiError = {
  response?: { status?: number; data?: { detail?: string } };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown, fallback: string) {
  const detail = (error as ApiError | undefined)?.response?.data?.detail;
  const status = (error as ApiError | undefined)?.response?.status;
  if (status === 401) return "Sua sessão expirou. Faça login novamente.";
  return typeof detail === "string" && detail.trim() ? detail : fallback;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CorrecaoPage() {
  const router = useRouter();

  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mensagens, setMensagens] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente de estoque da Benverde.\n\nPosso te ajudar a consultar movimentações, verificar saldos, corrigir registros incorretos ou remover entradas duplicadas.\n\nComo posso te ajudar?",
    },
  ]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroChat, setErroChat] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  const historicoRef = useRef<{ role: string; content: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Carrega o histórico completo ────────────────────────────────────────────
  const carregarHistorico = useCallback(async () => {
    try {
      const response = await api.get<{ saldo: number; historico: Movimentacao[] }>(
        "/api/estoque/saldo"
      );
      const dados = Array.isArray(response.data?.historico) ? response.data.historico : [];
      setHistorico(dados);
    } catch {
      // Segue sem histórico; o assistente ainda pode responder
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    if (!carregando) inputRef.current?.focus();
  }, [carregando]);

  // ── Envia mensagem ao assistente ────────────────────────────────────────────
  const enviar = async () => {
    const texto = input.trim();
    if (!texto || enviando || concluido) return;

    setInput("");
    setErroChat(null);

    setMensagens((prev) => [
      ...prev,
      { role: "user", content: texto },
      { role: "assistant", content: "", pending: true },
    ]);

    setEnviando(true);

    try {
      const response = await api.post<{
        answer: string;
        concluido: boolean;
        history: { role: string; content: string }[];
      }>("/api/estoque/correcao", {
        historico,
        message: texto,
        history: historicoRef.current,
      });

      const { answer, concluido: foiConcluido, history } = response.data;
      historicoRef.current = history;

      setMensagens((prev) => {
        const semPending = prev.filter((m) => !m.pending);
        return [...semPending, { role: "assistant", content: answer }];
      });

      if (foiConcluido) setConcluido(true);
    } catch (error) {
      setErroChat(getErrorMessage(error, "Erro ao comunicar com o assistente."));
      setMensagens((prev) => prev.filter((m) => !m.pending));
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.18),_transparent_35%),_#07130d] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-3xl flex flex-col gap-6 animate-in fade-in duration-300">

        {/* Header */}
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
          <button
            onClick={() => router.push("/Estoque")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={14} /> Voltar ao estoque
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Banana className="text-yellow-400" />
            Assistente de Estoque
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Consulte movimentações, verifique saldos ou corrija registros incorretos.
          </p>
        </div>

        {/* Área do chat */}
        <div
          className="rounded-[24px] border border-white/10 bg-white/[0.03] shadow-xl backdrop-blur-md flex flex-col overflow-hidden"
          style={{ minHeight: "500px" }}
        >
          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {carregando ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                <Loader2 size={14} className="animate-spin text-emerald-400" />
                Carregando histórico...
              </div>
            ) : (
              mensagens.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <Bot size={13} className="text-emerald-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-emerald-600/25 border border-emerald-500/20 text-emerald-100 rounded-br-sm"
                        : "bg-white/5 border border-white/10 text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {msg.pending ? (
                      <span className="flex items-center gap-2 text-gray-400">
                        <Loader2 size={13} className="animate-spin" />
                        <span className="text-xs">Analisando...</span>
                      </span>
                    ) : (
                      <FormattedMessage content={msg.content} />
                    )}
                  </div>
                </div>
              ))
            )}

            {concluido && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-emerald-400 border border-emerald-500/20 rounded-xl bg-emerald-500/5">
                <CheckCircle2 size={16} />
                Correção aplicada com sucesso! Você pode voltar ao estoque.
              </div>
            )}

            {erroChat && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                <AlertTriangle size={14} />
                {erroChat}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 px-6 py-4 bg-black/10">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={enviando || concluido || carregando}
                placeholder={
                  concluido
                    ? "Correção concluída. Volte ao estoque."
                    : "Pergunte sobre o estoque ou descreva um problema..."
                }
                rows={2}
                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-40 max-h-36 overflow-y-auto"
                style={{ lineHeight: "1.6" }}
              />
              <button
                onClick={() => void enviar()}
                disabled={!input.trim() || enviando || concluido || carregando}
                className="flex-shrink-0 h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 text-center">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Renderizador de markdown inline ─────────────────────────────────────────

function FormattedMessage({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
