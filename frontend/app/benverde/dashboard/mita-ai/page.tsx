"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, Send, ChevronDown, Sparkles, Bot, LoaderCircle, FileText, Trash2, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";

const LumiiChart = dynamic(() => import("@/components/mita/MitaChart"), { ssr: false });

import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/dashboard/client";

// Define TypeScript interfaces
interface Attachment {
  id: string;
  name: string;
  size: number;
  kind: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  attachments?: Attachment[];
  ts: number;
}

interface LumiiResponse {
  answer?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  conversation_id?: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string | null;
}

interface ConversationDetail {
  conversation: ConversationSummary;
  messages: Array<{ id: number; role: "user" | "assistant"; content: string; created_at: string }>;
}

const aiStyles: Record<string, any> = {
  layout: {
    display: "flex",
    gap: 16,
    height: "calc(100vh - 120px)",
    minHeight: 650,
  },
  sidebar: {
    width: 260,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "8px 0",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    paddingRight: 12,
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 4px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  newConvBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(16,185,129,0.30)",
    background: "rgba(16,185,129,0.08)",
    color: "#6ee7b7",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    transition: "all .15s",
  },
  convList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  convItem: (active: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 10,
    background: active ? "rgba(16,185,129,0.10)" : "transparent",
    border: active ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
    color: active ? "#86efac" : "#cbd5e1",
    fontSize: 13,
    cursor: "pointer",
    transition: "all .15s",
    textAlign: "left",
    width: "100%",
  }),
  convTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  convDel: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    padding: 4,
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
  },
  convEmpty: {
    padding: "20px 12px",
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  mainCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  page: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    background: "transparent",
    fontFamily: "inherit",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "8px 0px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  overline: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.01em",
    margin: 0,
  },
  sub: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 9999,
    background: "rgba(52,211,153,0.10)",
    border: "1px solid rgba(52,211,153,0.25)",
    color: "#6ee7b7",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  thread: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 0",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  threadInner: {
    maxWidth: 920,
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  msg: {
    display: "flex",
    gap: 14,
  },
  msgRoleChip: (kind: "user" | "assistant") => ({
    width: 36,
    height: 36,
    borderRadius: 12,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: kind === "user"
      ? "rgba(255,255,255,0.06)"
      : "linear-gradient(135deg, #34d399, #10b981)",
    border: kind === "user" ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(16,185,129,0.30)",
    color: kind === "user" ? "#cbd5e1" : "#06281b",
    fontWeight: 700,
    fontSize: 13,
    boxShadow: kind === "user" ? "none" : "0 4px 14px rgba(16,185,129,0.20)",
  }),
  msgBody: {
    flex: 1,
    minWidth: 0,
  },
  msgMeta: {
    fontSize: 11,
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.04em",
    marginBottom: 6,
  },
  msgText: {
    fontSize: 14.5,
    lineHeight: 1.65,
    color: "#cbd5e1",
    wordWrap: "break-word",
  },
  attRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  attChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 12px 5px 6px",
    borderRadius: 9999,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: 600,
  },
  attChipIcon: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    background: "rgba(52,211,153,0.18)",
    color: "#86efac",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8,
    fontWeight: 800,
  },
  composerWrap: {
    padding: "16px 0 8px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
  },
  composerInner: {
    maxWidth: 920,
    width: "100%",
    margin: "0 auto",
  },
  composer: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.30)",
    transition: "all .2s",
  },
  composerFocused: {
    borderColor: "rgba(52,211,153,0.35)",
    boxShadow: "0 12px 35px rgba(0,0,0,0.35), 0 0 0 4px rgba(52,211,153,0.10)",
  },
  composerTextarea: {
    width: "100%",
    minHeight: 56,
    maxHeight: 200,
    padding: "16px 18px 8px",
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    color: "#f1f5f9",
    fontFamily: "inherit",
    fontSize: 14.5,
    lineHeight: 1.5,
    boxSizing: "border-box",
    display: "block",
  },
  composerToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 12px 12px",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "1px solid transparent",
    color: "#94a3b8",
    cursor: "pointer",
    transition: "all .15s",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #34d399, #10b981)",
    border: "1px solid rgba(16,185,129,0.30)",
    color: "#06281b",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(16,185,129,0.25)",
    transition: "all .15s",
  },
  modelChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#94a3b8",
    fontSize: 11.5,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  pendingDot: (delay: number) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#34d399",
    animation: `lumii-dot 1.2s infinite ${delay}s`,
  }),
  emptyHero: {
    maxWidth: 580,
    margin: "80px auto auto",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    alignItems: "center",
  },
  promptGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 16,
    width: "100%",
  },
  promptCard: {
    padding: "14px 18px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.06)",
    color: "#cbd5e1",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "all .2s",
    textAlign: "left",
  },
};

