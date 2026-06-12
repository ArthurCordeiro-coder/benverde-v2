import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { IconCalendar, IconChevDown, IconChevLeft, IconChevRight } from "../_lib/icons";
import { isoOf, isoToDate, monthLabel, pad } from "../_lib/overview";

const pill: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "12px 14px", borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  color: "#cbd5e1", fontWeight: 600, fontSize: 13,
  fontFamily: "inherit", cursor: "pointer", transition: "all .2s", whiteSpace: "nowrap",
};
const popover: CSSProperties = {
  position: "absolute", top: "calc(100% + 8px)", zIndex: 30,
  background: "rgba(12,5,37,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  boxShadow: "0 20px 50px rgba(0,0,0,0.60)",
  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
};
const overline: CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#64748b",
  letterSpacing: "0.16em", textTransform: "uppercase",
};
const iconBtn: CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  color: "#cbd5e1", cursor: "pointer", fontFamily: "inherit",
};

function isoDaysAgoFrom(ref: Date, n: number): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - n);
  return isoOf(d);
}

export function DateRangePicker({
  from,
  to,
  onChange,
  refIso,
}: {
  from: string; // ISO YYYY-MM-DD
  to: string; // ISO YYYY-MM-DD ("" while picking)
  onChange: (from: string, to: string) => void;
  refIso?: string; // latest data date (anchors shortcuts); defaults to today
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const refDate = refIso ? isoToDate(refIso) : new Date();
  const [view, setView] = useState(() => {
    const d = isoToDate(from || isoOf(refDate));
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const fmtBR = (iso: string) => {
    const d = isoToDate(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const onDayClick = (iso: string) => {
    if (!from || (from && to)) onChange(iso, "");
    else if (iso < from) onChange(iso, from);
    else onChange(from, iso);
  };

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const startDay = first.getDay();
    const last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= last; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const todayIso = isoOf(refDate);
  const shortcuts = [
    { label: "Últimos 7 dias", range: (): [string, string] => [isoDaysAgoFrom(refDate, 6), todayIso] },
    { label: "Últimos 30 dias", range: (): [string, string] => [isoDaysAgoFrom(refDate, 29), todayIso] },
    { label: "Este mês", range: (): [string, string] => [isoOf(new Date(refDate.getFullYear(), refDate.getMonth(), 1)), todayIso] },
    {
      label: "Mês passado",
      range: (): [string, string] => {
        const m = refDate.getMonth() - 1;
        const start = new Date(refDate.getFullYear(), m, 1);
        const end = new Date(refDate.getFullYear(), m + 1, 0);
        return [isoOf(start), isoOf(end)];
      },
    },
    { label: "Trimestre", range: (): [string, string] => [isoDaysAgoFrom(refDate, 89), todayIso] },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ ...pill, gap: 10 }}>
        <IconCalendar size={15} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#64748b", textTransform: "uppercase" }}>
            Período
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {from ? fmtBR(from) : "…"} <span style={{ color: "#64748b" }}>→</span> {to ? fmtBR(to) : "…"}
          </span>
        </div>
        <IconChevDown size={13} />
      </button>

      {open && (
        <div style={{ ...popover, right: 0, minWidth: 540, padding: 0, display: "flex" }} data-r-popover data-r-daterange>
          <div style={{
            width: 180, padding: 16, borderRight: "1px solid rgba(255,255,255,0.08)",
            display: "flex", flexDirection: "column", gap: 4,
          }} data-r-daterange-shortcuts>
            <div style={{ ...overline, marginBottom: 8, padding: 0 }}>Atalhos</div>
            {shortcuts.map((s) => (
              <button key={s.label} type="button" onClick={() => { const [f, t] = s.range(); onChange(f, t); }}
                style={{
                  padding: "9px 10px", borderRadius: 10,
                  background: "transparent", border: "1px solid transparent",
                  color: "#cbd5e1", fontSize: 12, fontFamily: "inherit", fontWeight: 500,
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#f1f5f9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#cbd5e1"; }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 16, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={iconBtn}><IconChevLeft size={14} /></button>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{monthLabel(view)}</div>
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} style={iconBtn}><IconChevRight size={14} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {days.map((d, i) => {
                if (!d) return <div key={i} style={{ height: 32 }} />;
                const iso = isoOf(d);
                const isFrom = iso === from, isTo = iso === to;
                const inRange = !!from && !!to && iso >= from && iso <= to;
                const inHover = !!from && !to && !!hover && iso > from && iso <= hover;
                const isToday = iso === todayIso;
                return (
                  <button key={i} type="button" onClick={() => onDayClick(iso)} onMouseEnter={() => setHover(iso)}
                    style={{
                      height: 32, borderRadius: 8,
                      background: (isFrom || isTo)
                        ? "linear-gradient(135deg, #5fd9cd, #2ec4b6)"
                        : (inRange || inHover) ? "rgba(46,196,182,0.14)" : "transparent",
                      color: (isFrom || isTo) ? "#042620" : (inRange || inHover) ? "#6fe0d4" : "#cbd5e1",
                      border: isToday && !isFrom && !isTo ? "1px solid rgba(46,196,182,0.4)" : "1px solid transparent",
                      fontSize: 12, fontWeight: (isFrom || isTo) ? 700 : 500,
                      fontFamily: "inherit", cursor: "pointer", transition: "all .15s",
                    }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
