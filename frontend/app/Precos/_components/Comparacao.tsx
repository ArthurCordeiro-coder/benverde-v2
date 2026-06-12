import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  IconArrowDown,
  IconArrowUp,
  IconBar,
  IconCalendar,
  IconChevDown,
  IconCheck,
  IconFilter,
  IconPlus,
  IconSearch,
} from "../_lib/icons";
import { fmtBRL, isoOf, isoToDate, lowestMarket, monthLabel } from "../_lib/overview";
import type { OverviewData } from "../_lib/overview";
import type { Categoria, CartItem, Produto, ViewMode } from "../_lib/types";
import { Thumb } from "../_lib/produceArt";
import { DateRangePicker } from "./DateRangePicker";

const CAT_ORDER: Categoria[] = ["Frutas", "Legumes", "Verduras", "Outros"];

const c = {
  page: { display: "flex", flexDirection: "column", gap: 20 } as CSSProperties,
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" } as CSSProperties,
  title: { fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.015em", margin: 0 } as CSSProperties,
  subtitle: { fontSize: 13, color: "#94a3b8", marginTop: 4 } as CSSProperties,
  overline: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.16em", textTransform: "uppercase" } as CSSProperties,
  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "12px 18px", borderRadius: 14,
    border: "1px solid rgba(245,208,48,0.45)",
    background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)",
    color: "#0c0525", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
    boxShadow: "0 8px 24px rgba(245,208,48,0.26), inset 0 1px 0 rgba(255,255,255,0.4)", transition: "all .2s",
  } as CSSProperties,
  filterRow: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "stretch" } as CSSProperties,
  search: { position: "relative", display: "flex", alignItems: "center" } as CSSProperties,
  searchInput: {
    width: "100%", padding: "14px 16px 14px 46px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)",
    color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", outline: "none", transition: "all .2s",
  } as CSSProperties,
  searchIcon: { position: "absolute", left: 16, color: "#64748b", pointerEvents: "none" } as CSSProperties,
  pill: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 14px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)",
    color: "#cbd5e1", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
    transition: "all .2s", whiteSpace: "nowrap",
  } as CSSProperties,
  pillActive: { background: "rgba(46,196,182,0.10)", border: "1px solid rgba(46,196,182,0.30)", color: "#6fe0d4" } as CSSProperties,
  popover: {
    position: "absolute", top: "calc(100% + 8px)", zIndex: 30, minWidth: 260,
    background: "rgba(12,5,37,0.95)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18, padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.60)",
    backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
  } as CSSProperties,
  checkbox: (active: boolean): CSSProperties => ({
    width: 18, height: 18, borderRadius: 6,
    border: `1px solid ${active ? "rgba(46,196,182,0.6)" : "rgba(255,255,255,0.15)"}`,
    background: active ? "linear-gradient(135deg, #5fd9cd, #2ec4b6)" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s",
  }),
  segGroup: { display: "inline-flex", padding: 4, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" } as CSSProperties,
  segBtn: (active: boolean): CSSProperties => ({
    padding: "8px 14px", borderRadius: 10,
    background: active ? "linear-gradient(135deg, rgba(46,196,182,0.20), rgba(46,196,182,0.10))" : "transparent",
    border: active ? "1px solid rgba(46,196,182,0.30)" : "1px solid transparent",
    color: active ? "#6fe0d4" : "#94a3b8",
    fontWeight: 600, fontSize: 12, fontFamily: "inherit", cursor: "pointer", transition: "all .2s",
    display: "inline-flex", alignItems: "center", gap: 6,
  }),
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 } as CSSProperties,
  card: (added: boolean): CSSProperties => ({
    position: "relative", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden",
    border: added ? "1px solid rgba(46,196,182,0.40)" : "1px solid rgba(255,255,255,0.08)",
    background: added ? "rgba(46,196,182,0.04)" : "rgba(255,255,255,0.03)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    boxShadow: added ? "0 8px 32px rgba(46,196,182,0.12), 0 0 0 1px rgba(46,196,182,0.18)" : "0 8px 32px rgba(0,0,0,0.20)",
    transition: "transform .2s, box-shadow .2s",
  }),
  cardThumb: { aspectRatio: "1 / 1", position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.06)" } as CSSProperties,
  catChip: {
    position: "absolute", top: 12, left: 12, zIndex: 2,
    padding: "4px 10px", borderRadius: 9999, background: "rgba(8,3,26,0.65)",
    border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", backdropFilter: "blur(10px)",
  } as CSSProperties,
  bestChip: {
    position: "absolute", top: 12, right: 12, zIndex: 2,
    padding: "4px 10px 4px 8px", borderRadius: 9999,
    background: "linear-gradient(135deg, rgba(46,196,182,0.25), rgba(46,196,182,0.15))",
    border: "1px solid rgba(46,196,182,0.40)", color: "#6fe0d4", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.06em", textTransform: "uppercase", backdropFilter: "blur(10px)",
    display: "inline-flex", alignItems: "center", gap: 4,
  } as CSSProperties,
  cardBody: { padding: 16, display: "flex", flexDirection: "column", gap: 12 } as CSSProperties,
  cardName: { fontSize: 15, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.005em", lineHeight: 1.25 } as CSSProperties,
  cardUnit: { fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" } as CSSProperties,
  priceRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 } as CSSProperties,
  priceLabel: { fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" } as CSSProperties,
  priceVal: { fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em", lineHeight: 1 } as CSSProperties,
  priceDelta: (up: boolean): CSSProperties => ({ fontSize: 11, fontWeight: 700, color: up ? "#f87171" : "#ffe566", display: "inline-flex", alignItems: "center", gap: 2 }),
  addBtn: (added: boolean): CSSProperties => ({
    width: 38, height: 38, borderRadius: 12,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: added ? "1px solid rgba(46,196,182,0.40)" : "1px solid rgba(255,255,255,0.10)",
    background: added ? "linear-gradient(135deg, #5fd9cd, #2ec4b6)" : "rgba(255,255,255,0.04)",
    color: added ? "#042620" : "#cbd5e1", cursor: "pointer", flexShrink: 0, transition: "all .2s",
    boxShadow: added ? "0 8px 20px rgba(46,196,182,0.30)" : "none",
  }),
  empty: {
    gridColumn: "1 / -1", padding: "48px 32px", borderRadius: 20,
    border: "1px dashed rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)",
    textAlign: "center", color: "#64748b",
  } as CSSProperties,
};

type SortKey = "data-desc" | "preco-desc" | "preco-asc" | "abc" | "zyx";
type Meta = { price: number | null; market: string | null; prev: number | null };

function PriceInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder: string }) {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", gap: 4,
      padding: "8px 10px", borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)",
    }}>
      <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>R$</span>
      <input type="number" step="0.01" min={0} value={value} placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}
      />
    </div>
  );
}