// Brazilian grocery-themed fallback composer
function fallbackReply(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("banana")) {
    return "Aqui está a comparação de preços da **Banana Prata (R$/kg)** nos concorrentes:\n\n```json\n{\n  \"type\": \"chart\",\n  \"chartType\": \"bar\",\n  \"title\": \"Cotações de Banana Prata (R$/kg)\",\n  \"description\": \"Cotações em vigor calculadas nos concorrentes monitorados\",\n  \"xAxis\": \"mercado\",\n  \"yAxis\": \"preco\",\n  \"data\": [\n    { \"mercado\": \"Semar\", \"preco\": 6.49 },\n    { \"mercado\": \"Rossi\", \"preco\": 6.70 },\n    { \"mercado\": \"Shibata\", \"preco\": 6.85 },\n    { \"mercado\": \"Alabarce\", \"preco\": 6.99 }\n  ]\n}\n```\n\nTambém preparei a distribuição de market share de hortifruti na região:\n\n```json\n{\n  \"type\": \"chart\",\n  \"chartType\": \"pie\",\n  \"title\": \"Distribuição de Market Share - Hortifruti\",\n  \"description\": \"Fração de mercado das redes na área de atendimento\",\n  \"xAxis\": \"nome\",\n  \"yAxis\": \"fatia\",\n  \"data\": [\n    { \"nome\": \"Semar\", \"fatia\": 36.1 },\n    { \"nome\": \"Rossi\", \"fatia\": 29.4 },\n    { \"nome\": \"Shibata\", \"fatia\": 20.0 },\n    { \"nome\": \"Alabarce\", \"fatia\": 14.5 }\n  ]\n}\n```\n\nA **Banana Prata** do Semar lidera como a cotação mais competitiva (R$ 6,49). Recomendo manter esse valor.";
  }
  if (lower.includes("margem") || lower.includes("perdendo")) {
    return "Identifiquei 4 SKUs perdendo margem significativa nas últimas 72h devido aos descontos regionais do Assaí:\n\n```json\n{\n  \"type\": \"kpis\",\n  \"title\": \"Margens Críticas de SKUs\",\n  \"description\": \"Produtos com maior redução de margem nos últimos 3 dias\",\n  \"data\": [\n    { \"title\": \"Tomate Italiano\", \"value\": \"-3.1%\", \"change\": \"-2.5% em 72h\", \"changeType\": \"down\", \"status\": \"danger\" },\n    { \"title\": \"Pimentão Vermelho\", \"value\": \"-2.4%\", \"change\": \"-1.8% em 72h\", \"changeType\": \"down\", \"status\": \"danger\" },\n    { \"title\": \"Mamão Formosa\", \"value\": \"-1.8%\", \"change\": \"-0.9% em 72h\", \"changeType\": \"down\", \"status\": \"warning\" },\n    { \"title\": \"Brócolis Ramoso\", \"value\": \"-1.2%\", \"change\": \"Estável\", \"changeType\": \"neutral\", \"status\": \"warning\" }\n  ]\n}\n```\n\nRecomendo subir o preço do Tomate Italiano para **R$ 8,79** para recuperar a margem, visto que o líder Carrefour está operando em R$ 8,90.";
  }
  if (lower.includes("reajuste") || lower.includes("sugest")) {
    return "Para manter a competitividade sem comprometer severamente a margem operacional, sugiro:\n\n* **Banana Prata:** manter em R$ 6,49\n* **Tomate Italiano:** subir para **R$ 8,79** (o líder Carrefour está em R$ 8,90)\n* **Cenoura:** reduzir para **R$ 4,69** (seu preço está 6% acima do mercado regional)\n\nDeseja que eu aplique essas sugestões diretamente no painel gerencial?";
  }
  if (lower.includes("resumo") || lower.includes("ontem")) {
    return "Aqui está o resumo da evolução do preço médio de hortifruti ontem:\n\n```json\n{\n  \"type\": \"chart\",\n  \"chartType\": \"line\",\n  \"title\": \"Evolução do Preço Médio da Cesta (R$)\",\n  \"description\": \"Preço médio diário calculado sobre 15 SKUs básicos\",\n  \"xAxis\": \"data\",\n  \"yAxis\": \"valor\",\n  \"data\": [\n    { \"data\": \"20/05\", \"valor\": 54.20 },\n    { \"data\": \"21/05\", \"valor\": 54.80 },\n    { \"data\": \"22/05\", \"valor\": 55.10 },\n    { \"data\": \"23/05\", \"valor\": 54.95 },\n    { \"data\": \"24/05\", \"valor\": 55.40 },\n    { \"data\": \"25/05\", \"valor\": 55.85 }\n  ]\n}\n```\n\nOntem coletamos **412 cotações** em 5 concorrentes monitorados. O Semar liderou em **38% dos SKUs** com menor preço.";
  }
  return "Oie! Sou a Lumii, sua gerente de dados de hortifruti. Analiso planilhas de preços, gaps de concorrentes e movimentações de estoque no banco da Benverde.\n\nComo posso ajudar hoje? Você pode testar me perguntando sobre:\n* \"Qual produto está perdendo margem?\"\n* \"Sugira reajustes de preços\"\n* \"Como estão as cotações de ontem?\"";
}

