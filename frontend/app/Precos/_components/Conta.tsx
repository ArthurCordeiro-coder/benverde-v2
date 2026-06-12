import { useState, type CSSProperties } from "react";

import {
  IconActivity,
  IconCheck,
  IconDownload,
  IconInfo,
  IconLock,
  IconMail,
  IconShield,
  IconTrash,
} from "../_lib/icons";
import type { Route } from "../_lib/types";

const cs = {
  page: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 880 } as CSSProperties,
  overline: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.16em", textTransform: "uppercase" } as CSSProperties,
  title: { fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.015em", margin: 0 } as CSSProperties,
  subtitle: { fontSize: 13, color: "#94a3b8", marginTop: 4 } as CSSProperties,
  card: { borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.20)", padding: 24, display: "flex", flexDirection: "column", gap: 16 } as CSSProperties,
  cardHead: { display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 } as CSSProperties,
  cardIconChip: (tint: "primary" | "warning" | "info" = "primary"): CSSProperties => ({
    width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
    background: tint === "primary" ? "rgba(46,196,182,0.10)" : tint === "warning" ? "rgba(251,191,36,0.10)" : "rgba(167,139,250,0.10)",
    border: `1px solid ${tint === "primary" ? "rgba(46,196,182,0.25)" : tint === "warning" ? "rgba(251,191,36,0.25)" : "rgba(167,139,250,0.25)"}`,
    color: tint === "primary" ? "#5fd9cd" : tint === "warning" ? "#fbbf24" : "#a78bfa", flexShrink: 0,
  }),
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.005em" } as CSSProperties,
  cardSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 } as CSSProperties,
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 } as CSSProperties,
  rowLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" } as CSSProperties,
  rowValue: { fontSize: 14, fontWeight: 500, color: "#f1f5f9", marginTop: 4 } as CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: 6 } as CSSProperties,
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" } as CSSProperties,
  input: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color .2s" } as CSSProperties,
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 12, border: "1px solid rgba(245,208,48,0.45)", background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)", color: "#0c0525", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s", boxShadow: "0 8px 24px rgba(245,208,48,0.26), inset 0 1px 0 rgba(255,255,255,0.4)" } as CSSProperties,
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#cbd5e1", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s" } as CSSProperties,
  dangerBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 12, border: "1px solid rgba(248,113,113,0.30)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s" } as CSSProperties,
  toggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" } as CSSProperties,
  toggle: (on: boolean): CSSProperties => ({ width: 44, height: 26, borderRadius: 9999, background: on ? "linear-gradient(135deg, #5fd9cd, #2ec4b6)" : "rgba(255,255,255,0.08)", border: `1px solid ${on ? "rgba(46,196,182,0.40)" : "rgba(255,255,255,0.10)"}`, position: "relative", cursor: "pointer", transition: "all .2s", boxShadow: on ? "0 0 12px rgba(46,196,182,0.30)" : "none", flexShrink: 0 }),
  toggleKnob: (on: boolean): CSSProperties => ({ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#ffffff", transition: "all .2s", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }),
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "6px 0" } as CSSProperties,
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as CSSProperties,
  sessionRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: 12 } as CSSProperties,
  sessionInfo: { fontSize: 13, fontWeight: 600, color: "#f1f5f9" } as CSSProperties,
  sessionMeta: { fontSize: 11, color: "#64748b", marginTop: 2 } as CSSProperties,
  log: { fontFamily: "var(--lumii-font-mono)", fontSize: 12, color: "#cbd5e1", background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, lineHeight: 1.7 } as CSSProperties,
};

function statusChip(kind: "ok" | "warn" | "err" | "info"): CSSProperties {
  const map: Record<string, { bg: string; bd: string; fg: string }> = {
    ok: { bg: "rgba(255,229,102,0.12)", bd: "rgba(255,229,102,0.30)", fg: "#ffe566" },
    warn: { bg: "rgba(251,191,36,0.10)", bd: "rgba(251,191,36,0.30)", fg: "#fcd34d" },
    err: { bg: "rgba(248,113,113,0.10)", bd: "rgba(248,113,113,0.30)", fg: "#fca5a5" },
    info: { bg: "rgba(167,139,250,0.10)", bd: "rgba(167,139,250,0.30)", fg: "#c4b5fd" },
  };
  const cc = map[kind];
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: cc.bg, border: `1px solid ${cc.bd}`, color: cc.fg, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" };
}

function ToggleRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={cs.toggleRow}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{desc}</div>
      </div>
      <button type="button" onClick={() => setOn((v) => !v)} style={cs.toggle(on)}>
        <span style={cs.toggleKnob(on)} />
      </button>
    </div>
  );
}

