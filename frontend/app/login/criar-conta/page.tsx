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
    if (!username) {
      setError("Informe um usuario valido.");
      return;
    }
    if (!form.email.trim()) {
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
    <div className="flex min-h-screen w-full overflow-hidden">
      <div className="hidden h-screen lg:block lg:w-1/2">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
          alt="Granja"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex h-screen w-full items-center justify-center overflow-y-auto bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-md py-8">
          <div className="rounded-xl border border-[#D9D8CE] bg-[#F2F1E8] px-10 py-10">
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
              <h1 className="text-2xl font-semibold text-[#2D2D2D]">Criar conta</h1>
              <p className="mt-1 text-sm text-[#7A7A7A]">Preencha os dados para se cadastrar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type="text"
                    value={form.usuario}
                    onChange={(e) => handleChange("usuario", e.target.value)}
                    placeholder="Escolha um nome de usuario"
                    className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-4 text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-4 text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">Funcao</label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <select
                    value={form.funcao}
                    onChange={(e) => handleChange("funcao", e.target.value)}
                    className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-10 text-sm text-[#2D2D2D] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
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
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.senha}
                    onChange={(e) => handleChange("senha", e.target.value)}
                    placeholder="Crie uma senha"
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

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#4A4A4A]">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5D23]/60" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmar}
                    onChange={(e) => handleChange("confirmar", e.target.value)}
                    placeholder="Repita a senha"
                    className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white pl-10 pr-11 text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] transition-colors focus:border-[#4A5D23] focus:outline-none focus:ring-1 focus:ring-[#4A5D23]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5D23]/50 transition-colors hover:text-[#4A5D23]"
                    aria-label="Mostrar ou ocultar confirmacao de senha"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              ) : null}
              {success ? (
                <p className="rounded-lg bg-[#EAF0DE] px-3 py-2 text-sm text-[#3E5019]">{success}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full rounded-lg bg-[#4A5D23] text-sm font-semibold text-white transition-colors hover:bg-[#3E5019] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Concluindo..." : "Concluir cadastro"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="h-11 w-full rounded-lg border border-[#4A5D23]/50 bg-white text-sm font-semibold text-[#4A5D23] transition-colors hover:bg-[#F5F5EE]"
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
