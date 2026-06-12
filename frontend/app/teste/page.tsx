"use client";

/**
 * /teste — Painel de diagnóstico de pagamentos (Mercado Pago).
 *
 * Chama as rotas internas e mostra a resposta crua de cada etapa:
 *   Cartão (assinatura) → POST /api/pagamento/assinar  { method: "card" }
 *   Pix/Boleto          → POST /api/pagamento/assinar  { method: "other" }
 *   Preferência crua    → POST /api/pagamento/preferencia
 *   Status              → GET  /api/pagamento/status?type=...&id=...
 *
 * Cada chamada de /assinar devolve { checkoutUrl } — abra o link numa janela
 * anônima para pagar como usuário de teste do Mercado Pago.
 */

import { useState, type CSSProperties } from "react";

type FreqKey = "monthly" | "quarter" | "annual";
const PLANS: Record<FreqKey, { label: string; amount: number }> = {
  monthly: { label: "Mensal", amount: 99.99 },
  quarter: { label: "Trimestral", amount: 269.97 },
  annual: { label: "Anual", amount: 959.90 },
};

type LogEntry = { label: string; ok: boolean; data: unknown; ts: string };

const env = {
  publicKey: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY,
  planMonthly: process.env.NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_MONTHLY,
  planQuarter: process.env.NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_QUARTER,
  planAnnual: process.env.NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_ANNUAL,
};