function ContaInformacoes() {
  const [nome, setNome] = useState("Arthur Cordeiro");
  const [email, setEmail] = useState("arthur.cordeiro@semar.com.br");
  const [telefone, setTelefone] = useState("(86) 99812-4470");
  const [cargo, setCargo] = useState("Gerente Operacional");
  const [loja, setLoja] = useState("Semar — Matriz Teresina");
  const [saved, setSaved] = useState(false);

  const focus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "rgba(46,196,182,0.40)");
  const blur = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)");

  return (
    <>
      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0c0525", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", boxShadow: "0 10px 24px rgba(46,196,182,0.30)", flexShrink: 0 }}>AC</div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>{nome}</div>
            <div style={cs.cardSub}>{cargo} · {loja}</div>
          </div>
          <span style={statusChip("ok")}><IconCheck size={10} /> Verificada</span>
        </div>

        <div style={cs.twoCol} data-r-grid-2>
          <div style={cs.field}>
            <label style={cs.fieldLabel}>Nome completo</label>
            <input style={cs.input} value={nome} onChange={(e) => setNome(e.target.value)} onFocus={focus} onBlur={blur} />
          </div>
          <div style={cs.field}>
            <label style={cs.fieldLabel}>Cargo</label>
            <input style={cs.input} value={cargo} onChange={(e) => setCargo(e.target.value)} onFocus={focus} onBlur={blur} />
          </div>
          <div style={cs.field}>
            <label style={cs.fieldLabel}>E-mail corporativo</label>
            <input style={cs.input} value={email} onChange={(e) => setEmail(e.target.value)} onFocus={focus} onBlur={blur} />
          </div>
          <div style={cs.field}>
            <label style={cs.fieldLabel}>Telefone</label>
            <input style={cs.input} value={telefone} onChange={(e) => setTelefone(e.target.value)} onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ ...cs.field, gridColumn: "1 / -1" }}>
            <label style={cs.fieldLabel}>Loja de atuação</label>
            <input style={cs.input} value={loja} onChange={(e) => setLoja(e.target.value)} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" style={cs.ghostBtn}>Cancelar</button>
          <button type="button" style={cs.primaryBtn} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
            {saved ? <IconCheck size={14} /> : null}
            {saved ? "Salvo" : "Salvar alterações"}
          </button>
        </div>
      </div>

      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("info")}><IconMail size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Preferências de notificação</div>
            <div style={cs.cardSub}>Como você quer receber atualizações da Lumii.</div>
          </div>
        </div>
        <ToggleRow label="Alertas de preço por e-mail" desc="Receba quando um concorrente baixar mais de 5%." defaultOn={true} />
        <ToggleRow label="Resumo semanal da Lumii" desc="Toda segunda às 7h com destaques da semana." defaultOn={true} />
        <ToggleRow label="SMS de variações críticas" desc="Apenas para gaps acima de 15% em produtos-chave." defaultOn={false} />
      </div>
    </>
  );
}

function Session({ name, meta, current }: { name: string; meta: string; current?: boolean }) {
  return (
    <div style={cs.sessionRow}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: current ? "#ffe566" : "#64748b", boxShadow: current ? "0 0 8px rgba(255,229,102,0.6)" : "none" }} />
        <div>
          <div style={cs.sessionInfo}>{name}</div>
          <div style={cs.sessionMeta}>{meta}</div>
        </div>
      </div>
      {!current && (
        <button type="button" style={{ ...cs.ghostBtn, padding: "8px 12px", fontSize: 12, color: "#fca5a5", border: "1px solid rgba(248,113,113,0.20)", background: "transparent" }}>Encerrar</button>
      )}
    </div>
  );
}

