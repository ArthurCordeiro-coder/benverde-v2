import { badRequest } from "@/lib/server/errors";

export async function readJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch (error) {
    console.error("Falha ao ler corpo JSON da requisição.", error);
    badRequest("Corpo JSON inválido.");
  }
}
