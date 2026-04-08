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

export type MitaPdfItem = {
  produto: string;
  quant: number;
  unidade: string;
  valor_unit: number;
  valor_total: number;
};

const XAI_BASE_URL = "https://api.x.ai/v1";
const MITA_PDF_MODEL = "grok-4-1-fast-reasoning";

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

function normalizeMitaItems(payload: unknown): MitaPdfItem[] {
  const rawItems =
    payload && typeof payload === "object" && "resultado" in payload
      ? (payload as { resultado?: unknown }).resultado
      : payload;

  if (!Array.isArray(rawItems)) {
    return [];
  }

  const merged = new Map<string, MitaPdfItem>();

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const item = rawItem as Record<string, unknown>;
    const produto = String(
      item.produto ?? item.item ?? item.descricao ?? item.descrição ?? "",
    )
      .trim()
      .toUpperCase();

    if (!produto || !produto.includes("BANANA")) {
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

    const key = `${produto}::${unidadeNormalizada}`;
    const current = merged.get(key) ?? {
      produto,
      quant: 0,
      unidade: unidadeNormalizada,
      valor_unit: 0,
      valor_total: 0,
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
      payload?.error?.message?.trim() || "Não foi possível enviar o PDF para a MITA-I.";
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
    console.error(`Falha ao remover arquivo temporário ${fileId} da MITA-I.`);
  }
}

export async function extractBananasFromPdfWithMita(file: File): Promise<{
  arquivo: string;
  processamento: "mita-ai";
  resultado: MitaPdfItem[];
}> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    badRequest("Envie um arquivo PDF válido.");
  }

  const apiKey = getXaiApiKey();
  const fileId = await uploadFileToXai(file, apiKey);

  try {
    const response = await fetch(`${XAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MITA_PDF_MODEL,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Leia o PDF anexado e extraia somente itens de banana para lançamento de entrada de estoque.",
                  'Responda somente com JSON válido no formato {"resultado":[{"produto":"BANANA NANICA","quant":12.5,"unidade":"KG","valor_unit":0,"valor_total":0}]}',
                  "Regras:",
                  "- inclua apenas produtos com BANANA no nome;",
                  "- o campo produto deve ser EXATAMENTE um destes quatro valores, sem variação: \"BANANA NANICA\", \"BANANA DA TERRA\", \"BANANA PRATA\" ou \"BANANA MACA\";",
                  "- escolha a variedade mais próxima do que está no documento; se não for possível identificar, use \"BANANA NANICA\";",
                  "- quant precisa ser número maior que zero;",
                  "- use KG, UN ou CX apenas quando isso estiver claro;",
                  "- se não houver item válido, responda com {\"resultado\":[]}.",
                ].join("\n"),
              },
              {
                type: "input_file",
                file_id: fileId,
              },
            ],
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
          : "Não foi possível processar o PDF com a MITA-I.";
      throw new HttpError(502, detail);
    }

    const responseText = extractResponseText(payload);
    const jsonPayload = extractJsonPayload(responseText);
    const resultado = normalizeMitaItems(jsonPayload);

    return {
      arquivo: file.name,
      processamento: "mita-ai",
      resultado,
    };
  } finally {
    await deleteFileFromXai(fileId, apiKey);
  }
}
