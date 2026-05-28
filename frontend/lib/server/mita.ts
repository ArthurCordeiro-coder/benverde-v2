import "server-only";

import { type DashboardScope } from "@/lib/dashboard/access";
import { HttpError, serviceUnavailable, badRequest } from "@/lib/server/errors";
import { getSchemaForPrompt } from "@/lib/server/lumii-schema";
import { ALLOWED_TABLES, executeSafeQuery } from "@/lib/server/lumii-sql";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type XaiToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type XaiAssistantMessage = {
  role: "assistant";
  content: string | null;
  tool_calls?: XaiToolCall[];
};

type XaiChoice = {
  message?: XaiAssistantMessage;
  finish_reason?: string;
};

type XaiResponse = {
  choices?: XaiChoice[];
};

const LUMII_MODEL = "grok-4-1-fast-reasoning";
const MAX_AGENT_ITERATIONS = 5;

const LUMII_SYSTEM_PROMPT_TEMPLATE = `Voce e a Lumii, gerente de dados inteligente da Benverde, uma distribuidora de bananas e hortifruti.
Responda de forma clara, objetiva e em portugues brasileiro. Seja direta, use numeros quando relevante e aponte riscos ou oportunidades quando identificar.

DATA DE REFERENCIA: {{TODAY}}

ACESSO A DADOS — REGRA CRITICA:
Voce NAO possui dados pre-carregados no contexto. Para responder QUALQUER pergunta sobre numeros, datas, produtos, precos, estoque, caixas ou metas, voce DEVE chamar a ferramenta query_database com uma query PostgreSQL SELECT.

Diretrizes para gerar SQL:
- Use SELECT ou WITH (CTE). INSERT/UPDATE/DELETE/DROP sao bloqueados pelo backend.
- Apenas as tabelas listadas em SCHEMA estao disponiveis.
- Para colunas com espacos ou maiusculas, use aspas duplas. Ex: "Produto Buscado", "Estabelecimento".
- Use WHERE para filtrar por data, produto, mercado, etc. Nao traga tudo se a pergunta e especifica.
- Use agregacoes (SUM, AVG, COUNT, GROUP BY) quando o usuario pedir totais ou comparacoes.
- Sempre inclua LIMIT explicito se a query puder retornar muitos resultados.
- Para perguntas temporais (este mes, ultimo mes, ultima semana), use a data de referencia acima para calcular o intervalo.
- Voce pode fazer ate {{MAX_QUERIES}} queries por turno. Se a primeira query nao trouxer o que precisa, faca uma refinada.

Apos receber o resultado JSON da ferramenta, formule a resposta final humanizada usando esses dados.

SCHEMA DO BANCO DE DADOS:
{{SCHEMA}}

CAPACIDADE DE GRAFICOS E VISUALIZACOES:
Sempre que fizer comparacoes de precos, market share ou resumir KPIs, inclua a resposta textual E TAMBEM um bloco JSON no fim da resposta dentro de \`\`\`json. Tipos disponiveis:

1. BARRAS (chartType: "bar") — comparar entre concorrentes/lojas:
\`\`\`json
{"type":"chart","chartType":"bar","title":"Preco da Banana Prata","xAxis":"mercado","yAxis":"preco","data":[{"mercado":"Semar","preco":6.49},{"mercado":"Rossi","preco":6.70}]}
\`\`\`

2. LINHA (chartType: "line") — tendencias temporais:
\`\`\`json
{"type":"chart","chartType":"line","title":"Evolucao do Preco Medio","xAxis":"data","yAxis":"valor","data":[{"data":"20/05","valor":54.20}]}
\`\`\`

3. PIZZA (chartType: "pie") — market share:
\`\`\`json
{"type":"chart","chartType":"pie","title":"Market Share","xAxis":"nome","yAxis":"fatia","data":[{"nome":"Semar","fatia":36.1}]}
\`\`\`

4. KPIs (type: "kpis") — multiplos indicadores:
\`\`\`json
{"type":"kpis","title":"SKUs com queda de margem","data":[{"title":"Tomate Italiano","value":"-3.1%","change":"-2.5% em 72h","changeType":"down","status":"danger"}]}
\`\`\`

NUNCA gere graficos com data vazio. Se a query nao trouxer dados, apenas explique em texto.`;

const QUERY_DATABASE_TOOL = {
  type: "function" as const,
  function: {
    name: "query_database",
    description:
      "Executa uma query SQL SELECT no banco de dados PostgreSQL (NeonDB) da Benverde. Use para responder QUALQUER pergunta sobre dados.",
    parameters: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            'Uma unica query PostgreSQL SELECT. Use aspas duplas em colunas com espaco/maiuscula. Ex: SELECT "Produto Buscado", "Estabelecimento", "Preco" FROM precos WHERE data >= \'2026-05-01\' LIMIT 100',
        },
      },
      required: ["sql"],
    },
  },
};

