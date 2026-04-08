import "server-only";

import { type DashboardScope } from "@/lib/dashboard/access";
import { HttpError, serviceUnavailable, badRequest } from "@/lib/server/errors";
import { getCaixas } from "@/lib/server/caixas";
import { buildDashboardMetaItems } from "@/lib/server/dashboard";
import { getSaldoEstoque } from "@/lib/server/estoque";
import { summarizePricesForPrompt } from "@/lib/server/precos";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MITA_MODEL = "grok-4-1-fast-reasoning";
const MITA_SYSTEM_PROMPT = `Voce e a Mita, gerente de dados inteligente da Benverde, uma distribuidora de bananas e hortifruti.
Voce tem acesso ao contexto operacional atual de estoque, precos, caixas das lojas e metas e deve responder
de forma clara, objetiva e em portugues brasileiro. Seja direta, use numeros quando relevante e aponte
riscos ou oportunidades quando identificar.`;

function formatQuantity(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function shouldIncludeScope(
  requestedScope: DashboardScope,
  section: "estoque" | "precos" | "caixas" | "metas",
): boolean {
  if (requestedScope === "overview" || requestedScope === "mita-ai") {
    return true;
  }

  return requestedScope === section;
}

function logMitaContextError(section: string, error: unknown): void {
  console.error(`Falha ao montar o contexto da Mita para ${section}.`, error);
}

async function buildMitaContext(scope: DashboardScope): Promise<string> {
  const sections: string[] = [];

  if (shouldIncludeScope(scope, "estoque")) {
    try {
      const estoque = await getSaldoEstoque();
      const ultimasMovimentacoes = estoque.historico
        .slice(-20)
        .map(
          (item) =>
            `- [${String(item.tipo ?? "").toUpperCase()}] ${item.data ?? "?"} | ${item.produto ?? "-"} | ${formatQuantity(Number(item.quant ?? 0))} ${item.unidade ?? "KG"}`,
        )
        .join("\n");

      sections.push(
        [
          "## ESTOQUE ATUAL",
          `Saldo atual: ${formatQuantity(estoque.saldo)} kg`,
          "Ultimas movimentacoes:",
          ultimasMovimentacoes || "Nenhuma movimentacao recente.",
        ].join("\n"),
      );
    } catch (error) {
      logMitaContextError("estoque", error);
    }
  }

  if (shouldIncludeScope(scope, "precos")) {
    try {
      sections.push(`## PRECOS CONCORRENTES\n${await summarizePricesForPrompt()}`);
    } catch (error) {
      logMitaContextError("precos", error);
    }
  }

  if (shouldIncludeScope(scope, "caixas")) {
    try {
      const caixas = await getCaixas();
      const pendentes = caixas.filter((item) => item.entregue !== "sim");
      sections.push(
        [
          "## CAIXAS DAS LOJAS",
          `Total de registros: ${caixas.length}`,
          `Registros nao entregues: ${pendentes.length}`,
          ...pendentes.slice(0, 20).map(
            (item) =>
              `- ${item.data ?? "?"} | ${item.loja ?? "Sem loja"} | total ${item.total} | entregue ${item.entregue}`,
          ),
        ].join("\n"),
      );
    } catch (error) {
      logMitaContextError("caixas", error);
    }
  }

  if (shouldIncludeScope(scope, "metas")) {
    try {
      const metas = await buildDashboardMetaItems();
      if (metas.length > 0) {
        sections.push(
          [
            "## METAS POR PRODUTO",
            ...metas.slice(0, 30).map(
              (item) =>
                `- ${item.produto}: meta ${item.meta}, pedido ${formatQuantity(item.pedido)}, progresso ${formatQuantity(item.progresso)}%, status ${item.status}`,
            ),
          ].join("\n"),
        );
      }
    } catch (error) {
      logMitaContextError("metas", error);
    }
  }

  return sections.join("\n\n") || "Nenhum dado operacional disponivel no momento.";
}

function extractAssistantMessage(payload: unknown): string {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => (item?.type === "text" ? item.text ?? "" : ""))
      .join("")
      .trim();
  }
  return "";
}

export async function chatWithMita(payload: unknown, scope: DashboardScope): Promise<{
  answer: string;
  history: ChatMessage[];
}> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    badRequest("Payload invalido.");
  }

  const body = payload as Record<string, unknown>;
  const userMessage = String(body.message ?? "").trim();
  if (!userMessage) {
    badRequest("Mensagem vazia.");
  }

  const xaiApiKey = process.env.XAI_API_KEY?.trim();
  if (!xaiApiKey) {
    serviceUnavailable("Servico de IA nao configurado. Defina XAI_API_KEY no servidor.");
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is ChatMessage =>
            Boolean(
              item &&
                typeof item === "object" &&
                ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "assistant") &&
                typeof (item as ChatMessage).content === "string",
            ),
        )
        .map((item) => ({ role: item.role, content: item.content }))
    : [];

  const messages = [
    {
      role: "system",
      content: `${MITA_SYSTEM_PROMPT}\n\n${await buildMitaContext(scope)}`,
    },
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${xaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MITA_MODEL,
      messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(
      502,
      errorText
        ? `Erro ao se comunicar com o modelo de IA: ${errorText}`
        : "Erro ao se comunicar com o modelo de IA.",
    );
  }

  const result = await response.json();
  const answer = extractAssistantMessage(result);
  return {
    answer,
    history: [...history, { role: "user", content: userMessage }, { role: "assistant", content: answer }],
  };
}
