import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { exportRowsToXlsx } from "@/lib/export";

import {
  IconCheck,
  IconChevDown,
  IconChevUp,
  IconChevsUD,
  IconDownload,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconSort,
} from "../_lib/icons";
import { fmtBRL, fmtDateBR, isoOf } from "../_lib/overview";
import type { OverviewData } from "../_lib/overview";
import type { Categoria, FlatRow } from "../_lib/types";
import { DateRangePicker } from "./DateRangePicker";

const CAT_ORDER: Categoria[] = ["Frutas", "Legumes", "Verduras", "Outros"];

const t = {
  page: { display: "flex", flexDirection: "column", gap: 20 } as CSSProperties,
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" } as CSSProperties,
  title: { fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.015em", margin: 0 } as CSSProperties,
  subtitle: { fontSize: 13, color: "#94a3b8", marginTop: 4 } as CSSProperties,
  overline: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.16em", textTransform: "uppercase" } as CSSProperties,
  toolbar: { display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 10, alignItems: "stretch" } as CSSProperties,
  search: { position: "relative", display: "flex", alignItems: "center" } as CSSProperties,
  searchInput: {
    width: "100%", padding: "12px 14px 12px 42px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)",
    color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", outline: "none",
  } as CSSProperties,
  searchIcon: { position: "absolute", left: 14, color: "#64748b", pointerEvents: "none" } as CSSProperties,
  pill: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "11px 14px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)",
    color: "#cbd5e1", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s", whiteSpace: "nowrap",
  } as CSSProperties,
  pillActive: { background: "rgba(46,196,182,0.10)", border: "1px solid rgba(46,196,182,0.30)", color: "#6fe0d4" } as CSSProperties,
  primaryGhost: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "11px 14px", borderRadius: 12,
    border: "1px solid rgba(46,196,182,0.30)", background: "rgba(46,196,182,0.10)",
    color: "#6fe0d4", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all .2s", whiteSpace: "nowrap",
  } as CSSProperties,
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 } as CSSProperties,
  kpi: { padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)" } as CSSProperties,
  kpiLabel: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.14em", textTransform: "uppercase" } as CSSProperties,
  kpiValue: { fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", marginTop: 8, lineHeight: 1 } as CSSProperties,
  kpiSub: { fontSize: 11, color: "#94a3b8", marginTop: 6 } as CSSProperties,
  tableWrap: {
    borderRadius: 24, overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
    backdropFilter: "blur(20px)", boxShadow: "0 20px 50px rgba(0,0,0,0.40)",
  } as CSSProperties,
  tableScroll: { maxHeight: "calc(100vh - 360px)", overflow: "auto" } as CSSProperties,
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13, textAlign: "left" } as CSSProperties,
  // Retinted from the original green band to the brand teal/indigo (no green).
  thead: {
    position: "sticky", top: 0, zIndex: 4,
    background: "linear-gradient(180deg, rgba(46,196,182,0.18), rgba(20,12,40,0.92))",
    backdropFilter: "blur(16px)",
  } as CSSProperties,
  th: {
    padding: "14px 18px", fontSize: 10, fontWeight: 800, color: "#6fe0d4",
    letterSpacing: "0.14em", textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.10)", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
  } as CSSProperties,
  thInner: { display: "inline-flex", alignItems: "center", gap: 6 } as CSSProperties,
  td: { padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#e2e8f0", verticalAlign: "middle" } as CSSProperties,
  tdMono: { fontFamily: "var(--lumii-font-mono)", fontSize: 12 } as CSSProperties,
  marketChip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "3px 10px", borderRadius: 9999, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 11, fontWeight: 600,
  } as CSSProperties,
  bestDot: { width: 6, height: 6, borderRadius: "50%", background: "#2ec4b6", boxShadow: "0 0 6px #2ec4b6" } as CSSProperties,
  footer: {
    padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.20)",
    display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#64748b", flexWrap: "wrap", gap: 12,
  } as CSSProperties,
};

