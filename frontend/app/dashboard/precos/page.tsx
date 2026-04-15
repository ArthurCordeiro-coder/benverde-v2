"use client";

import { Settings, ShieldAlert } from "lucide-react";

export default function PrecosPage() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-4">
      <div className="relative flex flex-col items-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-16 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] backdrop-blur-3xl transition-all hover:bg-white/[0.04]">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-yellow-500/10 blur-[100px]" />
        
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute animate-spin opacity-20">
            <Settings size={120} strokeWidth={1} className="text-white" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <ShieldAlert size={40} className="text-yellow-400" />
          </div>
        </div>
        
        <div className="relative text-center">
          <h1 className="mb-4 text-5xl font-black uppercase tracking-[0.25em] text-white">
            Manutenção
          </h1>
          <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <p className="max-w-md text-base font-medium leading-relaxed text-gray-400">
            O módulo de inteligência de preços está passando por uma atualização técnica programada para otimização de performance.
          </p>
        </div>

        <div className="mt-12 flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-6 py-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Sincronização em curso
          </span>
        </div>
      </div>
    </div>
  );
}
