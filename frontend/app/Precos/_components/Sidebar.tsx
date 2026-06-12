import type { CSSProperties } from "react";

import {
  IconBar,
  IconChevDown,
  IconLogout,
  IconPlus,
  IconTag,
  IconUser,
  IconX,
} from "../_lib/icons";
import type { AiSeed, ChatSession, Route } from "../_lib/types";
import { mobileScrimStyles } from "./MobileTopBar";

const sb = {
  shell: {
    position: "relative", zIndex: 10, margin: 16,
    display: "flex", width: 272, flexShrink: 0, flexDirection: "column",
    overflow: "hidden", borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    maxHeight: "calc(100vh - 32px)",
  } as CSSProperties,
  brandRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "24px 24px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  } as CSSProperties,
  brandTitle: { fontSize: 20, fontWeight: 700, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.01em" } as CSSProperties,
  brandSub: { marginTop: 4, fontSize: 11, fontWeight: 600, color: "#c4b5fd", letterSpacing: "0.02em" } as CSSProperties,
  nav: { flex: 1, overflowY: "auto", padding: 14 } as CSSProperties,
  overline: {
    marginTop: 16, marginBottom: 8, padding: "0 12px",
    fontSize: 10, fontWeight: 700, color: "#64748b",
    letterSpacing: "0.16em", textTransform: "uppercase",
  } as CSSProperties,
  groupHead: (active: boolean): CSSProperties => ({
    width: "100%", display: "flex", alignItems: "center", gap: 12,
    padding: "11px 14px", borderRadius: 14, transition: "all .2s",
    fontWeight: 600, fontSize: 13,
    border: "1px solid transparent",
    background: active ? "linear-gradient(90deg, rgba(46,196,182,0.20), rgba(46,196,182,0.08))" : "transparent",
    color: active ? "#6fe0d4" : "#cbd5e1",
    borderColor: active ? "rgba(46,196,182,0.25)" : "transparent",
    boxShadow: active ? "0 0 24px rgba(46,196,182,0.14)" : "none",
    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
  }),
  subItem: (active: boolean): CSSProperties => ({
    width: "calc(100% - 12px)", marginLeft: 12, marginTop: 4,
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 12, transition: "all .2s",
    fontWeight: active ? 600 : 500, fontSize: 13,
    border: "1px solid transparent",
    background: active ? "rgba(46,196,182,0.10)" : "transparent",
    color: active ? "#6fe0d4" : "#94a3b8",
    borderColor: active ? "rgba(46,196,182,0.22)" : "transparent",
    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
    position: "relative",
  }),
  subItemDot: (active: boolean): CSSProperties => ({
    width: 6, height: 6, borderRadius: "50%",
    background: active ? "#5fd9cd" : "rgba(148,163,184,0.4)",
    boxShadow: active ? "0 0 8px rgba(46,196,182,0.6)" : "none",
    flexShrink: 0,
  }),
  footer: { padding: 14, borderTop: "1px solid rgba(255,255,255,0.06)" } as CSSProperties,
  userBtn: {
    display: "flex", alignItems: "center", gap: 12,
    width: "100%", padding: "10px 14px", borderRadius: 14,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
    cursor: "pointer", color: "#94a3b8", fontSize: 12, fontFamily: "inherit",
    textAlign: "left", transition: "all .2s",
  } as CSSProperties,
};

const PRECOS_KEYS: Route[] = ["comparacao", "tabela", "lumii-ai"];
const CONTA_KEYS: Route[] = ["conta-info", "conta-seguranca", "conta-status", "conta-privacidade"];

const ch = {
  wrap: { marginLeft: 12, marginTop: 6, marginBottom: 2 } as CSSProperties,
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px 4px",
    fontSize: 9, fontWeight: 700, color: "#475569",
    letterSpacing: "0.16em", textTransform: "uppercase",
  } as CSSProperties,
  newBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 22, height: 22, borderRadius: 7,
    background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
    color: "#94a3b8", cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
  } as CSSProperties,
  item: (active: boolean): CSSProperties => ({
    width: "calc(100% - 4px)",
    display: "flex", alignItems: "center", gap: 8,
    padding: "7px 10px", marginLeft: 2, borderRadius: 9,
    background: active ? "rgba(46,196,182,0.08)" : "transparent",
    border: active ? "1px solid rgba(46,196,182,0.18)" : "1px solid transparent",
    color: active ? "#cbd5e1" : "#94a3b8",
    cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s",
  }),
  itemText: {
    flex: 1, minWidth: 0,
    fontSize: 12, fontWeight: 500, lineHeight: 1.3,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  } as CSSProperties,
  empty: {
    margin: "4px 12px 8px", padding: "10px 12px", borderRadius: 10,
    border: "1px dashed rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.015)",
    color: "#475569", fontSize: 11, lineHeight: 1.4,
  } as CSSProperties,
};

