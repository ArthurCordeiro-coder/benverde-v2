"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  BarChart3,
  Banana,
  Tags,
  PackageSearch,
  LogOut,
  Users,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const NavItem = ({ href, icon, label, isHighlight = false }: any) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-medium text-sm
        ${
          isActive
            ? "bg-gradient-to-r from-green-500/20 to-emerald-500/10 text-green-300 border border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            : "text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent"
        }
        ${
          isHighlight && !isActive
            ? "bg-emerald-900/20 border-emerald-500/10 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-900/40"
            : ""
        }
      `}
      >
        <span className={isActive ? "text-green-400" : ""}>{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR - Liquid Glass */}
      <aside className="w-72 m-4 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden z-10">
        {/* Header da Sidebar */}
        <div className="p-8 flex items-center gap-3 border-b border-white/5">
          <div className="p-2 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg shadow-green-500/30">
            <Leaf size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Benverde</h1>
            <p className="text-xs text-green-400 font-medium">Gestao Inteligente</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-4 mb-2">
            Painel Gerencial
          </p>
          <NavItem href="/dashboard" icon={<BarChart3 size={18} />} label="Resumo & Metas" />
          <NavItem
            href="/dashboard/estoque"
            icon={<Banana size={18} />}
            label="Estoque de Bananas"
          />
          <NavItem
            href="/dashboard/caixas"
            icon={<PackageSearch size={18} />}
            label="Caixas das Lojas"
          />
          <NavItem
            href="/dashboard/precos"
            icon={<Tags size={18} />}
            label="Precos Concorrentes"
          />

          <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-8 mb-2">
            Acesso Operacional
          </p>
          <NavItem
            href="/registro"
            icon={<Users size={18} />}
            label="Registro de Estoque"
            isHighlight={true}
          />
        </nav>

        {/* Footer da Sidebar */}
        <div className="p-4 border-t border-white/5">
          <Link
            href="/login"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-300 group"
          >
            <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
            Sair do Sistema
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 h-screen overflow-y-auto z-10 relative">{children}</main>
    </div>
  );
}