const rangeInputStyle: CSSProperties = {
  position: "absolute", left: 0, right: 0, top: 0, width: "100%", height: 26,
  background: "transparent", appearance: "none", WebkitAppearance: "none", pointerEvents: "none",
};

function RangeSlider({ min, max, value, onChange }: { min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void }) {
  const lo = value[0], hi = value[1];
  const pct = (n: number) => ((n - min) / (max - min || 1)) * 100;
  return (
    <div style={{ position: "relative", height: 26 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 11, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }} />
      <div style={{ position: "absolute", top: 11, height: 4, left: `${pct(lo)}%`, right: `${100 - pct(hi)}%`, background: "linear-gradient(90deg, #5fd9cd, #2ec4b6)", borderRadius: 2, boxShadow: "0 0 12px rgba(46,196,182,0.40)" }} />
      <input type="range" min={min} max={max} step="0.5" value={lo} onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])} style={rangeInputStyle} />
      <input type="range" min={min} max={max} step="0.5" value={hi} onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])} style={rangeInputStyle} />
    </div>
  );
}

function CategoryFilter({
  allCats, selected, setSelected, sortKey, setSortKey, priceRange, setPriceRange, maxBound,
}: {
  allCats: Categoria[];
  selected: Categoria[];
  setSelected: (v: Categoria[]) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  maxBound: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const activeCount =
    (selected.length < allCats.length ? 1 : 0) +
    (sortKey !== "data-desc" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < maxBound ? 1 : 0);

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "data-desc", label: "Data mais recente" },
    { key: "preco-desc", label: "Preço — maior para menor" },
    { key: "preco-asc", label: "Preço — menor para maior" },
    { key: "abc", label: "Ordem alfabética (A → Z)" },
    { key: "zyx", label: "Ordem alfabética (Z → A)" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ ...c.pill, ...(activeCount ? c.pillActive : {}) }}>
        <IconFilter size={15} />
        Filtros
        {activeCount > 0 && (
          <span style={{ background: "#2ec4b6", color: "#042620", borderRadius: 9999, padding: "2px 7px", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{activeCount}</span>
        )}
        <IconChevDown size={13} />
      </button>

      {open && (
        <div style={{ ...c.popover, right: 0, minWidth: 320 }} data-r-popover>
          <div style={c.overline}>Categorias</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {allCats.map((cat) => {
              const active = selected.includes(cat);
              return (
                <button key={cat} type="button"
                  onClick={() => setSelected(active ? selected.filter((x) => x !== cat) : [...selected, cat])}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "transparent", border: "1px solid transparent", color: active ? "#f1f5f9" : "#94a3b8", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={c.checkbox(active)}>{active && <IconCheck size={12} color="#042620" />}</div>
                  {cat}
                </button>
              );
            })}
          </div>

          <div style={{ ...c.overline, marginTop: 18 }}>Ordenar por</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {sortOptions.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <button key={opt.key} type="button" onClick={() => setSortKey(opt.key)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: active ? "rgba(46,196,182,0.10)" : "transparent", border: active ? "1px solid rgba(46,196,182,0.25)" : "1px solid transparent", color: active ? "#6fe0d4" : "#cbd5e1", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", border: `1px solid ${active ? "#5fd9cd" : "rgba(255,255,255,0.20)"}`, background: active ? "#5fd9cd" : "transparent", boxShadow: active ? "0 0 8px rgba(46,196,182,0.5)" : "none", flexShrink: 0 }} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div style={{ ...c.overline, marginTop: 18 }}>Faixa de preço</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <PriceInput value={priceRange[0]} onChange={(v) => setPriceRange([Math.min(v, priceRange[1]), priceRange[1]])} placeholder="Mín." />
            <span style={{ color: "#64748b", fontSize: 12 }}>até</span>
            <PriceInput value={priceRange[1]} onChange={(v) => setPriceRange([priceRange[0], Math.max(v, priceRange[0])])} placeholder="Máx." />
          </div>
          <div style={{ marginTop: 12 }}>
            <RangeSlider min={0} max={maxBound} value={priceRange} onChange={setPriceRange} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#64748b" }}>
              <span>{fmtBRL(priceRange[0])}</span>
              <span>{fmtBRL(priceRange[1])}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setSelected(allCats); setSortKey("data-desc"); setPriceRange([0, maxBound]); }} style={{ ...c.pill, padding: "8px 12px", fontSize: 12 }}>Limpar</button>
            <button type="button" onClick={() => setOpen(false)} style={{ ...c.primaryBtn, padding: "8px 14px", fontSize: 12 }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product, price, prevPrice, bestMarket, added, onToggle, viewMode,
}: {
  product: Produto;
  price: number | null;
  prevPrice: number | null;
  bestMarket: string | null;
  added: boolean;
  onToggle: () => void;
  viewMode: ViewMode;
}) {
  const delta = prevPrice && prevPrice > 0 && price && price > 0 ? ((price - prevPrice) / prevPrice) * 100 : null;
  return (
    <div style={c.card(added)}
      onMouseEnter={(e) => { if (!added) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={c.cardThumb}>
        <span style={c.catChip}>{product.categoria}</span>
        {bestMarket && (
          <span style={c.bestChip}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ec4b6", boxShadow: "0 0 6px #2ec4b6" }} />
            {bestMarket}
          </span>
        )}
        <Thumb kind={product.art} size="100%" rounded={0} />
      </div>
      <div style={c.cardBody}>
        <div>
          <div style={c.cardName}>{product.produto}</div>
          <div style={{ ...c.cardUnit, marginTop: 4 }}>
            por {product.unidade}
            {viewMode === "monthly" && " · média do mês"}
            {viewMode === "overall" && " · média do período"}
            {viewMode === "today" && " · cotação recente"}
          </div>
        </div>
        <div style={c.priceRow}>
          <div>
            <div style={c.priceLabel}>{viewMode === "today" ? "Atual" : "Média"}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <span style={c.priceVal}>{fmtBRL(price)}</span>
              {delta !== null && Math.abs(delta) > 0.5 && (
                <span style={c.priceDelta(delta > 0)}>
                  {delta > 0 ? <IconArrowUp size={11} /> : <IconArrowDown size={11} />}
                  {Math.abs(delta).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onToggle} style={c.addBtn(added)} title={added ? "Remover da análise" : "Adicionar à análise"}>
            {added ? <IconCheck size={16} /> : <IconPlus size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Comparacao({
  data, cart, setCart, setCartOpen,
}: {
  data: OverviewData;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
}) {
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

  const months = useMemo(() => {
    const seen = new Map<string, { y: number; m: number }>();
    for (const d of data.dates) seen.set(`${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}`, { y: d.date.getFullYear(), m: d.date.getMonth() });
    return Array.from(seen.entries())
      .map(([monthKey, { y, m }]) => ({
        monthKey,
        label: monthLabel(new Date(y, m, 1)),
        from: isoOf(new Date(y, m, 1)),
        to: isoOf(new Date(y, m + 1, 0)),
        sort: y * 12 + m,
      }))
      .sort((a, b) => b.sort - a.sort);
  }, [data.dates]);

  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<Categoria[]>(allCats);
  const [sortKey, setSortKey] = useState<SortKey>("data-desc");
  const [from, setFrom] = useState(bounds.firstIso);
  const [to, setTo] = useState(bounds.lastIso);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const maxPrice = useMemo(() => {
    let max = 0;
    for (const p of data.produtos) {
      const prices = data.pricesOn(p.produto, data.latestKey ?? "");
      const best = lowestMarket(prices);
      if (best.price && best.price > max) max = best.price;
    }
    return Math.max(30, Math.ceil(max / 5) * 5);
  }, [data]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, maxPrice]);

  // Keep ranges in sync when data first loads.
  useEffect(() => { setSelectedCats(allCats); }, [allCats]);
  useEffect(() => { setFrom(bounds.firstIso); setTo(bounds.lastIso); }, [bounds.firstIso, bounds.lastIso]);
  useEffect(() => { setPriceRange([0, maxPrice]); }, [maxPrice]);
  useEffect(() => {
    if (viewMode === "monthly" && !selectedMonth && months.length) setSelectedMonth(months[0].monthKey);
  }, [viewMode, selectedMonth, months]);

  const prevKey = useMemo(() => {
    if (data.dates.length < 2) return null;
    return data.dates[data.dates.length - 2].key;
  }, [data.dates]);

  function priceFor(p: Produto): Meta {
    if (viewMode === "today") {
      const prices = data.pricesOn(p.produto, data.latestKey ?? "");
      const best = lowestMarket(prices);
      const prevBest = prevKey ? lowestMarket(data.pricesOn(p.produto, prevKey)) : { price: null };
      return { price: best.price, market: best.market, prev: prevBest.price };
    }
    if (viewMode === "monthly" && selectedMonth) {
      const idx = months.findIndex((m) => m.monthKey === selectedMonth);
      const month = months[idx] ?? months[0];
      const prev = months[idx + 1] ?? null;
      const best = lowestMarket(data.averagePrices(p.produto, month.from, month.to));
      const prevBest = prev ? lowestMarket(data.averagePrices(p.produto, prev.from, prev.to)) : { price: null };
      return { price: best.price, market: best.market, prev: prevBest.price };
    }
    // overall — within [from, to]
    const best = lowestMarket(data.averagePrices(p.produto, from, to || bounds.lastIso));
    const fromD = isoToDate(from), toD = isoToDate(to || bounds.lastIso);
    const span = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;
    const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (span - 1));
    const prevBest = lowestMarket(data.averagePrices(p.produto, isoOf(prevFrom), isoOf(prevTo)));
    return { price: best.price, market: best.market, prev: prevBest.price };
  }

  const items = useMemo(() => {
    const list = data.produtos
      .filter((p) => selectedCats.includes(p.categoria))
      .map((p) => ({ p, meta: priceFor(p) }))
      .filter(({ p }) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return p.produto.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
      })
      .filter(({ meta }) => {
        const px = meta.price ?? 0;
        return px >= priceRange[0] && px <= priceRange[1];
      });

    if (sortKey === "preco-desc") list.sort((a, b) => (b.meta.price ?? 0) - (a.meta.price ?? 0));
    else if (sortKey === "preco-asc") list.sort((a, b) => (a.meta.price ?? 0) - (b.meta.price ?? 0));
    else if (sortKey === "abc") list.sort((a, b) => a.p.produto.localeCompare(b.p.produto, "pt-BR"));
    else if (sortKey === "zyx") list.sort((a, b) => b.p.produto.localeCompare(a.p.produto, "pt-BR"));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, selectedCats, sortKey, priceRange, viewMode, selectedMonth, from, to]);

  const inCart = (id: string) => cart.some((x) => x.id === id);

  const addToCart = (p: Produto, meta: Meta) => {
    setCart((cur) => {
      if (cur.some((x) => x.id === p.id)) return cur.filter((x) => x.id !== p.id);
      return [...cur, { id: p.id, produto: p.produto, categoria: p.categoria, art: p.art, unidade: p.unidade, price: meta.price, market: meta.market }];
    });
  };

  return (
    <div style={c.page}>
      <div style={c.topbar} data-r-topbar>
        <div>
          <div style={c.overline}>Preços Concorrentes</div>
          <h1 style={{ ...c.title, marginTop: 6 }}>Comparação</h1>
          <div style={c.subtitle}>Monte uma cesta de produtos e envie para a Lumii analisar sua estratégia de preços.</div>
        </div>
        <button type="button" onClick={() => setCartOpen(true)} style={c.primaryBtn} data-r-cta-block
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(245,208,48,0.34), inset 0 1px 0 rgba(255,255,255,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(245,208,48,0.26), inset 0 1px 0 rgba(255,255,255,0.4)"; }}
        >
          <IconPlus size={16} />
          Itens selecionados
          <span style={{ background: "rgba(12,5,37,0.20)", color: "#0c0525", borderRadius: 9999, padding: "2px 9px", fontSize: 12, fontWeight: 800, lineHeight: 1, border: "1px solid rgba(12,5,37,0.28)" }}>{cart.length}</span>
        </button>
      </div>

      <div style={c.filterRow} data-r-stack>
        <div style={c.search}>
          <span style={c.searchIcon}><IconSearch size={16} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto, categoria…" style={c.searchInput}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(46,196,182,0.40)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
          />
        </div>
        <CategoryFilter allCats={allCats} selected={selectedCats} setSelected={setSelectedCats} sortKey={sortKey} setSortKey={setSortKey} priceRange={priceRange} setPriceRange={setPriceRange} maxBound={maxPrice} />
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} refIso={bounds.lastIso} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={c.segGroup} data-r-seggroup>
          <button type="button" onClick={() => setViewMode("today")} style={c.segBtn(viewMode === "today")}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: viewMode === "today" ? "#5fd9cd" : "#475569", boxShadow: viewMode === "today" ? "0 0 6px #2ec4b6" : "none" }} />
            Recente
          </button>
          <button type="button" onClick={() => setViewMode("overall")} style={c.segBtn(viewMode === "overall")}>
            <IconCalendar size={12} /> Média geral
          </button>
          <button type="button" onClick={() => setViewMode("monthly")} style={c.segBtn(viewMode === "monthly")}>
            <IconBar size={12} /> Média mensal
          </button>
        </div>

        {viewMode === "monthly" && months.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>
            {months.slice(0, 5).map((m) => (
              <button key={m.monthKey} type="button" onClick={() => setSelectedMonth(m.monthKey)}
                style={{ ...c.pill, padding: "8px 12px", fontSize: 12, ...(selectedMonth === m.monthKey ? c.pillActive : {}) }}>
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>{items.length}</span> produtos
        </div>
      </div>

      <div style={c.grid} data-r-grid-store>
        {items.length === 0 && (
          <div style={c.empty}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#cbd5e1" }}>Nenhum produto corresponde aos filtros.</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>Ajuste a busca, a faixa de preço ou as categorias selecionadas.</div>
          </div>
        )}
        {items.map(({ p, meta }) => (
          <ProductCard key={p.id} product={p} price={meta.price} prevPrice={meta.prev} bestMarket={meta.market} added={inCart(p.id)} onToggle={() => addToCart(p, meta)} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
}
