"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";

import api from "@/lib/api";

type ApiError = {
  request?: unknown;
  response?: {
    data?: {
      detail?: string;
    };
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/api/login", {
        username: username.trim(),
        password,
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      const detail = (err as ApiError | undefined)?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : (err as ApiError | undefined)?.request
            ? "Nao foi possivel conectar ao servidor."
            : "Usuario ou senha invalidos.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-benverde-base via-benverde-dark to-black">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-green-900/35 blur-3xl" />
      </div>

      <div className="hidden h-screen lg:block lg:w-1/2">
        <div className="relative h-full w-full">
          <Image
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
            alt="Granja"
            fill
            priority
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
        </div>
      </div>

      <div className="relative flex h-screen w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-10 py-12 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
                  stroke="#34d399"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white">Benverde</h1>
              <p className="mt-1 text-sm text-slate-300">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Digite seu usuario"
                    className="h-11 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    className="h-11 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70 transition-colors hover:text-emerald-300"
                    aria-label="Mostrar ou ocultar senha"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <p className="text-right text-xs text-slate-400">
                Recuperacao de senha por e-mail fora do escopo desta migracao.
              </p>

              {error ? (
                <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Entrando..." : "Login"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login/criar-conta")}
                className="h-11 w-full rounded-lg border border-white/20 bg-white/5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10"
              >
                Criar conta
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
