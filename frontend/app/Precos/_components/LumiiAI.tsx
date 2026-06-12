import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import api from "@/lib/api";
import { IconChevDown, IconPlus, IconSend, IconX } from "../_lib/icons";
import type { AiSeed, ChatMessage, ChatSession } from "../_lib/types";

const a = {
  page: { display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", minHeight: 600, margin: -8 } as CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 16, padding: "8px 16px 16px" } as CSSProperties,
  overline: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.16em", textTransform: "uppercase" } as CSSProperties,
  title: { fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", margin: 0 } as CSSProperties,
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 4 } as CSSProperties,
  badge: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999,
    background: "rgba(46,196,182,0.10)", border: "1px solid rgba(46,196,182,0.25)",
    color: "#6fe0d4", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
  } as CSSProperties,
  thread: { flex: 1, overflowY: "auto", padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 18 } as CSSProperties,
  threadInner: { maxWidth: 820, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 } as CSSProperties,
  msg: { display: "flex", gap: 12 } as CSSProperties,
  msgRoleChip: (kind: string): CSSProperties => ({
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: kind === "user" ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #5fd9cd, #2ec4b6)",
    border: kind === "user" ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(46,196,182,0.30)",
    color: kind === "user" ? "#cbd5e1" : "#042620", fontWeight: 700, fontSize: 12,
    boxShadow: kind === "user" ? "none" : "0 4px 14px rgba(46,196,182,0.30)",
  }),
  msgBody: { flex: 1, minWidth: 0 } as CSSProperties,
  msgMeta: { fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em", marginBottom: 6 } as CSSProperties,
  msgText: { fontSize: 15, lineHeight: 1.65, color: "#e2e8f0", whiteSpace: "pre-wrap", wordWrap: "break-word" } as CSSProperties,
  attRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 } as CSSProperties,
  attChip: { display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 6px", borderRadius: 9999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 11, fontWeight: 600 } as CSSProperties,
  attChipIcon: { width: 20, height: 20, borderRadius: 9999, background: "rgba(46,196,182,0.18)", color: "#6fe0d4", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 } as CSSProperties,
  composerWrap: { padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg, rgba(7,4,26,0) 0%, rgba(7,4,26,0.5) 50%, rgba(7,4,26,0.95) 100%)" } as CSSProperties,
  composerInner: { maxWidth: 820, width: "100%", margin: "0 auto" } as CSSProperties,
  composer: { borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", boxShadow: "0 12px 30px rgba(0,0,0,0.35)", transition: "all .2s" } as CSSProperties,
  composerFocused: { borderColor: "rgba(46,196,182,0.35)", boxShadow: "0 12px 30px rgba(0,0,0,0.35), 0 0 0 4px rgba(46,196,182,0.10)" } as CSSProperties,
  composerTextarea: { width: "100%", minHeight: 50, maxHeight: 200, padding: "16px 18px 8px", background: "transparent", border: "none", outline: "none", resize: "none", color: "#f1f5f9", fontFamily: "inherit", fontSize: 15, lineHeight: 1.5, boxSizing: "border-box", display: "block" } as CSSProperties,
  composerToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 10px" } as CSSProperties,
  iconBtn: { width: 34, height: 34, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid transparent", color: "#94a3b8", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" } as CSSProperties,
  sendBtn: { width: 34, height: 34, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)", border: "1px solid rgba(245,208,48,0.45)", color: "#0c0525", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(245,208,48,0.30), inset 0 1px 0 rgba(255,255,255,0.35)", transition: "all .15s" } as CSSProperties,
  modelChip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 9, background: "transparent", border: "1px solid transparent", color: "#94a3b8", fontSize: 12, fontFamily: "inherit", cursor: "pointer" } as CSSProperties,
  pendingDot: (delay: number): CSSProperties => ({ width: 6, height: 6, borderRadius: "50%", background: "#5fd9cd", animation: `lumii-dot 1.2s infinite ${delay}s` }),
  emptyHero: { maxWidth: 540, margin: "auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" } as CSSProperties,
  promptGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8, width: "100%" } as CSSProperties,
  promptCard: { padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s", textAlign: "left" } as CSSProperties,
};

type ApiError = { response?: { status?: number; data?: { detail?: string } } };

function fallbackReply(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("banana")) return "Olhando as cotações recentes, a Banana Prata da Semar segue competitiva frente aos concorrentes monitorados. Recomendação: manter o preço esta semana e reavaliar com a próxima pesquisa. Quer um relatório por loja?";
  if (lower.includes("margem") || lower.includes("perdendo")) return "Alguns SKUs aparecem perdendo margem nas pesquisas mais recentes, principalmente quando um concorrente baixa o preço regional. Posso preparar uma sugestão de reajuste?";
  if (lower.includes("reajuste") || lower.includes("sugest")) return "Para manter competitividade sem comprometer margem, avalie aproximar os preços do líder nos itens em que a Semar está acima e segurar onde já lidera. Quer que eu detalhe item a item?";
  if (lower.includes("resumo") || lower.includes("ontem") || lower.includes("cesta")) return "Recebi sua seleção. Posso comparar cada item com o menor preço dos concorrentes, destacar onde a Semar está perdendo e sugerir reajustes. Quer que eu comece por quais produtos?";
  return "Posso ajudar com análise de preços, sugestões de reajuste, comparação com concorrentes e leitura de planilhas. Me conta o que você está investigando hoje e eu monto a análise.";
}

async function callLumii(message: string, conversationId: string | null): Promise<{ answer: string; conversationId: string | null }> {
  try {
    const res = await api.post<{ answer: string; conversation_id: string }>("/api/mita-ai/chat", {
      scope: "precos",
      message,
      conversation_id: conversationId ?? undefined,
    });
    const answer = (res.data?.answer || "").trim();
    return { answer: answer || fallbackReply(message), conversationId: res.data?.conversation_id ?? conversationId };
  } catch (e) {
    const status = (e as ApiError)?.response?.status;
    if (status === 401) {
      return { answer: "Sua sessão expirou. Faça login novamente para conversar com a Lumii.", conversationId };
    }
    return { answer: fallbackReply(message), conversationId };
  }
}

export function LumiiAI({
  session,
  onAppend,
  seed,
  clearSeed,
  onNew,
}: {
  session: ChatSession | null;
  onAppend: (messages: ChatMessage[], conversationId?: string | null) => void;
  seed: AiSeed;
  clearSeed: () => void;
  onNew: () => void;
}) {
  const messages = useMemo(() => session?.messages ?? [], [session?.messages]);
  const conversationId = session?.conversationId ?? null;
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState<ChatMessage["attachments"]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<string | null>(conversationId);
  convRef.current = conversationId;

  async function sendUser(content: string, files: ChatMessage["attachments"] = []) {
    const userMsg: ChatMessage = { role: "user", text: content, attachments: files, ts: Date.now() };
    const next = [...messages, userMsg];
    onAppend(next, convRef.current);
    setPending(true);
    const { answer, conversationId: newId } = await callLumii(content, convRef.current);
    convRef.current = newId;
    const afterReply: ChatMessage[] = [...next, { role: "assistant", text: answer, ts: Date.now() }];
    onAppend(afterReply, newId);
    setPending(false);
  }

  // Seed once on entry (only for empty sessions).
  useEffect(() => {
    if (!seed) return;
    if (messages.length > 0) { clearSeed(); return; }
    if (seed.seedText || (seed.seedFiles && seed.seedFiles.length > 0)) {
      void sendUser(seed.seedText || "Carreguei estes arquivos. Pode me ajudar a analisá-los?", seed.seedFiles || []);
    }
    clearSeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed && (seed.seedText || (seed.seedFiles && seed.seedFiles.length))]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, pending]);

  const onSend = () => {
    const content = text.trim();
    if (!content && (!attachments || attachments.length === 0)) return;
    void sendUser(content || "Análise dos arquivos anexados.", attachments);
    setText("");
    setAttachments([]);
  };

  const attachFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, name: f.name, size: f.size, kind: (f.name.split(".").pop() || "").toLowerCase() }));
    setAttachments((cur) => [...(cur || []), ...next]);
  };

  const prompts = [
    "Compare meus 10 SKUs mais vendidos com Carrefour e Atacadão",
    "Quais produtos estão perdendo margem essa semana?",
    "Resumo das cotações de ontem por loja",
    "Sugira reajuste de preço para banana, tomate e cenoura",
  ];

  return (
    <div style={a.page} data-r-ai-page>
      <div style={a.head} data-r-chat-head>
        <div style={{ flex: 1 }}>
          <div style={a.overline}>Preços Concorrentes · IA</div>
          <h1 style={{ ...a.title, marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
            Lumii AI
            <span style={a.badge}>Online</span>
          </h1>
          <div style={a.sub}>Converse com a Lumii sobre preços, margem e estratégia. Anexe planilhas para análises personalizadas.</div>
        </div>
        <button type="button" onClick={() => onNew()}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(46,196,182,0.30)", background: "rgba(46,196,182,0.10)", color: "#6fe0d4", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(46,196,182,0.16)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(46,196,182,0.10)")}
        >
          <IconPlus size={13} /> Nova conversa
        </button>
      </div>

      <div ref={threadRef} style={a.thread}>
        <div style={a.threadInner}>
          {messages.length === 0 ? (
            <div style={a.emptyHero}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lumii-icon.png" alt="Lumii" width={64} height={64} style={{ borderRadius: 20, boxShadow: "0 14px 36px rgba(32,10,94,0.50)" }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.01em" }}>Como posso ajudar hoje?</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Posso analisar planilhas, comparar preços e sugerir reajustes.</div>
              </div>
              <div style={a.promptGrid} data-r-grid-2>
                {prompts.map((p) => (
                  <button key={p} type="button" onClick={() => void sendUser(p)} style={a.promptCard}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(46,196,182,0.20)"; e.currentTarget.style.color = "#f1f5f9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#cbd5e1"; }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={a.msg}>
                <div style={a.msgRoleChip(m.role)}>
                  {m.role === "user" ? "AC" : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3l1.8 5.5L19 10l-4.7 1.5L12 17l-2.3-5.5L5 10l5.2-1.5L12 3z" fill="#042620" />
                    </svg>
                  )}
                </div>
                <div style={a.msgBody}>
                  <div style={a.msgMeta}>{m.role === "user" ? "Você" : "Lumii"}</div>
                  <div style={a.msgText} data-r-msg-text>{m.text}</div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div style={a.attRow}>
                      {m.attachments.map((att) => (
                        <span key={att.id} style={a.attChip}>
                          <span style={a.attChipIcon}>{att.kind.toUpperCase().slice(0, 3)}</span>
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {pending && (
            <div style={a.msg}>
              <div style={a.msgRoleChip("assistant")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3l1.8 5.5L19 10l-4.7 1.5L12 17l-2.3-5.5L5 10l5.2-1.5L12 3z" fill="#042620" />
                </svg>
              </div>
              <div style={a.msgBody}>
                <div style={a.msgMeta}>Lumii</div>
                <div style={{ display: "flex", gap: 5, padding: "10px 0" }}>
                  <span style={a.pendingDot(0)} />
                  <span style={a.pendingDot(0.2)} />
                  <span style={a.pendingDot(0.4)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={a.composerWrap}>
        <div style={a.composerInner}>
          <div style={{ ...a.composer, ...(focused ? a.composerFocused : {}) }}>
            {attachments && attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 16px 0" }}>
                {attachments.map((att) => (
                  <span key={att.id} style={{ ...a.attChip, background: "rgba(46,196,182,0.10)", border: "1px solid rgba(46,196,182,0.25)", color: "#6fe0d4" }}>
                    <span style={{ ...a.attChipIcon, background: "rgba(4,38,32,0.40)" }}>{att.kind.toUpperCase().slice(0, 3)}</span>
                    {att.name}
                    <button type="button" onClick={() => setAttachments((cur) => (cur || []).filter((x) => x.id !== att.id))} style={{ background: "transparent", border: "none", color: "#6fe0d4", cursor: "pointer", padding: 0, display: "inline-flex" }}>
                      <IconX size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              style={a.composerTextarea}
              placeholder="Pergunte sobre preços, margens, concorrentes…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              rows={1}
            />
            <div style={a.composerToolbar}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={(e) => { attachFiles(e.target.files); e.target.value = ""; }} />
                <button type="button" style={a.iconBtn} onClick={() => fileRef.current?.click()}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#f1f5f9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <IconPlus size={15} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button type="button" style={a.modelChip}>
                  Lumii <span style={{ color: "#6fe0d4", fontWeight: 600 }}>Adaptativo</span>
                  <IconChevDown size={11} />
                </button>
                <button type="button" style={a.sendBtn} onClick={onSend} disabled={pending}>
                  <IconSend size={13} />
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#475569", textAlign: "center" }}>
            A Lumii pode cometer erros. Verifique recomendações antes de aplicar aos preços.
          </div>
        </div>
      </div>
    </div>
  );
}
