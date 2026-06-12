"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import iconImg from "../icon.png";

type ApiError = { request?: unknown; response?: { data?: { detail?: string } } };
type LoginResponse = { user?: { funcionalidade?: string } };

function getRedirectPath(funcionalidade?: string) {
  const n = String(funcionalidade ?? "").trim().toLowerCase();
  if (n === "busca de precos") return "/Precos";
  if (n === "registro de estoque") return "/benverde/Estoque";
  if (n === "registro de caixas") return "/benverde/Caixas";
  return "/benverde/dashboard";
}

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
          style={{
            color: "var(--lumii-fg)",
            fontSize: 15,
            fontFamily: "var(--lumii-font-sans)",
            padding: rightSlot ? "16px 52px 0 18px" : "16px 18px 0",
          }}
        />
        {rightSlot && (
          <div className="absolute bottom-0 right-3 top-0 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>
      {error && <p className="pl-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

/* ─── Step panel (animated) ─── */
function StepPanel({ children, active, direction }: { children: React.ReactNode; active: boolean; direction: "left" | "right" }) {
  return (
    <div
      className="flex flex-col gap-3.5"
      style={{
        transition: "opacity 0.25s, transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        opacity: active ? 1 : 0,
        transform: active ? "translateX(0)" : direction === "right" ? "translateX(24px)" : "translateX(-24px)",
        pointerEvents: active ? "auto" : "none",
        position: active ? "relative" : "absolute",
        inset: active ? "auto" : 0,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Login page ─── */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const advanceToPassword = () => {
    if (!email.trim()) { setError("Informe seu usuário."); return; }
    setError("");
    setDirection("right");
    setStep("password");
  };

  const goBack = () => {
    setError("");
    setDirection("left");
    setStep("email");
  };

  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!password) { setError("Digite sua senha."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.post<LoginResponse>("/api/login", { username: email.trim(), password });
      router.push(getRedirectPath(res.data?.user?.funcionalidade));
    } catch (err: unknown) {
      const detail = (err as ApiError)?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : (err as ApiError)?.request ? "Não foi possível conectar ao servidor." : "Usuário ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  const titleMap = { email: "Bem-vindo ao Lumii", password: "Digite sua senha" };
  const subtitleMap = { email: "Acesse sua conta para continuar", password: email };

  return (
    <div
      className="relative flex min-h-screen flex-col px-8 py-8"
      style={{
        background: "radial-gradient(circle at top, rgba(32,10,94,0.15), transparent 32%), linear-gradient(180deg, #0c0525 0%, #150838 48%, #060214 100%)",
        fontFamily: "var(--lumii-font-sans)",
      }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-purple-900/35 blur-3xl" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <BrandMark size={28} />
          <span className="text-base font-bold tracking-tight text-slate-100" style={{ letterSpacing: "-0.01em" }}>lumii</span>
        </Link>
        <div className="flex items-center gap-4 text-[13px] text-slate-400">
          <span>Não tem conta?</span>
          {/* TEMPORARIAMENTE DESATIVADO — remover disabled + style overrides para reativar */}
          <button
            type="button"
            disabled
            title="Cadastros temporariamente pausados"
            onClick={() => router.push("/login/criar-conta")}
            className="font-semibold text-purple-300 transition-colors hover:text-purple-200"
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            Criar conta
          </button>
        </div>
      </div>

      {/* Center stage */}
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
          id="lumii-auth-card"
        >
          {/* Left column — animated title */}
          <div id="lumii-auth-left" className="flex flex-col justify-center pr-2">
            <BrandMark size={44} />
            <div className="mt-7">
              <h1
                key={step + "-title"}
                className="font-semibold text-slate-100"
                style={{
                  fontSize: 40, lineHeight: 1.08, letterSpacing: "-0.02em",
                  animation: "lumii-fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                {titleMap[step]}
              </h1>
              <p
                key={step + "-sub"}
                className="mt-4 text-[15px] leading-relaxed text-slate-400"
                style={{ animation: "lumii-fade-up 0.35s 0.05s cubic-bezier(0.16,1,0.3,1) both" }}
              >
                {subtitleMap[step]}
              </p>
              {step === "password" && (
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] text-slate-100 transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--lumii-border-2)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  {email}
                </button>
              )}
            </div>
          </div>

          {/* Right column — form */}
          <div className="relative flex flex-col">
            <div className="relative flex flex-1 flex-col justify-center" style={{ minHeight: 200 }}>
              <form onSubmit={step === "email" ? (e) => { e.preventDefault(); advanceToPassword(); } : handleLogin}>
                <StepPanel active={step === "email"} direction={direction}>
                  <FloatInput
                    label="Usuário"
                    value={email}
                    onChange={setEmail}
                    autoFocus={step === "email"}
                    name="email"
                    autoComplete="email"
                    onEnter={advanceToPassword}
                    error={step === "email" ? error : undefined}
                  />
                </StepPanel>

                <StepPanel active={step === "password"} direction={direction}>
                  <FloatInput
                    label="Senha"
                    value={password}
                    onChange={setPassword}
                    type={showPassword ? "text" : "password"}
                    autoFocus={step === "password"}
                    name="password"
                    autoComplete="current-password"
                    onEnter={() => handleLogin()}
                    error={step === "password" ? error : undefined}
                    rightSlot={
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-slate-400 hover:text-slate-200">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                </StepPanel>

                {/* Actions row */}
                <div className="mt-8 flex items-center justify-between gap-4 border-t pt-5" style={{ borderColor: "var(--lumii-border)" }}>
                  {/* TEMPORARIAMENTE DESATIVADO — remover disabled + style overrides para reativar */}
                  <button
                    type="button"
                    disabled
                    title="Cadastros temporariamente pausados"
                    onClick={() => router.push("/login/criar-conta")}
                    className="text-[13px] font-semibold text-purple-300 transition-colors hover:text-purple-200"
                    style={{ background: "none", border: "none", cursor: "not-allowed", fontFamily: "inherit", opacity: 0.5 }}
                  >
                    Criar conta
                  </button>

                  <button
                    type={step === "email" ? "button" : "submit"}
                    onClick={step === "email" ? advanceToPassword : undefined}
                    disabled={loading}
                    className="inline-flex h-11 min-w-[116px] items-center justify-center gap-2 rounded-full px-7 text-[14px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: "var(--lumii-primary-500)", boxShadow: "0 0 24px rgba(16,185,129,0.18)", fontFamily: "inherit" }}
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        {step === "email" ? "Avançar" : "Entrar"}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div id="lumii-auth-footer" className="relative flex items-center justify-between text-[12px] text-slate-600 px-2">
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
