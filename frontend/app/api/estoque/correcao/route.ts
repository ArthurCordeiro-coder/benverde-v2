import { NextResponse } from "next/server";

import { requireDashboardScope } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { readJsonBody } from "@/lib/server/http";
import { execute, queryRows } from "@/lib/server/db";
import { serviceUnavailable, badRequest } from "@/lib/server/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Movimentacao = {
  id: number;
  data: string | null;
  tipo: string | null;
  produto: string | null;
  quant: number;
  unidade: string | null;
  loja: string | null;
};

// ─── Tools disponíveis para o Grok ───────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "atualizar_movimentacao",
      description:
        "Atualiza campos de uma movimentação de estoque existente. Só chamar após confirmação explícita do usuário.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da movimentação a corrigir" },
          quant: { type: "number", description: "Nova quantidade em KG, se precisar alterar" },
          tipo: {
            type: "string",
            enum: ["entrada", "saida", "bonificação"],
            description: "Novo tipo, se precisar alterar",
          },
          loja: { type: "string", description: "Nova loja de destino, se precisar alterar" },
          produto: {
            type: "string",
            enum: ["BANANA NANICA", "BANANA DA TERRA", "BANANA PRATA", "BANANA MAÇÃ"],
            description: "Novo produto, se precisar alterar",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deletar_movimentacao",
      description:
        "Remove completamente uma movimentação incorreta. Só chamar após confirmação explícita do usuário.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID da movimentação a remover" },
          motivo: { type: "string", description: "Motivo da remoção, para log" },
        },
        required: ["id", "motivo"],
      },
    },
  },
];

// ─── Executor das tools no Neon ───────────────────────────────────────────────

