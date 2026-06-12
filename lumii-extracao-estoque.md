# Extração de itens de banana — Lumii / Benverde

Pacote com duas peças independentes:

1. **Prompt do PDF (NF-e)** → enviado ao `grok-4-1-fast-reasoning`.
2. **Parser de CSV (pedido por loja)** → roda em TypeScript no Vercel, **sem IA**.

Valor canônico do produto em todo o sistema: `BANANA NANICA`, `BANANA DA TERRA`, `BANANA PRATA`, `BANANA MAÇÃ` (com acento).

---

## 1. Prompt do PDF

Separado em **system** e **user**. O `grok-4-1-fast-reasoning` raciocina nos tokens de reasoning (validação aritmética, origem de cada número) e a saída final é só JSON.

### SYSTEM

```
Você é um extrator de itens de banana para entrada de estoque, a partir de documentos fiscais brasileiros (DANFE/NF-e). Sua precisão é crítica: é melhor NÃO retornar um item do que retornar um item errado. Nunca invente, estime ou complete dados que não estejam explícitos no documento.

FORMATO NUMÉRICO (Brasil):
- A vírgula é o separador decimal; o ponto é separador de milhar.
- "8850,0000" = 8850.0 | "12.390,00" = 12390.0 | "1,4000" = 1.4
- No JSON de saída, todos os números usam ponto decimal e NÃO têm separador de milhar.

DE ONDE EXTRAIR:
- Use SOMENTE a tabela "DADOS DOS PRODUTOS/SERVIÇOS" (colunas: DESCRIÇÃO DO PRODUTO/SERVIÇO, UN, QUANT, VALOR UNIT, VALOR TOTAL). Uma linha de saída por linha de produto.
- IGNORE COMPLETAMENTE o bloco "TRANSPORTADOR / VOLUMES TRANSPORTADOS" (campos QUANTIDADE, ESPÉCIE, MARCA, NÚMERO, PESO BRUTO, PESO LÍQUIDO). Esses campos NÃO são itens de estoque, mesmo que contenham a palavra NANICA ou um número de caixas (ex.: "840 CX MARCA NANICA" é volume de transporte, não um item).

FILTRO E MAPEAMENTO DE PRODUTO:
- Considere apenas linhas cuja descrição contenha "BANANA".
- Mapeie a descrição para EXATAMENTE um destes quatro valores:
    "BANANA NANICA"   ← nanica, nanicão, caturra, d'água
    "BANANA DA TERRA" ← da terra, terra, pacovã, pacova
    "BANANA PRATA"    ← prata, prata-anã, branca
    "BANANA MAÇÃ"     ← maçã, maca, maça (sempre escreva na saída com acento: "BANANA MAÇÃ")
- Normalize hífens e espaços: "BANANA - NANICA" → "BANANA NANICA".
- Se a descrição contém BANANA mas NÃO corresponde claramente a nenhuma das quatro variedades (ex.: banana ouro, banana figo), IGNORE a linha. NÃO use fallback, não chute a variedade.

CAMPOS DE SAÍDA POR ITEM:
- produto: um dos quatro valores exatos acima.
- quant: número > 0, lido da coluna QUANT da tabela de produtos.
- unidade: lida da coluna UN da MESMA linha (ex.: KG). Se a linha fatura em KG, use KG; não converta para CX.
- valor_unit: lido da coluna VALOR UNIT da mesma linha.
- valor_total: lido da coluna VALOR TOTAL da mesma linha.
- loja: sempre o texto "Entrada" (a NF-e de compra não tem loja de destino).

VALIDAÇÃO OBRIGATÓRIA (faça internamente antes de responder):
1. Para cada item, confira se quant × valor_unit ≈ valor_total (tolerância de 1%). Se não bater, releia os números no documento e corrija a interpretação de vírgula/ponto — o erro quase sempre está aí.
2. Confirme que nenhum item veio do bloco de volumes/transporte.
3. Confirme que todo número usa ponto decimal e não tem separador de milhar.
4. quant, valor_unit e valor_total devem ser > 0. Se algum não existir no documento, NÃO inclua o item.

SAÍDA:
- Responda com JSON válido e NADA MAIS: sem texto antes ou depois, sem markdown, sem crases.
- Formato exato:
  {"resultado":[{"produto":"BANANA NANICA","quant":8850,"unidade":"KG","valor_unit":1.4,"valor_total":12390,"loja":"Entrada"}]}
- Se não houver item válido: {"resultado":[]}
```

