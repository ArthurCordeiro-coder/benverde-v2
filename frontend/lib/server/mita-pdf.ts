import "server-only";

import { HttpError, badRequest, serviceUnavailable } from "@/lib/server/errors";

type UploadResponse = {
  id?: string;
};

type ResponsesApiPayload = {
  output?: Array<{
    type?: string;
    text?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export type LumiiPdfItem = {
  produto: string;
  quant: number;
  unidade: string;
  valor_unit: number;
  valor_total: number;
  loja: string;
};

const XAI_BASE_URL = "https://api.x.ai/v1";
const LUMII_PDF_MODEL = "grok-4-1-fast-reasoning";

const PRODUTOS_CANONICOS = [
  "BANANA NANICA",
  "BANANA DA TERRA",
  "BANANA PRATA",
  "BANANA MAÇÃ",
] as const;

const LUMII_PDF_SYSTEM_PROMPT = `Você é um extrator de itens de banana para entrada de estoque, a partir de documentos fiscais brasileiros (DANFE/NF-e). Sua precisão é crítica: é melhor NÃO retornar um item do que retornar um item errado. Nunca invente, estime ou complete dados que não estejam explícitos no documento.

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
- Se não houver item válido: {"resultado":[]}`;

const LUMII_PDF_USER_PROMPT =
  "Extraia os itens de banana para entrada de estoque do documento anexado, seguindo todas as regras. Pondere internamente a aritmética e a origem de cada número, mas responda APENAS com o JSON final.";

const LUMII_PDF_USER_PROMPT_TEXTO =
  "Extraia os itens de banana para entrada de estoque do documento abaixo (texto extraído de um DANFE/NF-e em PDF), seguindo todas as regras. Pondere internamente a aritmética e a origem de cada número, mas responda APENAS com o JSON final.";

// DANFEs têm bem mais texto que isso; abaixo do limite, tratamos o PDF como
// escaneado (sem camada de texto) e caímos no fallback de envio do arquivo.
const MIN_TEXTO_EXTRAIDO = 200;

function getXaiApiKey(): string {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    serviceUnavailable("Serviço de IA não configurado. Defina XAI_API_KEY no servidor.");
  }
  return apiKey;
}

function parseNumber(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "none") {
    return null;
  }

  let normalized = raw.replace(/[^\d,.\-]/g, "");
  if (!normalized) {
    return null;
  }

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractResponseText(payload: unknown): string {
  const data = payload as ResponsesApiPayload;
  if (!Array.isArray(data.output)) {
    return "";
  }

  const texts: string[] = [];

  for (const item of data.output) {
    if (typeof item?.text === "string" && item.text.trim()) {
      texts.push(item.text.trim());
    }

    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
        texts.push(contentItem.text.trim());
      }
    }
  }

  return texts.join("\n").trim();
}

function extractJsonPayload(rawText: string): unknown {
  const text = rawText.trim();
  if (!text) {
    return null;
  }

  const candidates = [text];
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    candidates.push(objectMatch[0]);
  }
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    candidates.push(arrayMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

function canonicalizarProduto(value: string): string | null {
  const produto = value.trim().toUpperCase().replace(/\s+/g, " ");
  if ((PRODUTOS_CANONICOS as readonly string[]).includes(produto)) {
    return produto;
  }
  if (produto === "BANANA MACA" || produto === "BANANA MAÇA") {
    return "BANANA MAÇÃ";
  }
  return null;
}

function normalizeLumiiItems(payload: unknown): LumiiPdfItem[] {
  const rawItems =
    payload && typeof payload === "object" && "resultado" in payload
      ? (payload as { resultado?: unknown }).resultado
      : payload;

  if (!Array.isArray(rawItems)) {
    return [];
  }

  const merged = new Map<string, LumiiPdfItem>();

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const item = rawItem as Record<string, unknown>;
    const produto = canonicalizarProduto(
      String(item.produto ?? item.item ?? item.descricao ?? item.descrição ?? ""),
    );

    if (!produto) {
      continue;
    }

    const quant = parseNumber(item.quant ?? item.quantidade ?? item.peso);
    if (quant == null || quant <= 0) {
      continue;
    }

    const unidade = String(item.unidade ?? "KG").trim().toUpperCase() || "KG";
    const unidadeNormalizada = unidade === "UN" || unidade === "CX" ? unidade : "KG";
    const valorUnit = parseNumber(
      item.valor_unit ?? item.valorUnit ?? item.valor_unitario ?? item.preco_unitario,
    );
    const valorTotal = parseNumber(item.valor_total ?? item.valorTotal ?? item.total);

    // Validação aritmética (mesma regra do prompt): quant × valor_unit ≈ valor_total,
    // tolerância de 1%. Item que não bate é descartado em vez de salvo errado.
    if (
      valorUnit != null &&
      valorUnit > 0 &&
      valorTotal != null &&
      valorTotal > 0 &&
      Math.abs(quant * valorUnit - valorTotal) / valorTotal > 0.01
    ) {
      continue;
    }

    const key = `${produto}::${unidadeNormalizada}`;
    const current = merged.get(key) ?? {
      produto,
      quant: 0,
      unidade: unidadeNormalizada,
      valor_unit: 0,
      valor_total: 0,
      loja: "Entrada",
    };

    current.quant = Math.round((current.quant + quant) * 1000) / 1000;
    current.valor_total = Math.round((current.valor_total + (valorTotal ?? 0)) * 100) / 100;

    if (valorUnit != null && valorUnit > 0) {
      current.valor_unit = valorUnit;
    } else if (current.valor_total > 0 && current.quant > 0) {
      current.valor_unit = Math.round((current.valor_total / current.quant) * 10000) / 10000;
    }

    merged.set(key, current);
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.produto.localeCompare(right.produto, "pt-BR"),
  );
}

