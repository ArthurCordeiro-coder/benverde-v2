"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronDown, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import api from "../../../lib/api";

type RegisterForm = {
  usuario: string;
  email: string;
  funcao: string;
  senha: string;
  confirmar: string;
};

const FUNCTION_OPTIONS = [
  { value: "administracao geral", label: "Administracao geral" },
  { value: "busca de precos", label: "Busca de precos" },
  { value: "registro de caixas", label: "Registro de caixas" },
];

export default function CreateAccountPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState<RegisterForm>({
    usuario: "",
    email: "",
    funcao: "",
    senha: "",
    confirmar: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (field: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const username = form.usuario.trim();
    const email = form.email.trim();
    if (!username) {
      setError("Informe um usuario valido.");
      return;
    }
    if (!email) {
      setError("Informe um e-mail valido.");
      return;
    }
    if (!form.funcao) {
      setError("Selecione uma funcao.");
      return;
    }
    if (form.senha.length < 6) {
      setError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (form.senha !== form.confirmar) {
      setError("As senhas nao coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/register", {
        username,
        nome: username,
        email,
        password: form.senha,
        funcionalidade: form.funcao,
      });

      const registerStatus = response?.data?.status;
      const message =
        registerStatus === "admin_criado"
          ? "Cadastro concluido. Sua conta de administrador foi criada."
          : "Cadastro enviado. Aguarde a aprovacao para acessar.";

      setSuccess(message);
      setForm({
        usuario: "",
        email: "",
        funcao: "",
        senha: "",
        confirmar: "",
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Nao foi possivel concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-benverde-base via-benverde-dark to-black">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 right-8 h-96 w-96 rounded-full bg-green-900/35 blur-3xl" />
      </div>

      <div className="hidden h-screen lg:block lg:w-1/2">
        <div className="relative h-full w-full">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
            alt="Granja"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
        </div>
      </div>

      <div className="relative flex h-screen w-full items-center justify-center overflow-y-auto px-6 lg:w-1/2">
        <div className="w-full max-w-md py-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-10 py-10 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
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
              <h1 className="text-2xl font-semibold text-white">Criar conta</h1>
              <p className="mt-1 text-sm text-slate-300">Preencha os dados para solicitar acesso</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                  <input
                    type="text"
                    value={form.usuario}
                    onChange={(e) => handleChange("usuario", e.target.value)}
                    placeholder="Escolha um nome de usuario"
                    className="h-11 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="h-11 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Funcao</label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                  <select
                    value={form.funcao}
                    onChange={(e) => handleChange("funcao", e.target.value)}
                    className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-black/30 pl-10 pr-10 text-sm text-white transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  >
                    <option value="" disabled>
                      Selecione uma funcao
                    </option>
                    {FUNCTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.senha}
                    onChange={(e) => handleChange("senha", e.target.value)}
                    placeholder="Crie uma senha"
                    className="h-11 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70 transition-colors hover:text-emerald-300"
                    aria-label="Mostrar ou ocultar senha"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/70" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmar}
                    onChange={(e) => handleChange("confirmar", e.target.value)}
                    placeholder="Repita a senha"
                    className="h-11 w-full rounded-lg border border-white/15 bg-black/30 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70 transition-colors hover:text-emerald-300"
                    aria-label="Mostrar ou ocultar confirmacao de senha"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {success}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Concluindo..." : "Concluir cadastro"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="h-11 w-full rounded-lg border border-white/20 bg-white/5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10"
              >
                Voltar ao login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