### USER

```
Extraia os itens de banana para entrada de estoque do documento anexado, seguindo todas as regras. Pondere internamente a aritmética e a origem de cada número, mas responda APENAS com o JSON final.
```

### Resultado esperado para o DANFE de exemplo (08/06 BENVERDE)

```json
{"resultado":[
  {"produto":"BANANA NANICA","quant":8850,"unidade":"KG","valor_unit":1.4,"valor_total":12390,"loja":"Entrada"},
  {"produto":"BANANA PRATA","quant":3750,"unidade":"KG","valor_unit":2.7,"valor_total":10125,"loja":"Entrada"}
]}
```

O item falso de `840 CX NANICA` (volume de transporte) **não** aparece — é exatamente o erro que o bloqueio explícito elimina.

### Recomendações no lado da chamada (não no prompt)

- `temperature: 0` para determinismo entre execuções iguais.
- Validar o JSON no servidor após o parse: `produto ∈ {4 valores}`, `quant > 0`, e re-checar `quant × valor_unit ≈ valor_total`. Se falhar, re-chamar uma vez ou marcar para revisão manual — assim um escorregão do Grok nunca quebra na cara do usuário.

---

## 2. Parser de CSV (pedido por loja) — TypeScript, sem IA

CSV é tabela estruturada: parsear no código é 100% determinístico e elimina o risco. **Não mande CSV para o Grok.**

### O que o parser resolve

O CSV de pedido tem dois blocos com os mesmos itens:

- **Bloco 1** — resumo consolidado do pedido (4 linhas, totais gerais).
- **Bloco 2** — quebra por loja (`Loja | Entrega | GTIN | Descrição | Ref | Qtde | Custo | Total`).

Somar os dois blocos juntos dobra a quantidade. O parser lê **apenas o Bloco 2** (linhas por loja), que é o que você quer lançar, e ignora o Bloco 1 e as linhas de "Totais".

### Código

```ts
// lib/server/pedido-csv.ts
//
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
```

### Validação opcional (recomendada)

Confere a aritmética linha a linha, no mesmo espírito da regra do prompt:

```ts
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
```

### Resultado esperado para o `pedido__36_.csv` (trecho)

```json
[
  {"produto":"BANANA NANICA","quant":240,"unidade":"KG","valor_unit":3.7,"valor_total":888,"loja":"5"},
  {"produto":"BANANA PRATA","quant":16,"unidade":"KG","valor_unit":6.9,"valor_total":110.4,"loja":"5"},
  {"produto":"BANANA NANICA","quant":256,"unidade":"KG","valor_unit":3.7,"valor_total":947.2,"loja":"10"},
  {"produto":"BANANA MAÇÃ","quant":16,"unidade":"KG","valor_unit":8.6,"valor_total":137.6,"loja":"10"}
]
```

---

## 3. Ajustes necessários no resto do sistema

Para o canônico `BANANA MAÇÃ` não quebrar:

- **`lib/server/mita-pdf.ts`** — o prompt antigo usava `BANANA MACA`. Trocar para `BANANA MAÇÃ` (com acento), igual ao enum em `estoque/correcao/route.ts`. Sem isso, upload e correção tratam a banana-maçã como dois produtos distintos no saldo/agrupamento.
- **Endpoint do CSV** — `upload-pdf/route.ts` só aceita `.pdf`. O CSV precisa de uma rota própria (ex.: `app/api/estoque/upload-csv/route.ts`) que lê o texto do arquivo e chama `parsePedidoCsv` direto, sem tocar na xAI.
- **Colunas de valor** — `estoque_manual` não tem `valor_unit`/`valor_total` hoje; `saveMovimentacoes` vai descartar esses campos até você adicionar as colunas. O JSON já os entrega para quando o schema existir.
- **Front (`EstoqueRegistro.tsx`)** — o `map` hardcoda `loja: "Entrada"`. Para aproveitar a `loja` do CSV, ler `item.loja` em vez do valor fixo.
