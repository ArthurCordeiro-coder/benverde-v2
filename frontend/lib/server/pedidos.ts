import "server-only";

import { createHash } from "node:crypto";

import { execute } from "@/lib/server/db";

// Registro vindo do cliente (processamento de PDF no navegador). Espelha o
// formato produzido por carregar_registros_upload_pdf (processor.py).
export type RegistroPedidoInput = {
  ARQUIVO?: unknown;
  Data?: unknown;
  Loja?: unknown;
  Produto?: unknown;
  UNID?: unknown;
  QUANT?: unknown;
  "VALOR TOTAL"?: unknown;
  "VALOR UNIT"?: unknown;
};

export type ResultadoInsercao = {
  inseridos: number;
  ignorados: number;
};

// Gera a chave única do pedido — espelha _chave_pedido do db_client.py.
function chavePedido(
  arquivo: string,
  loja: string,
  produto: string,
  quant: number,
  valorUnit: number,
): string {
  const src = `${arquivo}|${loja}|${produto}|${quant}|${valorUnit}`;
  return createHash("sha1").update(src).digest("hex");
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

let indexReady: Promise<void> | null = null;

// Garante o índice único em cache_pedidos.key (necessário para o ON CONFLICT).
// Auto-cura duplicatas pré-existentes (mantém o maior id) antes de criar, para
// não falhar caso a tabela tenha sido populada sem a constraint. Idempotente.
async function ensurePedidosKeyIndex(): Promise<void> {
  if (!indexReady) {
    indexReady = (async () => {
      await execute(
        `DELETE FROM cache_pedidos a
         USING cache_pedidos b
         WHERE a.key = b.key AND a.id < b.id AND a.key IS NOT NULL`,
      );
      await execute(
        `CREATE UNIQUE INDEX IF NOT EXISTS cache_pedidos_key_idx
         ON cache_pedidos (key)`,
      );
    })().catch((error) => {
      indexReady = null;
      throw error;
    });
  }
  await indexReady;
}

/**
 * Insere/atualiza registros de pedidos em cache_pedidos. Não extrai nada — só
 * persiste o que o cliente processou. Idempotente via ON CONFLICT (key).
 */
export async function inserirPedidos(
  registros: RegistroPedidoInput[],
): Promise<ResultadoInsercao> {
  if (!Array.isArray(registros) || registros.length === 0) {
    return { inseridos: 0, ignorados: 0 };
  }

  await ensurePedidosKeyIndex();

  const agora = new Date();
  let inseridos = 0;
  let ignorados = 0;

  for (const reg of registros) {
    const produto = String(reg.Produto ?? "").trim();
    if (!produto) {
      ignorados += 1;
      continue;
    }

    const arquivo = String(reg.ARQUIVO ?? "").trim();
    const loja = String(reg.Loja ?? "").trim();
    const unidade = String(reg.UNID ?? "").trim();
    const quant = toNumberOrNull(reg.QUANT);
    const valorTotal = toNumberOrNull(reg["VALOR TOTAL"]);
    const valorUnit = toNumberOrNull(reg["VALOR UNIT"]);
    const data = toDateOrNull(reg.Data);
    const key = chavePedido(arquivo, loja, produto, quant ?? 0, valorUnit ?? 0);

    await execute(
      `INSERT INTO cache_pedidos
         (arquivo_pdf, data, loja, produto, unidade, quant, valor_total, valor_unit, key, payload, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (key) DO UPDATE SET
         quant = EXCLUDED.quant,
         valor_total = EXCLUDED.valor_total,
         valor_unit = EXCLUDED.valor_unit,
         payload = EXCLUDED.payload,
         updated_at = EXCLUDED.updated_at`,
      [
        arquivo,
        data,
        loja,
        produto,
        unidade,
        quant,
        valorTotal,
        valorUnit,
        key,
        JSON.stringify(reg),
        agora,
      ],
    );
    inseridos += 1;
  }

  return { inseridos, ignorados };
}
