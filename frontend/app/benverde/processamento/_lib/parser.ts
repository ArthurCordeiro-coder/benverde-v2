// Porte determinístico do processor.py (app desktop) para rodar no navegador.
// Mantém os mesmos regexes e regras de extração de DANFE/NF-e e pedidos Semar.
// Não depende do DOM nem de pdf.js — recebe texto/linhas já extraídos
// (ver pdf-text.ts) e devolve registros normalizados.

import type { Fragmento, PaginaPdf, ProdutoExtraido, RegistroPedido } from "./types";

// =============================================================================
// 1. REGEX (equivalentes aos do processor.py)
// Em JS usamos \p{L} (com flag u) no lugar das classes acentuadas do Python.
// =============================================================================
const RE_DANFE_LINHA =
  /^\s*\d+\s+(\p{L}[^\n]{2,80}?)\s+\d{8}\s+\d{3}\s+\d{4}\s+(KG|UN|CX|FD|PCT|SC|BAG|BD|BND|PT|BJ)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/gimu;
const RE_UN_QT_NCM = /\b(KG|UN|CX|FD|PCT|SC|BAG|BD|BND|PT|BJ)\s+([\d.,]+)/iu;
const RE_COD_BARRAS = /^c[oó]d\.?\s*(?:de\s*)?barras?[\s:]*[\d\s]+$/iu;
const RE_SO_DIGITOS = /^[\d\s]{8,}$/u;
const RE_TEM_NCM = /\b(KG|UN|CX|FD|PCT|SC|BAG|BD|BND|PT|BJ)\s+[\d.,]+/iu;
const RE_LIXO_DESC = /^(c[oó]d\.?\s*(?:de\s*)?barras?[\s:]*[\d\s]+|[\d]{6,}|\s*)$/iu;
const RE_KG_CX = /\bKG\s+CX\s+([\d]+(?:[.,]\d+)?)\b/iu;

const RE_PROD_SEMAR = /^(\p{L}[\p{L}\s]+?)\s+kg\b/iu;
const RE_DATA_SEMAR = /Data de emiss[aã]o[:\s]+(\d{2}\/\d{2}\/\d{4})/iu;
const RE_LOJA_SEMAR = /LOJA\s+(\d+)/iu;
const RE_QUANT_SEMAR = /^[\d.,]+$/u;

// =============================================================================
// 2. HELPERS
// =============================================================================
export function parseBr(val: unknown): number {
  let s = String(val ?? "").trim().replace(/\s+/g, "");
  if (!s || ["none", "nan", "-"].includes(s.toLowerCase())) return 0.0;
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  } else {
    const partes = s.split(".");
    if (partes.length === 2 && partes[1].length === 3) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0.0;
}

function resolverCxParaKg(
  produto: string,
  quant: number,
  unidade: string,
): [string, number, string] {
  if (unidade.toUpperCase() !== "CX") return [produto, quant, unidade];
  const m = RE_KG_CX.exec(produto);
  if (!m) return [produto, quant, unidade];
  const kgPorCx = parseBr(m[1]);
  if (kgPorCx <= 0) return [produto, quant, unidade];
  const nomeLimpo = produto.replace(RE_KG_CX, "").trim().replace(/^-+|-+$/g, "").trim();
  return [nomeLimpo, Math.round(quant * kgPorCx * 1000) / 1000, "KG"];
}

