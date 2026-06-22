"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Method = "card" | "other";
type StepNum = 1 | 2 | 3;
type FreqKey = "monthly" | "quarter" | "annual";
type StepState = "active" | "done" | "pending";

interface BillingData {
  cpf: string; cep: string; rua: string; num: string;
  bairro: string; cidade: string; uf: string;
}

interface FreqPlan {
  label: string; sub: string; price: number; perMonth: number;
  save: string | null; cycleLabel: string; freqWord: string; renewWord: string;
}

// ─── Brand / payment logos ────────────────────────────────────────────────────

const VisaMark = () => (
  <svg width="36" height="14" viewBox="0 0 48 16" aria-label="Visa">
    <rect width="48" height="16" rx="2" fill="rgba(255,255,255,0.06)" />
    <text x="24" y="11.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900"
      fontSize="9" fill="#f1f5f9" letterSpacing="0.5">VISA</text>
  </svg>
);
const MastercardMark = () => (
  <svg width="36" height="14" viewBox="0 0 48 16" aria-label="Mastercard">
    <rect width="48" height="16" rx="2" fill="rgba(255,255,255,0.06)" />
    <circle cx="20" cy="8" r="5" fill="#eb001b" opacity="0.95" />
    <circle cx="28" cy="8" r="5" fill="#f79e1b" opacity="0.95" />
    <path d="M24 4.2a5 5 0 0 0 0 7.6 5 5 0 0 0 0-7.6Z" fill="#ff5f00" />
  </svg>
);
const EloMark = () => (
  <svg width="36" height="14" viewBox="0 0 48 16" aria-label="Elo">
    <rect width="48" height="16" rx="2" fill="rgba(255,255,255,0.06)" />
    <text x="24" y="11.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700"
      fontSize="8.5" fill="#f1f5f9" letterSpacing="0.5">ELO</text>
  </svg>
);
const MercadoPagoLogo = ({ height = 22 }: { height?: number }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 7, height,
    padding: "0 12px", borderRadius: 6, background: "#009ee3", color: "#fff",
    fontFamily: "Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
    letterSpacing: "-0.01em", lineHeight: 1, whiteSpace: "nowrap"
  } as CSSProperties}
    aria-label="Mercado Pago">
    <svg width="18" height="14" viewBox="0 0 32 22">
      <ellipse cx="16" cy="11" rx="15" ry="9.5" fill="#fff200" />
      <path d="M5 12c2-1.5 5-2 7-1 1.5.5 2.5 1.2 4 1.2s2.5-.7 4-1.2c2-.7 5-.5 7 1"
        stroke="#009ee3" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M9 10c1-.5 2-.5 3 0M20 10c1-.5 2-.5 3 0"
        stroke="#009ee3" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
    Mercado&nbsp;Pago
  </span>
);
const BoletoMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Boleto">
    <rect x="3" y="6" width="1.6" height="12" fill="currentColor" />
    <rect x="5.6" y="6" width="0.8" height="12" fill="currentColor" />
    <rect x="7.4" y="6" width="2" height="12" fill="currentColor" />
    <rect x="10.4" y="6" width="0.8" height="12" fill="currentColor" />
    <rect x="12.2" y="6" width="1.6" height="12" fill="currentColor" />
    <rect x="14.8" y="6" width="0.8" height="12" fill="currentColor" />
    <rect x="16.6" y="6" width="2" height="12" fill="currentColor" />
    <rect x="19.6" y="6" width="0.8" height="12" fill="currentColor" />
  </svg>
);
const WalletMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M16 12h3" />
    <circle cx="17.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <path d="M3 9h15" />
  </svg>
);
const PixMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Pix">
    <g fill="none" stroke="#32bcad" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 22 L4 16 9 10" /><path d="M23 10 L28 16 23 22" />
      <path d="M11 6 L16 11 21 6" /><path d="M11 26 L16 21 21 26" />
    </g>
    <circle cx="16" cy="16" r="2.4" fill="#32bcad" />
  </svg>
);

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconLock = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const IconArrowLeft = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const IconCheck = ({ size = 14, color, strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconBarChart = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconSparkles = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M19 2l.8 2.2 2.2.8-2.2.8L19 8l-.8-2.2L16 5l2.2-.8z" />
    <path d="M5 17l.4 1.2 1.2.4-1.2.4L5 20l-.4-1.2L3.4 18l1.2-.4z" />
  </svg>
);
const IconFilter = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const IconCheckCircle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatCpf = (s: string) => {
  const d = s.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};
const formatCep = (s: string) => { const d = s.replace(/\D/g, "").slice(0, 8); return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`; };

// ─── Styles ───────────────────────────────────────────────────────────────────

const sy = {
  shell: { minHeight: "100vh", color: "#f1f5f9", fontFamily: "var(--lumii-font-sans)", paddingBottom: 80 } as CSSProperties,
  topBar: {
    height: 72, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,3,26,0.6)",
    backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50
  } as CSSProperties,
  brand: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" } as CSSProperties,
  brandMark: {
    width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#8a74e0,#6247c7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 12px rgba(98,71,199,0.30)"
  } as CSSProperties,
  brandWord: { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#f1f5f9" } as CSSProperties,
  secure: {
    display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500,
    color: "#94a3b8", padding: "6px 12px", borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)"
  } as CSSProperties,
  page: { maxWidth: 1180, margin: "0 auto", padding: "48px 32px 0 32px" } as CSSProperties,
  titleRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 40, color: "#f1f5f9" } as CSSProperties,
  backBtn: {
    width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center",
    justifyContent: "center", color: "#cbd5e1", cursor: "pointer", fontFamily: "inherit"
  } as CSSProperties,
  title: { fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "#f1f5f9", margin: 0 } as CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, alignItems: "flex-start" } as CSSProperties,
  step: { background: "transparent", paddingBottom: 8 } as CSSProperties,
  stepHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 } as CSSProperties,
  stepNum: (state: StepState): CSSProperties => ({
    width: 26, height: 26, borderRadius: 9999, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
    background: state === "done" ? "#6247c7" : state === "active" ? "rgba(98,71,199,0.15)" : "rgba(255,255,255,0.04)",
    color: state === "done" ? "#ffffff" : state === "active" ? "#8a74e0" : "#64748b",
    border: state === "done" ? "1px solid rgba(255,255,255,0.20)"
      : state === "active" ? "1px solid rgba(98,71,199,0.40)"
        : "1px solid rgba(255,255,255,0.10)",
    boxShadow: (state === "done" || state === "active") ? "0 0 16px rgba(98,71,199,0.20)" : "none",
  }),
  stepTitle: (state: StepState): CSSProperties => ({
    fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em",
    color: state === "pending" ? "#64748b" : "#f1f5f9",
  }),
  stepEdit: {
    marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#8a74e0",
    cursor: "pointer", background: "none", border: "none", fontFamily: "inherit"
  } as CSSProperties,
  pathStack: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 } as CSSProperties,
  pathCard: (active: boolean): CSSProperties => ({
    borderRadius: 16,
    background: active ? "rgba(98,71,199,0.06)" : "rgba(255,255,255,0.03)",
    border: "1px solid " + (active ? "rgba(98,71,199,0.45)" : "rgba(255,255,255,0.08)"),
    boxShadow: active ? "0 0 0 3px rgba(98,71,199,0.10),0 12px 32px rgba(0,0,0,0.30)" : "none",
    transition: "all .2s", overflow: "hidden",
  }),
  pathHead: {
    display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
    cursor: "pointer", width: "100%", background: "transparent", border: "none",
    color: "#f1f5f9", fontFamily: "inherit", textAlign: "left"
  } as CSSProperties,
  pathRadio: (active: boolean): CSSProperties => ({
    width: 20, height: 20, borderRadius: 9999, flexShrink: 0,
    border: "2px solid " + (active ? "#6247c7" : "rgba(255,255,255,0.20)"),
    background: "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center",
  }),
  pathRadioDot: (active: boolean): CSSProperties => ({
    width: 10, height: 10, borderRadius: 9999, transition: "all .15s",
    background: active ? "#6247c7" : "transparent",
    boxShadow: active ? "0 0 8px rgba(98,71,199,0.60)" : "none",
  }),
  pathHeadInfo: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 } as CSSProperties,
  pathTitle: { fontSize: 15, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.005em" } as CSSProperties,
  pathSub: { fontSize: 12.5, color: "#94a3b8", lineHeight: 1.45 } as CSSProperties,
  pathHeadBrands: { display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 } as CSSProperties,
  pathBody: { padding: "4px 20px 22px 54px" } as CSSProperties,
  mpBand: {
    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 16,
    border: "1px solid rgba(0,158,227,0.30)",
    background: "linear-gradient(135deg,rgba(0,158,227,0.10),rgba(0,158,227,0.04))",
    marginBottom: 28, flexWrap: "wrap"
  } as CSSProperties,
  mpBandLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 } as CSSProperties,
  mpBandText: { fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 } as CSSProperties,
  mpBandStrong: { color: "#f1f5f9", fontWeight: 600 } as CSSProperties,
  mpBandTrust: {
    marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 14,
    fontSize: 11, color: "#94a3b8"
  } as CSSProperties,
  mpBandTrustItem: { display: "inline-flex", alignItems: "center", gap: 5 } as CSSProperties,
  bricksMount: {
    position: "relative", padding: 16, borderRadius: 12, background: "rgba(0,0,0,0.25)",
    border: "1px dashed rgba(0,158,227,0.30)", marginBottom: 14
  } as CSSProperties,
  bricksLabel: {
    position: "absolute", top: -9, left: 14, padding: "2px 8px", fontSize: 9.5, fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase", color: "#7dd3fc",
    background: "var(--lumii-bg)", borderRadius: 9999,
    display: "inline-flex", alignItems: "center", gap: 6
  } as CSSProperties,
  redirectPanel: {
    padding: 20, borderRadius: 12, background: "rgba(0,158,227,0.06)",
    border: "1px solid rgba(0,158,227,0.20)", display: "flex", flexDirection: "column", gap: 14
  } as CSSProperties,
  redirectMethods: { display: "flex", gap: 10, flexWrap: "wrap" } as CSSProperties,
  redirectChip: {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9999,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#cbd5e1", fontSize: 12, fontWeight: 600
  } as CSSProperties,
  redirectNote: { fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5, margin: 0 } as CSSProperties,
  fieldGroup: { display: "flex", flexDirection: "column", gap: 12 } as CSSProperties,
  fieldRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as CSSProperties,
  field: (focus: boolean, valid?: boolean): CSSProperties => ({
    position: "relative", height: 56, borderRadius: 12, background: "rgba(0,0,0,0.30)",
    border: "1px solid " + (focus ? "rgba(98,71,199,0.45)" : valid === false ? "rgba(248,113,113,0.40)" : "rgba(255,255,255,0.10)"),
    transition: "border-color .15s, box-shadow .15s",
    boxShadow: focus ? "0 0 0 3px rgba(98,71,199,0.10)" : "none",
  }),
  fieldLabel: (lifted: boolean): CSSProperties => ({
    position: "absolute", left: 16, top: lifted ? 8 : "50%",
    transform: lifted ? "none" : "translateY(-50%)",
    fontSize: lifted ? 10 : 13, fontWeight: lifted ? 700 : 500,
    color: lifted ? "#64748b" : "#94a3b8",
    letterSpacing: lifted ? "0.10em" : undefined,
    textTransform: lifted ? "uppercase" : "none",
    pointerEvents: "none", transition: "all .15s ease",
  }),
  inputStyle: (lifted: boolean): CSSProperties => ({
    width: "100%", height: "100%", boxSizing: "border-box",
    background: "transparent", border: "none", outline: "none",
    padding: lifted ? "20px 16px 6px 16px" : "0 16px",
    color: "#f1f5f9", fontFamily: "inherit", fontSize: 14, fontWeight: 500, letterSpacing: 0.2,
  }),
  fieldEnd: {
    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
    display: "flex", alignItems: "center", gap: 6, pointerEvents: "none"
  } as CSSProperties,
  primaryBtn: (enabled: boolean): CSSProperties => ({
    height: 52, width: "100%", marginTop: 20, borderRadius: 12,
    background: enabled ? "linear-gradient(135deg,#8a74e0,#6247c7)" : "rgba(255,255,255,0.05)",
    border: "none", color: enabled ? "#ffffff" : "#475569",
    fontSize: 15, fontWeight: 700, fontFamily: "inherit",
    cursor: enabled ? "pointer" : "not-allowed", transition: "all .18s",
    boxShadow: enabled ? "0 8px 24px rgba(98,71,199,0.25),inset 0 1px 0 rgba(255,255,255,0.30)" : "none",
    letterSpacing: "-0.005em",
  }),
  freqGroup: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: 4, borderRadius: 12,
    background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 18
  } as CSSProperties,
  freqOption: (active: boolean): CSSProperties => ({
    position: "relative", padding: "10px 8px 8px", borderRadius: 9, fontFamily: "inherit",
    background: active ? "rgba(98,71,199,0.14)" : "transparent",
    border: active ? "1px solid rgba(98,71,199,0.40)" : "1px solid transparent",
    color: active ? "#f1f5f9" : "#94a3b8", cursor: "pointer", transition: "all .18s",
    textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  }),
  freqLabel: { fontSize: 12, fontWeight: 700, letterSpacing: "-0.005em" } as CSSProperties,
  freqSave: (active: boolean): CSSProperties => ({ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: active ? "#8a74e0" : "#64748b" }),
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "32px 0" } as CSSProperties,
  step2Body: { display: "flex", flexDirection: "column", gap: 16, paddingLeft: 38 } as CSSProperties,
  summary: {
    position: "sticky", top: 96, borderRadius: 20, border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)", padding: 28,
    backdropFilter: "blur(20px)", boxShadow: "0 20px 50px rgba(0,0,0,0.40)"
  } as CSSProperties,
  summaryPlan: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.015em", color: "#f1f5f9", margin: "0 0 4px 0" } as CSSProperties,
  summaryPlanSub: { fontSize: 12, color: "#64748b", marginBottom: 22 } as CSSProperties,
  summaryFeats: {
    fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.16em",
    textTransform: "uppercase", marginBottom: 14
  } as CSSProperties,
  featRow: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 } as CSSProperties,
  featIcon: {
    flexShrink: 0, width: 28, height: 28, borderRadius: 9, background: "rgba(98,71,199,0.10)",
    border: "1px solid rgba(98,71,199,0.20)", display: "flex", alignItems: "center",
    justifyContent: "center", color: "#8a74e0", marginTop: 1
  } as CSSProperties,
  featText: { fontSize: 13.5, lineHeight: 1.5, color: "#e2e8f0", margin: 0 } as CSSProperties,
  divLight: { height: 1, background: "rgba(255,255,255,0.08)", margin: "20px 0" } as CSSProperties,
  lineRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, fontSize: 13.5, color: "#cbd5e1" } as CSSProperties,
  lineRowTotal: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16, marginBottom: 20 } as CSSProperties,
  lineLabelBig: { fontSize: 15, fontWeight: 700, color: "#f1f5f9" } as CSSProperties,
  lineValueBig: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" } as CSSProperties,
  footerTerms: { maxWidth: 380, marginLeft: "auto", marginTop: 24, fontSize: 11.5, lineHeight: 1.55, color: "#64748b" } as CSSProperties,
  footerLink: { color: "#94a3b8", textDecoration: "underline", textDecorationColor: "rgba(148,163,184,0.30)", cursor: "pointer" } as CSSProperties,
  mpTrustFooter: {
    marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(0,158,227,0.06)",
    border: "1px solid rgba(0,158,227,0.20)", display: "flex", flexDirection: "column", gap: 8
  } as CSSProperties,
  mpTrustRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.45 } as CSSProperties,
  mpTrustIcon: { color: "#8a74e0", display: "inline-flex", flexShrink: 0 } as CSSProperties,
  successCard: {
    padding: 40, borderRadius: 20, border: "1px solid rgba(98,71,199,0.30)",
    background: "linear-gradient(180deg,rgba(98,71,199,0.10),rgba(255,255,255,0.02))", textAlign: "center"
  } as CSSProperties,
  successRing: {
    width: 64, height: 64, borderRadius: 9999, background: "linear-gradient(135deg,#8a74e0,#6247c7)",
    display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
    boxShadow: "0 0 30px rgba(98,71,199,0.40)"
  } as CSSProperties,
};

// ─── Frequency plans ──────────────────────────────────────────────────────────

const FREQ_PLANS: Record<FreqKey, FreqPlan> = {
  monthly: { label: "Mensal", sub: "", price: 9999, perMonth: 9999, save: null, cycleLabel: "Mensal", freqWord: "mês", renewWord: "mensal" },
  quarter: { label: "Trimestral", sub: "−10%", price: 26997, perMonth: 8999, save: "Economize R$ 10,00/mês", cycleLabel: "Trimestral", freqWord: "trimestre", renewWord: "trimestral" },
  annual: { label: "Anual", sub: "−20%", price: 95990, perMonth: 7999, save: "Economize R$ 240,00/ano", cycleLabel: "Anual", freqWord: "ano", renewWord: "anual" },
};

const fmtBRL = (cents: number) => "R$ " + (cents / 100).toFixed(2).replace(".", ",");

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, value, onChange, format, type = "text", inputMode, right, valid }: {
  label: string; value: string; onChange: (v: string) => void;
  format?: (v: string) => string; type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  right?: ReactNode; valid?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const lifted = focus || !!value;
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => onChange(format ? format(e.target.value) : e.target.value);
  return (
    <div style={sy.field(focus, valid)}>
      <label style={sy.fieldLabel(lifted)}>{label}</label>
      <input type={type} inputMode={inputMode} value={value}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onChange={handle} style={sy.inputStyle(lifted)} />
      {right && <span style={sy.fieldEnd}>{right}</span>}
    </div>
  );
}

// ─── Frequency picker ─────────────────────────────────────────────────────────

function FrequencyPicker({ value, onChange }: { value: FreqKey; onChange: (k: FreqKey) => void }) {
  return (
    <div style={sy.freqGroup}>
      {(Object.entries(FREQ_PLANS) as [FreqKey, FreqPlan][]).map(([k, p]) => {
        const active = value === k;
        return (
          <button key={k} type="button" style={sy.freqOption(active)} onClick={() => onChange(k)}>
            <span style={sy.freqLabel}>{p.label}</span>
            <span style={sy.freqSave(active)}>{p.sub || " "}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Order Summary ────────────────────────────────────────────────────────────

function OrderSummary({ frequency, setFrequency }: {
  frequency: FreqKey;
  setFrequency: (k: FreqKey) => void;
}) {
  const plan = FREQ_PLANS[frequency];
  const features = [
    { icon: <IconBarChart size={14} />, text: "Comparação de preços ilimitada" },
    { icon: <IconSparkles size={14} />, text: "Acesso completo à Lumii-IA e suas recomendações" },
    { icon: <IconFilter size={14} />, text: "Filtros temáticos personalizáveis" },
    { icon: <IconCheckCircle size={14} />, text: "Status competitivo a cada cotação" },
  ];

  return (
    <aside style={sy.summary} className="lumii-pay-summary">
      <h2 style={sy.summaryPlan}>Plano Lumii · Acesso Completo</h2>
      <div style={sy.summaryPlanSub}>Assinatura recorrente · cancele quando quiser</div>
      <FrequencyPicker value={frequency} onChange={setFrequency} />
      <div style={sy.summaryFeats}>Principais recursos</div>
      {features.map((f, i) => (
        <div key={i} style={sy.featRow}>
          <span style={sy.featIcon}>{f.icon}</span>
          <p style={sy.featText}>{f.text}</p>
        </div>
      ))}
      <div style={sy.divLight} />
      <div style={sy.lineRow}>
        <span>{plan.cycleLabel} ({fmtBRL(plan.perMonth)}/mês)</span>
        <span style={{ fontFamily: "var(--lumii-font-mono)" }}>{fmtBRL(plan.price)}</span>
      </div>
      {plan.save && (
        <div style={sy.lineRow}>
          <span>Desconto do plano</span>
          <span style={{ fontFamily: "var(--lumii-font-mono)", color: "#8a74e0" }}>{plan.save}</span>
        </div>
      )}
      <div style={sy.lineRow}>
        <span>Impostos (0%)</span>
        <span style={{ fontFamily: "var(--lumii-font-mono)" }}>R$ 0,00</span>
      </div>
      <div style={sy.lineRowTotal}>
        <span style={sy.lineLabelBig}>A pagar hoje</span>
        <span style={sy.lineValueBig}>{fmtBRL(plan.price)}</span>
      </div>
      <div style={sy.mpTrustFooter}>
        <div style={sy.mpTrustRow}>
          <span style={sy.mpTrustIcon}><IconLock size={12} /></span>
          <span>Cobranças processadas e armazenadas com segurança pela <strong style={{ color: "#f1f5f9" }}>Mercado Pago</strong>.</span>
        </div>
        <div style={sy.mpTrustRow}>
          <span style={sy.mpTrustIcon}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </span>
          <span>Tentativas automáticas se a próxima cobrança falhar — sem prejuízo ao seu acesso.</span>
        </div>
      </div>
      <p style={sy.footerTerms}>
        Renovação {plan.renewWord} de {fmtBRL(plan.price)} até cancelar.{" "}
        <span style={sy.footerLink}>Cancele quando quiser</span> em Configurações.
        Ao assinar, você concorda com os <span style={sy.footerLink}>Termos</span>, a{" "}
        <span style={sy.footerLink}>Política de privacidade</span> e autoriza a Lumii e a Mercado Pago
        a armazenar e cobrar sua forma de pagamento.
      </p>
    </aside>
  );
}

// ─── Unified payment panel (cartão + Pix + Boleto + Saldo no mesmo checkout) ──

function UnifiedPaymentPanel({ frequency }: { frequency: FreqKey }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordOk = password.length >= 6;
  const valid = emailOk && passwordOk && !busy;

  const submit = async () => {
    if (!valid) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/pagamento/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, frequency, method: "other" }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data?.detail || "Falha ao iniciar o pagamento.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setBusy(false);
    }
  };

  return (
    <div style={sy.redirectPanel}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MercadoPagoLogo height={24} />
        <span style={{ fontSize: 12.5, color: "#cbd5e1", fontWeight: 600 }}>Checkout Mercado Pago</span>
      </div>
      <div style={sy.redirectMethods}>
        <span style={sy.redirectChip}><VisaMark /></span>
        <span style={sy.redirectChip}><MastercardMark /></span>
        <span style={sy.redirectChip}><EloMark /></span>
        <span style={sy.redirectChip}><PixMark size={14} /> Pix</span>
        <span style={sy.redirectChip}>
          <span style={{ color: "#cbd5e1", display: "flex" }}><BoletoMark size={14} /></span> Boleto
        </span>
        <span style={sy.redirectChip}>
          <span style={{ color: "#cbd5e1", display: "flex" }}><WalletMark size={14} /></span> Saldo
        </span>
      </div>
      <p style={sy.redirectNote}>
        Você será redirecionado para o ambiente seguro do Mercado Pago, onde poderá pagar com
        cartão, Pix, boleto ou saldo. Após a confirmação, retornaremos automaticamente à Lumii
        para finalizar o cadastro da sua assinatura.
      </p>
      <p style={{ ...sy.redirectNote, fontSize: 11.5, color: "#64748b" }}>
        <strong style={{ color: "#94a3b8" }}>Observação:</strong> a cobrança é única, referente
        ao ciclo selecionado.
      </p>
      <div style={{ ...sy.fieldGroup, marginTop: 4 }}>
        <Field label="E-mail" value={email} onChange={setEmail} type="email" inputMode="email" />
        <Field label="Crie uma senha (mín. 6 caracteres)" value={password} onChange={setPassword} type="password" valid={password.length === 0 || passwordOk} />
        <div style={{ fontSize: 11, color: "#64748b", paddingLeft: 4 }}>
          Sua conta Lumii é criada com este e-mail e senha e liberada após a confirmação do pagamento.
        </div>
      </div>
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.30)",
          color: "#fca5a5", fontSize: 12.5, lineHeight: 1.5
        }}>
          {error}
        </div>
      )}
      <button type="button" onClick={submit} disabled={!valid}
        style={{
          ...sy.primaryBtn(valid), marginTop: 0,
          background: valid ? "#009ee3" : "rgba(255,255,255,0.05)",
          boxShadow: valid
            ? "0 8px 24px rgba(0,158,227,0.30),inset 0 1px 0 rgba(255,255,255,0.30)"
            : "none",
          color: valid ? "#ffffff" : "#475569"
        }}>
        {busy ? "Redirecionando…" : "Continuar para Mercado Pago"}
        {!busy && (
          <span style={{ marginLeft: 8, display: "inline-flex", verticalAlign: "middle" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7" /><polyline points="8 7 17 7 17 16" />
            </svg>
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Billing form ─────────────────────────────────────────────────────────────

function BillingForm({ billing, setBilling }: {
  billing: BillingData; setBilling: (b: BillingData) => void;
}) {
  const set = (k: keyof BillingData) => (v: string) => setBilling({ ...billing, [k]: v });
  return (
    <div style={sy.step2Body} className="lumii-pay-step2body">
      <div style={sy.fieldRow} className="lumii-pay-fieldrow">
        <Field label="CPF" value={billing.cpf} onChange={set("cpf")} format={formatCpf} inputMode="numeric" />
        <Field label="CEP" value={billing.cep} onChange={set("cep")} format={formatCep} inputMode="numeric" />
      </div>
      <div style={{ ...sy.fieldRow, gridTemplateColumns: "2fr 1fr" }} className="lumii-pay-fieldrow">
        <Field label="Rua / Avenida" value={billing.rua} onChange={set("rua")} />
        <Field label="Número" value={billing.num} onChange={set("num")} inputMode="numeric" />
      </div>
      <div style={{ ...sy.fieldRow, gridTemplateColumns: "1.4fr 2fr 1fr" }} className="lumii-pay-fieldrow">
        <Field label="Bairro" value={billing.bairro} onChange={set("bairro")} />
        <Field label="Cidade" value={billing.cidade} onChange={set("cidade")} />
        <Field label="UF" value={billing.uf}
          onChange={(v) => setBilling({ ...billing, uf: v.toUpperCase().slice(0, 2) })} />
      </div>
    </div>
  );
}

// ─── Payment success ──────────────────────────────────────────────────────────

function PaymentSuccess({ method, mpId, mpStatus }: {
  method: Method; mpId?: string | null; mpStatus?: string | null;
}) {
  const router = useRouter();
  return (
    <div style={sy.successCard}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={sy.successRing}><IconCheck size={28} color="#ffffff" strokeWidth={3} /></div>
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#f1f5f9", margin: "0 0 10px 0" }}>
        Pagamento confirmado.
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#94a3b8", maxWidth: 480, margin: "0 auto 28px auto" }}>
        Sua assinatura do <strong style={{ color: "#f1f5f9" }}>Plano Lumii · Acesso Completo</strong> está ativa.
        Você receberá o recibo da Mercado Pago por e-mail.{" "}
        {method === "other"
          ? "O pagamento via Mercado Pago foi confirmado."
          : "Próxima cobrança recorrente conforme o ciclo selecionado."}
      </p>
      {mpId && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 9999,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
          fontFamily: "var(--lumii-font-mono)", fontSize: 12, color: "#94a3b8", marginBottom: 24
        }}>
          <span style={{ color: "#64748b" }}>{method === "card" ? "ID assinatura" : "ID pagamento"}:</span>
          <span style={{ color: "#e2e8f0" }}>{mpId}</span>
          {mpStatus && <span style={{ color: "#6ee7b7" }}>· {mpStatus}</span>}
        </div>
      )}
      <div>
        <button type="button" onClick={() => router.push("/")}
          style={{
            ...sy.primaryBtn(true), width: "auto", padding: "0 32px", marginTop: 0,
            display: "inline-flex", alignItems: "center", gap: 8
          }}>
          Entrar no painel <IconArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function PagamentoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parâmetros de retorno do MP (lidos uma vez na renderização):
  //   - Checkout Pro (Pix/Boleto/Saldo) → `payment_id` (ou `collection_id`)
  //   - Assinaturas (checkout de preapproval) → `preapproval_id`
  const returnPaymentId = searchParams.get("payment_id") ?? searchParams.get("collection_id");
  const returnSubId = searchParams.get("preapproval_id");
  const returnStatus = searchParams.get("status") ?? searchParams.get("collection_status");
  const returningFromMp = !!(returnPaymentId || returnSubId);

  // Fluxo único de Checkout Pro (pagamento). `card` só aparece no retorno de um
  // preapproval legado, preservado para a tela de sucesso.
  const [method] = useState<Method>(returnSubId ? "card" : "other");
  const [step, setStep] = useState<StepNum>(returningFromMp ? 3 : 1);
  const [billing, setBilling] = useState<BillingData>({ cpf: "", cep: "", rua: "", num: "", bairro: "", cidade: "", uf: "" });
  const [frequency, setFrequency] = useState<FreqKey>("monthly");
  const [subscriptionId] = useState<string | null>(returnSubId);
  const [paymentId] = useState<string | null>(returnPaymentId);
  const [mpStatus, setMpStatus] = useState<string | null>(returnStatus);

  // No retorno do MP, confirma o status real via API (a fonte de verdade do
  // acesso é o webhook; isto é só para a tela de sucesso).
  useEffect(() => {
    if (returnSubId) {
      fetch(`/api/pagamento/status?type=preapproval&id=${encodeURIComponent(returnSubId)}`)
        .then(r => r.json())
        .then(d => { if (d?.status) setMpStatus(String(d.status)); })
        .catch(() => { /* ignore */ });
    } else if (returnPaymentId) {
      fetch(`/api/pagamento/status?type=payment&id=${encodeURIComponent(returnPaymentId)}`)
        .then(r => r.json())
        .then(d => { if (d?.status) setMpStatus(String(d.status)); })
        .catch(() => { /* ignore */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={sy.shell} data-screen-label="Pagamento Lumii v3">
      {/* Top bar */}
      <header style={sy.topBar}>
        <Link href="/" style={sy.brand}>
          <span style={sy.brandMark}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4v15h10" /><circle cx="17" cy="7" r="1.8" fill="#fff" stroke="none" />
            </svg>
          </span>
          <span style={sy.brandWord}>lumii</span>
        </Link>
        <div style={sy.secure}>
          <span style={{ color: "#8a74e0", display: "flex" }}><IconLock size={12} /></span>
          Pagamento seguro · SSL 256 bits
        </div>
      </header>

      <div style={sy.page} className="lumii-pay-page">
        {/* Title row */}
        <div style={sy.titleRow}>
          <button type="button" style={sy.backBtn} aria-label="Voltar" onClick={() => router.back()}>
            <IconArrowLeft size={18} />
          </button>
          <h1 style={sy.title}>Configure o seu plano</h1>
        </div>

        <div style={sy.grid} className="lumii-pay-grid">
          {/* Left column */}
          <div style={{ minWidth: 0 }} className="lumii-pay-left">
            {step === 3 ? (
              <PaymentSuccess method={method} mpId={subscriptionId ?? paymentId} mpStatus={mpStatus} />
            ) : (
              <>
                {/* MP band */}
                <div style={sy.mpBand} className="lumii-pay-mpband">
                  <div style={sy.mpBandLeft}>
                    <MercadoPagoLogo height={26} />
                    <div style={sy.mpBandText}>
                      <span style={sy.mpBandStrong}>
                        Pagamentos e cobranças recorrentes processados pela Mercado Pago.
                      </span>{" "}
                      Seus dados ficam armazenados de forma criptografada — a Lumii nunca os vê.
                    </div>
                  </div>
                  <div style={sy.mpBandTrust} className="lumii-pay-mpband-trust">
                    <span style={sy.mpBandTrustItem}>
                      <span style={{ color: "#8a74e0", display: "flex" }}><IconLock size={12} /></span> PCI DSS
                    </span>
                    <span style={sy.mpBandTrustItem}>
                      <span style={{ color: "#8a74e0", display: "flex" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </span> Antifraude
                    </span>
                  </div>
                </div>

                {/* Step 1 — billing address */}
                <div style={sy.step}>
                  <div style={sy.stepHeader}>
                    <span style={sy.stepNum(step >= 2 ? "active" : "pending")}>1</span>
                    <span style={sy.stepTitle(step >= 2 ? "active" : "pending")}>Endereço de cobrança</span>
                  </div>
                  {step >= 2 && <BillingForm billing={billing} setBilling={setBilling} />}
                </div>

                <div style={sy.divider} />

                {/* Step 2 — payment method */}
                <div style={sy.step}>
                  <div style={sy.stepHeader}>
                    <span style={sy.stepNum(step > 1 ? "done" : "active")}>
                      {step > 1 ? <IconCheck size={13} strokeWidth={3} /> : "2"}
                    </span>
                    <span style={sy.stepTitle(step > 1 ? "done" : "active")}>Forma de pagamento</span>
                    {step > 1 && (
                      <button type="button" style={sy.stepEdit} onClick={() => setStep(1)}>Editar</button>
                    )}
                  </div>

                  {step === 1 && (
                    <div style={sy.pathStack}>
                      <UnifiedPaymentPanel frequency={frequency} />
                    </div>
                  )}

                  {step > 1 && (
                    <div style={{ paddingLeft: 38, color: "#94a3b8", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#6247c7", display: "flex" }}>
                        <MercadoPagoLogo height={18} />
                      </span>
                      Pagamento via Mercado Pago (cartão / Pix / Boleto / Saldo)
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right column — order summary */}
          <OrderSummary
            frequency={frequency}
            setFrequency={setFrequency}
          />
        </div>
      </div>
    </div>
  );
}

export default function PagamentoPage() {
  return (
    <Suspense fallback={<div style={sy.shell} />}>
      <PagamentoInner />
    </Suspense>
  );
}
