"use client";

import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  /** Cor do ícone (ex.: "text-emerald-400"). */
  iconClassName?: string;
  /** Título em caixa alta compacta (estilo dos painéis de preços/estoque). */
  uppercaseTitle?: boolean;
};

export function GlassCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  iconClassName = "",
  uppercaseTitle = false,
}: GlassCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-2xl border border-white/5 bg-white/5 p-3 shadow-inner ${iconClassName}`}>
          {icon}
        </div>
        {trend === "up" ? <TrendingUp size={20} className="text-green-400" /> : null}
        {trend === "down" ? <TrendingDown size={20} className="text-red-400" /> : null}
        {trend === "neutral" ? <Activity size={20} className="text-blue-400" /> : null}
      </div>
      <div>
        <p
          className={
            uppercaseTitle
              ? "mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500"
              : "mb-1 text-sm font-medium text-gray-400"
          }
        >
          {title}
        </p>
        <h3 className="mb-2 text-3xl font-bold tracking-tight text-white">{value}</h3>
        <p className={uppercaseTitle ? "text-xs font-medium text-gray-400" : "text-xs font-medium text-gray-500"}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
