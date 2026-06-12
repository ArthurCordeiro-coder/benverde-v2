import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconChevRight,
  IconDownload,
  IconMic,
  IconPlus,
  IconSearch,
  IconSend,
  IconX,
} from "../_lib/icons";
import { fmtBRL, lowestMarket } from "../_lib/overview";
import type { OverviewData } from "../_lib/overview";
import type { AiSeed, Categoria, Produto, Route } from "../_lib/types";
import { Thumb } from "../_lib/produceArt";

const CAT_ORDER: Categoria[] = ["Frutas", "Legumes", "Verduras", "Outros"];

const ini = {
  page: { display: "flex", flexDirection: "column", gap: 48, paddingBottom: 32 } as CSSProperties,
  hero: { display: "flex", flexDirection: "column", alignItems: "center", gap: 28, paddingTop: 56, paddingBottom: 12, textAlign: "center" } as CSSProperties,
  greetRow: { display: "flex", alignItems: "center", gap: 16, color: "#f1f5f9" } as CSSProperties,
  greetTitle: { fontSize: 40, fontWeight: 500, letterSpacing: "-0.02em", color: "#f8fafc", margin: 0, lineHeight: 1.05 } as CSSProperties,
  composerWrap: { width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 } as CSSProperties,
  composer: { borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", boxShadow: "0 20px 50px rgba(0,0,0,0.40)", transition: "all .2s", overflow: "hidden" } as CSSProperties,
  composerFocused: { borderColor: "rgba(46,196,182,0.35)", boxShadow: "0 20px 50px rgba(0,0,0,0.40), 0 0 0 4px rgba(46,196,182,0.10)" } as CSSProperties,
  composerTextarea: { width: "100%", minHeight: 56, maxHeight: 220, padding: "20px 22px 12px", background: "transparent", border: "none", outline: "none", resize: "none", color: "#f1f5f9", fontFamily: "inherit", fontSize: 16, lineHeight: 1.5, boxSizing: "border-box", display: "block" } as CSSProperties,
  composerToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 12px" } as CSSProperties,
  composerIconBtn: { width: 36, height: 36, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" } as CSSProperties,
  sendBtn: { width: 36, height: 36, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)", border: "1px solid rgba(245,208,48,0.45)", color: "#0c0525", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 16px rgba(245,208,48,0.32), inset 0 1px 0 rgba(255,255,255,0.35)", transition: "all .15s" } as CSSProperties,
  attachedRow: { display: "flex", flexWrap: "wrap", gap: 8, padding: "0 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 } as CSSProperties,
  attachedChip: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 6px", borderRadius: 9999, background: "rgba(46,196,182,0.10)", border: "1px solid rgba(46,196,182,0.25)", color: "#6fe0d4", fontSize: 12, fontWeight: 600 } as CSSProperties,
  attachedChipIcon: { width: 22, height: 22, borderRadius: 9999, background: "rgba(4,38,32,0.40)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#6fe0d4", fontSize: 9, fontWeight: 800 } as CSSProperties,
  promptChips: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 4 } as CSSProperties,
  promptChip: { padding: "8px 14px", borderRadius: 9999, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all .15s" } as CSSProperties,
  divider: { width: "100%", maxWidth: 760, display: "flex", alignItems: "center", gap: 14, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", margin: "8px auto 0" } as CSSProperties,
  dividerLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)" } as CSSProperties,
  importBtn: { display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 22px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#f1f5f9", fontWeight: 600, fontSize: 14, fontFamily: "inherit", cursor: "pointer", transition: "all .2s", backdropFilter: "blur(20px)" } as CSSProperties,
  section: { display: "flex", flexDirection: "column", gap: 16 } as CSSProperties,
  sectionHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, paddingBottom: 4, borderBottom: "1px solid rgba(255,255,255,0.06)" } as CSSProperties,
  sectionTitle: { fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", margin: 0 } as CSSProperties,
  sectionSub: { fontSize: 13, color: "#94a3b8", marginTop: 6 } as CSSProperties,
  overline: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.16em", textTransform: "uppercase" } as CSSProperties,
  meusGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 } as CSSProperties,
  card: { position: "relative", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.20)", transition: "transform .2s, border-color .2s" } as CSSProperties,
  cardThumb: { aspectRatio: "1 / 1", position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.06)" } as CSSProperties,
  catChip: { position: "absolute", top: 12, left: 12, zIndex: 2, padding: "4px 10px", borderRadius: 9999, background: "rgba(8,3,26,0.65)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", backdropFilter: "blur(10px)" } as CSSProperties,
  statusChip: (lowest: boolean): CSSProperties => ({
    position: "absolute", top: 12, right: 12, zIndex: 2, padding: "4px 10px", borderRadius: 9999,
    background: lowest ? "rgba(46,196,182,0.15)" : "rgba(255,107,87,0.15)",
    border: `1px solid ${lowest ? "rgba(46,196,182,0.38)" : "rgba(255,107,87,0.35)"}`,
    color: lowest ? "#6fe0d4" : "#ff9b8c", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.06em", textTransform: "uppercase", backdropFilter: "blur(10px)",
    display: "inline-flex", alignItems: "center", gap: 4,
  }),
  cardBody: { padding: 16, display: "flex", flexDirection: "column", gap: 12 } as CSSProperties,
  cardName: { fontSize: 15, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.005em", lineHeight: 1.25 } as CSSProperties,
  cardMeta: { fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" } as CSSProperties,
  priceRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 } as CSSProperties,
  priceLabel: { fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" } as CSSProperties,
  priceVal: { fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", lineHeight: 1 } as CSSProperties,
  delta: (good: boolean): CSSProperties => ({ fontSize: 11, fontWeight: 700, color: good ? "#ffe566" : "#f87171", display: "inline-flex", alignItems: "center", gap: 2 }),
  filterBar: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" } as CSSProperties,
  searchBox: { position: "relative", display: "flex", alignItems: "center", minWidth: 280, flex: 1 } as CSSProperties,
  searchInput: { width: "100%", padding: "11px 14px 11px 40px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", outline: "none" } as CSSProperties,
  searchIcon: { position: "absolute", left: 14, color: "#64748b", pointerEvents: "none" } as CSSProperties,
  pill: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#cbd5e1", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s" } as CSSProperties,
  pillActive: { background: "rgba(245,208,48,0.14)", border: "1px solid rgba(245,208,48,0.40)", color: "#ffe566" } as CSSProperties,
};

type MeuProduto = Produto & {
  precoAtual: number | null;
  precoAnterior: number | null;
  bestCompMarket: string | null;
  bestCompPrice: number | null;
  isLowest: boolean;
};

function buildMeus(data: OverviewData): MeuProduto[] {
  const latest = data.latestKey ?? "";
  const prevKey = data.dates.length >= 2 ? data.dates[data.dates.length - 2].key : null;
  return data.produtos.map((p) => {
    const prices = data.pricesOn(p.produto, latest);
    const semar = typeof prices.Semar === "number" ? prices.Semar : null;
    const prevPrices = prevKey ? data.pricesOn(p.produto, prevKey) : {};
    const prevSemar = typeof prevPrices.Semar === "number" ? prevPrices.Semar : null;
    const comp = lowestMarket(prices, "Semar");
    const isLowest = semar !== null && (comp.price === null || semar <= comp.price);
    return {
      ...p,
      precoAtual: semar,
      precoAnterior: prevSemar,
      bestCompMarket: comp.market,
      bestCompPrice: comp.price,
      isLowest,
    };
  });
}

function ImportModal({ open, onClose, onDownloadTemplate, onPickFile, isMobile }: { open: boolean; onClose: () => void; onDownloadTemplate: () => void; onPickFile: () => void; isMobile: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const half: CSSProperties = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "36px 28px", cursor: "pointer", transition: "background .2s", background: "transparent", border: "none", fontFamily: "inherit" };
  const iconWrap = (tint: "green" | "blue"): CSSProperties => ({ width: 56, height: 56, borderRadius: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", background: tint === "green" ? "rgba(46,196,182,0.10)" : "rgba(167,139,250,0.10)", border: `1px solid ${tint === "green" ? "rgba(46,196,182,0.25)" : "rgba(167,139,250,0.25)"}`, color: tint === "green" ? "#6fe0d4" : "#c4b5fd" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .2s" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, borderRadius: 24, overflow: "hidden", background: "rgba(12,5,37,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 40px 80px rgba(0,0,0,0.55)", backdropFilter: "blur(28px)", transform: open ? "scale(1)" : "scale(0.96)", transition: "transform .2s" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 22px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>Importar planilha</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Baixe o modelo para preencher ou envie seu arquivo .xlsx / .csv.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", cursor: "pointer", fontFamily: "inherit" }}>
            <IconX size={15} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", position: "relative" }}>
          <button type="button" style={half} onClick={onDownloadTemplate}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(46,196,182,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={iconWrap("green")}><IconDownload size={24} /></span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Baixar modelo</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.5, maxWidth: 200 }}>Planilha modelo com as colunas certas para preencher.</div>
            </div>
            <span style={{ marginTop: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#6fe0d4", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}>
              .csv / .xlsx <IconChevRight size={12} />
            </span>
          </button>

          <div style={{ position: "absolute", ...(isMobile ? { left: 28, right: 28, top: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" } : { top: 28, bottom: 28, left: "50%", width: 1, background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)" }) }} />

          <button type="button" style={half} onClick={onPickFile}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(167,139,250,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={iconWrap("blue")}><IconDownload size={24} style={{ transform: "rotate(180deg)" }} /></span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Enviar arquivo</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.5, maxWidth: 200 }}>Carrega os dados direto no painel, sem passar pela Lumii.</div>
            </div>
            <span style={{ marginTop: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#c4b5fd", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Selecionar <IconChevRight size={12} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MeusProdutos({ data, onNavigate }: { data: OverviewData; onNavigate: (route: Route, payload?: AiSeed) => void }) {
  const meus = useMemo(() => buildMeus(data), [data]);
  const allCats = useMemo<Categoria[]>(() => {
    const present = new Set(data.produtos.map((p) => p.categoria));
    return CAT_ORDER.filter((cat) => present.has(cat));
  }, [data.produtos]);

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<"todas" | Categoria>("todas");
  const [sortKey, setSortKey] = useState("nome");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = meus.filter((p) => {
      if (cat !== "todas" && p.categoria !== cat) return false;
      if (q && !p.produto.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortKey === "preco-asc") list = [...list].sort((x, y) => (x.precoAtual ?? Infinity) - (y.precoAtual ?? Infinity));
    if (sortKey === "preco-desc") list = [...list].sort((x, y) => (y.precoAtual ?? -Infinity) - (x.precoAtual ?? -Infinity));
    if (sortKey === "nome") list = [...list].sort((x, y) => x.produto.localeCompare(y.produto, "pt-BR"));
    if (sortKey === "economia") {
      const gap = (p: MeuProduto) => (p.precoAtual !== null && p.bestCompPrice ? (p.precoAtual - p.bestCompPrice) / p.bestCompPrice : 0);
      list = [...list].sort((x, y) => gap(x) - gap(y));
    }
    return list;
  }, [meus, search, cat, sortKey]);

  const catOptions: Array<{ id: "todas" | Categoria; label: string }> = [
    { id: "todas", label: "Todas" },
    ...allCats.map((cc) => ({ id: cc, label: cc })),
  ];

  return (
    <section style={ini.section}>
      <div style={ini.sectionHead} data-r-topbar>
        <div>
          <div style={ini.overline}>Minha operação · Semar</div>
          <h2 style={{ ...ini.sectionTitle, marginTop: 6 }}>Meus produtos</h2>
          <div style={ini.sectionSub}>Catálogo da sua loja com preço atual e posição frente aos concorrentes.</div>
        </div>
        <button type="button" onClick={() => onNavigate("comparacao")}
          style={{ ...ini.pill, background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)", border: "1px solid rgba(245,208,48,0.45)", color: "#0c0525", fontWeight: 700, boxShadow: "0 6px 16px rgba(245,208,48,0.26), inset 0 1px 0 rgba(255,255,255,0.35)" }}>
          Comparar com concorrentes
          <IconChevRight size={12} />
        </button>
      </div>

      <div style={ini.filterBar}>
        <div style={ini.searchBox}>
          <span style={ini.searchIcon}><IconSearch size={15} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nos meus produtos…" style={ini.searchInput} />
        </div>
        {catOptions.map((opt) => (
          <button key={opt.id} type="button" onClick={() => setCat(opt.id)} style={{ ...ini.pill, ...(cat === opt.id ? ini.pillActive : {}) }}>
            {opt.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={ini.overline}>Ordenar</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "#cbd5e1", fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
            <option value="nome" style={{ background: "#150838" }}>Alfabético (A → Z)</option>
            <option value="preco-desc" style={{ background: "#150838" }}>Preço — maior para menor</option>
            <option value="preco-asc" style={{ background: "#150838" }}>Preço — menor para maior</option>
            <option value="economia" style={{ background: "#150838" }}>Maior economia vs. líder</option>
          </select>
        </div>
      </div>

      <div style={ini.meusGrid} data-r-grid-store>
        {filtered.map((p) => {
          const delta = p.precoAnterior && p.precoAtual ? ((p.precoAtual - p.precoAnterior) / p.precoAnterior) * 100 : 0;
          return (
            <div key={p.id} style={ini.card}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(46,196,182,0.20)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <div style={ini.cardThumb}>
                <span style={ini.catChip}>{p.categoria}</span>
                <span style={ini.statusChip(p.isLowest)}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.isLowest ? "#2ec4b6" : "#ff6b57", boxShadow: `0 0 6px ${p.isLowest ? "#2ec4b6" : "#ff6b57"}` }} />
                  {p.isLowest ? "Menor preço" : "Acima do líder"}
                </span>
                <Thumb kind={p.art} size="100%" rounded={0} />
              </div>
              <div style={ini.cardBody}>
                <div>
                  <div style={ini.cardName}>{p.produto}</div>
                  <div style={{ ...ini.cardMeta, marginTop: 4 }}>
                    {p.bestCompMarket ? `Líder: ${p.bestCompMarket} · ${fmtBRL(p.bestCompPrice)}` : "Sem concorrência registrada"}
                  </div>
                </div>
                <div style={ini.priceRow}>
                  <div>
                    <div style={ini.priceLabel}>Meu preço</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
                      <span style={ini.priceVal}>{fmtBRL(p.precoAtual)}</span>
                      {Math.abs(delta) > 0.5 && (
                        <span style={ini.delta(delta < 0)}>
                          {delta < 0 ? <IconArrowDown size={11} /> : <IconArrowUp size={11} />}
                          {Math.abs(delta).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => onNavigate("comparacao")} title="Comparar com concorrentes"
                    style={{ width: 38, height: 38, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "#cbd5e1", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(46,196,182,0.30)"; e.currentTarget.style.color = "#6fe0d4"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "#cbd5e1"; }}
                  >
                    <IconChevRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "32px", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)", textAlign: "center", color: "#64748b" }}>
            Nenhum produto encontrado.
          </div>
        )}
      </div>
    </section>
  );
}

export function PainelInicio({ data, onNavigate, isMobile }: { data: OverviewData; onNavigate: (route: Route, payload?: AiSeed) => void; isMobile: boolean }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size?: number; kind: string }>>([]);
  const [importedAt, setImportedAt] = useState<{ name: string } | null>(null);
  const [importModal, setImportModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const attachFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}`, name: f.name, size: f.size, kind: (f.name.split(".").pop() || "").toLowerCase() }));
    setAttachments((cur) => [...cur, ...next]);
  };

  const send = () => {
    if (!text.trim() && attachments.length === 0) return;
    onNavigate("lumii-ai", { seedText: text.trim(), seedFiles: attachments });
    setText("");
    setAttachments([]);
  };

  const importToPanel = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImportedAt({ name: files[0].name });
    setImportModal(false);
  };

  const downloadTemplate = () => {
    const headers = ["produto", "categoria", "unidade", "preco", "data", "concorrente"];
    const sample = [
      ["Banana Prata", "Frutas", "kg", "6.49", "25-05-2026", "Semar"],
      ["Tomate Italiano", "Legumes", "kg", "8.49", "25-05-2026", "Semar"],
      ["Alface Crespa", "Verduras", "un", "3.49", "25-05-2026", "Semar"],
    ];
    const csv = [headers.join(","), ...sample.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-precos-lumii.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div style={ini.page}>
      <section style={ini.hero} data-r-hero>
        <div style={ini.greetRow} data-r-greet-row>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lumii-icon.png" alt="Lumii" width={44} height={44} style={{ borderRadius: 14, boxShadow: "0 12px 30px rgba(32,10,94,0.45)", flexShrink: 0 }} />
          <h1 style={ini.greetTitle} data-r-greet>{greeting}, Arthur</h1>
        </div>

        <div style={ini.composerWrap}>
          <div style={{ ...ini.composer, ...(focused ? ini.composerFocused : {}) }} data-r-composer>
            {attachments.length > 0 && (
              <div style={ini.attachedRow}>
                {attachments.map((att) => (
                  <span key={att.id} style={ini.attachedChip}>
                    <span style={ini.attachedChipIcon}>{att.kind.toUpperCase().slice(0, 3)}</span>
                    {att.name}
                    <button type="button" onClick={() => setAttachments((cur) => cur.filter((x) => x.id !== att.id))} style={{ background: "transparent", border: "none", color: "#6fe0d4", cursor: "pointer", padding: 0, marginLeft: 2, display: "inline-flex", alignItems: "center" }}>
                      <IconX size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              style={ini.composerTextarea} data-r-composer-textarea
              placeholder="Como posso ajudar você hoje?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
              rows={1}
            />
            <div style={ini.composerToolbar}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={(e) => { attachFiles(e.target.files); e.target.value = ""; }} />
                <button type="button" style={ini.composerIconBtn} onClick={() => fileRef.current?.click()} title="Anexar arquivos da empresa"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#f1f5f9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <IconPlus size={16} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button type="button" style={{ ...ini.composerIconBtn, border: "none" }} title="Ditar"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  <IconMic size={16} />
                </button>
                <button type="button" style={ini.sendBtn} onClick={send} title="Iniciar conversa"
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <IconSend size={14} />
                </button>
              </div>
            </div>
          </div>

          <div style={ini.promptChips}>
            {["Compare meus preços com os de Carrefour e Assaí", "Quais produtos estão perdendo margem essa semana?", "Sugira reajuste para bananas", "Resumo da operação ontem"].map((q) => (
              <button key={q} type="button" onClick={() => onNavigate("lumii-ai", { seedText: q })} style={ini.promptChip}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div style={ini.divider}>
          <span style={ini.dividerLine} />
          <span>ou</span>
          <span style={ini.dividerLine} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { importToPanel(e.target.files); e.target.value = ""; }} />
          <button type="button" onClick={() => setImportModal(true)} style={ini.importBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(46,196,182,0.30)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
          >
            <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(46,196,182,0.10)", border: "1px solid rgba(46,196,182,0.25)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgb(255, 229, 102)" }}>
              <IconDownload size={15} style={{ transform: "rotate(180deg)" }} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
              <span>Importar planilha (.xlsx ou .csv)</span>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: 2 }}>Carrega os dados direto no painel, sem passar pela Lumii.</span>
            </span>
          </button>
          {importedAt && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#6fe0d4", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <IconCheck size={12} /> <strong>{importedAt.name}</strong> recebido · será processado no painel.
            </div>
          )}
        </div>
      </section>

      <MeusProdutos data={data} onNavigate={onNavigate} />

      <ImportModal open={importModal} onClose={() => setImportModal(false)} onDownloadTemplate={downloadTemplate} onPickFile={() => importRef.current?.click()} isMobile={isMobile} />
    </div>
  );
}
