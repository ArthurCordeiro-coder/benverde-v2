"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Eye, EyeOff, Lock, Mail, User, X } from "lucide-react";

import api from "../../lib/api";

type JwtPayload = {
  role?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadChunk = token.split(".")[1];
    if (!payloadChunk) {
      return null;
    }

    const normalizedPayload = payloadChunk.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );
    return JSON.parse(window.atob(paddedPayload));
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [recovery, setRecovery] = useState({ usuario: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/login", {
        username: username.trim(),
        password,
      });

      const accessToken = response.data.access_token;
      Cookies.set("benverde_token", accessToken);

      const payload = decodeJwtPayload(accessToken);
      router.push(payload?.role === "operacional" ? "/registro" : "/dashboard");
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail;
      const finalMessage =
        typeof errorMessage === "string"
          ? errorMessage
          : err?.request
            ? "Nao foi possivel conectar ao servidor de autenticacao."
            : "Usuario ou senha invalidos.";
      setError(finalMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = () => {
    const usuario = recovery.usuario.trim();
    const email = recovery.email.trim();
    if (!usuario || !email) {
      setRecoveryMessage("Preencha usuario e e-mail para continuar.");
      return;
    }
    setRecoveryMessage(
      "Solicitacao registrada. Em breve entraremos em contato para recuperar o acesso.",
    );
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <div className="hidden h-screen lg:block lg:w-1/2">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
          alt="Granja"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex h-screen w-full items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-[#D9D8CE] bg-[#F2F1E8] px-10 py-12">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#4A5D23]/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
                  stroke="#4A5D23"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-[#2D2D2D]">Benverde</h1>
              <p className="mt-1 text-sm text-[#7A7A7A]">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu usuario"
                    className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-4 text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-11 text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5D23]/50 transition-colors hover:text-[#4A5D23]"
                    aria-label="Mostrar ou ocultar senha"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMessage("");
                    setShowModal(true);
                  }}
                  className="text-xs text-[#4A5D23] underline-offset-2 transition-colors hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-lg bg-[#4A5D23] text-sm font-semibold text-white transition-colors hover:bg-[#3E5019] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Entrando..." : "Login"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login/criar-conta")}
                className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white text-sm font-semibold text-[#4A5D23] transition-colors hover:bg-[#F5F5EE]"
              >
                Criar conta
              </button>
            </form>
          </div>
        </div>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-[#D9D8CE] bg-[#F2F1E8] px-8 py-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#2D2D2D]">Recuperacao de acesso</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#7A7A7A] transition-colors hover:text-[#4A5D23]"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-5 text-xs leading-relaxed text-[#7A7A7A]">
              Informe seu usuario e e-mail cadastrado para recuperar o acesso.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type="text"
                    value={recovery.usuario}
                    onChange={(e) =>
                      setRecovery((prev) => ({
                        ...prev,
                        usuario: e.target.value,
                      }))
                    }
                    placeholder="Seu nome de usuario"
                    className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-4 text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type="email"
                    value={recovery.email}
                    onChange={(e) =>
                      setRecovery((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Seu e-mail cadastrado"
                    className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-4 text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
                  />
                </div>
              </div>
            </div>
            {recoveryMessage ? (
              <p className="mt-4 rounded-lg bg-[#EAF0DE] px-3 py-2 text-xs text-[#3E5019]">
                {recoveryMessage}
              </p>
            ) : null}
            <button
              onClick={handleRecovery}
              className="mt-6 h-11 w-full rounded-lg bg-[#4A5D23] text-sm font-semibold text-white transition-colors hover:bg-[#3E5019]"
            >
              Enviar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
