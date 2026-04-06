import "server-only";

import { badRequest } from "@/lib/server/errors";
import { execute, queryRows } from "@/lib/server/db";
import { parseDateValue } from "@/lib/server/normalization";

export type Movimentacao = {
  id: number;
  data: string | null;
  tipo: string | null;
  produto: string | null;
  quant: number;
  unidade: string | null;
  loja: string | null;
  arquivo: string | null;
};

function serializeMovimentacao(row: Record<string, unknown>): Movimentacao {
  const data = parseDateValue(row.data);
  return {
    id: Number(row.id ?? 0),
    data: data ? data.toISOString() : null,
    tipo: row.tipo ? String(row.tipo) : null,
    produto: row.produto ? String(row.produto) : null,
    quant: Number(row.quant ?? 0),
    unidade: row.unidade ? String(row.unidade) : null,
    loja: row.loja ? String(row.loja) : null,
    arquivo: row.arquivo ? String(row.arquivo) : null,
  };
}

function parsePositiveQuantity(value: unknown): number {
  const quant = Number(value);
  if (!Number.isFinite(quant) || quant <= 0) {
    badRequest("Quantidade invalida.");
  }
  return quant;
}

function normalizeTipo(value: unknown): string {
  const tipo = String(value ?? "").trim().toLowerCase();
  if (tipo !== "entrada" && tipo !== "saida") {
    badRequest("Tipo de movimentacao invalido.");
  }
  return tipo;
}

export async function getMovimentacoes(): Promise<Movimentacao[]> {
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT id, data, tipo, produto, quant, unidade, loja, arquivo
     FROM estoque_manual
     ORDER BY id`,
  );
  return rows.map(serializeMovimentacao);
}

export async function saveMovimentacoes(payload: unknown): Promise<number> {
  const registros = Array.isArray(payload) ? payload : [payload];
  if (!Array.isArray(registros) || registros.length === 0) {
    badRequest("Payload deve ser objeto ou lista de objetos.");
  }

  for (const rawRegistro of registros) {
    if (!rawRegistro || typeof rawRegistro !== "object") {
      badRequest("Cada movimentacao precisa ser um objeto JSON.");
    }

    const registro = rawRegistro as Record<string, unknown>;
    const produto = String(registro.produto ?? "").trim();
    if (!produto) {
      badRequest("Toda movimentacao precisa informar o produto.");
    }

    const tipo = normalizeTipo(registro.tipo);
    const quant = parsePositiveQuantity(registro.quant);
    const data = parseDateValue(registro.data) ?? new Date();
    const unidade = String(registro.unidade ?? "KG").trim() || "KG";
    const loja = String(registro.loja ?? "").trim();
    const arquivo = String(registro.arquivo ?? "manual").trim() || "manual";

    await execute(
      `INSERT INTO estoque_manual (data, tipo, produto, quant, unidade, loja, arquivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data, tipo, produto, quant, unidade, loja, arquivo],
    );
  }

  return registros.length;
}

export async function removeMovimentacao(id: number): Promise<boolean> {
  const rows = await queryRows<{ id?: number }>(
    "DELETE FROM estoque_manual WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}

export async function getSaldoEstoque(): Promise<{ saldo: number; historico: Movimentacao[] }> {
  const historico = await getMovimentacoes();
  const saldo = historico.reduce((total, item) => {
    const quant = Number(item.quant ?? 0);
    if ((item.tipo ?? "").toLowerCase() === "saida") {
      return total - quant;
    }
    return total + quant;
  }, 0);

  return {
    saldo: Math.round(saldo * 100) / 100,
    historico,
  };
}
