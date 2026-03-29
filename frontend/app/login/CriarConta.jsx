import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, Briefcase, Mail, ChevronDown } from "lucide-react";

export default function CriarConta() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ usuario: "", email: "", funcao: "", senha: "", confirmar: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left — Farm Image */}
      <div className="hidden lg:block lg:w-1/2 h-full">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80"
          alt="Granja"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 h-full bg-white flex items-center justify-center px-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Card */}
          <div className="bg-[#F2F1E8] rounded-xl border border-[#D9D8CE] px-10 py-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#4A5D23]/10 mb-4">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="#4A5D23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-[#2D2D2D]">Criar conta</h1>
              <p className="text-sm text-[#7A7A7A] mt-1">Preencha os dados para se cadastrar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Usuário */}
              <div>
                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                  <input
                    type="text"
                    name="usuario"
                    value={form.usuario}
                    onChange={handleChange}
                    placeholder="Escolha um nome de usuário"
                    className="w-full h-11 pl-10 pr-4 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Digite seu e-mail"
                    className="w-full h-11 pl-10 pr-4 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                  />
                </div>
              </div>

              {/* Função */}
              <div>
                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Função</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60 pointer-events-none" />
                  <select
                    name="funcao"
                    value={form.funcao}
                    onChange={handleChange}
                    className="w-full h-11 pl-10 pr-10 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Selecione uma função</option>
                    <option value="administracao">Administração geral</option>
                    <option value="busca_precos">Busca de preços</option>
                    <option value="registro_caixas">Registro de caixas</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60 pointer-events-none" />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="senha"
                    value={form.senha}
                    onChange={handleChange}
                    placeholder="Crie uma senha"
                    className="w-full h-11 pl-10 pr-11 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5D23]/50 hover:text-[#4A5D23] transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmar"
                    value={form.confirmar}
                    onChange={handleChange}
                    placeholder="Repita a senha"
                    className="w-full h-11 pl-10 pr-11 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5D23]/50 hover:text-[#4A5D23] transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Concluir */}
              <button
                type="submit"
                className="w-full h-11 mt-2 bg-[#4A5D23] hover:bg-[#3E5019] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Concluir cadastro
              </button>

              {/* Voltar */}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full h-11 bg-white hover:bg-[#F5F5EE] text-[#4A5D23] text-sm font-semibold rounded-lg border border-[#4A5D23]/50 transition-colors"
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