function ContaSeguranca() {
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [twoFA, setTwoFA] = useState(true);
  return (
    <>
      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("primary")}><IconLock size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Alterar senha</div>
            <div style={cs.cardSub}>Última troca há 47 dias — recomendamos atualizar a cada 90 dias.</div>
          </div>
        </div>
        <div style={cs.field}>
          <label style={cs.fieldLabel}>Senha atual</label>
          <input type="password" style={cs.input} value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} placeholder="••••••••••" />
        </div>
        <div style={cs.twoCol} data-r-grid-2>
          <div style={cs.field}>
            <label style={cs.fieldLabel}>Nova senha</label>
            <input type="password" style={cs.input} value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="Mínimo de 10 caracteres" />
          </div>
          <div style={cs.field}>
            <label style={cs.fieldLabel}>Confirmar nova senha</label>
            <input type="password" style={cs.input} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="Digite novamente" />
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>Use ao menos 10 caracteres, uma letra maiúscula, um número e um símbolo.</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" style={cs.primaryBtn}>Atualizar senha</button>
        </div>
      </div>

      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("primary")}><IconShield size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Autenticação em dois fatores</div>
            <div style={cs.cardSub}>Adicione uma camada extra ao login — recomendado para acessos administrativos.</div>
          </div>
          <span style={statusChip(twoFA ? "ok" : "warn")}>{twoFA ? "Ativada" : "Desativada"}</span>
        </div>
        <div style={cs.toggleRow}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>App autenticador</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Google Authenticator · configurado em 12/03/2026</div>
          </div>
          <button type="button" onClick={() => setTwoFA((v) => !v)} style={cs.toggle(twoFA)}>
            <span style={cs.toggleKnob(twoFA)} />
          </button>
        </div>
        <ToggleRow label="Códigos por SMS" desc="Fallback caso o app autenticador esteja indisponível." defaultOn={false} />
        <ToggleRow label="Chaves de segurança (WebAuthn)" desc="Conecte uma chave física como YubiKey ou Titan." defaultOn={false} />
      </div>

      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("info")}><IconActivity size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Sessões ativas</div>
            <div style={cs.cardSub}>Dispositivos conectados à sua conta agora.</div>
          </div>
          <button type="button" style={cs.ghostBtn}>Encerrar todas</button>
        </div>
        <Session name="MacBook Pro · Chrome" meta="Teresina, BR · Sessão atual · Há 4 min" current />
        <Session name="iPhone 15 · App Lumii Mobile" meta="Teresina, BR · Há 2 horas" />
        <Session name="Windows · Edge" meta="Parnaíba, BR · Há 3 dias" />
      </div>
    </>
  );
}

function KV({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={cs.rowLabel}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", marginTop: 6, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function UsageBar({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = Math.min(100, (used / total) * 100);
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{fmt(used)}</span>{" / "}{fmt(total)} {unit}
        </div>
      </div>
      <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct > 85 ? "linear-gradient(90deg, #fbbf24, #f87171)" : "linear-gradient(90deg, #5fd9cd, #2ec4b6)", borderRadius: 3, transition: "width .8s ease", boxShadow: pct > 0 ? "0 0 8px rgba(46,196,182,0.4)" : "none" }} />
      </div>
    </div>
  );
}

