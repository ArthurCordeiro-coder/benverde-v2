// Lumii AI — full chat surface for asking the assistant about prices,
// stock, and competitor strategy. Accepts a seed message from the Início
// composer (passed in via props.seed) and runs the conversation locally
// using window.claude.complete.

const aiStyles = {
  page: {
    display: "flex", flexDirection: "column",
    height: "calc(100vh - 56px)",
    minHeight: 600,
    margin: -8,
  },
  head: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "8px 16px 16px",
  },
  overline: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.16em", textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", margin: 0 },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 9999,
    background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)",
    color: "#6ee7b7", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
  },

  thread: {
    flex: 1, overflowY: "auto",
    padding: "8px 16px 16px",
    display: "flex", flexDirection: "column", gap: 18,
  },
  threadInner: { maxWidth: 820, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 },

  msg: { display: "flex", gap: 12 },
  msgRoleChip: (kind) => ({
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: kind === "user"
      ? "rgba(255,255,255,0.06)"
      : "linear-gradient(135deg, #34d399, #10b981)",
    border: kind === "user" ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(16,185,129,0.30)",
    color: kind === "user" ? "#cbd5e1" : "#06281b",
    fontWeight: 700, fontSize: 12,
    boxShadow: kind === "user" ? "none" : "0 4px 14px rgba(16,185,129,0.30)",
  }),
  msgBody: { flex: 1, minWidth: 0 },
  msgMeta: { fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em", marginBottom: 6 },
  msgText: {
    fontSize: 15, lineHeight: 1.65, color: "#e2e8f0",
    whiteSpace: "pre-wrap", wordWrap: "break-word",
  },

  attRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  attChip: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "5px 10px 5px 6px", borderRadius: 9999,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1", fontSize: 11, fontWeight: 600,
  },
  attChipIcon: {
    width: 20, height: 20, borderRadius: 9999,
    background: "rgba(52,211,153,0.18)", color: "#86efac",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 8, fontWeight: 800,
  },

  // Composer pinned at bottom
  composerWrap: {
    padding: "12px 16px 16px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "linear-gradient(180deg, rgba(7,20,14,0) 0%, rgba(7,20,14,0.5) 50%, rgba(7,20,14,0.95) 100%)",
  },
  composerInner: { maxWidth: 820, width: "100%", margin: "0 auto" },
  composer: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    transition: "all .2s",
  },
  composerFocused: {
    borderColor: "rgba(52,211,153,0.35)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35), 0 0 0 4px rgba(52,211,153,0.10)",
  },
  composerTextarea: {
    width: "100%", minHeight: 50, maxHeight: 200, padding: "16px 18px 8px",
    background: "transparent", border: "none", outline: "none", resize: "none",
    color: "#f1f5f9", fontFamily: "inherit", fontSize: 15, lineHeight: 1.5,
    boxSizing: "border-box", display: "block",
  },
  composerToolbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "4px 10px 10px",
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "1px solid transparent",
    color: "#94a3b8", cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 10,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #34d399, #10b981)",
    border: "1px solid rgba(16,185,129,0.30)",
    color: "#06281b", cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(16,185,129,0.25)",
    transition: "all .15s",
  },
  modelChip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 10px", borderRadius: 9, background: "transparent",
    border: "1px solid transparent", color: "#94a3b8",
    fontSize: 12, fontFamily: "inherit", cursor: "pointer",
  },
  pendingDot: (delay) => ({
    width: 6, height: 6, borderRadius: "50%",
    background: "#34d399",
    animation: `lumii-dot 1.2s infinite ${delay}s`,
  }),

  emptyHero: {
    maxWidth: 540, margin: "auto", textAlign: "center",
    display: "flex", flexDirection: "column", gap: 16, alignItems: "center",
  },
  promptGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8, width: "100%",
  },
  promptCard: {
    padding: "14px 16px", borderRadius: 14,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1", fontSize: 13, fontFamily: "inherit",
    cursor: "pointer", transition: "all .2s", textAlign: "left",
  },
};