function catChip(cat: Categoria): CSSProperties {
  const colors: Record<string, { bg: string; bd: string; fg: string }> = {
    Frutas: { bg: "rgba(255,107,87,0.12)", bd: "rgba(255,107,87,0.32)", fg: "#ff9b8c" },
    Legumes: { bg: "rgba(46,196,182,0.12)", bd: "rgba(46,196,182,0.30)", fg: "#6fe0d4" },
    Verduras: { bg: "rgba(167,139,250,0.14)", bd: "rgba(167,139,250,0.34)", fg: "#c4b5fd" },
    Outros: { bg: "rgba(148,163,184,0.12)", bd: "rgba(148,163,184,0.28)", fg: "#cbd5e1" },
  };
  const cc = colors[cat] || colors.Frutas;
  return {
    display: "inline-block", padding: "3px 9px", borderRadius: 9999,
    background: cc.bg, border: `1px solid ${cc.bd}`, color: cc.fg,
    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
  };
}

type SortSpec = { key: keyof FlatRow; dir: "asc" | "desc" };

const COLUMNS: Array<{ key: keyof FlatRow; label: string; width: number; kind: string; align?: "right" }> = [
  { key: "data", label: "Data", width: 110, kind: "date" },
  { key: "produto", label: "Produto", width: 200, kind: "text" },
  { key: "categoria", label: "Categoria", width: 120, kind: "text" },
  { key: "concorrente", label: "Concorrente", width: 140, kind: "text" },
  { key: "preco", label: "Preço", width: 110, kind: "num", align: "right" },
  { key: "unidade", label: "Unidade", width: 80, kind: "text" },
  { key: "variacao", label: "Δ vs. média", width: 110, kind: "num", align: "right" },
  { key: "isBest", label: "Melhor", width: 90, kind: "bool" },
];

function SortIcon({ dir }: { dir: "asc" | "desc" | null }) {
  if (dir === "asc") return <IconChevUp size={12} />;
  if (dir === "desc") return <IconChevDown size={12} />;
  return <span style={{ opacity: 0.35 }}><IconChevsUD size={12} /></span>;
}

function exportRows(rows: FlatRow[]) {
  void exportRowsToXlsx(
    rows.map((r) => ({
      Data: fmtDateBR(r.data),
      Produto: r.produto,
      Categoria: r.categoria,
      Concorrente: r.concorrente,
      Preço: r.preco,
      Unidade: r.unidade,
      "Δ vs. média (%)": Number(r.variacao.toFixed(1)),
      Melhor: r.isBest ? "Sim" : "Não",
    })),
    "Preços",
    "tabela-precos-lumii.xlsx",
  );
}