// Extrai a camada de texto do PDF preservando a estrutura tabular: agrupa os
// fragmentos por linha (coordenada y) e ordena por coluna (x).
async function extractPdfText(file: File): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;

  try {
    let texto = "";
    for (let pagina = 1; pagina <= doc.numPages; pagina++) {
      const page = await doc.getPage(pagina);
      const conteudo = await page.getTextContent();

      const porLinha = new Map<number, Array<{ x: number; trecho: string }>>();
      for (const item of conteudo.items) {
        if (!("str" in item) || !item.str.trim()) {
          continue;
        }
        const y = Math.round(item.transform[5]);
        const grupo = porLinha.get(y) ?? [];
        grupo.push({ x: item.transform[4], trecho: item.str });
        porLinha.set(y, grupo);
      }

      const linhas = Array.from(porLinha.keys()).sort((a, b) => b - a);
      for (const y of linhas) {
        const fragmentos = porLinha.get(y) ?? [];
        texto += fragmentos.sort((a, b) => a.x - b.x).map((f) => f.trecho).join(" ") + "\n";
      }
      texto += "\n";
    }
    return texto.trim();
  } finally {
    await loadingTask.destroy();
  }
}

async function uploadFileToXai(file: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("purpose", "assistants");

  const response = await fetch(`${XAI_BASE_URL}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as UploadResponse & { error?: { message?: string } };
  if (!response.ok || !payload.id) {
    const detail =
      payload?.error?.message?.trim() || "Não foi possível enviar o PDF para a Lumii.";
    throw new HttpError(502, detail);
  }

  return payload.id;
}

async function deleteFileFromXai(fileId: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${XAI_BASE_URL}/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
  } catch {
    console.error(`Falha ao remover arquivo temporário ${fileId} da Lumii.`);
  }
}

async function requestLumiiExtraction(
  apiKey: string,
  userContent: Array<Record<string, unknown>>,
): Promise<LumiiPdfItem[]> {
  const response = await fetch(`${XAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LUMII_PDF_MODEL,
      temperature: 0,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: LUMII_PDF_SYSTEM_PROMPT,
            },
          ],
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "message" in payload.error &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim()
        ? payload.error.message
        : "Não foi possível processar o PDF com a Lumii.";
    throw new HttpError(502, detail);
  }

  const responseText = extractResponseText(payload);
  const jsonPayload = extractJsonPayload(responseText);
  return normalizeLumiiItems(jsonPayload);
}

export async function extractBananasFromPdfWithLumii(file: File): Promise<{
  arquivo: string;
  processamento: "lumii";
  resultado: LumiiPdfItem[];
}> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    badRequest("Envie um arquivo PDF válido.");
  }

  const apiKey = getXaiApiKey();

  // O extrator de PDF da xAI falha em DANFEs com fontes Identity-H (ex.: os
  // gerados pelo Fonet) e o modelo alucina itens. Extrair o texto aqui e
  // enviar como input_text evita isso; input_file fica só para escaneados.
  let textoDocumento = "";
  try {
    textoDocumento = await extractPdfText(file);
  } catch (error) {
    console.error("Falha ao extrair texto do PDF localmente; usando fallback de arquivo.", error);
  }

  if (textoDocumento.length >= MIN_TEXTO_EXTRAIDO) {
    const resultado = await requestLumiiExtraction(apiKey, [
      {
        type: "input_text",
        text: `${LUMII_PDF_USER_PROMPT_TEXTO}\n\n=== DOCUMENTO ===\n${textoDocumento}`,
      },
    ]);

    return {
      arquivo: file.name,
      processamento: "lumii",
      resultado,
    };
  }

  const fileId = await uploadFileToXai(file, apiKey);

  try {
    const resultado = await requestLumiiExtraction(apiKey, [
      {
        type: "input_text",
        text: LUMII_PDF_USER_PROMPT,
      },
      {
        type: "input_file",
        file_id: fileId,
      },
    ]);

    return {
      arquivo: file.name,
      processamento: "lumii",
      resultado,
    };
  } finally {
    await deleteFileFromXai(fileId, apiKey);
  }
}
