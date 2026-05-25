export type DashboardScope = "overview" | "estoque" | "caixas" | "precos" | "mita-ai" | "lojas" | "drive";

export type DashboardPath =
  | "/benverde/dashboard"
  | "/benverde/dashboard/estoque"
  | "/benverde/dashboard/caixas"
  | "/benverde/dashboard/precos"
  | "/benverde/dashboard/mita-ai"
  | "/benverde/dashboard/lojas"
  | "/benverde/dashboard/drive";

export type DashboardNavItem = {
  href: DashboardPath;
  label: string;
};

const ALL_DASHBOARD_PATHS: DashboardPath[] = [
  "/benverde/dashboard",
  "/benverde/dashboard/estoque",
  "/benverde/dashboard/caixas",
  "/benverde/dashboard/precos",
  "/benverde/dashboard/mita-ai",
  "/benverde/dashboard/lojas",
  "/benverde/dashboard/drive",
];

const DASHBOARD_SCOPE_PATHS: Record<DashboardScope, DashboardPath> = {
  overview: "/benverde/dashboard",
  estoque: "/benverde/dashboard/estoque",
  caixas: "/benverde/dashboard/caixas",
  precos: "/benverde/dashboard/precos",
  "mita-ai": "/benverde/dashboard/mita-ai",
  lojas: "/benverde/dashboard/lojas",
  drive: "/benverde/dashboard/drive",
};

const RESTRICTED_SCOPE_BY_FUNCIONALIDADE: Record<string, DashboardScope[]> = {
  "registro de estoque": ["estoque"],
  "registro de caixas": ["caixas"],
  "busca de precos": ["precos"],
};

const DRIVE_ALLOWED_FUNCIONALIDADES = new Set(["administracao geral"]);

export function normalizeFuncionalidade(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function getAllowedDashboardScopes(funcionalidade?: string | null): DashboardScope[] {
  const normalized = normalizeFuncionalidade(funcionalidade);
  const restricted = RESTRICTED_SCOPE_BY_FUNCIONALIDADE[normalized];
  if (restricted) {
    return restricted;
  }

  const baseScopes: DashboardScope[] = [
    "overview",
    "estoque",
    "caixas",
    "precos",
    "mita-ai",
    "lojas",
  ];

  if (DRIVE_ALLOWED_FUNCIONALIDADES.has(normalized)) {
    baseScopes.push("drive");
  }

  return baseScopes;
}

export function canAccessDashboardScope(
  funcionalidade: string | null | undefined,
  scope: DashboardScope,
): boolean {
  return getAllowedDashboardScopes(funcionalidade).includes(scope);
}

export function getAllowedDashboardPaths(funcionalidade?: string | null): DashboardPath[] {
  return getAllowedDashboardScopes(funcionalidade).map((scope) => DASHBOARD_SCOPE_PATHS[scope]);
}

export function getDefaultDashboardPath(funcionalidade?: string | null): DashboardPath {
  return getAllowedDashboardPaths(funcionalidade)[0] ?? "/benverde/dashboard";
}

export function getDashboardScopeFromPath(pathname: string): DashboardScope | null {
  const path = pathname.toLowerCase();
  if (path === "/benverde/dashboard") {
    return "overview";
  }
  if (path === "/benverde/dashboard/estoque") {
    return "estoque";
  }
  if (path === "/benverde/dashboard/caixas") {
    return "caixas";
  }
  if (path === "/benverde/dashboard/precos") {
    return "precos";
  }
  if (path === "/benverde/dashboard/mita-ai") {
    return "mita-ai";
  }
  if (path === "/benverde/dashboard/lojas" || path.startsWith("/benverde/dashboard/lojas/")) {
    return "lojas";
  }
  if (path === "/benverde/dashboard/drive") {
    return "drive";
  }
  return null;
}

export function isDashboardPathAllowed(
  funcionalidade: string | null | undefined,
  pathname: string,
): boolean {
  const scope = getDashboardScopeFromPath(pathname);
  if (!scope) {
    return false;
  }
  return canAccessDashboardScope(funcionalidade, scope);
}

export function isKnownDashboardPath(pathname: string): pathname is DashboardPath {
  return ALL_DASHBOARD_PATHS.includes(pathname as DashboardPath);
}
