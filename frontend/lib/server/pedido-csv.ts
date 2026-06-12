import "server-only";

// Parser determinístico do CSV de pedido por loja (Benverde).
// Lê SOMENTE o bloco detalhado por loja; ignora o resumo consolidado
// e as linhas de "Totais". Não usa IA.

export type ItemEstoque = {
  produto: string;
  quant: number;
  unidade: "KG";
  valor_unit: number;
  valor_total: number;
  loja: string;
};

const VARIEDADES: Array<{ canonico: string; termos: string[] }> = [
  { canonico: "BANANA NANICA",   termos: ["nanica", "nanicao", "nanicão", "caturra"] },
  { canonico: "BANANA DA TERRA", termos: ["da terra", "terra", "pacova", "pacovã", "pacovan"] },
  { canonico: "BANANA PRATA",    termos: ["prata", "branca"] },
  { canonico: "BANANA MAÇÃ",     termos: ["maca", "maça", "maçã"] },
];

// "5409,6" -> 5409.6 ; "12.390,00" -> 12390 ; "" -> NaN
function parseNum(raw: string): number {
  const s = (raw ?? "").trim();
  if (!s) return NaN;
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function normalizar(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos para casar termos
}

function mapearVariedade(descricao: string): string | null {
  const d = normalizar(descricao);
  if (!d.includes("banana")) return null;
  // PRATA antes de TERRA não importa aqui; cada termo é específico.
  for (const v of VARIEDADES) {
    if (v.termos.some((t) => d.includes(normalizar(t)))) return v.canonico;
  }
  return null; // contém "banana" mas não bate com nenhuma variedade -> ignora
}

/**
 * Cabeçalho do bloco por loja:
 * Loja;Entrega;GTIN/PLU Unitário;;Descrição do Produto;;Ref. Fornecedor;;;;;;;Qtde.;Custo;Total
 * As colunas têm campos vazios no meio, então localizamos por posição fixa
 * a partir do cabeçalho detectado, em vez de assumir índices cravados.
 */
export function parsePedidoCsv(conteudo: string): ItemEstoque[] {
  // remove BOM e divide em linhas
  const linhas = conteudo.replace(/^\uFEFF/, "").split(/\r?\n/);

  const itens: ItemEstoque[] = [];
  let dentroDoBlocoLoja = false;
  let idx: { loja: number; desc: number; qtde: number; custo: number; total: number } | null = null;

  for (const linha of linhas) {
    const col = linha.split(";");
    const primeira = normalizar(col[0] ?? "");

    // Detecta o cabeçalho do bloco por loja (começa com "Loja" e tem "Entrega")
    if (primeira === "loja" && normalizar(col[1] ?? "") === "entrega") {
      dentroDoBlocoLoja = true;
      idx = {
        loja: 0,
        desc: col.findIndex((c) => normalizar(c).includes("descricao")),
        qtde: col.findIndex((c) => normalizar(c).includes("qtde")),
        custo: col.findIndex((c) => normalizar(c).includes("custo")),
        total: col.findIndex((c) => normalizar(c).includes("total")),
      };
      continue;
    }

    if (!dentroDoBlocoLoja || !idx) continue;

    // Linha de "Totais" encerra um sub-bloco de loja -> ignora
    if (normalizar(col[idx.desc] ?? col[4] ?? "").includes("totais")) continue;

    const loja = (col[idx.loja] ?? "").trim();
    const descricao = (col[idx.desc] ?? "").trim();
    if (!loja || !descricao) continue;

    const produto = mapearVariedade(descricao);
    if (!produto) continue;

    const quant = parseNum(col[idx.qtde] ?? "");
    const valor_unit = parseNum(col[idx.custo] ?? "");
    const valor_total = parseNum(col[idx.total] ?? "");

    if (!(quant > 0)) continue;

    itens.push({
      produto,
      quant,
      unidade: "KG",
      valor_unit: Number.isFinite(valor_unit) ? valor_unit : 0,
      valor_total: Number.isFinite(valor_total) ? valor_total : 0,
      loja,
    });
  }

  return itens;
}

// Confere a aritmética linha a linha, no mesmo espírito da regra do prompt do PDF.
export function validarItens(itens: ItemEstoque[]): {
  ok: ItemEstoque[];
  suspeitos: Array<{ item: ItemEstoque; motivo: string }>;
} {
  const ok: ItemEstoque[] = [];
  const suspeitos: Array<{ item: ItemEstoque; motivo: string }> = [];

  for (const item of itens) {
    if (item.valor_unit > 0 && item.valor_total > 0) {
      const esperado = item.quant * item.valor_unit;
      const erro = Math.abs(esperado - item.valor_total) / item.valor_total;
      if (erro > 0.01) {
        suspeitos.push({ item, motivo: `quant×unit=${esperado} ≠ total=${item.valor_total}` });
        continue;
      }
    }
    ok.push(item);
  }
  return { ok, suspeitos };
}
