import "server-only";

import { badRequest } from "@/lib/server/errors";
import { execute, queryRows } from "@/lib/server/db";
import { parseDateValue } from "@/lib/server/normalization";

export type CaixaRegistro = {
  id: number;
  data: string | null;
  loja: string | null;
  n_loja: number;
  caixas_benverde: number;
  caixas_ccj: number;
  ccj_banca: number;
  ccj_mercadoria: number;
  ccj_retirada: number;
  caixas_bananas: number;
  total: number;
  entregue: string;
};

function toInteger(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.trunc(parsed);
}

function normalizeEntregue(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "sim" ? "sim" : "nao";
}

function serializeCaixa(row: Record<string, unknown>): CaixaRegistro {
  const data = parseDateValue(row.data);
  return {
    id: toInteger(row.id),
    data: data ? data.toISOString().slice(0, 10) : null,
    loja: row.loja ? String(row.loja) : null,
    n_loja: toInteger(row.n_loja),
    caixas_benverde: toInteger(row.caixas_benverde),
    caixas_ccj: toInteger(row.caixas_ccj),
    ccj_banca: toInteger(row.ccj_banca),
    ccj_mercadoria: toInteger(row.ccj_mercadoria),
    ccj_retirada: toInteger(row.ccj_retirada),
    caixas_bananas: toInteger(row.caixas_bananas),
    total: toInteger(row.total),
    entregue: normalizeEntregue(row.entregue),
  };
}

export async function getCaixas(mes?: string): Promise<CaixaRegistro[]> {
  let query = `
     SELECT id, data, loja, n_loja, caixas_benverde, caixas_ccj, ccj_banca,
            ccj_mercadoria, ccj_retirada, caixas_bananas, total, entregue
     FROM caixas_lojas
  `;
  const params: any[] = [];

  if (mes) {
    query += ` WHERE TO_CHAR(data, 'YYYY-MM') = $1`;
    params.push(mes);
  }

  query += ` ORDER BY data DESC NULLS LAST, id DESC`;

  const rows = await queryRows<Record<string, unknown>>(query, params);
  return rows.map(serializeCaixa);
}

export async function createCaixa(payload: unknown): Promise<number> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    badRequest("Payload deve ser um objeto JSON.");
  }

  const raw = payload as Record<string, unknown>;
  const loja = String(raw.loja ?? "").trim();
  if (!loja) {
    badRequest("Informe a loja.");
  }

  const data = parseDateValue(raw.data);
  if (!data) {
    badRequest("Informe uma data valida.");
  }

  const caixasBenverde = toInteger(raw.caixas_benverde ?? raw.total);
  const caixasCcj = toInteger(raw.caixas_ccj);
  const ccjBanca = toInteger(raw.ccj_banca);
  const ccjMercadoria = toInteger(raw.ccj_mercadoria);
  const ccjRetirada = toInteger(raw.ccj_retirada);
  const caixasBananas = toInteger(raw.caixas_bananas);
  const total =
    raw.total !== undefined
      ? toInteger(raw.total)
      : caixasBenverde + caixasCcj + ccjBanca + ccjMercadoria + ccjRetirada + caixasBananas;

  if (total <= 0) {
    badRequest("Informe a quantidade total de caixas.");
  }

  const rows = await queryRows<Record<string, unknown>>(
    `INSERT INTO caixas_lojas (
      data, loja, n_loja, caixas_benverde, caixas_ccj, ccj_banca,
      ccj_mercadoria, ccj_retirada, caixas_bananas, total, entregue
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [
      data,
      loja,
      toInteger(raw.n_loja),
      caixasBenverde,
      caixasCcj,
      ccjBanca,
      ccjMercadoria,
      ccjRetirada,
      caixasBananas,
      total,
      normalizeEntregue(raw.entregue),
    ],
  );

  return toInteger(rows[0]?.id);
}

export async function updateCaixaEntregue(id: number, payload: unknown): Promise<CaixaRegistro> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    badRequest("Payload deve ser um objeto JSON.");
  }

  const entregue = normalizeEntregue((payload as Record<string, unknown>).entregue);
  const rows = await queryRows<Record<string, unknown>>(
    `UPDATE caixas_lojas
     SET entregue = $2
     WHERE id = $1
     RETURNING id, data, loja, n_loja, caixas_benverde, caixas_ccj, ccj_banca,
               ccj_mercadoria, ccj_retirada, caixas_bananas, total, entregue`,
    [id, entregue],
  );

  if (rows.length === 0) {
    badRequest("Registro de caixa não encontrado.");
  }

  return serializeCaixa(rows[0]);
}

export async function deleteCaixa(id: number): Promise<void> {
  const rows = await queryRows<Record<string, unknown>>(
    `DELETE FROM caixas_lojas WHERE id = $1 RETURNING id`,
    [id]
  );

  if (rows.length === 0) {
    badRequest("Registro de caixa não encontrado.");
  }
}
