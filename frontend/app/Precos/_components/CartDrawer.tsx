import { useState, type CSSProperties } from "react";
import { exportRowsToXlsx } from "@/lib/export";

import { IconCart, IconCheck, IconDownload, IconSend, IconSparkles, IconTrash, IconX } from "../_lib/icons";
import { fmtBRL } from "../_lib/overview";
import type { CartItem } from "../_lib/types";
import { Thumb } from "../_lib/produceArt";

const s = {
  scrim: {
    position: "fixed", inset: 0, zIndex: 60,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
    opacity: 0, pointerEvents: "none", transition: "opacity .25s",
  } as CSSProperties,
  scrimOpen: { opacity: 1, pointerEvents: "auto" } as CSSProperties,
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 61,
    width: 420, maxWidth: "100vw",
    background: "rgba(12,5,37,0.97)",
    borderLeft: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "-30px 0 60px rgba(0,0,0,0.60)",
    backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
    transform: "translateX(100%)",
    transition: "transform .3s cubic-bezier(0.4,0,0.2,1)",
    display: "flex", flexDirection: "column",
  } as CSSProperties,
  drawerOpen: { transform: "translateX(0)" } as CSSProperties,
  head: {
    padding: "20px 22px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  } as CSSProperties,
  headTitle: { fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" } as CSSProperties,
  headSub: { fontSize: 12, color: "#94a3b8", marginTop: 4 } as CSSProperties,
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1", cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
  } as CSSProperties,
  list: { flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 } as CSSProperties,
  row: {
    display: "flex", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)",
  } as CSSProperties,
  rowName: { fontSize: 13, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.2 } as CSSProperties,
  rowMeta: { fontSize: 11, color: "#64748b", marginTop: 2 } as CSSProperties,
  rowPrice: { fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.005em" } as CSSProperties,
  rowMarket: { fontSize: 10, fontWeight: 700, color: "#6fe0d4", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 } as CSSProperties,
  empty: {
    flex: 1, display: "flex", flexDirection: "column", gap: 12,
    alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center",
  } as CSSProperties,
  emptyChip: {
    width: 64, height: 64, borderRadius: 18,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#475569", marginBottom: 4,
  } as CSSProperties,
  summary: {
    padding: "12px 22px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex", flexDirection: "column", gap: 8,
  } as CSSProperties,
  summaryRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" } as CSSProperties,
  summaryStrong: { color: "#f1f5f9", fontWeight: 700, fontSize: 14 } as CSSProperties,
  footer: { padding: 18, borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(7,4,26,0.55)" } as CSSProperties,
  sendBtn: {
    width: "100%", padding: "16px 20px", borderRadius: 16,
    border: "1px solid rgba(245,208,48,0.45)",
    background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)",
    color: "#0c0525", fontWeight: 800, fontSize: 14, letterSpacing: "0.02em",
    fontFamily: "inherit", cursor: "pointer",
    boxShadow: "0 12px 30px rgba(245,208,48,0.30), inset 0 1px 0 rgba(255,255,255,0.4)",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all .2s",
  } as CSSProperties,
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 80,
    padding: "14px 18px", borderRadius: 14,
    background: "linear-gradient(135deg, rgba(46,196,182,0.20), rgba(46,196,182,0.12))",
    border: "1px solid rgba(46,196,182,0.40)",
    color: "#6fe0d4", fontWeight: 600, fontSize: 13,
    boxShadow: "0 20px 40px rgba(0,0,0,0.40), 0 0 24px rgba(46,196,182,0.20)",
    backdropFilter: "blur(18px)",
    display: "flex", alignItems: "center", gap: 10,
    transform: "translateY(20px)", opacity: 0, transition: "all .3s", maxWidth: 360,
  } as CSSProperties,
  toastVisible: { transform: "translateY(0)", opacity: 1 } as CSSProperties,
};

