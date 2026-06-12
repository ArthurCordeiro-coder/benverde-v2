"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import "./precos.css";
import { useIsMobile } from "./_lib/useIsMobile";
import { useOverview } from "./_lib/useOverview";
import { fmtBRL } from "./_lib/overview";
import type { AiSeed, CartItem, ChatMessage, ChatSession, Route } from "./_lib/types";
import { Sidebar } from "./_components/Sidebar";
import { MobileTopBar } from "./_components/MobileTopBar";
import { CartDrawer } from "./_components/CartDrawer";
import { PainelInicio } from "./_components/PainelInicio";
import { Comparacao } from "./_components/Comparacao";
import { TabelaCompleta } from "./_components/TabelaCompleta";
import { LumiiAI } from "./_components/LumiiAI";
import { Conta } from "./_components/Conta";
import { IconInfo } from "./_lib/icons";

const STORAGE_KEY = "lumii-ai-sessions-v3";

const shell: Record<string, CSSProperties> = {
  main: { flex: 1, minWidth: 0, minHeight: 0, height: "100vh", overflowY: "auto", padding: "24px 28px 32px" },
  inner: { maxWidth: 1380, margin: "0 auto", paddingBottom: 24 },
};

const SCREEN_LABELS: Record<Route, string> = {
  inicio: "Início",
  comparacao: "Comparação",
  tabela: "Tabela Completa",
  "lumii-ai": "Lumii AI",
  "conta-info": "Informações da Conta",
  "conta-seguranca": "Senha e Segurança",
  "conta-status": "Status da Conta",
  "conta-privacidade": "Dados e Privacidade",
};

export default function PrecosPage() {
  const { data, loading, refreshing, error, reload } = useOverview();

  const [route, setRoute] = useState<Route>("inicio");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [aiSeed, setAiSeed] = useState<AiSeed>(null);

  // Lumii AI sessions (persisted to localStorage, like the prototype).
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const rawStored = localStorage.getItem(STORAGE_KEY);
      // setState no mount é intencional: localStorage não existe no servidor,
      // e inicializar direto no useState causaria divergência de hidratação.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (rawStored) setSessions(JSON.parse(rawStored));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { currentIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch { /* ignore */ }
  }, [sessions]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

  const titleFor = (messages: ChatMessage[]) => {
    const first = (messages || []).find((m) => m.role === "user");
    if (!first) return "Nova conversa";
    const t = (first.text || "").trim().replace(/\s+/g, " ");
    return t.length > 48 ? `${t.slice(0, 48).trim()}…` : t || "Nova conversa";
  };

  const appendToSession = useCallback((messages: ChatMessage[], conversationId?: string | null) => {
    setSessions((cur) => {
      let id = currentIdRef.current;
      if (!id) {
        id = `s-${Date.now()}`;
        currentIdRef.current = id;
        setCurrentSessionId(id);
        return [{ id, title: titleFor(messages), messages, conversationId: conversationId ?? null, createdAt: Date.now(), updatedAt: Date.now() }, ...cur];
      }
      return cur.map((s) =>
        s.id === id
          ? {
              ...s,
              messages,
              conversationId: conversationId ?? s.conversationId ?? null,
              title: s.title === "Nova conversa" ? titleFor(messages) : s.title,
              updatedAt: Date.now(),
            }
          : s,
      );
    });
  }, []);

  const newSession = useCallback(() => {
    currentIdRef.current = null;
    setCurrentSessionId(null);
    setRoute("lumii-ai");
  }, []);

  const selectSession = useCallback((id: string) => {
    currentIdRef.current = id;
    setCurrentSessionId(id);
    setRoute("lumii-ai");
  }, []);

  const navigate = useCallback((next: Route, payload?: AiSeed) => {
    if (next === "lumii-ai" && payload) {
      currentIdRef.current = null;
      setCurrentSessionId(null);
      setAiSeed(payload);
    }
    setRoute(next);
  }, []);

  const sendCartToLumii = useCallback((items: CartItem[]) => {
    const lines = items.map((it) => `• ${it.produto} — ${fmtBRL(it.price)}${it.market ? ` (melhor: ${it.market})` : ""}`).join("\n");
    const seedText = `Analise esta cesta de produtos e compare a Semar com os concorrentes, destacando onde estou perdendo e sugerindo reajustes:\n${lines}`;
    setCartOpen(false);
    navigate("lumii-ai", { seedText });
  }, [navigate]);

  const isMobile = useIsMobile(760);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPrecos = route === "comparacao" || route === "tabela";
  const isConta = route.startsWith("conta-");
  const screenLabel = SCREEN_LABELS[route] ?? "Lumii";

  const showInitialLoader = loading && data.produtos.length === 0;

  const banner = useMemo(() => {
    if (!error) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.10)", color: "#fecaca", padding: "12px 16px", fontSize: 13, marginBottom: 20 }}>
        <IconInfo size={16} />
        {error}
      </div>
    );
  }, [error]);

  return (
    <div className="lumii-precos-root" style={{ display: "flex", minHeight: "100vh", flexDirection: isMobile ? "column" : "row", color: "#f1f5f9" }}>
      {isMobile && (
        <MobileTopBar
          screenLabel={screenLabel}
          onMenu={() => setSidebarOpen(true)}
          onCart={() => setCartOpen(true)}
          cartCount={cart.length}
          showCart={isPrecos}
        />
      )}

      <Sidebar
        active={route}
        onNavigate={navigate}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewSession={newSession}
        isMobile={isMobile}
        open={isMobile && sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main style={shell.main} data-r-main>
        <div style={shell.inner}>
          {banner}

          {showInitialLoader ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "120px 20px", color: "#64748b" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(46,196,182,0.2)", borderTopColor: "#2ec4b6", animation: "lumii-dot 0.9s linear infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>Carregando preços…</span>
            </div>
          ) : (
            <>
              {route === "inicio" && <PainelInicio data={data} onNavigate={navigate} isMobile={isMobile} />}
              {route === "comparacao" && (
                <Comparacao data={data} cart={cart} setCart={setCart} cartOpen={cartOpen} setCartOpen={setCartOpen} />
              )}
              {route === "tabela" && <TabelaCompleta data={data} onReload={() => void reload("refresh")} refreshing={refreshing} />}
              {route === "lumii-ai" && (
                <LumiiAI session={currentSession} onAppend={appendToSession} seed={aiSeed} clearSeed={() => setAiSeed(null)} onNew={newSession} />
              )}
              {isConta && <Conta route={route} />}
            </>
          )}
        </div>
      </main>

      {isPrecos && (
        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cart}
          setItems={setCart}
          marketsCount={data.markets.length}
          onSendToLumii={sendCartToLumii}
        />
      )}
    </div>
  );
}
