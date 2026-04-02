"use client";

import api from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  AlertCircle,
  Banana,
  BarChart3,
  Check,
  Leaf,
  LogOut,
  MessageCircleMore,
  PackageSearch,
  Tags,
  Users,
  X,
} from "lucide-react";

type DashboardLayoutProps = {
  children: ReactNode;
};

type PendingUser = {
  username: string;
  nome: string | null;
  email: string | null;
  funcionalidade: string | null;
};

type ApiError = {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
};

type NavItemProps = {
  icon: ReactNode;
  label: string;
  active: boolean;
  href?: string;
  isHighlight?: boolean;
  onClick?: () => void;
};

const navItems = [
  { href: "/dashboard", label: "Resumo & Metas", icon: <BarChart3 size={18} /> },
  { href: "/dashboard/estoque", label: "Estoque de Bananas", icon: <Banana size={18} /> },
  { href: "/dashboard/caixas", label: "Caixas das Lojas", icon: <PackageSearch size={18} /> },
  { href: "/dashboard/precos", label: "Precos Concorrentes", icon: <Tags size={18} /> },
  { href: "/dashboard/mita-ai", label: "Mita AI", icon: <MessageCircleMore size={18} /> },
];

function getNavClass(active: boolean, isHighlight = false) {
  return `w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-medium text-sm ${
    active
      ? "bg-gradient-to-r from-green-500/20 to-emerald-500/10 text-green-300 border border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
      : "text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent"
  } ${
    isHighlight && !active
      ? "bg-emerald-900/20 border-emerald-500/10 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-900/40"
      : ""
  }`;
}

function NavItem({ icon, label, active, href, isHighlight = false, onClick }: NavItemProps) {
  const className = getNavClass(active, isHighlight);

  if (href) {
    return (
      <Link href={href} className={className}>
        <span className={active ? "text-green-400" : ""}>{icon}</span>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <span className={active ? "text-green-400" : ""}>{icon}</span>
      {label}
    </button>
  );
}

function getErrorDetail(error: unknown): string | undefined {
  return (error as ApiError | undefined)?.response?.data?.detail;
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as ApiError | undefined)?.response?.status;
}

function formatPendingEmail(email?: string | null) {
  const normalizedEmail = email?.trim();
  return normalizedEmail ? normalizedEmail : "E-mail nao informado";
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [pendingSuccess, setPendingSuccess] = useState("");
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const carregarPendentes = async () => {
    if (!isAdmin) {
      return;
    }

    setPendingLoading(true);
    setPendingError("");
    try {
      const pendingResponse = await api.get("/api/admin/pending");
      const pendingItems = Array.isArray(pendingResponse.data?.items)
        ? pendingResponse.data.items
        : [];
      setPendingUsers(pendingItems);
    } catch (error: unknown) {
      if (getErrorStatus(error) === 403) {
        setIsAdmin(false);
        setPendingUsers([]);
        setPendingModalOpen(false);
        return;
      }

      const detail = getErrorDetail(error);
      setPendingError(
        typeof detail === "string"
          ? detail
          : "Nao foi possivel carregar as solicitacoes pendentes.",
      );
    } finally {
      setPendingLoading(false);
    }
  };

  const handlePendingAction = async (username: string, action: "approve" | "reject") => {
    setPendingActionKey(`${action}:${username}`);
    setPendingError("");
    setPendingSuccess("");
    try {
      await api.post(`/api/admin/pending/${encodeURIComponent(username)}/${action}`);
      setPendingSuccess(
        action === "approve"
          ? `Usuario ${username} aprovado com sucesso.`
          : `Solicitacao de ${username} rejeitada.`,
      );
      await carregarPendentes();
    } catch (error: unknown) {
      const detail = getErrorDetail(error);
      setPendingError(
        typeof detail === "string" ? detail : "Nao foi possivel processar essa solicitacao.",
      );
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleLogout = () => {
    document.cookie = "benverde_token=; Max-Age=0; path=/; SameSite=Lax";
    setPendingModalOpen(false);
    router.replace("/login");
  };

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const meResponse = await api.get("/api/me");
        const admin = Boolean(
          meResponse.data?.role === "admin" || meResponse.data?.is_admin === true,
        );
        setIsAdmin(admin);

        if (!admin) {
          setPendingModalOpen(false);
          setPendingUsers([]);
        }
      } catch {
        setIsAdmin(false);
        setPendingModalOpen(false);
        setPendingUsers([]);
      }
    };

    void carregarPerfil();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#070d09] text-gray-100">
      <aside className="relative z-10 m-4 flex w-72 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-white/5 p-8">
          <div className="rounded-xl bg-gradient-to-br from-green-400 to-green-600 p-2 shadow-lg shadow-green-500/30">
            <Leaf size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Benverde</h1>
            <p className="text-xs font-medium text-green-400">Gestao Inteligente</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="mb-2 mt-4 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Painel Gerencial
          </p>

          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href}
            />
          ))}

          {isAdmin ? (
            <>
              <p className="mb-2 mt-8 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Administracao
              </p>
              <NavItem
                icon={<Users size={18} />}
                label="Usuarios Pendentes"
                active={pendingModalOpen}
                isHighlight
                onClick={() => {
                  setPendingError("");
                  setPendingSuccess("");
                  setPendingModalOpen(true);
                  void carregarPendentes();
                }}
              />
            </>
          ) : null}
        </nav>

        <div className="border-t border-white/5 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-gray-400 transition-all duration-300 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} className="transition-colors group-hover:text-red-400" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="relative z-10 h-screen flex-1 overflow-y-auto p-8">{children}</main>

      {pendingModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6"
          onClick={() => {
            if (!pendingActionKey) {
              setPendingModalOpen(false);
            }
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#0b1f15]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Aprovar acessos</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Revise solicitacoes pendentes e aprove ou rejeite novos usuarios.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void carregarPendentes()}
                  disabled={pendingLoading}
                  className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingLoading ? "Atualizando..." : "Atualizar lista"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingModalOpen(false)}
                  disabled={Boolean(pendingActionKey)}
                  className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Fechar modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {pendingSuccess ? (
              <p className="mb-3 rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {pendingSuccess}
              </p>
            ) : null}

            {pendingError ? (
              <p className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {pendingError}
              </p>
            ) : null}

            {pendingLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-200">
                <AlertCircle className="h-4 w-4 text-emerald-300" />
                Carregando solicitacoes...
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
                Nenhuma solicitacao pendente no momento.
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {pendingUsers.map((pendingUser) => {
                  const approveKey = `approve:${pendingUser.username}`;
                  const rejectKey = `reject:${pendingUser.username}`;
                  const actionInProgress =
                    pendingActionKey === approveKey || pendingActionKey === rejectKey;

                  return (
                    <div
                      key={pendingUser.username}
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                              Username
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              @{pendingUser.username}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                              Nome
                            </p>
                            <p className="mt-1 text-sm text-slate-100">
                              {pendingUser.nome || pendingUser.username}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                              Email
                            </p>
                            <p className="mt-1 break-all text-sm text-slate-100">
                              {formatPendingEmail(pendingUser.email)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                              Funcao
                            </p>
                            <p className="mt-1 text-sm text-slate-100">
                              {pendingUser.funcionalidade || "Administracao geral"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 md:justify-end">
                          <button
                            type="button"
                            onClick={() => void handlePendingAction(pendingUser.username, "approve")}
                            disabled={actionInProgress}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Check className="h-4 w-4" />
                            Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePendingAction(pendingUser.username, "reject")}
                            disabled={actionInProgress}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300/35 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <X className="h-4 w-4" />
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
