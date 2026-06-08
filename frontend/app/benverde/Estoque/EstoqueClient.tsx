"use client";

import { type ReactNode, useState } from "react";
import { Banana, BarChart3, FileText, Leaf, Menu, X } from "lucide-react";
import EstoqueRegistro from "./EstoqueRegistro";
import EstoqueDashboard from "../dashboard/estoque/EstoqueDashboard";

type Aba = "registro" | "dashboard";

const ABAS: Array<{ id: Aba; label: string; icon: ReactNode }> = [
  { id: "registro", label: "Registro", icon: <FileText size={18} /> },
  { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={18} /> },
];

function getNavClass(active: boolean) {
  return `w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-medium text-sm ${
    active
      ? "bg-gradient-to-r from-green-500/20 to-emerald-500/10 text-green-300 border border-green-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
      : "text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent"
  }`;
}

export default function EstoqueClient() {
  const [aba, setAba] = useState<Aba>("registro");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const selecionarAba = (id: Aba) => {
    setAba(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#070d09] text-gray-100">
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
              <h1 className="text-xl font-bold tracking-tight text-white">Estoque</h1>
              <p className="text-xs font-medium text-green-400">Bananas</p>
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
            Funções
          </p>
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selecionarAba(item.id)}
              className={getNavClass(aba === item.id)}
            >
              <span className={aba === item.id ? "text-green-400" : ""}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="relative z-10 flex h-screen flex-1 flex-col overflow-hidden">
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
              <Banana size={16} className="text-yellow-200" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              {aba === "registro" ? "Registro" : "Dashboard"}
            </span>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto">
          {aba === "registro" ? (
            <EstoqueRegistro />
          ) : (
            <div className="p-4 lg:p-8">
              <EstoqueDashboard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
