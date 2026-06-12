import type { CSSProperties } from "react";

import { IconCart, IconMenu } from "../_lib/icons";

const styles: Record<string, CSSProperties> = {
  bar: {
    position: "sticky", top: 0, zIndex: 50,
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px",
    background: "rgba(8,3,26,0.88)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1", cursor: "pointer", fontFamily: "inherit",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  brandTitle: { fontSize: 16, fontWeight: 700, color: "#ffffff", lineHeight: 1 },
  brandScreen: { fontSize: 11, fontWeight: 600, color: "#6fe0d4", marginTop: 2 },
  cartBtn: {
    position: "relative",
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #ffe566 0%, #f5d030 100%)",
    border: "1px solid rgba(245,208,48,0.45)",
    color: "#0c0525", cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 6px 16px rgba(245,208,48,0.30), inset 0 1px 0 rgba(255,255,255,0.35)",
  },
  cartBadge: {
    position: "absolute", top: -6, right: -6,
    minWidth: 20, height: 20, padding: "0 5px", borderRadius: 9999,
    background: "#150838", border: "1px solid rgba(46,196,182,0.5)",
    color: "#6fe0d4", fontSize: 11, fontWeight: 800,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
};

export const mobileScrimStyles: { scrim: CSSProperties; scrimOpen: CSSProperties } = {
  scrim: {
    position: "fixed", inset: 0, zIndex: 70,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
    opacity: 0, pointerEvents: "none", transition: "opacity .25s",
  },
  scrimOpen: { opacity: 1, pointerEvents: "auto" },
};

export function MobileTopBar({
  screenLabel,
  onMenu,
  onCart,
  cartCount,
  showCart,
}: {
  screenLabel: string;
  onMenu: () => void;
  onCart: () => void;
  cartCount: number;
  showCart: boolean;
}) {
  return (
    <div style={styles.bar}>
      <button type="button" style={styles.menuBtn} onClick={onMenu} aria-label="Abrir menu">
        <IconMenu size={18} />
      </button>
      <div style={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lumii-icon.png" alt="" width={28} height={28} style={{ borderRadius: 8 }} />
        <div style={{ minWidth: 0 }}>
          <div style={styles.brandTitle}>Lumii</div>
          <div style={styles.brandScreen}>{screenLabel}</div>
        </div>
      </div>
      {showCart && (
        <button type="button" style={styles.cartBtn} onClick={onCart} aria-label="Itens selecionados">
          <IconCart size={18} />
          {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
        </button>
      )}
    </div>
  );
}