function FooterExportMenu({ rows }: { rows: FlatRow[] }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const pick = (fmt: "pdf" | "excel") => {
    if (fmt === "excel") exportRows(rows);
    setSent(fmt);
    setOpen(false);
    setTimeout(() => setSent(null), 1800);
  };
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 9,
          background: open ? "rgba(255,255,255,0.06)" : "transparent",
          border: `1px solid ${open ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)"}`,
          color: sent ? "#6fe0d4" : "#94a3b8", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
          letterSpacing: "0.04em", cursor: "pointer", transition: "all .15s",
        }}
      >
        {sent ? <IconCheck size={11} /> : <IconDownload size={11} />}
        {sent ? `${sent === "pdf" ? "PDF" : "Excel"} gerado` : "Exportar"}
        {!sent && <IconChevUp size={10} />}
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 30, minWidth: 200,
          background: "rgba(12,5,37,0.97)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14, padding: 6, boxShadow: "0 20px 50px rgba(0,0,0,0.60)", backdropFilter: "blur(24px)",
        }}>
          {[
            { id: "pdf" as const, label: "Exportar como PDF", sub: "Em breve" },
            { id: "excel" as const, label: "Exportar como Excel", sub: ".xlsx com filtros aplicados" },
          ].map((opt) => (
            <button key={opt.id} type="button" onClick={() => pick(opt.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "transparent", border: "1px solid transparent", color: "#cbd5e1", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: opt.id === "pdf" ? "rgba(248,113,113,0.10)" : "rgba(46,196,182,0.10)",
                border: `1px solid ${opt.id === "pdf" ? "rgba(248,113,113,0.25)" : "rgba(46,196,182,0.25)"}`,
                color: opt.id === "pdf" ? "#fca5a5" : "#6fe0d4", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
              }}>{opt.id === "pdf" ? "PDF" : "XLS"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TabelaCompleta({ data, onReload, refreshing }: { data: OverviewData; onReload: () => void; refreshing: boolean }) {
  const allCats = useMemo<Categoria[]>(() => {
    const present = new Set(data.produtos.map((p) => p.categoria));
    const ordered = CAT_ORDER.filter((cat) => present.has(cat));
    return ordered.length ? ordered : ["Frutas", "Legumes", "Verduras"];
  }, [data.produtos]);

  const bounds = useMemo(() => {
    if (data.dates.length === 0) {
      const now = isoOf(new Date());
      return { firstIso: now, lastIso: now };
    }
    return { firstIso: data.dates[0].iso, lastIso: data.dates[data.dates.length - 1].iso };
  }, [data.dates]);

  const [sort, setSort] = useState<SortSpec[]>([
    { key: "preco", dir: "desc" },
    { key: "concorrente", dir: "asc" },
    { key: "produto", dir: "asc" },
  ]);
  const [search, setSearch] = useState("");
  const [cats, setCats] = useState<Categoria[]>(allCats);
  const [filterMarkets, setFilterMarkets] = useState<string[]>(data.markets);
  const [onlyBest, setOnlyBest] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [from, setFrom] = useState(bounds.firstIso);
  const [to, setTo] = useState(bounds.lastIso);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCats(allCats); }, [allCats]);
  useEffect(() => { setFilterMarkets(data.markets); }, [data.markets]);
  useEffect(() => { setFrom(bounds.firstIso); setTo(bounds.lastIso); }, [bounds.firstIso, bounds.lastIso]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setOpenFilter(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.flatRows.filter((r) => {
      if (q && !r.produto.toLowerCase().includes(q) && !r.concorrente.toLowerCase().includes(q)) return false;
      if (!cats.includes(r.categoria)) return false;
      if (!filterMarkets.includes(r.concorrente)) return false;
      if (onlyBest && !r.isBest) return false;
      if (from && r.iso < from) return false;
      if (to && r.iso > to) return false;
      return true;
    });
  }, [data.flatRows, search, cats, filterMarkets, onlyBest, from, to]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      for (const sp of sort) {
        const av = a[sp.key];
        const bv = b[sp.key];
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else if (typeof av === "boolean" || typeof bv === "boolean") cmp = av === bv ? 0 : av ? -1 : 1;
        else cmp = String(av).localeCompare(String(bv), "pt-BR");
        if (cmp !== 0) return sp.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  const cycleSort = (key: keyof FlatRow) => {
    setSort((cur) => {
      const top = cur[0];
      if (top.key === key) return [{ key, dir: top.dir === "asc" ? "desc" : "asc" }, ...cur.slice(1).filter((sp) => sp.key !== key)];
      const col = COLUMNS.find((cc) => cc.key === key);
      const defaultDir: "asc" | "desc" = col && col.kind === "num" ? "desc" : "asc";
      const rest = cur.filter((sp) => sp.key !== key).slice(0, 2);
      return [{ key, dir: defaultDir }, ...rest];
    });
  };
  const sortFor = (key: keyof FlatRow) => sort.find((sp) => sp.key === key);

  const total = sorted.length;
  const totalProducts = new Set(sorted.map((r) => r.produto)).size;
  const lowestRow = sorted.reduce<FlatRow | null>((acc, r) => (acc === null || r.preco < acc.preco ? r : acc), null);
  const winningSemar = sorted.filter((r) => r.concorrente === "Semar" && r.isBest).length;

  return (
    <div style={t.page}>
      <div style={t.topbar} data-r-topbar>
        <div>
          <div style={t.overline}>Preços Concorrentes</div>
          <h1 style={{ ...t.title, marginTop: 6 }}>Tabela Completa</h1>
          <div style={t.subtitle}>Snapshot completo do banco — todas as cotações coletadas, em ordem decrescente de preço.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={t.pill} onClick={onReload}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
          >
            <IconRefresh size={14} /> {refreshing ? "Atualizando…" : "Atualizar"}
          </button>
          <button type="button" style={t.primaryGhost} onClick={() => exportRows(sorted)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(46,196,182,0.16)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(46,196,182,0.10)")}
          >
            <IconDownload size={14} /> Exportar
          </button>
        </div>
      </div>

      <div style={t.kpiRow} data-r-grid-kpi>
        <div style={t.kpi}>
          <div style={t.kpiLabel}>Cotações</div>
          <div style={t.kpiValue}>{total.toLocaleString("pt-BR")}</div>
          <div style={t.kpiSub}>linhas no banco (filtros aplicados)</div>
        </div>
        <div style={t.kpi}>
          <div style={t.kpiLabel}>Produtos únicos</div>
          <div style={t.kpiValue}>{totalProducts}</div>
          <div style={t.kpiSub}>SKUs monitorados na seleção</div>
        </div>
        <div style={t.kpi}>
          <div style={t.kpiLabel}>Menor cotação</div>
          <div style={{ ...t.kpiValue, color: "#6fe0d4" }}>{lowestRow ? fmtBRL(lowestRow.preco) : "—"}</div>
          <div style={t.kpiSub}>{lowestRow ? `${lowestRow.produto} · ${lowestRow.concorrente}` : "—"}</div>
        </div>
        <div style={t.kpi}>
          <div style={t.kpiLabel}>Semar liderando</div>
          <div style={{ ...t.kpiValue, color: "#5fd9cd" }}>{winningSemar}</div>
          <div style={t.kpiSub}>cotações com menor preço</div>
        </div>
      </div>

      <div style={t.toolbar} data-r-table-toolbar>
        <div style={t.search}>
          <span style={t.searchIcon}><IconSearch size={15} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto ou concorrente…" style={t.searchInput}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(46,196,182,0.40)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
          />
        </div>

        <DateRangePicker from={from} to={to} onChange={(f, tt) => { setFrom(f); setTo(tt); }} refIso={bounds.lastIso} />

        <div ref={filterRef} style={{ position: "relative" }}>
          <button type="button" onClick={() => setOpenFilter((v) => !v)} style={{ ...t.pill, ...(openFilter ? t.pillActive : {}) }}>
            <IconFilter size={14} /> Concorrentes
            {filterMarkets.length < data.markets.length && (
              <span style={{ background: "#2ec4b6", color: "#042620", borderRadius: 9999, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{filterMarkets.length}</span>
            )}
            <IconChevDown size={12} />
          </button>
          {openFilter && (
            <div data-r-popover style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 30, minWidth: 240, background: "rgba(12,5,37,0.95)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.60)" }}>
              <div style={{ ...t.overline, padding: "0 4px 8px" }}>Concorrentes</div>
              {data.markets.map((m) => {
                const checked = filterMarkets.includes(m);
                return (
                  <button key={m} type="button" onClick={() => setFilterMarkets(checked ? filterMarkets.filter((x) => x !== m) : [...filterMarkets, m])}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "transparent", border: "1px solid transparent", color: checked ? "#f1f5f9" : "#94a3b8", fontSize: 13, fontFamily: "inherit", fontWeight: 500, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 6, border: `1px solid ${checked ? "rgba(46,196,182,0.6)" : "rgba(255,255,255,0.15)"}`, background: checked ? "linear-gradient(135deg, #5fd9cd, #2ec4b6)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{checked && <IconCheck size={12} color="#042620" />}</div>
                    {m}
                  </button>
                );
              })}
              <div style={{ ...t.overline, padding: "12px 4px 8px", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 6 }}>Categorias</div>
              {allCats.map((cc) => {
                const checked = cats.includes(cc);
                return (
                  <button key={cc} type="button" onClick={() => setCats(checked ? cats.filter((x) => x !== cc) : [...cats, cc])}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "transparent", border: "1px solid transparent", color: checked ? "#f1f5f9" : "#94a3b8", fontSize: 13, fontFamily: "inherit", fontWeight: 500, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 6, border: `1px solid ${checked ? "rgba(46,196,182,0.6)" : "rgba(255,255,255,0.15)"}`, background: checked ? "linear-gradient(135deg, #5fd9cd, #2ec4b6)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{checked && <IconCheck size={12} color="#042620" />}</div>
                    {cc}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button type="button" onClick={() => setOnlyBest((v) => !v)} style={{ ...t.pill, ...(onlyBest ? t.pillActive : {}) }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: onlyBest ? "#2ec4b6" : "#475569" }} />
          Apenas líder
        </button>

        <button type="button" onClick={() => setSort([{ key: "preco", dir: "desc" }, { key: "concorrente", dir: "asc" }, { key: "produto", dir: "asc" }])} style={t.pill}>
          <IconSort size={14} /> Ordem padrão
        </button>
      </div>

      <div style={t.tableWrap}>
        <div style={t.tableScroll} data-r-table-scroll>
          <table style={t.table}>
            <thead style={t.thead}>
              <tr>
                {COLUMNS.map((col) => {
                  const sp = sortFor(col.key);
                  return (
                    <th key={String(col.key)} onClick={() => cycleSort(col.key)} style={{ ...t.th, width: col.width, textAlign: col.align || "left" }}>
                      <span style={{ ...t.thInner, justifyContent: col.align === "right" ? "flex-end" : "flex-start", width: "100%" }}>
                        {col.label}
                        <SortIcon dir={sp ? sp.dir : null} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
                    Nenhum registro corresponde aos filtros aplicados.
                  </td>
                </tr>
              )}
              {sorted.slice(0, 400).map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 ? "rgba(255,255,255,0.015)" : "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(46,196,182,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 ? "rgba(255,255,255,0.015)" : "transparent")}
                >
                  <td style={{ ...t.td, ...t.tdMono, color: "#94a3b8" }}>{fmtDateBR(r.data)}</td>
                  <td style={{ ...t.td, fontWeight: 500, color: "#f1f5f9" }}>{r.produto}</td>
                  <td style={t.td}><span style={catChip(r.categoria)}>{r.categoria}</span></td>
                  <td style={t.td}>
                    <span style={t.marketChip}>{r.isBest && <span style={t.bestDot} />}{r.concorrente}</span>
                  </td>
                  <td style={{ ...t.td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: r.isBest ? "#6fe0d4" : "#f1f5f9" }}>{fmtBRL(r.preco)}</td>
                  <td style={{ ...t.td, color: "#94a3b8", fontSize: 12 }}>{r.unidade}</td>
                  <td style={{ ...t.td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, color: r.variacao > 0 ? "#f87171" : r.variacao < 0 ? "#ffe566" : "#94a3b8" }}>
                    {r.variacao > 0 ? "+" : ""}{r.variacao.toFixed(1)}%
                  </td>
                  <td style={t.td}>
                    {r.isBest ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 9999, background: "rgba(46,196,182,0.10)", border: "1px solid rgba(46,196,182,0.30)", color: "#6fe0d4", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        <IconCheck size={10} /> Sim
                      </span>
                    ) : (
                      <span style={{ color: "#475569", fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={t.footer}>
          <div>
            Mostrando <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{Math.min(400, sorted.length)}</span> de{" "}
            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{sorted.length.toLocaleString("pt-BR")}</span> linhas
            <span style={{ color: "#475569", margin: "0 8px" }}>·</span>
            período <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{fmtDateBR(from)}</span> — <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{fmtDateBR(to)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ec4b6", boxShadow: "0 0 6px #2ec4b6" }} />
              Menor preço da data
            </span>
            <span>Ordem ativa: preço ↓ · concorrente ↑ · produto ↑</span>
            <FooterExportMenu rows={sorted} />
          </div>
        </div>
      </div>
    </div>
  );
}
