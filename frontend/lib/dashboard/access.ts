export type DashboardScope = "overview" | "estoque" | "caixas" | "precos" | "mita-ai";

export type DashboardPath =
  | "/dashboard"
  | "/dashboard/estoque"
  | "/dashboard/caixas"
  | "/dashboard/precos"
  | "/dashboard/mita-ai";

export type DashboardNavItem = {
  href: DashboardPath;
  label: string;
};

const ALL_DASHBOARD_PATHS: DashboardPath[] = [
  "/dashboard",
  "/dashboard/estoque",
  "/dashboard/caixas",
  "/dashboard/precos",
  "/dashboard/mita-ai",
];

const DASHBOARD_SCOPE_PATHS: Record<DashboardScope, DashboardPath> = {
  overview: "/dashboard",
  estoque: "/dashboard/estoque",
  caixas: "/dashboard/caixas",
  precos: "/dashboard/precos",
  "mita-ai": "/dashboard/mita-ai",
};

const RESTRICTED_SCOPE_BY_FUNCIONALIDADE: Record<string, DashboardScope[]> = {
  "registro de estoque": ["estoque"],
  "registro de caixas": ["caixas"],
  "busca de precos": ["precos"],
};

export function normalizeFuncionalidade(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function getAllowedDashboardScopes(funcionalidade?: string | null): DashboardScope[] {
  const normalized = normalizeFuncionalidade(funcionalidade);
  return RESTRICTED_SCOPE_BY_FUNCIONALIDADE[normalized] ?? [
    "overview",
    "estoque",
    "caixas",
    "precos",
    "mita-ai",
  ];
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
  return getAllowedDashboardPaths(funcionalidade)[0] ?? "/dashboard";
}

export function getDashboardScopeFromPath(pathname: string): DashboardScope | null {
  const path = pathname.toLowerCase();
  if (path === "/dashboard") {
    return "overview";
  }
  if (path === "/dashboard/estoque") {
    return "estoque";
  }
  if (path === "/dashboard/caixas") {
    return "caixas";
  }
  if (path === "/dashboard/precos") {
    return "precos";
  }
  if (path === "/dashboard/mita-ai") {
    return "mita-ai";
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
