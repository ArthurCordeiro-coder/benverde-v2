import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { listPendingUsers } from "@/lib/server/users";

export async function GET() {
  try {
    await requireAdminUser();
    const items = await listPendingUsers();

    return NextResponse.json({
      count: items.length,
      items: items.map((item) => ({
        username: item.username,
        nome: item.nome,
        email: item.email,
        funcionalidade: item.funcionalidade || "administracao geral",
        solicitado_em: item.solicitado_em?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
