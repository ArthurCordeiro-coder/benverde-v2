"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import api from "../../../lib/api";
import Link from "next/link";
import Image from "next/image";
import iconImg from "../../icon.png";

type ApiError = { response?: { data?: { detail?: string } } };

/* ─── Brand mark ─── */
function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      src={iconImg}
      alt="lumii logo"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

/* ─── Floating label input ─── */
function FloatInput({
  label, value, onChange, type = "text", autoFocus, error, onEnter, name, autoComplete, rightSlot,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
  autoFocus?: boolean; error?: string; onEnter?: () => void; name?: string; autoComplete?: string; rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const float = focused || value.length > 0;
  const errored = !!error;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="relative h-14 transition-all duration-150"
        style={{
          borderRadius: 14,
          border: `1px solid ${errored ? "rgba(248,113,113,0.55)" : focused ? "var(--lumii-primary-300)" : "var(--lumii-border-2)"}`,
          background: focused ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
          boxShadow: focused && !errored ? "0 0 0 3px rgba(110,231,183,0.10)" : "none",
        }}
      >
        <label
          className="pointer-events-none absolute transition-all duration-200"
          style={{
            left: 18,
            top: float ? 10 : "50%",
            transform: float ? "translateY(0)" : "translateY(-50%)",
            fontSize: float ? 11 : 15,
            color: errored ? "#fca5a5" : focused ? "var(--lumii-primary-300)" : "var(--lumii-fg-muted)",
            background: float ? "var(--lumii-bg-1)" : "transparent",
            padding: float ? "0 6px" : "0",
            marginLeft: float ? -6 : 0,
            letterSpacing: float ? "0.02em" : "0",
            fontFamily: "var(--lumii-font-sans)",
          }}
        >
          {label}
        </label>
        <input
          ref={inputRef}
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className="absolute inset-0 h-full w-full border-none bg-transparent outline-none"
          style={{ color: "var(--lumii-fg)", fontSize: 15, fontFamily: "var(--lumii-font-sans)", padding: rightSlot ? "16px 52px 0 18px" : "16px 18px 0" }}
        />
        {rightSlot && <div className="absolute bottom-0 right-3 top-0 flex items-center">{rightSlot}</div>}
      </div>
      {error && <p className="pl-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

type Step = "identity" | "credentials";

const STEP_ORDER: Step[] = ["identity", "credentials"];

const TITLES: Record<Step, string> = {
  identity: "Criar conta",
  credentials: "Criar conta",
};

const SUBTITLES: Record<Step, string> = {
  identity: "Como podemos chamar você?",
  credentials: "Defina seus dados de acesso",
};

// Funções disponíveis no cadastro. O usuário fica pendente de aprovação de um
// administrador. "administracao geral" (admin) não é exposta aqui por segurança.
const FUNCOES: Array<{ value: string; label: string }> = [
  { value: "busca de precos", label: "Busca de preços" },
  { value: "registro de estoque", label: "Registro de estoque" },
  { value: "registro de caixas", label: "Registro de caixas" },
  { value: "processamento de pdf", label: "Processamento de PDF" },
];

export default function CreateAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [prevStep, setPrevStep] = useState<Step>("identity");

  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [funcao, setFuncao] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const direction = STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(prevStep) ? "right" : "left";

  function advance(next: Step) {
    setPrevStep(step);
    setStep(next);
    setError("");
  }

  function goTo(s: Step) {
    setPrevStep(step);
    setStep(s);
    setError("");
  }

  /* Step 1 → 2 */
  const submitIdentity = () => {
    if (!nome.trim()) { setError("Informe seu nome."); return; }
    if (!usuario.trim()) { setError("Informe um nome de usuário."); return; }
    advance("credentials");
  };

  /* Step 2 → 3: actually register */
  const submitCredentials = async () => {
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    if (!funcao) { setError("Selecione a função no sistema."); return; }
    if (senha.length < 6) { setError("A senha precisa ter ao menos 6 caracteres."); return; }
    if (senha !== confirmSenha) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      await api.post("/api/register", {
        username: usuario.trim(),
        nome: nome.trim(),
        email: email.trim(),
        password: senha,
        funcionalidade: funcao,
      });
      // Sem cobrança: o cadastro fica pendente de aprovação de um administrador.
      // Mostra a confirmação e retorna para a home do site.
      setSubmitted(true);
      window.setTimeout(() => router.push("/"), 5000);
    } catch (err: unknown) {
      const detail = (err as ApiError)?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Não foi possível concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  };

  /* Progress dots */
  const steps: Step[] = ["identity", "credentials"];
  const currentIdx = steps.indexOf(step);

  const subtitleForStep = SUBTITLES[step];

  return (
    <div
      className="relative flex min-h-screen flex-col px-8 py-8"
      style={{
        background: "radial-gradient(circle at top, rgba(32,10,94,0.15), transparent 32%), linear-gradient(180deg, #0c0525 0%, #150838 48%, #060214 100%)",
        fontFamily: "var(--lumii-font-sans)",
      }}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-purple-900/35 blur-3xl" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <BrandMark size={28} />
          <span className="text-base font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.01em" }}>lumii</span>
        </Link>
        <div className="flex items-center gap-4 text-[13px] text-slate-400">
          <span>Já tem conta?</span>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-semibold text-purple-300 transition-colors hover:text-purple-200"
          >
            Entrar
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex flex-1 items-center justify-center py-4">
        <div
          className="w-full overflow-hidden"
          style={{
            maxWidth: "min(1100px, 100%)",
            minHeight: 520,
            borderRadius: 28,
            border: "1px solid var(--lumii-border)",
            background: "var(--lumii-surface)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.45)",
            padding: "44px 56px 40px",
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1fr) minmax(360px, 1fr)",
            gap: 56,
          }}
        >
          {/* Left column */}
          <div className="flex flex-col justify-center pr-2">
            <BrandMark size={44} />
            <div className="mt-7">
              <h1
                key={step + "-title"}
                className="font-semibold text-slate-100"
                style={{ fontSize: 40, lineHeight: 1.08, letterSpacing: "-0.02em", animation: "lumii-fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
              >
                {TITLES[step]}
              </h1>
              <p
                key={step + "-sub"}
                className="mt-4 text-[15px] leading-relaxed text-slate-400"
                style={{ animation: "lumii-fade-up 0.35s 0.05s cubic-bezier(0.16,1,0.3,1) both" }}
              >
                {subtitleForStep}
              </p>
            </div>

            {/* Step indicators */}
            <div className="mt-auto pt-10 flex items-center gap-2">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === currentIdx ? 24 : 8,
                    background: i <= currentIdx ? "var(--lumii-primary-500)" : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right column — form */}
          <div className="relative flex flex-col">
            <div className="relative flex flex-1 flex-col justify-center" style={{ minHeight: 280 }}>
              {/* Sucesso: cadastro enviado, aguardando aprovação de admin */}
              {submitted && (
                <div
                  key="sucesso"
                  className="flex flex-col items-center gap-4 text-center"
                  style={{ animation: "lumii-fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
                >
                  <CheckCircle2 size={56} className="text-emerald-400" />
                  <h2 className="text-2xl font-semibold text-slate-100">Cadastro enviado!</h2>
                  <p className="max-w-sm text-[15px] leading-relaxed text-slate-400">
                    Um administrador está aprovando seu acesso. Assim que for liberado, você poderá
                    entrar normalmente.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="mt-2 inline-flex h-11 items-center justify-center rounded-full px-7 text-[14px] font-semibold text-[#03110a] transition-all"
                    style={{ background: "var(--lumii-primary-500)", boxShadow: "0 0 24px rgba(16,185,129,0.18)", fontFamily: "inherit" }}
                  >
                    Voltar ao início
                  </button>
                </div>
              )}

              {/* Step 1: Identity */}
              {!submitted && step === "identity" && (
                <div
                  key="identity"
                  className="flex flex-col gap-3.5"
                  style={{ animation: `${direction === "right" ? "lumii-slide-in" : "lumii-slide-in"} 0.25s cubic-bezier(0.4,0,0.2,1) both` }}
                >
                  <FloatInput label="Nome completo" value={nome} onChange={setNome} autoFocus name="name" autoComplete="name" error={error && !usuario ? error : undefined} />
                  <FloatInput label="Nome de usuário" value={usuario} onChange={setUsuario} name="username" autoComplete="username" onEnter={submitIdentity} error={error && usuario ? error : undefined} />
                  {error && <p className="pl-1 text-xs text-red-300">{error}</p>}
                  <div className="mt-4 flex items-center justify-end border-t pt-5" style={{ borderColor: "var(--lumii-border)" }}>
                    <button type="button" onClick={submitIdentity} className="inline-flex h-11 min-w-[116px] items-center justify-center gap-2 rounded-full px-7 text-[14px] font-semibold text-[#03110a] transition-all" style={{ background: "var(--lumii-primary-500)", boxShadow: "0 0 24px rgba(16,185,129,0.18)", fontFamily: "inherit" }}>
                      Avançar
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Credentials */}
              {!submitted && step === "credentials" && (
                <div
                  key="credentials"
                  className="flex flex-col gap-3.5"
                  style={{ animation: "lumii-slide-in 0.25s cubic-bezier(0.4,0,0.2,1) both" }}
                >
                  <FloatInput label="E-mail" value={email} onChange={setEmail} type="email" autoFocus name="email" autoComplete="email" />
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="funcao"
                      className="pl-1"
                      style={{ fontSize: 11, letterSpacing: "0.02em", color: "var(--lumii-fg-muted)", fontFamily: "var(--lumii-font-sans)" }}
                    >
                      Função no sistema
                    </label>
                    <div
                      className="relative h-14"
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${funcao ? "var(--lumii-primary-300)" : "var(--lumii-border-2)"}`,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <select
                        id="funcao"
                        value={funcao}
                        onChange={(e) => setFuncao(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-none bg-transparent outline-none"
                        style={{
                          color: funcao ? "var(--lumii-fg)" : "var(--lumii-fg-muted)",
                          fontSize: 15,
                          padding: "0 44px 0 18px",
                          fontFamily: "var(--lumii-font-sans)",
                        }}
                      >
                        <option value="" disabled style={{ color: "#0c0525" }}>
                          Selecione a função
                        </option>
                        {FUNCOES.map((f) => (
                          <option key={f.value} value={f.value} style={{ color: "#0c0525" }}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <div
                        className="pointer-events-none absolute bottom-0 right-4 top-0 flex items-center"
                        style={{ color: "var(--lumii-fg-muted)" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <FloatInput
                    label="Senha"
                    value={senha}
                    onChange={setSenha}
                    type={showSenha ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    rightSlot={
                      <button type="button" onClick={() => setShowSenha((v) => !v)} className="text-slate-400 hover:text-slate-200">
                        {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                  <FloatInput
                    label="Confirmar senha"
                    value={confirmSenha}
                    onChange={setConfirmSenha}
                    type={showConfirm ? "text" : "password"}
                    name="confirm-password"
                    autoComplete="new-password"
                    onEnter={submitCredentials}
                    rightSlot={
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-slate-400 hover:text-slate-200">
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                  {error && <p className="pl-1 text-xs text-red-300">{error}</p>}
                  <div className="mt-4 flex items-center justify-between border-t pt-5" style={{ borderColor: "var(--lumii-border)" }}>
                    <button type="button" onClick={() => goTo("identity")} className="text-[13px] font-semibold text-slate-400 transition-colors hover:text-slate-200" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      ← Voltar
                    </button>
                    <button type="button" onClick={submitCredentials} disabled={loading} className="inline-flex h-11 min-w-[116px] items-center justify-center gap-2 rounded-full px-7 text-[14px] font-semibold text-[#03110a] transition-all disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "var(--lumii-primary-500)", boxShadow: "0 0 24px rgba(16,185,129,0.18)", fontFamily: "inherit" }}>
                      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#03110a]/30 border-t-[#03110a]" /> : <>Criar conta <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between px-2 text-[12px] text-slate-600">
        <span>Português (Brasil)</span>
        <div className="flex gap-5">
          <span className="cursor-default">Ajuda</span>
          <span className="cursor-default">Privacidade</span>
          <span className="cursor-default">Termos</span>
        </div>
      </div>
    </div>
  );
}
