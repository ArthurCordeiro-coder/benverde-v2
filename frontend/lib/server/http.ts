import { badRequest } from "@/lib/server/errors";

export async function readJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    badRequest("Corpo JSON invalido.");
  }
}