async function executarTool(nome: string, args: Record<string, unknown>): Promise<string> {
  if (nome === "atualizar_movimentacao") {
    const { id, ...campos } = args as { id: number } & Record<string, unknown>;

    if (!Number.isInteger(id) || id <= 0) {
      return JSON.stringify({ erro: "ID inválido." });
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [campo, valor] of Object.entries(campos)) {
      if (["quant", "tipo", "loja", "produto"].includes(campo) && valor !== undefined) {
        setClauses.push(`${campo} = $${idx++}`);
        values.push(valor);
      }
    }

    if (setClauses.length === 0) {
      return JSON.stringify({ erro: "Nenhum campo válido para atualizar." });
    }

    values.push(id);
    await execute(
      `UPDATE estoque_manual SET ${setClauses.join(", ")} WHERE id = $${idx}`,
      values as (string | number | boolean | Date | null)[]
    );

    return JSON.stringify({ sucesso: true, id, campos_alterados: campos });
  }

  if (nome === "deletar_movimentacao") {
    const { id, motivo } = args as { id: number; motivo: string };

    if (!Number.isInteger(id) || id <= 0) {
      return JSON.stringify({ erro: "ID inválido." });
    }

    const rows = await queryRows<{ id?: number }>(
      "DELETE FROM estoque_manual WHERE id = $1 RETURNING id",
      [id]
    );

    if (rows.length === 0) {
      return JSON.stringify({ erro: "Movimentação não encontrada." });
    }

    return JSON.stringify({ sucesso: true, id, motivo });
  }

  return JSON.stringify({ erro: "Função desconhecida." });
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(historico: Movimentacao[]): string {
  const linhas = historico
    .map(
      (m) =>
        `ID ${m.id} | ${m.produto ?? "—"} | ${m.quant} ${m.unidade ?? "KG"} | ${m.tipo ?? "—"} | loja: ${m.loja ?? "—"} | data: ${m.data ?? "—"}`
    )
    .join("\n");

  return `
Você é um assistente de gestão de estoque da Benverde.
Você tem acesso ao histórico completo de movimentações abaixo:

${linhas || "(nenhuma movimentação registrada)"}

Seu papel é:
1. Responder perguntas sobre o estoque (consultas, resumos, totais, análises)
2. Corrigir ou remover registros incorretos quando o usuário solicitar
3. Antes de executar qualquer alteração, resumir claramente o que será feito e pedir confirmação explícita do usuário
4. Só chamar as funções após confirmação clara ("sim", "pode fazer", "confirmo", etc.)

Seja direto e objetivo. Não faça mais de uma pergunta por vez.
`.trim();
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    await requireDashboardScope("estoque");

    const payload = await readJsonBody<Record<string, unknown>>(request);

    const historico = (payload.historico ?? []) as Movimentacao[];
    const history = (payload.history ?? []) as ChatMessage[];
    const userMessage = String(payload.message ?? "").trim();

    if (!userMessage) {
      badRequest("message é obrigatório.");
    }

    const xaiApiKey = process.env.XAI_API_KEY?.trim();
    if (!xaiApiKey) {
      serviceUnavailable("Serviço de IA não configurado. Defina XAI_API_KEY no servidor.");
    }

    const messages: Record<string, unknown>[] = [
      { role: "system", content: buildSystemPrompt(historico) },
      ...history,
      { role: "user", content: userMessage },
    ];

    let iteracoes = 0;
    const MAX_ITER = 6;

    // Loop de tool calling
    while (iteracoes < MAX_ITER) {
      iteracoes++;

      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${xaiApiKey}`,
        },
        body: JSON.stringify({
          model: "grok-3",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          (err as { error?: { message?: string } })?.error?.message?.trim() ||
          `Erro ${res.status} ao comunicar com a IA.`;
        return NextResponse.json({ detail }, { status: 502 });
      }

      const data = await res.json() as {
        choices: Array<{
          message: {
            role: string;
            content: string | null;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
        }>;
      };

      const msg = data.choices[0].message;
      messages.push(msg as Record<string, unknown>);

      // Sem tool calls → resposta final em texto
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        const answer = msg.content ?? "";
        const concluido =
          answer.toLowerCase().includes("corrig") &&
          (answer.toLowerCase().includes("sucesso") ||
            answer.toLowerCase().includes("aplicad") ||
            answer.toLowerCase().includes("feito"));

        return NextResponse.json({
          answer,
          concluido,
          history: [
            ...history,
            { role: "user", content: userMessage },
            { role: "assistant", content: answer },
          ],
        });
      }

      // Executa cada tool call
      for (const call of msg.tool_calls) {
        const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        let resultado: string;
        try {
          resultado = await executarTool(call.function.name, args);
        } catch (e) {
          resultado = JSON.stringify({
            erro: e instanceof Error ? e.message : "Falha na execução",
          });
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: resultado,
        });
      }
    }

    return NextResponse.json(
      { detail: "Limite de iterações da IA atingido." },
      { status: 500 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

// ─── PATCH — atualização direta (sem IA, para casos simples) ─────────────────

export async function PATCH(request: Request) {
  try {
    await requireDashboardScope("estoque");

    const url = new URL(request.url);
    const idStr = url.searchParams.get("id");
    const id = Number(idStr);

    if (!Number.isInteger(id) || id <= 0) {
      badRequest("ID inválido na query string (?id=...).");
    }

    const payload = await readJsonBody<Record<string, unknown>>(request);
    const campos = payload as Record<string, unknown>;

    const setClauses: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];
    let idx = 1;

    for (const [campo, valor] of Object.entries(campos)) {
      if (["quant", "tipo", "loja", "produto"].includes(campo) && valor !== undefined) {
        setClauses.push(`${campo} = $${idx++}`);
        values.push(valor as string | number);
      }
    }

    if (setClauses.length === 0) {
      badRequest("Nenhum campo válido para atualizar.");
    }

    values.push(id);
    await execute(
      `UPDATE estoque_manual SET ${setClauses.join(", ")} WHERE id = $${idx}`,
      values
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