// Memoized message row — prevents re-rendering (and chart remount/flicker) when
// the parent re-renders for unrelated state changes like typing in the input.
// As long as the same `message` object reference is passed, this component skips
// its render. New messages always get new references, so they render normally.
const MessageRow = React.memo(function MessageRow({ message }: { message: ChatMessage }) {
  return (
    <div style={aiStyles.msg}>
      <div style={aiStyles.msgRoleChip(message.role)}>
        {message.role === "user" ? "U" : <Sparkles size={16} />}
      </div>
      <div style={aiStyles.msgBody}>
        <div style={aiStyles.msgMeta}>{message.role === "user" ? "Você" : "Lumii"}</div>
        <div style={aiStyles.msgText}>
          {message.role === "assistant" ? (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p style={{ margin: "0 0 12px 0", lineHeight: 1.65 }} className="last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong style={{ fontWeight: 700, color: "#86efac" }}>{children}</strong>,
                  em: ({ children }) => <em style={{ fontStyle: "italic", color: "#a7f3d0" }}>{children}</em>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: "0 0 12px 0", listStyleType: "disc" }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: "0 0 12px 0", listStyleType: "decimal" }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>,
                  // Tables (via remark-gfm) — dark theme with subtle borders and overflow scroll.
                  table: ({ children }) => (
                    <div style={{
                      overflowX: "auto",
                      margin: "12px 0",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "rgba(255,255,255,0.06)",
                      background: "rgba(15,23,42,0.30)",
                    }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead style={{ background: "rgba(52,211,153,0.06)" }}>{children}</thead>
                  ),
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr>{children}</tr>,
                  th: ({ children }) => (
                    <th style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "#94a3b8",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid",
                      borderBottomColor: "rgba(255,255,255,0.10)",
                    }}>{children}</th>
                  ),
                  td: ({ children }) => (
                    <td style={{
                      padding: "10px 14px",
                      color: "#cbd5e1",
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid",
                      borderBottomColor: "rgba(255,255,255,0.04)",
                      verticalAlign: "top",
                    }}>{children}</td>
                  ),
                  // Render code blocks as a block-level div instead of <pre> so charts
                  // get a proper width context (pre has white-space:pre which can
                  // collapse ResponsiveContainer's measured width to -1).
                  pre: ({ children }) => <div style={{ width: "100%", margin: 0 }}>{children}</div>,
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeText = String(children).replace(/\n$/, "");
                    if (match && match[1] === "json") {
                      try {
                        const parsed = JSON.parse(codeText);
                        if (parsed && (parsed.type === "chart" || parsed.type === "kpis")) {
                          if (Array.isArray(parsed.data) && parsed.data.length > 0) {
                            return <LumiiChart spec={parsed} />;
                          }
                        }
                      } catch {
                        // Not a valid JSON chart spec, fall through to default
                      }
                    }
                    return (
                      <code
                        style={{
                          fontFamily: "monospace",
                          fontSize: 13,
                          background: "rgba(52,211,153,0.15)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          color: "#a7f3d0",
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.65 }}>{message.text}</p>
          )}
        </div>
        {message.attachments && message.attachments.length > 0 ? (
          <div style={aiStyles.attRow}>
            {message.attachments.map((a) => (
              <span key={a.id} style={aiStyles.attChip}>
                <span style={aiStyles.attChipIcon}>
                  <FileText size={10} />
                </span>
                {a.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default function LumiiAiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation thread
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, pending]);

  // Load conversation list on mount
  const reloadConversations = useCallback(async () => {
    try {
      const res = await api.get<{ conversations: ConversationSummary[] }>(
        "/api/lumii/conversations",
      );
      setConversations(res.data?.conversations ?? []);
    } catch (error) {
      console.warn("Falha ao listar conversas Lumii:", error);
    }
  }, []);

  useEffect(() => {
    void reloadConversations();
  }, [reloadConversations]);

  // Load messages from a stored conversation
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await api.get<ConversationDetail>(`/api/lumii/conversations/${id}`);
      const loaded = res.data?.messages ?? [];
      setMessages(
        loaded.map((m) => ({
          role: m.role,
          text: m.content,
          ts: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        })),
      );
      setCurrentConversationId(id);
    } catch (error) {
      console.warn(getApiErrorMessage(error, "Falha ao carregar conversa."), error);
    }
  }, []);

  // Delete a stored conversation
  const removeConversation = useCallback(
    async (id: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      try {
        await api.delete(`/api/lumii/conversations/${id}`);
        if (id === currentConversationId) {
          setMessages([]);
          setCurrentConversationId(null);
        }
        await reloadConversations();
      } catch (error) {
        console.warn(getApiErrorMessage(error, "Falha ao excluir conversa."), error);
      }
    },
    [currentConversationId, reloadConversations],
  );

  // Execute chat message exchange
  const sendUser = async (content: string, files: Attachment[] = []) => {
    const userMsg: ChatMessage = {
      role: "user",
      text: content,
      attachments: files,
      ts: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setPending(true);

    try {
      // Map frontend message history to backend format
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      // In case files were attached, append a helpful notification context in user message text
      let apiMessage = content;
      if (files.length > 0) {
        const fileNames = files.map((f) => f.name).join(", ");
        apiMessage += `\n[Nota do Usuário: Arquivos anexados: ${fileNames}]`;
      }

      // Query the real Next.js API chat route
      const response = await api.post<LumiiResponse>("/api/mita-ai/chat", {
        message: apiMessage,
        history: historyPayload,
        scope: "mita-ai",
        conversation_id: currentConversationId,
      });

      const replyText = response.data?.answer?.trim();
      const returnedId = response.data?.conversation_id;
      if (returnedId && returnedId !== currentConversationId) {
        setCurrentConversationId(returnedId);
      }

      if (replyText) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: replyText,
            ts: Date.now(),
          },
        ]);
        // Refresh sidebar so new conversation shows up / order updates
        void reloadConversations();
      } else {
        throw new Error("Resposta em branco da API");
      }
    } catch (error) {
      console.warn("Falha na API de chat com Lumii. Utilizando fallback local:", error);
      
      // Implement fallback logic
      const fallbackText = fallbackReply(content);
      
      // Delay response slightly to simulate thinking
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: fallbackText,
            ts: Date.now(),
          },
        ]);
      }, 750);
    } finally {
      // Resolve typing indicators after api / timeout finishes
      setTimeout(() => setPending(false), 800);
    }
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content && attachments.length === 0) return;

    // Build user message with optional uploads
    const msgText = content || `Análise de arquivos: ${attachments.map((a) => a.name).join(", ")}`;
    sendUser(msgText, attachments);
    setText("");
    setAttachments([]);
  };

  const handleAttachFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const parsedFiles = Array.from(selectedFiles).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      kind: (file.name.split(".").pop() || "").toLowerCase(),
    }));

    setAttachments((prev) => [...prev, ...parsedFiles]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const startNewConversation = () => {
    setMessages([]);
    setText("");
    setAttachments([]);
    setPending(false);
    setCurrentConversationId(null);
  };

  const prompts = [
    "Compare meus 10 SKUs mais vendidos com Carrefour e Atacadão",
    "Quais produtos estão perdendo margem essa semana?",
    "Resumo das cotações de ontem por loja",
    "Sugira reajuste de preço para banana, tomate e cenoura",
  ];

  return (
    <div style={aiStyles.layout} data-screen-label="Lumii AI">
      {/* Sidebar with conversation list */}
      <aside style={aiStyles.sidebar}>
        <div style={aiStyles.sidebarHeader}>
          <span style={aiStyles.sidebarTitle}>Conversas</span>
          <button
            type="button"
            onClick={startNewConversation}
            style={aiStyles.newConvBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(16,185,129,0.16)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(16,185,129,0.08)";
            }}
          >
            <Plus size={12} /> Nova
          </button>
        </div>
        <div style={aiStyles.convList}>
          {conversations.length === 0 ? (
            <div style={aiStyles.convEmpty}>Nenhuma conversa ainda.</div>
          ) : (
            conversations.map((conv) => {
              const active = conv.id === currentConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => void loadConversation(conv.id)}
                  style={aiStyles.convItem(active)}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <MessageSquare size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span style={aiStyles.convTitle}>{conv.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => void removeConversation(conv.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void removeConversation(conv.id);
                      }
                    }}
                    style={aiStyles.convDel}
                    title="Excluir conversa"
                    aria-label="Excluir conversa"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#64748b";
                    }}
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main column with header + chat + composer */}
      <div style={aiStyles.mainCol}>
        <div style={aiStyles.page}>
      {/* Page Header */}
      <div style={aiStyles.head}>
        <div style={{ flex: 1 }}>
          <div style={aiStyles.overline}>Preços Concorrentes · IA</div>
          <h1 style={{ ...aiStyles.title, marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
            Lumii AI
            <span style={aiStyles.badge}>Online</span>
          </h1>
          <div style={aiStyles.sub}>
            Converse com a Lumii sobre preços, margens e metas de estoque. Anexe planilhas de cotações para análises.
          </div>
        </div>
        <button
          type="button"
          onClick={startNewConversation}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 14,
            border: "1px solid rgba(16,185,129,0.30)",
            background: "rgba(16,185,129,0.08)",
            color: "#6ee7b7",
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            transition: "all .2s",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(16,185,129,0.16)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(16,185,129,0.08)";
          }}
        >
          <Plus size={14} /> Nova conversa
        </button>
      </div>

      {/* Chat Thread */}
      <div ref={threadRef} style={aiStyles.thread}>
        <div style={aiStyles.threadInner}>
          {messages.length === 0 ? (
            <div style={aiStyles.emptyHero}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  background: "linear-gradient(135deg, #34d399, #10b981)",
                  boxShadow: "0 0 30px rgba(52,211,153,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={34} color="#06281b" />
              </div>
              <div>
                <div style={{ fontSize: 21, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
                  Como posso ajudar hoje?
                </div>
                <div style={{ fontSize: 13.5, color: "#94a3b8", marginTop: 6 }}>
                  Estou pronta para analisar planilhas de preços, comparar cotações concorrentes e propor reajustes estratégicos.
                </div>
              </div>
              <div style={aiStyles.promptGrid}>
                {prompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendUser(p)}
                    style={aiStyles.promptCard}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.borderColor = "rgba(52,211,153,0.25)";
                      e.currentTarget.style.color = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.color = "#cbd5e1";
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <MessageRow key={i} message={m} />)
          )}

          {pending && (
            <div style={aiStyles.msg}>
              <div style={aiStyles.msgRoleChip("assistant")}>
                <Sparkles size={16} />
              </div>
              <div style={aiStyles.msgBody}>
                <div style={aiStyles.msgMeta}>Lumii</div>
                <div style={{ display: "flex", gap: 5, padding: "12px 0" }}>
                  <span style={aiStyles.pendingDot(0)} />
                  <span style={aiStyles.pendingDot(0.2)} />
                  <span style={aiStyles.pendingDot(0.4)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer Input Wrap */}
      <div style={aiStyles.composerWrap}>
        <div style={aiStyles.composerInner}>
          <div style={{ ...aiStyles.composer, ...(focused ? aiStyles.composerFocused : {}) }}>
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "14px 16px 0" }}>
                {attachments.map((a) => (
                  <span
                    key={a.id}
                    style={{
                      ...aiStyles.attChip,
                      background: "rgba(52,211,153,0.10)",
                      border: "1px solid rgba(52,211,153,0.25)",
                      color: "#86efac",
                    }}
                  >
                    <span style={{ ...aiStyles.attChipIcon, background: "rgba(6,40,27,0.40)" }}>
                      <FileText size={10} />
                    </span>
                    {a.name}
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#86efac",
                        cursor: "pointer",
                        padding: 0,
                        display: "inline-flex",
                        marginLeft: 4,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              style={aiStyles.composerTextarea}
              placeholder="Pergunte sobre preços, margens de SKUs ou dados operacionais..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
            />
            <div style={aiStyles.composerToolbar}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={handleAttachFiles}
                />
                <button
                  type="button"
                  style={aiStyles.iconBtn}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#94a3b8";
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" style={aiStyles.modelChip}>
                  Lumii <span style={{ color: "#6ee7b7", fontWeight: 600, marginLeft: 3 }}>Adaptativo</span>
                  <ChevronDown size={12} style={{ marginLeft: 4 }} />
                </button>
                <button type="button" style={aiStyles.sendBtn} onClick={handleSend} disabled={pending}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#475569", textAlign: "center" }}>
            A Lumii pode cometer erros de cálculo. Verifique recomendações antes de aplicá-las aos preços.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lumii-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </div>
      </div>
    </div>
  );
}