const s = {
  shell: { minHeight: "100vh", background: "#0b0f17", color: "#e2e8f0", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "32px 24px 80px" } as CSSProperties,
  wrap: { maxWidth: 1100, margin: "0 auto" } as CSSProperties,
  h1: { fontSize: 24, fontWeight: 800, margin: "0 0 4px" } as CSSProperties,
  sub: { fontSize: 13.5, color: "#94a3b8", margin: "0 0 24px" } as CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 440px", gap: 24, alignItems: "start" } as CSSProperties,
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 20, marginBottom: 16 } as CSSProperties,
  cardTitle: { fontSize: 14, fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 } as CSSProperties,
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", display: "block", margin: "0 0 6px" } as CSSProperties,
  input: { width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px", borderRadius: 9, background: "#0b0f17", border: "1px solid #1f2937", color: "#e2e8f0", fontSize: 13.5, outline: "none" } as CSSProperties,
  field: { marginBottom: 12 } as CSSProperties,
  btn: (variant: "primary" | "blue" | "ghost" = "primary", disabled = false): CSSProperties => ({
    height: 42, padding: "0 16px", borderRadius: 9, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13.5, fontWeight: 700, width: "100%", opacity: disabled ? 0.5 : 1,
    background: variant === "blue" ? "#009ee3" : variant === "ghost" ? "#1f2937" : "#6247c7",
    color: "#fff",
  }),
  pill: (active: boolean): CSSProperties => ({
    padding: "8px 12px", borderRadius: 9, border: "1px solid " + (active ? "#6247c7" : "#1f2937"),
    background: active ? "rgba(98,71,199,0.15)" : "transparent", color: active ? "#c4b5fd" : "#94a3b8",
    cursor: "pointer", fontSize: 12.5, fontWeight: 600, textAlign: "center",
  }),
  chip: { padding: "5px 9px", borderRadius: 7, background: "#0b0f17", border: "1px solid #1f2937", cursor: "pointer", fontSize: 11.5, color: "#cbd5e1", fontFamily: "ui-monospace, monospace" } as CSSProperties,
  logBox: { background: "#0b0f17", border: "1px solid #1f2937", borderRadius: 10, padding: 12, maxHeight: 560, overflow: "auto", fontFamily: "ui-monospace, monospace", fontSize: 11.5, lineHeight: 1.55 } as CSSProperties,
  logHead: (ok: boolean): CSSProperties => ({ color: ok ? "#6ee7b7" : "#fca5a5", fontWeight: 700, marginBottom: 4 }),
  pre: { margin: "0 0 14px", whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#cbd5e1" } as CSSProperties,
  envRow: (ok: boolean): CSSProperties => ({ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "4px 0", color: ok ? "#cbd5e1" : "#fca5a5" }),
  link: { color: "#7dd3fc", wordBreak: "break-all" } as CSSProperties,
};

export default function TestePagamentosPage() {
  const [frequency, setFrequency] = useState<FreqKey>("monthly");
  const [email, setEmail] = useState("test_user_123@testuser.com");
  const [password, setPassword] = useState("teste123");
  const [statusType, setStatusType] = useState<"payment" | "preapproval">("payment");
  const [statusId, setStatusId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const push = (label: string, ok: boolean, data: unknown) =>
    setLog((l) => [{ label, ok, data, ts: new Date().toLocaleTimeString() }, ...l]);

  const assinar = async (method: "card" | "other") => {
    setBusy(method);
    try {
      const res = await fetch("/api/pagamento/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, frequency, method }),
      });
      const data = await res.json();
      push(`POST /assinar (${method})`, res.ok, data);
    } catch (e) {
      push(`Erro de rede (assinar ${method})`, false, String(e));
    } finally {
      setBusy(null);
    }
  };

  const runPreference = async () => {
    setBusy("pref");
    try {
      const res = await fetch("/api/pagamento/preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency, payerEmail: email }),
      });
      const data = await res.json();
      push("POST /preferencia", res.ok, data);
    } catch (e) {
      push("Erro de rede (preferência)", false, String(e));
    } finally {
      setBusy(null);
    }
  };

  const runStatus = async () => {
    if (!statusId) return;
    setBusy("status");
    try {
      const res = await fetch(`/api/pagamento/status?type=${statusType}&id=${encodeURIComponent(statusId)}`);
      const data = await res.json();
      push(`GET /status?type=${statusType}`, res.ok, data);
    } catch (e) {
      push("Erro de rede (status)", false, String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={s.shell}>
      <div style={s.wrap}>
        <h1 style={s.h1}>🧪 Painel de teste · Pagamentos</h1>
        <p style={s.sub}>
          Chama as rotas internas e mostra a resposta crua. Cada <code>/assinar</code> devolve um{" "}
          <code>checkoutUrl</code> — abra-o numa janela anônima para pagar como usuário de teste do MP.
        </p>

        <div style={s.grid} className="teste-grid">
          {/* ─── Coluna esquerda: controles ─── */}
          <div>
            <div style={s.card}>
              <h2 style={s.cardTitle}>Plano / ciclo</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {(Object.keys(PLANS) as FreqKey[]).map((k) => (
                  <div key={k} style={s.pill(frequency === k)} onClick={() => setFrequency(k)}>
                    {PLANS[k].label}
                    <div style={{ fontSize: 11, opacity: 0.8 }}>R$ {PLANS[k].amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div style={s.field}>
                <label style={s.label}>E-mail</label>
                <input style={s.input} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Senha (mín. 6)</label>
                <input style={s.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <div style={s.card}>
              <h2 style={s.cardTitle}>💳 Assinatura (cartão recorrente)</h2>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "0 0 12px" }}>
                Cria o cadastro pendente + o preapproval e devolve o <code>checkoutUrl</code> da assinatura.
              </p>
              <button style={s.btn("primary", busy === "card")} disabled={busy === "card"} onClick={() => assinar("card")}>
                {busy === "card" ? "Processando…" : "Criar assinatura (cartão)"}
              </button>
            </div>

            <div style={s.card}>
              <h2 style={s.cardTitle}>🔗 Pix / Boleto / Saldo (via /assinar)</h2>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "0 0 12px" }}>
                Cria o cadastro pendente + a preferência (ciclo único) e devolve o <code>checkoutUrl</code>.
              </p>
              <button style={s.btn("blue", busy === "other")} disabled={busy === "other"} onClick={() => assinar("other")}>
                {busy === "other" ? "Processando…" : "Criar pagamento (Pix/Boleto)"}
              </button>
            </div>

            <div style={s.card}>
              <h2 style={s.cardTitle}>🧾 Preferência crua (sem conta)</h2>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "0 0 12px" }}>
                Diagnóstico: cria só a preferência (não cria conta nem reconcilia).
              </p>
              <button style={s.btn("ghost", busy === "pref")} disabled={busy === "pref"} onClick={runPreference}>
                {busy === "pref" ? "Criando…" : "Criar preferência"}
              </button>
            </div>

            <div style={s.card}>
              <h2 style={s.cardTitle}>🔍 Consultar status</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={s.pill(statusType === "payment")} onClick={() => setStatusType("payment")}>payment</div>
                <div style={s.pill(statusType === "preapproval")} onClick={() => setStatusType("preapproval")}>preapproval</div>
              </div>
              <div style={s.field}>
                <label style={s.label}>ID</label>
                <input style={s.input} value={statusId} onChange={(e) => setStatusId(e.target.value)} placeholder="ID do pagamento/assinatura" />
              </div>
              <button style={s.btn("ghost", busy === "status" || !statusId)} disabled={busy === "status" || !statusId} onClick={runStatus}>
                {busy === "status" ? "Consultando…" : "Consultar"}
              </button>
            </div>
          </div>

          {/* ─── Coluna direita: env + log ─── */}
          <div>
            <div style={s.card}>
              <h2 style={s.cardTitle}>⚙️ Configuração detectada</h2>
              <div style={s.envRow(!!env.publicKey)}>
                {env.publicKey ? "✓" : "✗"} NEXT_PUBLIC_MP_PUBLIC_KEY {env.publicKey ? `(${env.publicKey.slice(0, 8)}…)` : "ausente"}
              </div>
              <div style={s.envRow(!!env.planMonthly)}>{env.planMonthly ? "✓" : "✗"} Plano mensal (preapproval id)</div>
              <div style={s.envRow(!!env.planQuarter)}>{env.planQuarter ? "✓" : "✗"} Plano trimestral (preapproval id)</div>
              <div style={s.envRow(!!env.planAnnual)}>{env.planAnnual ? "✓" : "✗"} Plano anual (preapproval id)</div>
              <p style={{ fontSize: 11.5, color: "#64748b", margin: "10px 0 0", lineHeight: 1.5 }}>
                Os plan ids também podem ser lidos server-side via <code>MP_PREAPPROVAL_PLAN_*</code>.
                O <code>MP_ACCESS_TOKEN</code> é server-side e não aparece aqui.
              </p>
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ ...s.cardTitle, margin: 0 }}>📋 Respostas</h2>
                {log.length > 0 && (
                  <button style={{ ...s.chip, border: "none", color: "#94a3b8" }} onClick={() => setLog([])}>limpar</button>
                )}
              </div>
              <div style={s.logBox}>
                {log.length === 0 ? (
                  <span style={{ color: "#475569" }}>As respostas cruas das APIs aparecem aqui…</span>
                ) : (
                  log.map((e, i) => {
                    const url =
                      e.data && typeof e.data === "object" && "checkoutUrl" in e.data
                        ? (e.data as { checkoutUrl?: string }).checkoutUrl
                        : undefined;
                    return (
                      <div key={i}>
                        <div style={s.logHead(e.ok)}>
                          {e.ok ? "● " : "✕ "}{e.label} · {e.ts}
                        </div>
                        {url && (
                          <div style={{ marginBottom: 6 }}>
                            <a href={url} target="_blank" rel="noreferrer" style={s.link}>abrir checkout ↗</a>
                          </div>
                        )}
                        <pre style={s.pre}>{JSON.stringify(e.data, null, 2)}</pre>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
