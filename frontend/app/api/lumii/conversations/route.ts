import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";
import { listConversations } from "@/lib/server/lumii-conversations";

export async function GET() {
  try {
    const user = await requireUser();
    const conversations = await listConversations(user.username);
    return NextResponse.json({ conversations });
  } catch (error) {
    return toErrorResponse(error);
  }
}
