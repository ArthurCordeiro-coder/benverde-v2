"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, LoaderCircle, SendHorizonal, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/dashboard/client";

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
        scope: "mita-ai",
      });

      const answer = response.data?.answer?.trim();

      if (answer) {
        setMessages(prev => [...prev, { role: "assistant", content: answer }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Não consegui montar uma resposta agora." }]);
      }
    } catch (error: unknown) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: getApiErrorMessage(
            error,
            "Não consegui falar com a Mita agora. Verifique a configuração da IA no servidor Next.js.",
          ),
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
              A Mita analisa estoque, caixas, preços e metas para responder em linguagem
              natural dentro do painel gerencial.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-slate-200 backdrop-blur-xl">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-emerald-200">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Mita pronta</p>
              <p className="text-xs text-slate-400">Use perguntas naturais sobre a operação.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_0.8fr]">
        <div className="flex min-h-[620px] flex-col rounded-[28px] border border-white/10 bg-[#07130d]/90 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Chat da Mita</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pergunte, por exemplo: &quot;como está o estoque?&quot;,
              &quot;qual produto está abaixo da meta?&quot; ou &quot;qual é o preço da banana
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
                    Oie! Eu sou a Mita, sua gerente de dados da Benverde!
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Posso resumir a operação, apontar riscos e responder perguntas sobre os dados
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
                    {message.role === "assistant" ? "Mita" : "Você"}
                  </p>
                  {message.role === "assistant" ? (
                    <div className="space-y-3">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-emerald-300">{children}</strong>,
                          em: ({ children }) => <em className="italic text-emerald-200/90">{children}</em>,
                          ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-2 last:mb-0">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-2 last:mb-0">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children }) => <code className="rounded-md bg-emerald-900/40 px-2 py-0.5 font-mono text-xs text-emerald-100 border border-emerald-500/20">{children}</code>,
                          pre: ({ children }) => (
                            <pre className="my-4 overflow-x-auto rounded-2xl border border-emerald-500/20 bg-black/40 p-5 font-mono text-xs leading-relaxed text-emerald-200 shadow-inner">
                              {children}
                            </pre>
                          ),
                          h1: ({ children }) => <h1 className="mb-4 mt-8 text-2xl font-bold tracking-tight text-emerald-300 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-bold tracking-tight text-emerald-300 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-bold tracking-tight text-emerald-300 first:mt-0">{children}</h3>,
                          blockquote: ({ children }) => (
                            <blockquote className="my-4 border-l-4 border-emerald-500/40 bg-emerald-500/5 py-2 pl-5 italic text-emerald-200/80 rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-300 underline decoration-emerald-500/40 underline-offset-4 hover:text-emerald-200 hover:decoration-emerald-500 transition-colors">
                              {children}
                            </a>
                          ),
                          img: ({ src, alt }) => (
                            <div className="my-6">
                              <img
                                src={src}
                                alt={alt}
                                className="mx-auto block max-w-full rounded-2xl border border-white/10 shadow-2xl transition-transform hover:scale-[1.01]"
                              />
                              {alt && <p className="mt-3 text-center text-xs text-slate-500 italic">{alt}</p>}
                            </div>
                          ),
                          hr: () => <hr className="my-8 border-white/10" />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              ))
            )}

            {isLoading ? (
              <div className="mr-auto inline-flex items-center gap-3 rounded-3xl border border-emerald-300/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-50">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Mita está analisando os dados...
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 p-5">
            <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-3 md:flex-row md:items-end">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                placeholder="Ex: Me mostre os maiores riscos da operação hoje."
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
              <li>Estoque atual e movimentações recentes de bananas.</li>
              <li>Preços da base atual e respostas rápidas para consulta de preço.</li>
              <li>Caixas registradas por loja.</li>
              <li>Metas salvas no banco e progresso operacional disponível no painel.</li>
            </ul>
          </div>

          <div className="rounded-[28px] border border-amber-300/20 bg-amber-500/10 p-6">
            <h2 className="text-base font-semibold text-amber-100">Boas perguntas</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-50/90">
              <li>Quais produtos estão mais atrasados em relação à meta?</li>
              <li>Existe risco de ruptura no estoque?</li>
              <li>Qual é o preço da banana nanica?</li>
              <li>Resuma a situação geral da operação.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
