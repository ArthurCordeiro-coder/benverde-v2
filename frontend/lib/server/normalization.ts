
export function stripAccents(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeText(value: unknown): string {
  const base = stripAccents(String(value ?? "").trim().toUpperCase());
  return base.replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeColumnName(value: unknown): string {
  return stripAccents(String(value ?? "").trim()).toLowerCase().replace(/\s+/g, " ");
}

export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value ?? "").trim();
  if (!raw || ["nan", "none", "-"].includes(raw.toLowerCase())) {
    return null;
  }

  let cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) {
    return null;
  }

  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function coercePositivePrice(value: unknown): number | null {
  const parsed = parseNumericValue(value);
  if (parsed === null || parsed <= 0) {
    return null;
  }
  return roundNumber(parsed);
}

export function roundNumber(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function parseDateValue(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  // Prefer day-first parsing for Brazilian date strings from the database,
  // e.g. 05/03/2026 should be interpreted as 5 March 2026.
  const dayFirstMatch = raw.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(
      dayFirstMatch[3].length === 2 ? `20${dayFirstMatch[3]}` : dayFirstMatch[3],
    );
    const hour = Number(dayFirstMatch[4] ?? 0);
    const minute = Number(dayFirstMatch[5] ?? 0);
    const second = Number(dayFirstMatch[6] ?? 0);
    const parsedDayFirst = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    return Number.isNaN(parsedDayFirst.getTime()) ? null : parsedDayFirst;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(value);
  const day = parts.find((p) => p.type === "day")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const year = parts.find((p) => p.type === "year")!.value;
  return `${day}-${month}-${year}`;
}

export function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