// Local response composer used as a fallback if window.claude isn't reachable.
function fallbackReply(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes("banana")) {
    return "Olhando os últimos 7 dias, a Banana Prata da Semar está R$ 6,49/kg — em linha com Carrefour (R$ 6,52) e R$ 0,30 acima do Atacadão. Recomendação: manter preço esta semana e reavaliar terça com a próxima cotação. Quer que eu monte um relatório por loja?";
  }
  if (lower.includes("margem") || lower.includes("perdendo")) {
    return "Identifiquei 4 SKUs perdendo margem nas últimas 72h: Tomate Italiano (-3,1%), Pimentão Vermelho (-2,4%), Mamão Formosa (-1,8%) e Brócolis Ramoso (-1,2%). O principal motivo é o Assaí baixando preço regional. Posso preparar uma sugestão de reajuste?";
  }
  if (lower.includes("reajuste") || lower.includes("sugest")) {
    return "Para manter a competitividade sem comprometer margem, sugiro:\n• Banana Prata: manter em R$ 6,49\n• Tomate Italiano: subir para R$ 8,79 (Carrefour está em R$ 8,90)\n• Cenoura: reduzir para R$ 4,69 (você está acima do líder em 6%)\n\nQuer que eu aplique essas sugestões no painel?";
  }
  if (lower.includes("resumo") || lower.includes("ontem")) {
    return "Resumo de ontem (24/05):\n• 412 cotações coletadas em 5 concorrentes\n• Semar liderou em 38% dos SKUs monitorados\n• Maior gap: Alho Nacional, R$ 1,80 acima do Atacadão\n• Estoque crítico: Morango Bandeja (12 un)\n\nQuer ver os detalhes da Tabela Completa?";
  }
  return "Posso ajudar com análise de preços, sugestões de reajuste, comparação com concorrentes e leitura de planilhas. Me conta o que você está investigando hoje e eu monto a análise.";
}

async function callLumii(messages) {
  try {
    if (window.claude && window.claude.complete) {
      const sys = "Você é a Lumii, uma assistente de IA para gestão de preços em supermercados brasileiros. Responda em português do Brasil, de forma direta, operacional e útil. Mantenha respostas curtas (3-5 frases). Quando relevante, ofereça próximos passos. Não use emojis.";
      const formatted = [
        { role: "user", content: `${sys}\n\nConversa:\n${messages.map((m) => `${m.role === "user" ? "Usuário" : "Lumii"}: ${m.text}`).join("\n")}\n\nLumii:` },
      ];
      const reply = await window.claude.complete({ messages: formatted });
      return (reply || "").trim() || fallbackReply(messages[messages.length - 1].text);
    }
  } catch (e) {
    // fall through
  }
  return fallbackReply(messages[messages.length - 1].text);
}