function relTime(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ChatHistory({
  sessions,
  currentSessionId,
  active,
  onSelectSession,
  onNewSession,
}: {
  sessions: ChatSession[];
  currentSessionId: string | null;
  active: Route;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}) {
  const list = [...(sessions || [])].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return (
    <div style={ch.wrap}>
      <div style={ch.header}>
        <span>Histórico</span>
        <button type="button" onClick={() => onNewSession()} style={ch.newBtn} title="Nova conversa"
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#cbd5e1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          <IconPlus size={11} />
        </button>
      </div>
      {list.length === 0 ? (
        <div style={ch.empty}>Suas conversas com a Lumii aparecerão aqui.</div>
      ) : (
        list.slice(0, 8).map((s) => {
          const isActive = active === "lumii-ai" && s.id === currentSessionId;
          return (
            <button key={s.id} type="button" onClick={() => onSelectSession(s.id)} style={ch.item(isActive)}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "#cbd5e1"; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
            >
              <span style={{
                width: 4, height: 4, borderRadius: "50%",
                background: isActive ? "#5fd9cd" : "rgba(148,163,184,0.5)",
                boxShadow: isActive ? "0 0 6px rgba(46,196,182,0.5)" : "none",
                flexShrink: 0,
              }} />
              <span style={ch.itemText} title={s.title}>{s.title}</span>
              <span style={{ fontSize: 10, color: "#475569", fontWeight: 500, flexShrink: 0 }}>
                {relTime(s.updatedAt)}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

export function Sidebar({
  active,
  onNavigate,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  isMobile,
  open,
  onClose,
}: {
  active: Route;
  onNavigate: (route: Route, payload?: AiSeed) => void;
  sessions?: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const precosOpen = PRECOS_KEYS.includes(active);
  const contaOpen = CONTA_KEYS.includes(active);

  const nav = (r: Route, payload?: AiSeed) => { onNavigate(r, payload); if (isMobile) onClose(); };
  const selSession = (id: string) => { onSelectSession(id); if (isMobile) onClose(); };
  const newSession = () => { onNewSession(); if (isMobile) onClose(); };

  const mobileShell: CSSProperties = {
    position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 80,
    margin: 0, width: 300, maxWidth: "86vw", maxHeight: "none", height: "100%",
    borderRadius: "0 24px 24px 0",
    transform: open ? "translateX(0)" : "translateX(-105%)",
    transition: "transform .3s cubic-bezier(0.4,0,0.2,1)",
  };

  const contaItems: Array<{ id: Route; label: string }> = [
    { id: "conta-info", label: "Informações da Conta" },
    { id: "conta-seguranca", label: "Senha e Segurança" },
    { id: "conta-status", label: "Status da Conta" },
    { id: "conta-privacidade", label: "Dados e Privacidade" },
  ];

  return (
    <>
      {isMobile && (
        <div
          style={{ ...mobileScrimStyles.scrim, ...(open ? mobileScrimStyles.scrimOpen : {}) }}
          onClick={onClose}
        />
      )}
      <aside style={{ ...sb.shell, ...(isMobile ? mobileShell : {}) }}>
        <div style={sb.brandRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lumii-icon.png" alt="Lumii" width={40} height={40} style={{ borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div style={sb.brandTitle}>Lumii</div>
            <div style={sb.brandSub}>Gestão Inteligente</div>
          </div>
          {isMobile && (
            <button type="button" onClick={onClose} aria-label="Fechar menu" style={{
              width: 36, height: 36, borderRadius: 10,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1", cursor: "pointer", fontFamily: "inherit",
            }}>
              <IconX size={16} />
            </button>
          )}
        </div>

        <nav style={sb.nav}>
          <div style={sb.overline}>Painel Gerencial</div>

          <button type="button" onClick={() => nav("inicio")}
            style={{ ...sb.groupHead(active === "inicio"), color: "rgb(255, 229, 102)", border: "1px solid rgb(255, 229, 102)" }}>
            <span style={{ display: "flex", color: active === "inicio" ? "#5fd9cd" : "#94a3b8" }}><IconBar size={16} /></span>
            Início
          </button>

          <button type="button" style={{ ...sb.groupHead(precosOpen), color: "rgb(255, 229, 102)", border: "1px solid rgb(255, 229, 102)" }}>
            <span style={{ display: "flex", color: precosOpen ? "#5fd9cd" : "#94a3b8" }}><IconTag size={16} /></span>
            Preços Concorrentes
            <IconChevDown size={14} color={precosOpen ? "#6fe0d4" : "#64748b"} style={{ marginLeft: "auto" }} />
          </button>

          <button type="button" onClick={() => nav("comparacao")}
            style={{ ...sb.subItem(active === "comparacao"), color: "rgb(255, 229, 102)", border: "1px solid rgb(255, 229, 102)" }}
            onMouseEnter={(e) => { if (active !== "comparacao") { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#cbd5e1"; } }}
            onMouseLeave={(e) => { if (active !== "comparacao") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
          >
            <span style={{ ...sb.subItemDot(active === "comparacao"), background: "rgb(255, 229, 102)" }} />
            Comparação
          </button>
          <button type="button" onClick={() => nav("tabela")}
            style={sb.subItem(active === "tabela")}
            onMouseEnter={(e) => { if (active !== "tabela") { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#cbd5e1"; } }}
            onMouseLeave={(e) => { if (active !== "tabela") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
          >
            <span style={sb.subItemDot(active === "tabela")} />
            Tabela Completa
          </button>
          <button type="button" onClick={() => nav("lumii-ai")}
            style={sb.subItem(active === "lumii-ai")}
            onMouseEnter={(e) => { if (active !== "lumii-ai") { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#cbd5e1"; } }}
            onMouseLeave={(e) => { if (active !== "lumii-ai") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
          >
            <span style={sb.subItemDot(active === "lumii-ai")} />
            <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              Lumii AI
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                padding: "2px 6px", borderRadius: 6,
                background: "linear-gradient(135deg, rgba(46,196,182,0.20), rgba(46,196,182,0.10))",
                color: "rgb(255, 229, 102)", border: "1px solid rgb(255, 229, 102)",
              }}>NOVO</span>
            </span>
          </button>

          <ChatHistory
            sessions={sessions}
            currentSessionId={currentSessionId}
            active={active}
            onSelectSession={selSession}
            onNewSession={newSession}
          />

          <div style={sb.overline}>Administração</div>

          <button type="button" onClick={() => nav("conta-info")} style={sb.groupHead(contaOpen)}>
            <span style={{ display: "flex", color: contaOpen ? "#5fd9cd" : "#94a3b8" }}><IconUser size={16} /></span>
            Conta
            <IconChevDown size={14} color={contaOpen ? "#6fe0d4" : "#64748b"} style={{ marginLeft: "auto" }} />
          </button>

          {contaItems.map((it) => (
            <button key={it.id} type="button" onClick={() => nav(it.id)}
              style={sb.subItem(active === it.id)}
              onMouseEnter={(e) => { if (active !== it.id) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#cbd5e1"; } }}
              onMouseLeave={(e) => { if (active !== it.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
            >
              <span style={sb.subItemDot(active === it.id)} />
              {it.label}
            </button>
          ))}
        </nav>

        <div style={sb.footer}>
          <button type="button" style={sb.userBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0c0525", fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>AC</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>Arthur Cordeiro</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>Gerente Operacional</div>
            </div>
            <IconLogout size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
