// Shared types for the Lumii Preços app (ported from the design bundle,
// adapted to the real /api/precos/overview backend shape).

export type Categoria = "Frutas" | "Legumes" | "Verduras" | "Outros";

export type ProduceKind = string;

// Raw backend shapes (mirror lib/server/precos.ts).
export type PriceSnapshotItem = {
  produto: string;
  prices: Record<string, number | null>;
  statuses?: Record<string, string>;
  matches?: Record<string, string>;
};

export type PriceOverview = {
  latestDate: string | null;
  dates: Array<{ key: string; label: string }>;
  markets: string[];
  snapshots: Record<string, PriceSnapshotItem[]>;
};

// A date option with its parsed Date (key is "DD-MM-YYYY" from the backend).
export type DateOption = {
  key: string; // "DD-MM-YYYY"
  label: string;
  iso: string; // "YYYY-MM-DD" for range math
  date: Date;
};

// A product derived from the snapshots, enriched with inferred metadata.
export type Produto = {
  id: string;
  produto: string;
  categoria: Categoria;
  unidade: string; // "kg" | "un" | …
  art: ProduceKind;
};

// One flat row for the Tabela Completa (produto × data × concorrente).
export type FlatRow = {
  id: string;
  data: string; // dateKey "DD-MM-YYYY"
  iso: string; // "YYYY-MM-DD"
  produto: string;
  categoria: Categoria;
  unidade: string;
  concorrente: string;
  preco: number;
  melhorPreco: number | null;
  isBest: boolean;
  variacao: number; // % vs. product mean
};

export type CartItem = {
  id: string;
  produto: string;
  categoria: Categoria;
  art: ProduceKind;
  unidade: string;
  price: number | null;
  market: string | null;
};

export type ViewMode = "today" | "overall" | "monthly";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
  attachments?: Array<{ id: string; name: string; size?: number; kind: string }>;
  ts?: number;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  conversationId?: string | null; // server conversation id from /api/mita-ai/chat
  createdAt: number;
  updatedAt: number;
};

export type AiSeed = {
  seedText?: string;
  seedFiles?: Array<{ id: string; name: string; size?: number; kind: string }>;
} | null;

export type Route =
  | "inicio"
  | "comparacao"
  | "tabela"
  | "lumii-ai"
  | "conta-info"
  | "conta-seguranca"
  | "conta-status"
  | "conta-privacidade";
