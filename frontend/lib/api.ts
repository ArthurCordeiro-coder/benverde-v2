// Cliente HTTP fino sobre fetch nativo, com a mesma interface usada pelos
// componentes (api.get/post/..., resposta em `.data`, erro com `.response`
// no formato { status, data }) — substitui a dependência axios.

export type ApiResponse<T = unknown> = {
  data: T;
  status: number;
};

export class ApiRequestError extends Error {
  response: { status: number; data: unknown };

  constructor(status: number, data: unknown) {
    super(`Request failed with status code ${status}`);
    this.name = "ApiRequestError";
    this.response = { status, data };
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body !== undefined && !isFormData ? { "Content-Type": "application/json" } : undefined,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiRequestError(res.status, data);
  }
  return { data: data as T, status: res.status };
}

const api = {
  get: <T = unknown>(url: string) => request<T>("GET", url),
  post: <T = unknown>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T = unknown>(url: string, body?: unknown) => request<T>("PUT", url, body),
  patch: <T = unknown>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T = unknown>(url: string) => request<T>("DELETE", url),
};

export default api;
