"use client";

import { type DashboardPath, getAllowedDashboardPaths } from "@/lib/dashboard/access";
import api from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  AlertCircle,
  Archive,
  Banana,
  BarChart3,
  Check,
  ChevronDown,
  Leaf,
  LogOut,
  Menu,
  MessageCircleMore,
  PackageSearch,
  Tags,
  Users,
  Store,
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

type MeResponse = {
  role?: string;
  is_admin?: boolean;
  funcionalidade?: string | null;
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

const panelItems: Array<{ href: DashboardPath; label: string; icon: ReactNode }> = [
  { href: "/benverde/dashboard", label: "Painel Principal", icon: <BarChart3 size={18} /> },
  { href: "/benverde/dashboard/estoque", label: "Estoque de Bananas", icon: <Banana size={18} /> },
  { href: "/benverde/dashboard/caixas", label: "Caixas das Lojas", icon: <PackageSearch size={18} /> },
  { href: "/benverde/dashboard/precos", label: "Preços Concorrentes", icon: <Tags size={18} /> },
  { href: "/benverde/dashboard/lojas", label: "Lojas", icon: <Store size={18} /> },
  { href: "/benverde/dashboard/drive", label: "Arquivos", icon: <Archive size={18} /> },
];

const featuredItems: Array<{ href: DashboardPath; label: string; icon: ReactNode }> = [
  { href: "/benverde/dashboard/mita-ai", label: "Lumii AI", icon: <MessageCircleMore size={18} /> },
];

const PAINEIS_STORAGE_KEY = "lumii_paineis_expanded";

function getNavClass(active: boolean, isHighlight = false) {
  return `w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-medium text-sm ${active
    ? "bg-gradient-to-r from-green-500/20 to-emerald-500/10 text-green-300 border border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
    : "text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent"
    } ${isHighlight && !active
      ? "bg-emerald-900/20 border-emerald-500/10 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-900/40"
      : ""
    }`;
}

function NavItem({ icon, label, active, href, isHighlight = false, onClick }: NavItemProps) {
  const className = getNavClass(active, isHighlight);

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
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
  return normalizedEmail ? normalizedEmail : "E-mail não informado";
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [funcionalidade, setFuncionalidade] = useState<string>("administracao geral");
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [pendingSuccess, setPendingSuccess] = useState("");
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Fecha o menu lateral (drawer) ao trocar de rota no mobile.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const allowedDashboardPaths = getAllowedDashboardPaths(funcionalidade);
  const visiblePanelItems = panelItems.filter((item) => allowedDashboardPaths.includes(item.href));
  const visibleFeaturedItems = featuredItems.filter((item) => allowedDashboardPaths.includes(item.href));
  const totalVisibleItems = visiblePanelItems.length + visibleFeaturedItems.length;

  const [paneisExpanded, setPaneisExpanded] = useState(true);

  // Load persisted preference after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PAINEIS_STORAGE_KEY);
    if (stored !== null) {
      setPaneisExpanded(stored === "true");
    }
  }, []);

  const togglePaneis = () => {
    setPaneisExpanded((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PAINEIS_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  const carregarPendentes = async () => {
    if (!isAdmin) {
      return;
    }

    setPendingLoading(true);
    setPendingError("");
    try {
      const pendingResponse = await api.get<{ items?: PendingUser[] }>("/api/admin/pending");
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
          : "Não foi possível carregar as solicitações pendentes.",
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
          ? `Usuário ${username} aprovado com sucesso.`
          : `Solicitação de ${username} rejeitada.`,
      );
      await carregarPendentes();
    } catch (error: unknown) {
      const detail = getErrorDetail(error);
      setPendingError(
        typeof detail === "string" ? detail : "Não foi possível processar essa solicitação.",
      );
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/logout");
    } catch {
      // Mesmo se a rota falhar, seguimos para limpar a sessao visualmente.
    } finally {
      setPendingModalOpen(false);
      router.replace("/login");
    }
  };

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const meResponse = await api.get<MeResponse>("/api/me");
        const admin = Boolean(
          meResponse.data?.role === "admin" || meResponse.data?.is_admin === true,
        );
        const nextFuncionalidade = meResponse.data?.funcionalidade || "administracao geral";

        setIsAdmin(admin);
        setFuncionalidade(nextFuncionalidade);

        if (!admin) {
          setPendingModalOpen(false);
          setPendingUsers([]);
        }

        const nextAllowedPaths = getAllowedDashboardPaths(nextFuncionalidade);
        if (!nextAllowedPaths.some((path) => path === pathname)) {
          router.replace(nextAllowedPaths[0] ?? "/login");
        }
      } catch {
        setIsAdmin(false);
        setFuncionalidade("administracao geral");
        setPendingModalOpen(false);
        setPendingUsers([]);
        router.replace("/login");
      }
    };

    void carregarPerfil();
  }, [pathname, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#070d09] text-gray-100" style={{ height: "100dvh" }}>
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-white/10 bg-[#0a130d]/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 lg:relative lg:z-10 lg:m-4 lg:translate-x-0 lg:rounded-3xl lg:border lg:bg-white/[0.03] ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/5 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-green-400 to-green-600 p-2 shadow-lg shadow-green-500/30">
              <Leaf size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Benverde</h1>
              <p className="text-xs font-medium text-green-400">Gestão Inteligente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            <p className="mb-2 mt-4 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {totalVisibleItems <= 1 ? "Painel Operacional" : "Painel Gerencial"}
            </p>

            {visiblePanelItems.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={togglePaneis}
                  aria-expanded={paneisExpanded}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                >
                  <span>Painéis</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${paneisExpanded ? "" : "-rotate-90"}`}
                  />
                </button>

                {paneisExpanded ? (
                  <div className="space-y-2">
                    {visiblePanelItems.map((item) => (
                      <NavItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        active={pathname === item.href}
                        onClick={() => setMobileNavOpen(false)}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {visibleFeaturedItems.length > 0 ? (
              <div className={visiblePanelItems.length > 0 ? "pt-2" : ""}>
                {visibleFeaturedItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={pathname === item.href}
                    isHighlight
                    onClick={() => setMobileNavOpen(false)}
                  />
                ))}
              </div>
            ) : null}

            {isAdmin ? (
              <>
                <p className="mb-2 mt-8 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Administração
                </p>
                <NavItem
                  icon={<Users size={18} />}
                  label="Usuários Pendentes"
                  active={pendingModalOpen}
                  isHighlight
                  onClick={() => {
                    setMobileNavOpen(false);
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
              onClick={() => void handleLogout()}
              className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-gray-400 transition-all duration-300 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={18} className="transition-colors group-hover:text-red-400" />
              Sair do Sistema
            </button>
          </div>
        </aside>

        <div className="relative z-10 flex h-full flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b border-white/5 bg-[#070d09]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-green-400 to-green-600 p-1.5 shadow-lg shadow-green-500/30">
                <Leaf size={16} className="text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">Benverde</span>
            </div>
          </header>

          <main className="relative flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
        </div>

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
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-[#0b1f15]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-6"
            >
              <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Aprovar acessos</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Revise solicitações pendentes e aprove ou rejeite novos usuários.
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
                  Carregando solicitações...
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
                  Nenhuma solicitação pendente no momento.
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
                                Função
                              </p>
                              <p className="mt-1 text-sm text-slate-100">
                                {pendingUser.funcionalidade || "Administração geral"}
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