function subLinhas(celula: unknown): string[] {
  return String(celula ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

// =============================================================================
// 3. METADADOS DANFE (data, loja, municipio) — sem fallback para data atual
// =============================================================================
export function extrairMetadados(textoPagina: string): {
  data: Date | null;
  loja: string | null;
  municipio: string;
} {
  let data: Date | null = null;
  let loja: string | null = null;
  let municipio = "Desconhecido";
  if (!textoPagina) return { data, loja, municipio };

  const mData = /(\d{2})\/(\d{2})\/(\d{4})/.exec(textoPagina);
  if (mData) {
    const [, dd, mm, yyyy] = mData;
    const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(dt.getTime())) data = dt;
  }

  const mLoja = /(?:LJ|LOJA)\s*(\d{1,2})/i.exec(textoPagina);
  if (mLoja) {
    const n = Number(mLoja[1]);
    if (Number.isFinite(n)) loja = `Loja ${String(n).padStart(2, "0")}`;
  }

  const mMunicipio = /MUNIC[IÍ]PIO[\r\n]+([\p{Lu}\s]+)/iu.exec(textoPagina);
  if (mMunicipio) {
    const cru = mMunicipio[1].trim().split("\n")[0].trim();
    if (cru) municipio = cru;
  }

  return { data, loja, municipio };
}

// =============================================================================
// 4. EXTRAÇÃO DANFE (texto + fallback tabela reconstruída)
// =============================================================================
export function extrairProdutosTexto(texto: string): ProdutoExtraido[] {
  const registros: ProdutoExtraido[] = [];
  for (const m of texto.matchAll(RE_DANFE_LINHA)) {
    let desc = m[1].trim().toUpperCase();
    let unidade = m[2].toUpperCase();
    let quant = parseBr(m[3]);
    const vunit = parseBr(m[4]);
    const vtotal = parseBr(m[5]);
    if (quant <= 0 || desc.length < 3 || RE_SO_DIGITOS.test(desc)) continue;
    [desc, quant, unidade] = resolverCxParaKg(desc, quant, unidade);
    registros.push({ produto: desc, quant, unidade, valor_unit: vunit, valor_total: vtotal });
  }
  return registros;
}

function indiceColuna(cabecalho: string[], candidatos: string[]): number | null {
  for (const candidato of candidatos) {
    for (let i = 0; i < cabecalho.length; i++) {
      if (cabecalho[i].includes(candidato)) return i;
    }
  }
  return null;
}

// pdfplumber dá células; no navegador reconstruímos uma "tabela" a partir das
// linhas posicionadas: cada célula é a junção dos fragmentos. Cobre os casos em
// que a regex de linha falhou (layout multi-coluna). É o caminho menos robusto.
export function extrairProdutosTabela(tabela: string[][]): ProdutoExtraido[] {
  if (!tabela || tabela.length < 2) return [];
  const cab = tabela[0].map((c) => String(c ?? "").trim().toUpperCase());
  const idxDesc = indiceColuna(cab, [
    "DESCRIÇÃO DO PRODUTO",
    "DESCRICAO DO PRODUTO",
    "DESCRIÇÃO",
    "DESCRICAO",
    "PRODUTO",
  ]);
  const idxNcm = indiceColuna(cab, ["NCM", "NCM/SH", "CST", "CFOP", "UNID"]);
  const idxVals = indiceColuna(cab, [
    "VALOR UNIT",
    "VL UNIT",
    "VALOR UNITÁRIO",
    "V.UNIT",
    "VL.UNIT",
  ]);
  const idxTotal = indiceColuna(cab, ["VALOR TOTAL", "VL TOTAL", "TOTAL"]);

  if (idxDesc === null) return [];

  const registros: ProdutoExtraido[] = [];
  for (const linha of tabela.slice(1)) {
    if (!linha || linha.length <= idxDesc) continue;
    const celulaDesc = String(linha[idxDesc] ?? "").trim();
    if (!celulaDesc || RE_COD_BARRAS.test(celulaDesc) || RE_SO_DIGITOS.test(celulaDesc)) continue;

    let subDesc = subLinhas(celulaDesc);
    let subNcm = idxNcm !== null && idxNcm < linha.length ? subLinhas(linha[idxNcm]) : [];
    let subVals = idxVals !== null && idxVals < linha.length ? subLinhas(linha[idxVals]) : [];
    let subTotal = idxTotal !== null && idxTotal < linha.length ? subLinhas(linha[idxTotal]) : [];

    const subLinhasReais = subNcm.filter((s) => RE_TEM_NCM.test(s)).length;
    if (subLinhasReais <= 1 && subDesc.length > 1) {
      const nomesValidos = subDesc.filter((s) => s.trim() && !RE_LIXO_DESC.test(s.trim()));
      subDesc = nomesValidos.length ? [nomesValidos[0]] : [subDesc[0]];
      subNcm = subNcm.slice(0, 1);
      subVals = subVals.slice(0, 1);
      subTotal = subTotal.slice(0, 1);
    }

    for (let i = 0; i < subDesc.length; i++) {
      let descUp = subDesc[i].trim().toUpperCase();
      if (
        !descUp ||
        descUp.length < 3 ||
        RE_SO_DIGITOS.test(descUp) ||
        RE_COD_BARRAS.test(descUp)
      )
        continue;
      const txtNcm = i < subNcm.length ? subNcm[i] : subNcm[subNcm.length - 1] ?? "";
      const txtVals = i < subVals.length ? subVals[i] : subVals[subVals.length - 1] ?? "";
      const txtTot = i < subTotal.length ? subTotal[i] : subTotal[subTotal.length - 1] ?? "";

      const mNcm = RE_UN_QT_NCM.exec(txtNcm);
      let unidade = mNcm ? mNcm[1].toUpperCase() : "UN";
      let quant = mNcm ? parseBr(mNcm[2]) : 0.0;

      const numsV = txtVals.match(/[\d]+(?:[.,][\d]+)*/g) ?? [];
      const vunit = numsV.length > 0 ? parseBr(numsV[0]) : 0.0;
      let vtotal = numsV.length > 1 ? parseBr(numsV[1]) : 0.0;

      if (txtTot) {
        const numsT = txtTot.match(/[\d]+(?:[.,][\d]+)*/g) ?? [];
        if (numsT.length) {
          const vt2 = parseBr(numsT[0]);
          if (vt2 > 0) vtotal = vt2;
        }
      }

      if (quant <= 0) continue;
      [descUp, quant, unidade] = resolverCxParaKg(descUp, quant, unidade);
      registros.push({ produto: descUp, quant, unidade, valor_unit: vunit, valor_total: vtotal });
    }
  }
  return registros;
}

// Reconstrói uma matriz de "células" a partir das linhas posicionadas de uma
// página, agrupando fragmentos próximos em x. Usado só como aproximação do
// extract_tables do pdfplumber.
function linhasParaTabela(linhas: Fragmento[][]): string[][] {
  return linhas.map((frag) =>
    frag
      .slice()
      .sort((a, b) => a.x - b.x)
      .map((f) => f.trecho.trim())
      .filter(Boolean),
  );
}

function dedupProdutos(registros: ProdutoExtraido[]): ProdutoExtraido[] {
  const vistos = new Set<string>();
  const unicos: ProdutoExtraido[] = [];
  for (const r of registros) {
    const chave = `${r.produto}|${r.quant}|${r.unidade}|${r.valor_unit}|${r.valor_total}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      unicos.push(r);
    }
  }
  return unicos;
}

// =============================================================================
// 5. EXTRAÇÃO SEMAR (pedido de compra)
// =============================================================================
export function arquivoEhPedidoSemar(textoPagina1: string): boolean {
  return (textoPagina1 ?? "").toLowerCase().includes("pedido de compra");
}

type RegistroSemar = {
  Data: Date | null;
  Loja: string;
  Produto: string;
  UNID: string;
  QUANT: number;
  "VALOR TOTAL": number;
  "VALOR UNIT": number;
};

export function extrairPedidoSemar(paginas: PaginaPdf[]): RegistroSemar[] {
  const registros: RegistroSemar[] = [];
  if (!paginas.length) return registros;

  const texto1 = paginas[0].texto;
  let dataPedido: Date | null = null;
  const mData = RE_DATA_SEMAR.exec(texto1);
  if (mData) {
    const [dd, mm, yyyy] = mData[1].split("/");
    const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(dt.getTime())) dataPedido = dt;
  }

  const tabela = linhasParaTabela(paginas[0].linhas);
  let produtoAtual: string | null = null;
  let custoAtual = 0.0;
  let lojasAtuais: Record<number, string> = {};

  for (const row of tabela) {
    if (!row.length) continue;
    const col0 = String(row[0] ?? "").trim();
    const mProd = RE_PROD_SEMAR.exec(col0);
    if (mProd) {
      produtoAtual = mProd[1].trim().toUpperCase();
      custoAtual = 0.0;
      lojasAtuais = {};
      continue;
    }
    if (col0.toLowerCase().includes("custo unit")) {
      const nums = col0.match(/(\d+[.,]\d+)/g) ?? [];
      if (nums.length >= 2) custoAtual = parseBr(nums[1]);
      else if (nums.length === 1) custoAtual = parseBr(nums[0]);
      continue;
    }
    const celulas = row.map((c) => String(c ?? "").trim());
    if (celulas.slice(1).some((c) => RE_LOJA_SEMAR.test(c))) {
      lojasAtuais = {};
      row.forEach((cell, idx) => {
        const v = String(cell ?? "").trim();
        if (RE_LOJA_SEMAR.test(v)) lojasAtuais[idx] = v.split(/\s+/).join(" ");
      });
      continue;
    }
    if (produtoAtual && Object.keys(lojasAtuais).length) {
      row.forEach((cell, idx) => {
        const val = String(cell ?? "").trim();
        if (!val || !RE_QUANT_SEMAR.test(val)) return;
        const quant = parseBr(val);
        if (quant > 0 && idx in lojasAtuais) {
          registros.push({
            Data: dataPedido,
            Loja: lojasAtuais[idx],
            Produto: produtoAtual as string,
            UNID: "KG",
            QUANT: quant,
            "VALOR TOTAL": Math.round(quant * custoAtual * 100) / 100,
            "VALOR UNIT": custoAtual,
          });
        }
      });
    }
  }

  // drop_duplicates(subset=["Produto","Loja","QUANT"])
  const vistos = new Set<string>();
  return registros.filter((r) => {
    const chave = `${r.Produto}|${r.Loja}|${r.QUANT}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

// =============================================================================
// 6. ORQUESTRAÇÃO — saída normalizada igual a carregar_registros_upload_pdf
// =============================================================================
function todosProdutosPdf(paginas: PaginaPdf[]): ProdutoExtraido[] {
  const registros: ProdutoExtraido[] = [];
  for (const pagina of paginas) {
    const prods = extrairProdutosTexto(pagina.texto);
    if (prods.length) {
      registros.push(...prods);
      continue;
    }
    registros.push(...extrairProdutosTabela(linhasParaTabela(pagina.linhas)));
  }
  return dedupProdutos(registros);
}

function isoOuNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/**
 * Recebe o nome do arquivo e as páginas já extraídas (pdf-text.ts) e devolve os
 * registros prontos para envio à rota /api/pedidos. Espelha
 * `carregar_registros_upload_pdf` do processor.py.
 */
export function carregarRegistrosUpload(nomeArquivo: string, paginas: PaginaPdf[]): RegistroPedido[] {
  const texto1 = paginas[0]?.texto ?? "";
  const ehSemar = arquivoEhPedidoSemar(texto1);
  const base = nomeArquivo.split(/[\\/]/).pop() ?? nomeArquivo;
  const arquivoCache = `${ehSemar ? "semar::" : "pedido::"}${base}`;

  if (ehSemar) {
    return extrairPedidoSemar(paginas).map((row) => ({
      Data: isoOuNull(row.Data),
      Loja: String(row.Loja ?? "").trim(),
      Produto: String(row.Produto ?? "").trim().toUpperCase(),
      UNID: String(row.UNID ?? "KG").trim().toUpperCase(),
      QUANT: Number(row.QUANT) || 0,
      "VALOR TOTAL": Number(row["VALOR TOTAL"]) || 0,
      "VALOR UNIT": Number(row["VALOR UNIT"]) || 0,
      ARQUIVO: arquivoCache,
    }));
  }

  const meta = extrairMetadados(texto1);
  const produtos = todosProdutosPdf(paginas);
  return produtos.map((produto) => ({
    Data: isoOuNull(meta.data),
    Loja: String(meta.loja ?? "").trim(),
    Produto: String(produto.produto ?? "").trim().toUpperCase(),
    UNID: String(produto.unidade ?? "KG").trim().toUpperCase(),
    QUANT: Number(produto.quant) || 0,
    "VALOR TOTAL": Number(produto.valor_total) || 0,
    "VALOR UNIT": Number(produto.valor_unit) || 0,
    ARQUIVO: arquivoCache,
  }));
}
