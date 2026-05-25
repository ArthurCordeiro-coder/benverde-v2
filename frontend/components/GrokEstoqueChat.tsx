"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

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
};

type ApiError = {
  response?: { status?: number; data?: { detail?: string } };
};

type GrokEstoqueChatProps = {
  registro: Movimentacao;
  onClose: () => void;
  onConcluido: () => void;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GrokEstoqueChat({
  registro,
  onClose,
  onConcluido,
}: GrokEstoqueChatProps) {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Olá! Vou te ajudar a corrigir o registro **#${registro.id}** (${registro.produto ?? "—"}, ${registro.quant} ${registro.unidade ?? "KG"}, ${registro.loja ?? "—"}).\n\nQual foi o problema identificado?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Histórico de mensagens para enviar à API (excluindo a mensagem inicial de boas-vindas)
  const historicoRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || carregando || concluido) return;

    setInput("");
    setErro(null);

    setMensagens((prev) => [
      ...prev,
      { role: "user", content: texto },
      { role: "assistant", content: "", pending: true } as ChatMessage & { pending: boolean },
    ]);

    setCarregando(true);

    try {
      const response = await api.post<{
        answer: string;
        concluido: boolean;
        history: ChatMessage[];
      }>("/api/estoque/correcao", {
        registro,
        message: texto,
        history: historicoRef.current,
      });

      const { answer, concluido: foiConcluido, history } = response.data;

      historicoRef.current = history;

      setMensagens((prev) => {
        const semPending = prev.filter((m) => !(m as ChatMessage & { pending?: boolean }).pending);
        return [...semPending, { role: "assistant", content: answer }];
      });

      if (foiConcluido) {
        setConcluido(true);
        setTimeout(onConcluido, 2000);
      }
    } catch (e) {
      const detail = (e as ApiError)?.response?.data?.detail;
      const status = (e as ApiError)?.response?.status;
      let msg = "Erro inesperado ao comunicar com o assistente.";
      if (status === 401) msg = "Sua sessão expirou. Faça login novamente.";
      else if (typeof detail === "string" && detail.trim()) msg = detail;

      setErro(msg);
      setMensagens((prev) =>
        prev.filter((m) => !(m as ChatMessage & { pending?: boolean }).pending)
      );
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6"
      style={{ pointerEvents: "none" }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{ pointerEvents: "all" }}
        onClick={onClose}
      />

      {/* Painel */}
      <div
        className="relative z-10 flex flex-col w-full max-w-md h-[600px] rounded-2xl border border-white/10 bg-[#0a1f12] shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        style={{ pointerEvents: "all" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Bot size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Assistente de Correção</p>
              <p className="text-[11px] text-gray-400">Registro #{registro.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumo do registro */}
        <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5">
          <div className="flex flex-wrap gap-2 text-[11px]">
            {[
              { label: "Produto", val: registro.produto ?? "—" },
              { label: "Qtd", val: `${registro.quant} ${registro.unidade ?? "KG"}` },
              { label: "Tipo", val: registro.tipo ?? "—" },
              { label: "Loja", val: registro.loja ?? "—" },
            ].map(({ label, val }) => (
              <span
                key={label}
                className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300"
              >
                <span className="text-gray-500">{label}:</span> {val}
              </span>
            ))}
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {mensagens.map((msg, i) => {
            const isPending = (msg as ChatMessage & { pending?: boolean }).pending;
            return (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot size={12} className="text-emerald-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-emerald-600/30 border border-emerald-500/20 text-emerald-100 rounded-br-sm"
                      : "bg-white/5 border border-white/10 text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {isPending ? (
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Loader2 size={13} className="animate-spin" />
                      <span className="text-xs">Analisando...</span>
                    </span>
                  ) : (
                    <FormattedMessage content={msg.content} />
                  )}
                </div>
              </div>
            );
          })}

          {concluido && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-emerald-400">
              <CheckCircle2 size={16} />
              Correção aplicada com sucesso!
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              <AlertTriangle size={14} />
              {erro}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={carregando || concluido}
              placeholder={concluido ? "Correção concluída." : "Descreva o problema..."}
              rows={1}
              className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50 max-h-28 overflow-y-auto"
              style={{ lineHeight: "1.5" }}
            />
            <button
              onClick={() => void enviar()}
              disabled={!input.trim() || carregando || concluido}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {carregando ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5 text-center">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Renderizador simples de markdown inline ──────────────────────────────────

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
