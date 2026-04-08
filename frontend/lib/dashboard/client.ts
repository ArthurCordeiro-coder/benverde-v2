export type DashboardApiError = {
  request?: unknown;
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
};

export function getApiErrorDetail(error: unknown): string | null {
  const detail = (error as DashboardApiError | undefined)?.response?.data?.detail;
  return typeof detail === "string" && detail.trim() ? detail.trim() : null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorDetail(error) ?? fallback;
}

export function normalizeDashboardText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return fallback;
  }

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function createDraftId(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  const positive = (hash >>> 0) || 1;
  return -positive;
}
