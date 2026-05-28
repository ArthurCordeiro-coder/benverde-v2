"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Reveal-on-scroll hook ─── */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { setShown(true); obs.unobserve(node); }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return { ref, shown };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, shown } = useReveal();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Lumii brand mark (inline SVG) ─── */
function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#lg)" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path d="M16 14 L16 33 L31 33" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="32" cy="17" r="2.6" fill="#fff" />
    </svg>
  );
}

/* ─── Navbar ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-12 py-4 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(7,13,9,0.85)" : "rgba(7,13,9,0.60)",
        backdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
      }}
    >
      <a href="#top" className="flex items-center gap-3 no-underline">
        <BrandMark size={36} />
        <span className="text-xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em" }}>lumii</span>
        <span className="ml-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Gestão Inteligente</span>
      </a>

      <div className="hidden items-center gap-1 md:flex">
        {["Lumii-IA", "Soluções", "Recursos", "Roadmap", "Preço", "Contato"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replace("-", "").replace("ç", "c").replace("ã", "a")}`}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white hover:bg-white/5"
          >
            {item}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-slate-100 transition-all hover:bg-white/6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Entrar
        </Link>
        {/* TEMPORARIAMENTE DESATIVADO — remover aria-disabled/tabIndex/style overrides para reativar */}
        <Link
          href="/login/criar-conta"
          aria-disabled="true"
          tabIndex={-1}
          title="Cadastros temporariamente pausados"
          className="flex items-center gap-1.5 rounded-xl border-none px-4 py-2 text-sm font-semibold text-[#04130b] transition-all hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)", boxShadow: "0 8px 24px rgba(16,185,129,0.30), inset 0 1px 0 rgba(255,255,255,0.30)", pointerEvents: "none", opacity: 0.5, cursor: "not-allowed" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Criar conta
        </Link>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-12 pb-14 pt-20">
      {/* Background halos */}
      <div className="pointer-events-none absolute -top-48 left-1/5 h-[700px] w-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.18), transparent 60%)", filter: "blur(30px)" }} />
      <div className="pointer-events-none absolute right-[-100px] top-32 h-[480px] w-[480px] rounded-full" style={{ background: "radial-gradient(circle, rgba(20,83,45,0.45), transparent 65%)", filter: "blur(40px)" }} />
      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)" }} />

      <div className="relative mx-auto max-w-7xl">
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-emerald-300" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)" }}>
          <span className="h-[7px] w-[7px] rounded-full bg-green-400" style={{ boxShadow: "0 0 10px #4ade80", animation: "lumii-pulse 1.8s ease-in-out infinite" }} />
          Ferramenta de preços para supermercados
        </div>

        {/* Tagline */}
        <h1
          className="mb-7 font-bold text-slate-100"
          style={{ fontSize: "clamp(44px, 5.6vw, 76px)", letterSpacing: "-0.035em", lineHeight: 0.98, maxWidth: 980 }}
        >
          Sua ferramenta de busca de preços{" "}
          <em
            style={{ background: "linear-gradient(120deg, #6ee7b7 0%, #34d399 40%, #10b981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "italic" }}
          >
            eficaz e sempre à mão.
          </em>
        </h1>

        <p className="mb-9 max-w-xl text-lg leading-relaxed text-slate-400">
          Comparação em tempo real, análise de gap e exportação para Excel — tudo em uma única tela. Feito para o setor de hortifrutigranjeiros.
        </p>

        <div className="mb-14 flex flex-wrap items-center gap-3">
          {/* TEMPORARIAMENTE DESATIVADO — remover aria-disabled/tabIndex/style overrides para reativar */}
          <Link
            href="/login/criar-conta"
            aria-disabled="true"
            tabIndex={-1}
            title="Cadastros temporariamente pausados"
            className="inline-flex items-center gap-2.5 rounded-xl border-none px-6 py-4 text-[15px] font-semibold text-[#04130b] transition-all hover:-translate-y-px hover:shadow-2xl"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)", boxShadow: "0 12px 32px rgba(16,185,129,0.30), inset 0 1px 0 rgba(255,255,255,0.30)", pointerEvents: "none", opacity: 0.5, cursor: "not-allowed" }}
          >
            Começar agora
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border px-6 py-4 text-[15px] font-semibold text-slate-100 transition-all hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.18)" }}
          >
            Já tenho conta
          </Link>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
          {[
            { value: "1", label: "Cliente satisfeito" },
            { value: "Real-time", label: "Atualização de preços" },
            { value: "1-click", label: "Exportação para Excel" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>{value}</span>
              <span className="mt-0.5 text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Dashboard preview ─── */
const competitors = ["Mercado Central", "Hortifruti Vivo", "Atacadão Bairro"];

type Row = { id: number; prod: string; cat: string; banana: boolean; meu: number; comp: (number | null)[]; best: number | null; status: "vencendo" | "perdendo" | "sem" };

const dashRows: Row[] = [
  { id: 1, prod: "Banana Prata", cat: "Frutas", banana: true, meu: 4.99, comp: [4.79, 5.29, 4.89], best: 0, status: "perdendo" },
  { id: 2, prod: "Banana Nanica", cat: "Frutas", banana: true, meu: 5.49, comp: [5.79, 5.69, 5.39], best: null, status: "vencendo" },
  { id: 3, prod: "Tomate Italiano", cat: "Legumes", banana: false, meu: 8.90, comp: [9.20, 8.99, null], best: 1, status: "vencendo" },
  { id: 4, prod: "Cebola Nacional", cat: "Legumes", banana: false, meu: 3.49, comp: [3.29, 3.39, 3.55], best: 0, status: "perdendo" },
  { id: 5, prod: "Alface Crespa", cat: "Verduras", banana: false, meu: 2.99, comp: [3.19, null, 3.09], best: null, status: "vencendo" },
];

function fmtBRL(n: number | null) {
  if (n == null) return "—";
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function DashPreview() {
  const [bananaOnly, setBananaOnly] = useState(false);
  const rows = bananaOnly ? dashRows.filter((r) => r.banana) : dashRows;
  const winning = rows.filter((r) => r.status === "vencendo").length;
  const losing = rows.filter((r) => r.status === "perdendo").length;

  return (
    <section className="relative overflow-hidden px-12 py-20" id="solucoes">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at center, rgba(16,185,129,0.08), transparent 60%)" }} />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Soluções</div>
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em" }}>
            Comparação de preços{" "}
            <span style={{ background: "linear-gradient(120deg, #6ee7b7, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              em tempo real
            </span>
          </h2>
          <p className="mb-10 max-w-xl text-base text-slate-400 leading-relaxed">
            Visualize lado a lado seus preços e os dos concorrentes. Identifique gaps, filtre por categoria, exporte em um clique.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          {/* Dashboard mock */}
          <div className="overflow-hidden rounded-2xl border" style={{ background: "rgba(8,18,13,0.85)", borderColor: "rgba(255,255,255,0.10)", boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(16,185,129,0.05)", backdropFilter: "blur(20px)" }}>
            {/* Chrome bar */}
            <div className="flex items-center gap-2.5 border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <span className="ml-3 text-xs text-slate-500 flex items-center gap-2">
                <BrandMark size={14} />
                Preços Concorrentes — Lumii
              </span>
            </div>

            <div className="flex">
              {/* Sidebar */}
              <div className="w-44 flex-shrink-0 border-r p-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
                <div className="mb-3 flex items-center gap-2 border-b pb-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <BrandMark size={24} />
                  <span className="text-sm font-bold tracking-tight text-slate-100">lumii</span>
                </div>
                {[
                  { label: "Painel Principal", active: false },
                  { label: "Preços Concorrentes", active: true },
                  { label: "Estoque", active: false },
                  { label: "Lojas", active: false },
                  { label: "Arquivos", active: false },
                ].map(({ label, active }) => (
                  <div
                    key={label}
                    className="mb-1 flex items-center rounded-[10px] px-2.5 py-2 text-[11px] font-medium"
                    style={{
                      color: active ? "#fff" : "#94a3b8",
                      background: active ? "rgba(16,185,129,0.12)" : "transparent",
                      border: active ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
                      boxShadow: active ? "0 0 20px rgba(16,185,129,0.10)" : "none",
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-5 min-w-0">
                {/* Toolbar */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold tracking-tight text-slate-100">Preços Concorrentes</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Atualizado hoje</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* KPI chips */}
                    <div className="rounded-xl border px-3 py-1.5 text-[11px] font-semibold text-emerald-300" style={{ background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.30)" }}>
                      {winning} Vencendo
                    </div>
                    <div className="rounded-xl border px-3 py-1.5 text-[11px] font-semibold text-red-300" style={{ background: "rgba(248,113,113,0.10)", borderColor: "rgba(248,113,113,0.25)" }}>
                      {losing} Perdendo
                    </div>
                    <button
                      onClick={() => setBananaOnly((v) => !v)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
                      style={{
                        background: bananaOnly ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                        border: bananaOnly ? "1px solid rgba(16,185,129,0.45)" : "1px solid rgba(255,255,255,0.12)",
                        color: bananaOnly ? "#6ee7b7" : "#94a3b8",
                      }}
                    >
                      🍌 Só Bananas
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" }}>
                        <th className="px-3 py-2.5 text-left font-bold tracking-[0.12em] text-slate-500 uppercase">Produto</th>
                        <th className="px-3 py-2.5 text-right font-bold tracking-[0.12em] text-slate-500 uppercase">Meu Preço</th>
                        {competitors.map((c) => (
                          <th key={c} className="px-3 py-2.5 text-right font-bold tracking-[0.12em] text-slate-500 uppercase hidden sm:table-cell">{c.split(" ")[0]}</th>
                        ))}
                        <th className="px-3 py-2.5 text-right font-bold tracking-[0.12em] text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={row.id}
                          className="border-b transition-colors hover:bg-white/[0.02]"
                          style={{ borderColor: i === rows.length - 1 ? "transparent" : "rgba(255,255,255,0.05)" }}
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-100">{row.prod}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-100">{fmtBRL(row.meu)}</td>
                          {row.comp.map((price, ci) => (
                            <td
                              key={ci}
                              className="px-3 py-2.5 text-right hidden sm:table-cell"
                              style={{ color: row.best === ci ? "#4ade80" : "#94a3b8", fontWeight: row.best === ci ? 600 : 400 }}
                            >
                              {fmtBRL(price)}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-right">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: row.status === "vencendo" ? "rgba(74,222,128,0.12)" : row.status === "perdendo" ? "rgba(248,113,113,0.12)" : "rgba(148,163,184,0.08)",
                                color: row.status === "vencendo" ? "#4ade80" : row.status === "perdendo" ? "#f87171" : "#94a3b8",
                                border: `1px solid ${row.status === "vencendo" ? "rgba(74,222,128,0.25)" : row.status === "perdendo" ? "rgba(248,113,113,0.25)" : "rgba(148,163,184,0.18)"}`,
                              }}
                            >
                              {row.status === "vencendo" ? "Vencendo" : row.status === "perdendo" ? "Perdendo" : "Sem cotação"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Lumii-IA section ─── */
function LumiiAI() {
  const chatMessages = [
    { role: "user" as const, text: "Como estão nossas bananas hoje?" },
    { role: "ai" as const, text: "Banana Prata está perdendo para o Mercado Central por -R$ 0,20 (−4%). Banana Nanica está vencendo todos os concorrentes. Recomendo ajustar a Prata para R$ 4,75 para recuperar margem." },
    { role: "user" as const, text: "E o tomate?" },
    { role: "ai" as const, text: "Tomate Italiano em boa posição — vencendo Hortifruti Vivo e Atacadão. Sem cotação do Mercado Central hoje. Seu preço de R$ 8,90 está competitivo." },
  ];

  return (
    <section id="lumii-ia" className="relative overflow-hidden px-12 py-28">
      <div className="pointer-events-none absolute left-[10%] top-[30%] h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(110,231,183,0.22), transparent 70%)", filter: "blur(20px)" }} />
      <div className="pointer-events-none absolute bottom-[10%] right-[5%] h-[480px] w-[480px] rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)", filter: "blur(30px)" }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgba(7,20,14,0.55) 25%, rgba(7,20,14,0.55) 75%, transparent 100%)" }}
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Ribbon */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-[11px] font-bold tracking-[0.18em] text-emerald-300 uppercase" style={{ background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.35)" }}>
          <span className="h-2 w-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 12px #4ade80", animation: "lumii-pulse 1.6s ease-in-out infinite" }} />
          Inteligência Artificial
        </div>

        {/* Headline + manifesto */}
        <Reveal>
          <div className="mb-16 grid gap-16 md:grid-cols-[1.5fr_1fr] md:items-end">
            <h2
              className="font-bold text-slate-100"
              style={{ fontSize: "clamp(56px, 7vw, 96px)", letterSpacing: "-0.045em", lineHeight: 0.92 }}
            >
              Conheça a{" "}
              <em
                style={{ display: "inline-block", background: "linear-gradient(120deg, #d1fae5 0%, #6ee7b7 35%, #10b981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "italic" }}
              >
                Lumii
              </em>
            </h2>
            <p className="text-[17px] leading-relaxed text-slate-300">
              A IA embutida que lê seus dados de preço, explica o que aconteceu no dia e sugere reações antes que você precise pedir. O coração do Lumii.
            </p>
          </div>
        </Reveal>

        <div className="grid items-stretch gap-12 md:grid-cols-[1fr_1.2fr]">
          {/* Capabilities */}
          <Reveal>
            <div>
              {[
                { title: "Análise do dia", body: "A Lumii lê todos os seus preços pela manhã e entrega um resumo operacional: quem está perdendo, por quanto, e por quê." },
                { title: "Sugestões de preço", body: "Receba recomendações baseadas em gap de mercado, frequência de compra e margem alvo — sem precisar abrir uma planilha." },
                { title: "Perguntas em linguagem natural", body: "\"Como estão nossas bananas hoje?\" — a Lumii responde com dados reais, não com relatórios genéricos." },
                { title: "Alertas proativos", body: "Quando um concorrente muda de preço em um produto crítico, a Lumii avisa antes que você note na cotação manual." },
              ].map(({ title, body }, i) => (
                <div
                  key={title}
                  className="flex gap-4 py-6"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: i === 3 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border text-emerald-300" style={{ background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.25)", boxShadow: "inset 0 0 20px rgba(16,185,129,0.10)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-[17px] font-bold leading-snug tracking-tight text-slate-100">{title}</h3>
                    <p className="m-0 text-[13px] leading-relaxed text-slate-400">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Chat preview */}
          <Reveal delay={0.1}>
            <div className="flex flex-col overflow-hidden rounded-2xl border" style={{ background: "linear-gradient(180deg, rgba(11,31,21,0.95), rgba(7,20,14,0.95))", borderColor: "rgba(255,255,255,0.10)", boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(16,185,129,0.08)", backdropFilter: "blur(20px)" }}>
              {/* Header */}
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl text-[#04130b]" style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)", boxShadow: "0 0 20px rgba(16,185,129,0.35)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4" /><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" /><path d="M9 17h6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-100">Lumii</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 6px #4ade80" }} />
                      Online agora
                    </div>
                  </div>
                </div>
                <span className="rounded-full border px-2.5 py-1 text-[9px] font-bold tracking-[0.16em] text-emerald-300 uppercase" style={{ background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.25)" }}>
                  ILumii
                </span>
              </div>

              {/* Messages */}
              <div className="flex flex-1 flex-col gap-4 p-5">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[75%] rounded-[18px] px-4 py-3 text-[13.5px] leading-relaxed"
                      style={{
                        borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: msg.role === "user" ? "rgba(255,255,255,0.06)" : "rgba(16,185,129,0.10)",
                        border: msg.role === "user" ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(16,185,129,0.20)",
                        color: msg.role === "user" ? "#e2e8f0" : "#d1fae5",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input area */}
              <div className="border-t p-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.10)" }}>
                  <span className="flex-1 text-sm text-slate-500">Perguntar sobre seus preços...</span>
                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-[#04130b]" style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Solutions grid ─── */
function Solutions() {
  const cards = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="20" x2="21" y2="20" /><rect x="6" y="11" width="3" height="9" rx="0.5" /><rect x="11" y="7" width="3" height="13" rx="0.5" /><rect x="16" y="14" width="3" height="6" rx="0.5" /></svg>,
      title: "Dashboard de Comparação",
      body: "Visão interativa dos preços cadastrados versus concorrentes, lado a lado.",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
      title: "Análise de Gap e Margem",
      body: "Cálculo automático do gap médio (%) e identificação instantânea do concorrente mais barato.",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
      title: "Filtros e Segmentação",
      body: "Busca rápida por produto, histórico por data e filtros temáticos exclusivos como o botão \"Só Bananas\".",
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
      title: "Exportação de Relatórios",
      body: "Ferramenta integrada para exportar dados da tabela diretamente para Excel (.xlsx) com um único clique.",
    },
  ];

  return (
    <section className="px-12 py-24" id="recursos">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Recursos</div>
          <h2 className="mb-14 text-4xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em", maxWidth: 680 }}>
            Tudo que você precisa para reagir ao mercado{" "}
            <span style={{ background: "linear-gradient(120deg, #6ee7b7, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              em minutos
            </span>
          </h2>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.05}>
              <div
                className="group flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:border-emerald-500/20"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.20)" }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border text-emerald-300 transition-all group-hover:shadow-emerald-500/20" style={{ background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.25)" }}>
                  {icon}
                </div>
                <h3 className="mb-2 text-base font-bold tracking-tight text-slate-100">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Key features ─── */
function KeyFeatures() {
  return (
    <section className="px-12 py-24" style={{ background: "linear-gradient(180deg, transparent, rgba(16,185,129,0.04), transparent)" }}>
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Diferenciais</div>
          <h2 className="mb-14 text-4xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em" }}>
            Construído para{" "}
            <span style={{ background: "linear-gradient(120deg, #6ee7b7, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              hortifrutigranjeiros
            </span>
          </h2>
        </Reveal>

        <div className="grid gap-8 md:grid-cols-2">
          {[
            {
              title: "Status Competitivo Visual",
              body: "Classificação automática em tempo real (Vencendo, Perdendo, Sem Cotação) que ajusta visualmente a estratégia de precificação.",
              accent: "emerald",
            },
            {
              title: "Agilidade em Produtos Perecíveis",
              body: "Interface e usabilidade focadas nos produtos de alta rotatividade e sensibilidade de preço do setor.",
              accent: "emerald",
            },
          ].map(({ title, body }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div
                className="rounded-2xl border p-7"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <h3 className="mb-3 text-xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.01em" }}>{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Roadmap ─── */
function Roadmap() {
  const steps = [
    { state: "done" as const, badge: "Disponível", title: "Preços Concorrentes", body: "O motor de cotação que originou o Lumii — em produção desde o dia 1." },
    { state: "done" as const, badge: "Disponível", title: "Lumii-IA", body: "A inteligência embutida que lê seus dados, explica o dia e sugere reações." },
    { state: "now" as const, badge: "Em construção", title: "Painel Principal", body: "KPIs do dia, metas operacionais e tabela de acompanhamento." },
    { state: "next" as const, badge: "Em breve", title: "Lumii-IA Pró", body: "Recomendações por categoria, comparações em lote e sugestões sem precisar pedir." },
    { state: "next" as const, badge: "Em breve", title: "Arquivos", body: "Integração com o Drive, busca rápida e versionamento de arquivos." },
  ];

  return (
    <section id="roadmap" className="relative overflow-hidden px-12 py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.10), transparent 70%)", filter: "blur(20px)" }} />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Em construção</div>
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em" }}>
            A próxima geração de{" "}
            <span style={{ background: "linear-gradient(120deg, #6ee7b7, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              administração para supermercados
            </span>
          </h2>
          <p className="mb-12 text-base text-slate-400" style={{ maxWidth: 560 }}>
            Cada etapa entrega valor por si só — você não precisa esperar o produto inteiro estar pronto.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative pt-8">
            {/* Rail */}
            <div
              className="absolute left-7 right-7 top-[52px] h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #34d399 0%, #10b981 25%, rgba(16,185,129,0.6) 38%, rgba(255,255,255,0.10) 42%, rgba(255,255,255,0.10) 100%)" }}
            />
            <div className="grid grid-cols-5 gap-4 relative z-10">
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-start px-1">
                  {/* Node */}
                  <div
                    className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full flex-shrink-0"
                    style={
                      step.state === "done"
                        ? { background: "linear-gradient(135deg, #34d399, #10b981)", border: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 0 24px rgba(16,185,129,0.40), inset 0 1px 0 rgba(255,255,255,0.3)", color: "#04130b" }
                        : step.state === "now"
                        ? { background: "rgba(16,185,129,0.10)", border: "2px solid #10b981", boxShadow: "0 0 24px rgba(16,185,129,0.30)", color: "#6ee7b7" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.18)", color: "#64748b" }
                    }
                  >
                    {step.state === "now" && (
                      <span className="pointer-events-none absolute inset-[-8px] rounded-full border-2 border-emerald-500/40" style={{ animation: "lumii-ring 2.2s ease-out infinite" }} />
                    )}
                    {step.state === "done" ? (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : step.state === "now" ? (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>
                    ) : (
                      <span className="text-lg font-bold" style={{ fontFamily: "var(--lumii-font-mono)" }}>{i + 1}</span>
                    )}
                  </div>

                  <div className="mb-1.5 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase" style={{ fontFamily: "var(--lumii-font-mono)" }}>
                    ETAPA {String(i + 1).padStart(2, "0")}
                  </div>
                  <span
                    className="mb-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.04em]"
                    style={
                      step.state === "done"
                        ? { color: "#4ade80", background: "rgba(74,222,128,0.10)", borderColor: "rgba(74,222,128,0.30)" }
                        : step.state === "now"
                        ? { color: "#6ee7b7", background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.30)" }
                        : { color: "#94a3b8", background: "rgba(148,163,184,0.06)", borderColor: "rgba(148,163,184,0.18)" }
                    }
                  >
                    {step.badge}
                  </span>
                  <h3 className="mb-1.5 text-base font-bold leading-tight tracking-tight text-slate-100" style={{ letterSpacing: "-0.01em" }}>{step.title}</h3>
                  <p className="m-0 text-xs leading-relaxed text-slate-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  return (
    <section id="preco" className="relative px-12 py-24">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-center text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Preço</div>
          <h2 className="mb-4 text-center text-4xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em" }}>Simples e transparente</h2>
          <p className="mb-14 text-center text-base text-slate-400">Sem surpresas. Um plano, tudo incluso.</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border p-12"
            style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.10) 0%, rgba(255,255,255,0.03) 50%)", borderColor: "rgba(16,185,129,0.25)", boxShadow: "0 30px 80px rgba(0,0,0,0.40), 0 0 80px rgba(16,185,129,0.10)", backdropFilter: "blur(20px)" }}
          >
            <div className="pointer-events-none absolute right-[-100px] top-[-100px] h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.20), transparent 70%)" }} />

            <div className="mb-8 flex items-center justify-between">
              <span className="text-sm font-bold tracking-[0.16em] text-emerald-300 uppercase">Plano Lumii</span>
              <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] text-green-400" style={{ background: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.30)" }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Acesso completo
              </span>
            </div>

            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-300">R$</span>
              <span className="font-bold text-slate-100" style={{ fontSize: "clamp(72px, 11vw, 112px)", letterSpacing: "-0.04em", lineHeight: 1 }}>99</span>
              <div className="flex flex-col">
                <span className="text-xl font-semibold text-slate-300">,00</span>
                <span className="text-sm text-slate-500">/mês</span>
              </div>
            </div>
            <p className="mb-8 text-sm text-slate-500">Fatura mensalmente. Cancele a qualquer momento.</p>

            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              {[
                "Dashboard de preços em tempo real",
                "Análise de gap e margem automática",
                "Filtros e segmentação avançada",
                "Exportação Excel com 1 clique",
                "Lumii — IA integrada",
                "Atualizações contínuas do produto",
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <svg className="mt-0.5 flex-shrink-0 text-emerald-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {feat}
                </div>
              ))}
            </div>

            {/* TEMPORARIAMENTE DESATIVADO — remover aria-disabled/tabIndex/style overrides para reativar */}
            <Link
              href="/login/criar-conta"
              aria-disabled="true"
              tabIndex={-1}
              title="Cadastros temporariamente pausados"
              className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold text-[#04130b] transition-all hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)", boxShadow: "0 0 40px rgba(16,185,129,0.30), inset 0 1px 0 rgba(255,255,255,0.30)", pointerEvents: "none", opacity: 0.5, cursor: "not-allowed" }}
            >
              Começar agora
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  return (
    <section className="px-12 py-24">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-4 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Depoimentos</div>
          <h2 className="mb-12 text-4xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em" }}>
            O que nossos clientes dizem
          </h2>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              quote: "Conseguimos centralizar toda a nossa análise competitiva em uma única tela. O dashboard mudou a velocidade com que reagimos aos preços do mercado.",
              author: "Diretor de Operações",
              company: "Benverde Hortifrutigranjeiro",
            },
            {
              quote: "Os cards com o resumo de 'Itens Visíveis' e 'Gap Médio' nos ajudam a entender rapidamente a situação do dia.",
              author: "Gerente Comercial",
              company: "Benverde Hortifrutigranjeiro",
            },
            {
              quote: "O botão 'Só Bananas' facilitou muito a verificação do nosso principal produto de forma isolada, economizando muito tempo de rolagem.",
              author: "Analista de Preços",
              company: "Benverde Hortifrutigranjeiro",
            },
          ].map(({ quote, author, company }, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div
                className="flex flex-col rounded-2xl border p-6"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <svg className="mb-4 text-emerald-500/40" width="28" height="22" viewBox="0 0 40 28" fill="currentColor">
                  <path d="M0 28V16.8C0 11.2 1.6 6.8 4.8 3.6 8 1.2 12.4 0 18 0v5.6c-3.6 0-6.2 1-7.8 3-1.6 1.6-2.4 4.2-2.4 7.8H14V28H0zm22 0V16.8c0-5.6 1.6-10 4.8-13.2C30 1.2 34.4 0 40 0v5.6c-3.6 0-6.2 1-7.8 3-1.6 1.6-2.4 4.2-2.4 7.8H36V28H22z" />
                </svg>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-slate-300">&quot;{quote}&quot;</p>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{author}</div>
                  <div className="text-xs text-slate-500">{company}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA + Footer ─── */
function Footer() {
  return (
    <>
      {/* CTA strip */}
      <section id="contato" className="px-12 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-3xl border p-14 text-center"
              style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(52,211,153,0.06))", borderColor: "rgba(16,185,129,0.30)", boxShadow: "0 0 80px rgba(16,185,129,0.08)" }}
            >
              <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(52,211,153,0.15), transparent 60%)" }} />
              <h2 className="relative mb-4 text-4xl font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.02em" }}>
                Pronto para mudar a velocidade <br className="hidden sm:block" />da sua estratégia de preços?
              </h2>
              <p className="relative mx-auto mb-8 max-w-md text-base text-slate-400">
                Comece hoje mesmo. Sem taxa de setup, sem contrato longo.
              </p>
              <div className="relative flex flex-wrap items-center justify-center gap-3">
                {/* TEMPORARIAMENTE DESATIVADO — remover aria-disabled/tabIndex/style overrides para reativar */}
                <Link
                  href="/login/criar-conta"
                  aria-disabled="true"
                  tabIndex={-1}
                  title="Cadastros temporariamente pausados"
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-[#04130b] transition-all hover:-translate-y-px"
                  style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)", boxShadow: "0 12px 32px rgba(16,185,129,0.30)", pointerEvents: "none", opacity: 0.5, cursor: "not-allowed" }}
                >
                  Criar conta grátis
                </Link>
                <a
                  href="https://wa.me/5512988567961"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-8 py-4 text-base font-semibold text-slate-100 transition-all hover:bg-white/5"
                  style={{ borderColor: "rgba(255,255,255,0.20)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 0-3.4 6.5L21 20l-1.6-4.3A7.96 7.96 0 0 0 20 12Z" /><path d="M8.5 10.5c.3 1.6 1.4 2.8 3 3.1.7.1 1.4-.4 1.7-1l.3-.6a1 1 0 0 0-.5-1.3l-1-.4a1 1 0 0 0-1.2.3l-.2.2" /></svg>
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-12 py-10" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BrandMark size={28} />
              <span className="text-base font-bold tracking-tight text-slate-100">lumii</span>
              <span className="text-xs text-slate-500">Gestão Inteligente</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <span>contato@lumii.app.br</span>
              <span>(12) 98856-7961</span>
              <a href="https://wa.me/5512988567961" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200 transition-colors">WhatsApp</a>
            </div>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} Lumii. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ─── Page ─── */
export default function HomePage() {
  return (
    <div style={{ fontFamily: "var(--lumii-font-sans)", background: "var(--lumii-bg)", color: "var(--lumii-fg)" }}>
      <Nav />
      <Hero />
      <DashPreview />
      <LumiiAI />
      <Solutions />
      <KeyFeatures />
      <Roadmap />
      <Pricing />
      <Testimonials />
      <Footer />
    </div>
  );
}