export function CartDrawer({
  open,
  onClose,
  items,
  setItems,
  marketsCount,
  onSendToLumii,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  marketsCount: number;
  onSendToLumii: (items: CartItem[]) => void;
}) {
  const [sent, setSent] = useState(false);
  const [exported, setExported] = useState(false);
  const [toast, setToast] = useState(false);

  const total = items.reduce((acc, it) => acc + (it.price ?? 0), 0);
  const avg = items.length ? total / items.length : 0;

  const remove = (id: string) => setItems((cur) => cur.filter((c) => c.id !== id));

  const send = () => {
    if (items.length === 0) return;
    setSent(true);
    setToast(true);
    onSendToLumii(items);
    setTimeout(() => setSent(false), 1100);
    setTimeout(() => setToast(false), 3200);
  };

  const exportXlsx = async () => {
    if (items.length === 0) return;
    await exportRowsToXlsx(
      items.map((it) => ({
        Produto: it.produto,
        Categoria: it.categoria,
        Unidade: it.unidade,
        "Menor preço": it.price,
        "Melhor concorrente": it.market ?? "—",
      })),
      "Cesta",
      "cesta-lumii.xlsx",
    );
    setExported(true);
    setTimeout(() => setExported(false), 1400);
  };

  return (
    <>
      <div style={{ ...s.scrim, ...(open ? s.scrimOpen : {}) }} onClick={onClose} />
      <aside data-r-drawer style={{ ...s.drawer, ...(open ? s.drawerOpen : {}) }}>
        <div style={s.head}>
          <div>
            <div style={s.headTitle}>Itens selecionados</div>
            <div style={s.headSub}>
              {items.length === 0
                ? "Nenhum item adicionado."
                : `${items.length} ${items.length === 1 ? "produto pronto" : "produtos prontos"} para análise.`}
            </div>
          </div>
          <button type="button" onClick={onClose} style={s.iconBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#ffffff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#cbd5e1"; }}
          >
            <IconX size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyChip}><IconCart size={26} /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>Sua cesta está vazia.</div>
            <div style={{ fontSize: 12, color: "#64748b", maxWidth: 240 }}>
              Adicione produtos clicando no botão + dentro de cada card. Os itens aparecerão aqui prontos para enviar à Lumii.
            </div>
          </div>
        ) : (
          <div style={s.list}>
            {items.map((it) => (
              <div key={it.id} style={s.row}>
                <Thumb kind={it.art} size={56} rounded={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.rowName}>{it.produto}</div>
                  <div style={s.rowMeta}>{it.categoria} · por {it.unidade}</div>
                  {it.market && <div style={s.rowMarket}>Melhor: {it.market}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={s.rowPrice}>{fmtBRL(it.price)}</span>
                  <button type="button" onClick={() => remove(it.id)} style={{ ...s.iconBtn, width: 28, height: 28 }} title="Remover"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.10)"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.30)"; e.currentTarget.style.color = "#fca5a5"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#cbd5e1"; }}
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div style={s.summary}>
            <div style={s.summaryRow}><span>Total da cesta</span><span style={s.summaryStrong}>{fmtBRL(total)}</span></div>
            <div style={s.summaryRow}><span>Preço médio</span><span style={s.summaryStrong}>{fmtBRL(avg)}</span></div>
            <div style={s.summaryRow}><span>Concorrentes monitorados</span><span style={s.summaryStrong}>{marketsCount}</span></div>
          </div>
        )}

        <div style={s.footer}>
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <button type="button" onClick={exportXlsx} disabled={items.length === 0} title="Exportar cesta como planilha"
              style={{
                flex: "0 0 auto", padding: "16px 18px", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: exported ? "rgba(46,196,182,0.10)" : "rgba(255,255,255,0.04)",
                color: exported ? "#6fe0d4" : "#cbd5e1",
                fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                cursor: items.length === 0 ? "not-allowed" : "pointer",
                opacity: items.length === 0 ? 0.5 : 1,
                display: "inline-flex", alignItems: "center", gap: 8, transition: "all .2s",
              }}
            >
              {exported ? <IconCheck size={14} /> : <IconDownload size={14} />}
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1, gap: 2 }}>
                <span>{exported ? "Exportado" : "Exportar"}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: exported ? "#5fd9cd" : "#64748b", textTransform: "uppercase" }}>.xlsx</span>
              </span>
            </button>

            <button type="button" onClick={send} disabled={items.length === 0}
              style={{ ...s.sendBtn, flex: 1, opacity: items.length === 0 ? 0.5 : 1, cursor: items.length === 0 ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (items.length > 0) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {sent ? <IconCheck size={16} /> : <IconSend size={16} />}
              {sent ? "Enviado à Lumii" : "Enviar para Lumii"}
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#64748b", textAlign: "center" }}>
            A Lumii analisará os preços e responderá com recomendações.
          </div>
        </div>
      </aside>

      <div style={{ ...s.toast, ...(toast ? s.toastVisible : {}) }}>
        <IconSparkles size={16} />
        <div>
          <div style={{ fontWeight: 700 }}>Cesta enviada à Lumii.</div>
          <div style={{ color: "#94a3b8", fontWeight: 500, fontSize: 12, marginTop: 2 }}>
            {items.length} produtos em análise. Veja a conversa na Lumii AI.
          </div>
        </div>
      </div>
    </>
  );
}