function ContaStatus() {
  return (
    <>
      <div style={{ ...cs.card, padding: 0, overflow: "hidden" }} data-r-conta-card>
        <div style={{ padding: 24, background: "linear-gradient(135deg, rgba(46,196,182,0.16), rgba(46,196,182,0.06))", borderBottom: "1px solid rgba(46,196,182,0.20)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ ...cs.overline, color: "#6fe0d4" }}>Plano atual</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#ffffff", marginTop: 6, letterSpacing: "-0.01em" }}>Lumii Profissional</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Inclui Comparação, Tabela Completa, Estoque, Lojas e Lumii AI ilimitada.</div>
          </div>
          <span style={statusChip("ok")}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffe566", boxShadow: "0 0 6px #ffe566" }} />
            Ativo
          </span>
        </div>
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} data-r-grid-3>
          <KV label="Próxima fatura" value="R$ 1.290,00" sub="vence em 12/06/2026" />
          <KV label="Ciclo" value="Mensal" sub="auto-renovação ativa" />
          <KV label="Lojas ativas" value="14 de 25" sub="11 vagas disponíveis" />
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", gap: 8 }}>
          <button type="button" style={cs.primaryBtn}>Gerenciar plano</button>
          <button type="button" style={cs.ghostBtn}>Histórico de faturas</button>
        </div>
      </div>

      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("info")}><IconActivity size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Uso no mês</div>
            <div style={cs.cardSub}>Atualizado há 12 min.</div>
          </div>
        </div>
        <UsageBar label="Consultas de preço" used={18420} total={50000} unit="consultas" />
        <UsageBar label="Análises da Lumii AI" used={142} total={500} unit="análises" />
        <UsageBar label="Exportações (Excel/PDF)" used={37} total={200} unit="arquivos" />
        <UsageBar label="Armazenamento (Drive)" used={4.2} total={20} unit="GB" />
      </div>

      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("primary")}><IconCheck size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Aprovação e papéis</div>
            <div style={cs.cardSub}>Permissões concedidas pela administração da Semar.</div>
          </div>
        </div>
        {[
          { label: "Conta aprovada por", value: "Marcos R. Andrade (Diretor TI)", date: "08/02/2026" },
          { label: "Papel", value: "Gerente Operacional · acesso total a Preços", date: "" },
          { label: "Escopo de lojas", value: "Matriz Teresina, Filial Parnaíba, Filial Campo Maior", date: "" },
          { label: "Política de exportação", value: "Liberada — sem aprovação extra", date: "" },
        ].map((r) => (
          <div key={r.label} style={{ ...cs.row, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={cs.rowLabel}>{r.label}</div>
              <div style={cs.rowValue}>{r.value}</div>
            </div>
            {r.date && <div style={{ fontSize: 12, color: "#64748b" }}>{r.date}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

function ContaPrivacidade() {
  return (
    <>
      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("info")}><IconShield size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Permissões de dados</div>
            <div style={cs.cardSub}>Como a Lumii usa as informações da sua operação.</div>
          </div>
        </div>
        <ToggleRow label="Compartilhar média anonimizada" desc="Contribui para benchmarks regionais. Nenhum dado nominal é exposto." defaultOn={true} />
        <ToggleRow label="Treinar a Lumii com minhas consultas" desc="Ajuda a refinar respostas. Você pode desativar a qualquer momento." defaultOn={true} />
        <ToggleRow label="Receber recomendações personalizadas" desc="Lumii sugere ajustes de preço baseados no seu histórico." defaultOn={true} />
        <ToggleRow label="Permitir análise por terceiros (auditoria LGPD)" desc="Auditores externos autorizados podem consultar logs anonimizados." defaultOn={false} />
      </div>

      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("info")}><IconDownload size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Exportar meus dados</div>
            <div style={cs.cardSub}>
              Receba um arquivo .zip com todas as cotações, metas e conversas com a Lumii ligadas à sua conta.
              Estimativa: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>~ 28 MB · ~ 6 min</span>.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={cs.primaryBtn}><IconDownload size={14} /> Solicitar exportação</button>
          <button type="button" style={cs.ghostBtn}>Ver exportações anteriores</button>
        </div>
      </div>

      <div style={cs.card} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("info")}><IconActivity size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>Atividade recente da conta</div>
            <div style={cs.cardSub}>Últimas ações registradas em auditoria.</div>
          </div>
        </div>
        <div style={cs.log}>
          <div>25/05/2026 09:42 — login bem-sucedido · Chrome · 200.140.12.4</div>
          <div>24/05/2026 18:15 — exportação Excel · Tabela Completa</div>
          <div>23/05/2026 11:03 — análise enviada à Lumii · 12 produtos</div>
          <div>22/05/2026 08:28 — alteração de telefone confirmada</div>
          <div>20/05/2026 14:09 — login bem-sucedido · App Mobile · iPhone</div>
        </div>
      </div>

      <div style={{ ...cs.card, border: "1px solid rgba(248,113,113,0.20)", background: "rgba(248,113,113,0.04)" }} data-r-conta-card>
        <div style={cs.cardHead} data-r-conta-card-head>
          <div style={cs.cardIconChip("warning")}><IconInfo size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ ...cs.cardTitle, color: "#fca5a5" }}>Excluir conta</div>
            <div style={cs.cardSub}>
              Remove permanentemente seu acesso ao Lumii. Os dados da loja permanecem com a administração.
              Esta ação <span style={{ color: "#fca5a5", fontWeight: 700 }}>não pode ser desfeita</span>.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={cs.dangerBtn}><IconTrash size={14} /> Solicitar exclusão da conta</button>
        </div>
      </div>
    </>
  );
}

export function Conta({ route }: { route: Route }) {
  const titles: Record<string, { t: string; s: string }> = {
    "conta-info": { t: "Informações da Conta", s: "Dados pessoais, contato e preferências do seu acesso." },
    "conta-seguranca": { t: "Senha e Segurança", s: "Senha, autenticação em dois fatores e sessões ativas." },
    "conta-status": { t: "Status da Conta", s: "Plano, faturamento e nível de aprovação no Lumii." },
    "conta-privacidade": { t: "Dados e Privacidade", s: "Permissões de dados, exportação e exclusão da conta." },
  };
  const { t, s } = titles[route] || titles["conta-info"];

  return (
    <div style={cs.page}>
      <div>
        <div style={cs.overline}>Administração · Conta</div>
        <h1 style={{ ...cs.title, marginTop: 6 }}>{t}</h1>
        <div style={cs.subtitle}>{s}</div>
      </div>
      {route === "conta-info" && <ContaInformacoes />}
      {route === "conta-seguranca" && <ContaSeguranca />}
      {route === "conta-status" && <ContaStatus />}
      {route === "conta-privacidade" && <ContaPrivacidade />}
    </div>
  );
}
