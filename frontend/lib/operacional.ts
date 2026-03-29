export type LinhaOperacionalTipo = "entrada" | "saida" | "bonificacao";

export type LojaOption = {
  numero: number;
  value: string;
  label: string;
};

export const VARIEDADES_OFICIAIS = [
  "BANANA NANICA",
  "BANANA DA TERRA",
  "BANANA PRATA",
  "BANANA MA\u00c7\u00c3",
] as const;

export const INPUT_GLASS =
  "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-benverde-accent focus:ring-1 focus:ring-benverde-accent transition-all";

export const CARD_GLASS =
  "rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-2xl";

export const BUTTON_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-benverde-accent/30 bg-benverde-accent/20 px-4 py-2 font-medium text-benverde-accent transition-all hover:border-benverde-accent/50 hover:bg-benverde-accent/30";

export const BUTTON_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/20 px-4 py-2 font-medium text-rose-300 transition-all hover:border-rose-500/50 hover:bg-rose-500/30";

const LOJAS_NOMEADAS: Record<number, string> = {
  1: "Suzano",
  4: "Sao Paulo",
  10: "Taubate",
};

export const LOJAS_OPERACIONAIS: LojaOption[] = Array.from(
  { length: 36 },
  (_, index) => {
    const numero = index + 1;
    const codigo = String(numero).padStart(2, "0");
    const nome = LOJAS_NOMEADAS[numero];
    const base = `Loja ${codigo}`;
    const label = nome ? `${base} - ${nome}` : base;
    return {
      numero,
      value: label,
      label,
    };
  },
);

export function createUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizarVariedadeOficial(valor?: string | null): string {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

  if (texto.includes("BANANA DA TERRA")) {
    return "BANANA DA TERRA";
  }
  if (texto.includes("BANANA PRATA")) {
    return "BANANA PRATA";
  }
  if (texto.includes("BANANA NANI")) {
    return "BANANA NANICA";
  }
  if (texto.includes("BANANA MACA")) {
    return "BANANA MA\u00c7\u00c3";
  }
  return "BANANA NANICA";
}

export function getTodayDateInputValue(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function toLocalDayKey(valor?: string | null): string {
  if (!valor) {
    return "";
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) {
    return value;
  }
  return data.toLocaleString("pt-BR");
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) {
    return value;
  }
  return data.toLocaleDateString("pt-BR");
}

export function extractLojaNumero(loja?: string | null): number {
  const match = String(loja ?? "").match(/(\d{1,2})/);
  return match ? Number(match[1]) : 0;
}