function LumiiAI({ session, onAppend, seed, clearSeed, onNew }) {
  const messages = (session && session.messages) || [];
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileRef = useRef(null);
  const threadRef = useRef(null);

  // Seed once on entry (only for empty sessions)
  useEffect(() => {
    if (!seed) return;
    if (messages.length > 0) { clearSeed && clearSeed(); return; }
    if (seed.seedText || (seed.seedFiles && seed.seedFiles.length > 0)) {
      sendUser(seed.seedText || "Carreguei estes arquivos. Pode me ajudar a analisá-los?", seed.seedFiles || []);
    }
    clearSeed && clearSeed();
    // eslint-disable-next-line
  }, [seed && (seed.seedText || (seed.seedFiles && seed.seedFiles.length))]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, pending]);

  async function sendUser(content, files = []) {
    const userMsg = { role: "user", text: content, attachments: files, ts: Date.now() };
    const next = [...messages, userMsg];
    onAppend && onAppend(next);
    setPending(true);
    const reply = await callLumii(next);
    const afterReply = [...next, { role: "assistant", text: reply, ts: Date.now() }];
    onAppend && onAppend(afterReply);
    setPending(false);
  }

  const onSend = () => {
    const content = text.trim();
    if (!content && attachments.length === 0) return;
    sendUser(content || "Análise dos arquivos anexados.", attachments);
    setText(""); setAttachments([]);
  };

  const attachFiles = (files) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name, size: f.size,
      kind: (f.name.split(".").pop() || "").toLowerCase(),
    }));
    setAttachments((cur) => [...cur, ...next]);
  };

  const prompts = [
    "Compare meus 10 SKUs mais vendidos com Carrefour e Atacadão",
    "Quais produtos estão perdendo margem essa semana?",
    "Resumo das cotações de ontem por loja",
    "Sugira reajuste de preço para banana, tomate e cenoura",
  ];

  return (
    <div style={aiStyles.page} data-screen-label="Lumii AI">
      <div style={aiStyles.head}>
        <div style={{ flex: 1 }}>
          <div style={aiStyles.overline}>Preços Concorrentes · IA</div>
          <h1 style={{ ...aiStyles.title, marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
            Lumii AI
            <span style={aiStyles.badge}>Online</span>
          </h1>
          <div style={aiStyles.sub}>
            Converse com a Lumii sobre preços, margem e estratégia. Anexe planilhas para análises personalizadas.
          </div>
        </div>
        <button type="button" onClick={() => onNew && onNew()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 12,
            border: "1px solid rgba(16,185,129,0.30)",
            background: "rgba(16,185,129,0.10)",
            color: "#6ee7b7", fontWeight: 600, fontSize: 13, fontFamily: "inherit",
            cursor: "pointer", transition: "all .2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.16)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.10)"; }}
        >
          <IconPlus size={13}/> Nova conversa
        </button>
      </div>

      <div ref={threadRef} style={aiStyles.thread}>
        <div style={aiStyles.threadInner}>
          {messages.length === 0 ? (
            <div style={aiStyles.emptyHero}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: "linear-gradient(135deg, #34d399, #10b981)",
                boxShadow: "0 0 30px rgba(52,211,153,0.40)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3l1.8 5.5L19 10l-4.7 1.5L12 17l-2.3-5.5L5 10l5.2-1.5L12 3z" fill="#06281b"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
                  Como posso ajudar hoje?
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
                  Posso analisar planilhas, comparar preços e sugerir reajustes.
                </div>
              </div>
              <div style={aiStyles.promptGrid}>
                {prompts.map((p) => (
                  <button key={p} type="button"
                    onClick={() => sendUser(p)}
                    style={aiStyles.promptCard}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(52,211,153,0.20)"; e.currentTarget.style.color = "#f1f5f9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#cbd5e1"; }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={aiStyles.msg}>
                <div style={aiStyles.msgRoleChip(m.role)}>
                  {m.role === "user" ? "AC" : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3l1.8 5.5L19 10l-4.7 1.5L12 17l-2.3-5.5L5 10l5.2-1.5L12 3z" fill="#06281b"/>
                    </svg>
                  )}
                </div>
                <div style={aiStyles.msgBody}>
                  <div style={aiStyles.msgMeta}>{m.role === "user" ? "Você" : "Lumii"}</div>
                  <div style={aiStyles.msgText}>{m.text}</div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div style={aiStyles.attRow}>
                      {m.attachments.map((a) => (
                        <span key={a.id} style={aiStyles.attChip}>
                          <span style={aiStyles.attChipIcon}>{a.kind.toUpperCase().slice(0, 3)}</span>
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {pending && (
            <div style={aiStyles.msg}>
              <div style={aiStyles.msgRoleChip("assistant")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3l1.8 5.5L19 10l-4.7 1.5L12 17l-2.3-5.5L5 10l5.2-1.5L12 3z" fill="#06281b"/>
                </svg>
              </div>
              <div style={aiStyles.msgBody}>
                <div style={aiStyles.msgMeta}>Lumii</div>
                <div style={{ display: "flex", gap: 5, padding: "10px 0" }}>
                  <span style={aiStyles.pendingDot(0)}/>
                  <span style={aiStyles.pendingDot(0.2)}/>
                  <span style={aiStyles.pendingDot(0.4)}/>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={aiStyles.composerWrap}>
        <div style={aiStyles.composerInner}>
          <div style={{ ...aiStyles.composer, ...(focused ? aiStyles.composerFocused : {}) }}>
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 16px 0" }}>
                {attachments.map((a) => (
                  <span key={a.id} style={{
                    ...aiStyles.attChip,
                    background: "rgba(52,211,153,0.10)",
                    border: "1px solid rgba(52,211,153,0.25)",
                    color: "#86efac",
                  }}>
                    <span style={{ ...aiStyles.attChipIcon, background: "rgba(6,40,27,0.40)" }}>{a.kind.toUpperCase().slice(0, 3)}</span>
                    {a.name}
                    <button type="button"
                      onClick={() => setAttachments((cur) => cur.filter((x) => x.id !== a.id))}
                      style={{ background: "transparent", border: "none", color: "#86efac", cursor: "pointer", padding: 0, display: "inline-flex" }}>
                      <IconX size={11}/>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              style={aiStyles.composerTextarea}
              placeholder="Pergunte sobre preços, margens, concorrentes…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }}}
              rows={1}
            />
            <div style={aiStyles.composerToolbar}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input ref={fileRef} type="file" multiple
                  accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => { attachFiles(e.target.files); e.target.value = ""; }}/>
                <button type="button" style={aiStyles.iconBtn}
                  onClick={() => fileRef.current && fileRef.current.click()}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#f1f5f9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <IconPlus size={15}/>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button type="button" style={aiStyles.modelChip}>
                  Lumii <span style={{ color: "#6ee7b7", fontWeight: 600 }}>Adaptativo</span>
                  <IconChevDown size={11}/>
                </button>
                <button type="button" style={aiStyles.sendBtn}
                  onClick={onSend}
                  disabled={pending}
                >
                  <IconSend size={13}/>
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#475569", textAlign: "center" }}>
            A Lumii pode cometer erros. Verifique recomendações antes de aplicar aos preços.
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
  );
}

window.LumiiAI = LumiiAI;
