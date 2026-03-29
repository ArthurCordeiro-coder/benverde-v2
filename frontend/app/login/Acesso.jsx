import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, X, Mail } from "lucide-react";

export default function Acesso() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [recovery, setRecovery] = useState({ usuario: "", email: "" });

    const handleLogin = (e) => {
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
            <div className="w-full lg:w-1/2 h-full bg-white flex items-center justify-center px-6">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-[#F2F1E8] rounded-xl border border-[#D9D8CE] px-10 py-12">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#4A5D23]/10 mb-4">
                                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="#4A5D23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-semibold text-[#2D2D2D]">Benverde</h1>
                            <p className="text-sm text-[#7A7A7A] mt-1">Acesse sua conta para continuar</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* Usuário */}
                            <div>
                                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Usuário</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Digite seu usuário"
                                        className="w-full h-11 pl-10 pr-4 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Senha */}
                            <div>
                                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Digite sua senha"
                                        className="w-full h-11 pl-10 pr-11 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5D23]/50 hover:text-[#4A5D23] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Esqueci a senha */}
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(true)}
                                    className="text-xs text-[#4A5D23] hover:underline underline-offset-2 transition-colors"
                                >
                                    Esqueci a senha
                                </button>
                            </div>

                            {/* Botão Login */}
                            <button
                                type="submit"
                                className="w-full h-11 bg-[#4A5D23] hover:bg-[#3E5019] text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                Login
                            </button>

                            {/* Botão Criar conta */}
                            <button
                                type="button"
                                onClick={() => navigate("/criar-conta")}
                                className="w-full h-11 bg-white hover:bg-[#F5F5EE] text-[#4A5D23] text-sm font-semibold rounded-lg border border-[#4A5D23]/50 transition-colors"
                            >
                                Criar conta
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal de Recuperação */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#F2F1E8] rounded-xl border border-[#D9D8CE] w-full max-w-sm px-8 py-8"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-[#2D2D2D]">Recuperação de acesso</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-[#7A7A7A] hover:text-[#4A5D23] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-[#7A7A7A] mb-5 leading-relaxed">
                            Informe seu usuário e e-mail cadastrado para recuperar o acesso.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Usuário</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                                    <input
                                        type="text"
                                        value={recovery.usuario}
                                        onChange={(e) => setRecovery({ ...recovery, usuario: e.target.value })}
                                        placeholder="Seu nome de usuário"
                                        className="w-full h-11 pl-10 pr-4 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5D23]/60" />
                                    <input
                                        type="email"
                                        value={recovery.email}
                                        onChange={(e) => setRecovery({ ...recovery, email: e.target.value })}
                                        placeholder="Seu e-mail cadastrado"
                                        className="w-full h-11 pl-10 pr-4 bg-white border border-[#4A5D23]/50 rounded-lg text-sm text-[#2D2D2D] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full h-11 mt-6 bg-[#4A5D23] hover:bg-[#3E5019] text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            Enviar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}