import { useCallback, useEffect, useMemo, useState } from "react";

import api from "@/lib/api";
import { buildOverviewData, type OverviewData } from "./overview";
import type { PriceOverview } from "./types";

type ApiError = {
  response?: { status?: number; data?: { detail?: string } };
};

export type UseOverviewResult = {
  data: OverviewData;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: (mode?: "initial" | "refresh") => Promise<void>;
};

export function useOverview(): UseOverviewResult {
  const [raw, setRaw] = useState<PriceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get<PriceOverview>("/api/precos/overview");
      setRaw(res.data);
      setError(null);
    } catch (e) {
      const status = (e as ApiError)?.response?.status;
      const detail = (e as ApiError)?.response?.data?.detail;
      if (status === 401) setError("Sua sessão expirou. Faça login novamente.");
      else if (typeof detail === "string" && detail.trim()) setError(detail);
      else setError("Não foi possível carregar os dados de preços concorrentes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reload("initial");
  }, [reload]);

  const data = useMemo(() => buildOverviewData(raw), [raw]);

  return { data, loading, refreshing, error, reload };
}