function todayLabel(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

// Filter ALLOWED_TABLES by scope so users with restricted access only see their slice.
function getAllowedTablesForScope(scope: DashboardScope): readonly string[] {
  if (scope === "mita-ai" || scope === "overview") {
    return ALLOWED_TABLES;
  }
  if (scope === "precos") return ["precos"];
  if (scope === "estoque") return ["estoque_manual", "cache_pedidos"];
  if (scope === "caixas") return ["caixas_lojas"];
  return ALLOWED_TABLES;
}

async function buildLumiiSystemPrompt(scope: DashboardScope): Promise<string> {
  const allowed = getAllowedTablesForScope(scope);
  const fullSchema = await getSchemaForPrompt();

  // If scope is restricted, filter the schema to only include allowed tables
  let schema = fullSchema;
  if (allowed.length < ALLOWED_TABLES.length) {
    schema = fullSchema
      .split("\n\n")
      .filter((section) => {
        const headerMatch = section.match(/^### (\w+)/);
        return headerMatch ? (allowed as readonly string[]).includes(headerMatch[1]) : false;
      })
      .join("\n\n");
  }

  return LUMII_SYSTEM_PROMPT_TEMPLATE.replace("{{TODAY}}", todayLabel())
    .replace("{{MAX_QUERIES}}", String(MAX_AGENT_ITERATIONS))
    .replace("{{SCHEMA}}", schema);
}

function extractAssistantText(message: XaiAssistantMessage | undefined): string {
  if (!message) return "";
  const content = message.content;
  if (typeof content === "string") return content.trim();
  return "";
}

async function executeToolCall(
  call: XaiToolCall,
  allowedTables: readonly string[],
): Promise<string> {
  if (call.function.name !== "query_database") {
    return JSON.stringify({ error: `Ferramenta desconhecida: ${call.function.name}` });
  }
  let args: { sql?: unknown };
  try {
    args = JSON.parse(call.function.arguments);
  } catch {
    return JSON.stringify({ error: "Argumentos da ferramenta nao sao JSON valido." });
  }
  if (typeof args.sql !== "string") {
    return JSON.stringify({ error: 'Campo "sql" deve ser string.' });
  }
  try {
    const result = await executeSafeQuery(args.sql, allowedTables);
    return JSON.stringify({
      rowCount: result.rowCount,
      truncated: result.truncated,
      rows: result.rows,
    });
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Erro ao executar SQL.",
    });
  }
}

async function callXai(
  messages: unknown[],
  xaiApiKey: string,
  conversationId?: string,
): Promise<XaiResponse> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${xaiApiKey}`,
    "Content-Type": "application/json",
  };
  if (conversationId) {
    headers["x-grok-conv-id"] = conversationId;
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: LUMII_MODEL,
      messages,
      tools: [QUERY_DATABASE_TOOL],
      tool_choice: "auto",
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

  return (await response.json()) as XaiResponse;
}

export async function chatWithLumii(
  payload: unknown,
  scope: DashboardScope,
  conversationId?: string,
): Promise<{ answer: string; history: ChatMessage[] }> {
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

  const systemPrompt = await buildLumiiSystemPrompt(scope);
  const allowedTables = getAllowedTablesForScope(scope);

  // Build the running message list. The agent loop will append assistant + tool
  // turns to this list and re-call the model until it produces a final answer
  // (no more tool_calls) or hits the iteration cap.
  const messages: unknown[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  let finalAnswer = "";
  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    const response = await callXai(messages, xaiApiKey, conversationId);
    const choice = response.choices?.[0];
    const message = choice?.message;
    if (!message) break;

    // Append the assistant message (with potential tool_calls) to history
    messages.push(message);

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length > 0) {
      for (const call of toolCalls) {
        const toolResult = await executeToolCall(call, allowedTables);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: toolResult,
        });
      }
      // Continue loop — the model needs to see the tool results
      continue;
    }

    // No more tool calls — final answer
    finalAnswer = extractAssistantText(message);
    break;
  }

  if (!finalAnswer) {
    finalAnswer =
      "Nao consegui chegar a uma resposta apos varias tentativas. Tente reformular a pergunta.";
  }

  return {
    answer: finalAnswer,
    history: [
      ...history,
      { role: "user", content: userMessage },
      { role: "assistant", content: finalAnswer },
    ],
  };
}
