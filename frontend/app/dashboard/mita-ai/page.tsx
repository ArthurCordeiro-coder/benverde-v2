"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, LoaderCircle, SendHorizonal, Sparkles } from "lucide-react";

import api from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type MitaResponse = {
  answer?: string;
  history?: ChatMessage[];
};

function bubbleClass(role: ChatMessage["role"]) {
  return role === "assistant"
    ? "mr-auto border border-emerald-400/20 bg-emerald-500/10 text-emerald-50"
    : "ml-auto border border-white/10 bg-white/10 text-white";
}

export default function MitaAiPage() {
  const mitaEndpoint = "/api/mita-ai/chat";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emptyStateVisible = useMemo(() => messages.length === 0, [messages.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const optimisticMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(optimisticMessages);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await api.post<MitaResponse>(mitaEndpoint, {
        message: trimmed,
        history: messages,
      });

      if (Array.isArray(response.data?.history) && response.data.history.length > 0) {
        setMessages(
          response.data.history.filter(
            (item): item is ChatMessage =>
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string",
          ),
        );
        return;
      }

      const answer =
        typeof response.data?.answer === "string" && response.data.answer.trim()
          ? response.data.answer.trim()
          : "Nao consegui montar uma resposta agora.";
      setMessages([...optimisticMessages, { role: "assistant", content: answer }]);
    } catch (error: unknown) {
      const detail = (
        error as { response?: { data?: { detail?: string } } } | undefined
      )?.response?.data?.detail;
      setMessages([
        ...optimisticMessages,
        {
          role: "assistant",
          content:
            typeof detail === "string" && detail.trim()
              ? detail
              : "Nao consegui falar com a Mita agora. Verifique a configuracao da IA no servidor Next.js.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.18),_transparent_42%),linear-gradient(135deg,rgba(12,28,21,0.94),rgba(8,17,13,0.98))] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Mita aí
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Converse com a gerente de dados do painel
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              A Mita analisa estoque, caixas, precos e metas para responder em linguagem
              natural dentro do painel gerencial.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-slate-200 backdrop-blur-xl">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-emerald-200">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Mita pronta</p>
              <p className="text-xs text-slate-400">Use perguntas naturais sobre a operacao.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_0.8fr]">
        <div className="flex min-h-[620px] flex-col rounded-[28px] border border-white/10 bg-[#07130d]/90 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Chat da Mita</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pergunte, por exemplo: &quot;como esta o estoque?&quot;,
              &quot;qual produto esta abaixo da meta?&quot; ou &quot;qual o preco da banana
              prata?&quot;
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {emptyStateVisible ? (
              <div className="flex h-full min-h-[360px] items-center justify-center">
                <div className="max-w-md rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                    <Bot className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Oie! eu sou a Mita, sua gerente de dados da Benverde!
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Posso resumir a operacao, apontar riscos e responder perguntas sobre os dados
                    do banco.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[82%] rounded-3xl px-5 py-4 text-sm leading-6 shadow-sm ${bubbleClass(
                    message.role,
                  )}`}
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {message.role === "assistant" ? "Mita" : "Voce"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}

            {isLoading ? (
              <div className="mr-auto inline-flex items-center gap-3 rounded-3xl border border-emerald-300/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-50">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Mita esta analisando os dados...
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 p-5">
            <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-3 md:flex-row md:items-end">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                placeholder="Ex: Me mostre os maiores riscos da operacao hoje."
                className="min-h-[92px] flex-1 resize-none rounded-2xl border border-white/10 bg-[#0b1712] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40"
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-[#062010] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-emerald-950/60"
              >
                <SendHorizonal className="h-4 w-4" />
                Enviar
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <h2 className="text-base font-semibold text-white">O que ela entende</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>Estoque atual e movimentacoes recentes de bananas.</li>
              <li>Precos da base atual e respostas rapidas para consulta de preco.</li>
              <li>Caixas registradas por loja.</li>
              <li>Metas salvas no banco e progresso operacional disponivel no painel.</li>
            </ul>
          </div>

          <div className="rounded-[28px] border border-amber-300/20 bg-amber-500/10 p-6">
            <h2 className="text-base font-semibold text-amber-100">Boas perguntas</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-50/90">
              <li>Quais produtos estao mais atrasados em relacao a meta?</li>
              <li>Existe risco de ruptura no estoque?</li>
              <li>Qual o preco da banana nanica?</li>
              <li>Resuma a situacao geral da operacao.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
