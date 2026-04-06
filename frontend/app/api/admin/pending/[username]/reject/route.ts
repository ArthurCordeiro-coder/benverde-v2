import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/server/auth";
import { notFound, toErrorResponse } from "@/lib/server/errors";
import { rejectPendingUser } from "@/lib/server/users";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { username } = await context.params;
    const rejected = await rejectPendingUser(username);
    if (!rejected) {
      notFound("Solicitacao pendente nao encontrada.");
    }

    return NextResponse.json({
      success: true,
      username,
      action: "rejected",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
