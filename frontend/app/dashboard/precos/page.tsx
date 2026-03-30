"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

type PrecoItem = {
  Produto?: string;
  Preco?: number;
  [key: string]: unknown;
};

export default function PrecosPage() {
  const [precos, setPrecos] = useState<PrecoItem[]>([]);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(true);

  const carregarPrecos = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/precos");
      setPrecos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erro ao carregar precos:", error);
      alert("Nao foi possivel carregar os precos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void carregarPrecos();
  }, []);

  const precosFiltradosOrdenados = useMemo(() => {
    const getNome = (item: PrecoItem) => String(item.Produto ?? item.produto ?? "");
    const getValor = (item: PrecoItem) => Number(item.Preco ?? item.preco ?? 0);

    const termo = busca.trim().toLowerCase();
    const filtrados = !termo
      ? [...precos]
      : precos.filter((item) => getNome(item).toLowerCase().includes(termo));

    filtrados.sort((a, b) => getValor(a) - getValor(b));
    if (ordem === "desc") {
      filtrados.reverse();
    }
    return filtrados;
  }, [busca, ordem, precos]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Busca de Precos</h1>

      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto por nome..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => setOrdem((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Ordenar: {ordem === "asc" ? "Preco crescente" : "Preco decrescente"}
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Preco</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={2}>
                    Carregando...
                  </td>
                </tr>
              ) : precosFiltradosOrdenados.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={2}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                precosFiltradosOrdenados.map((item, index) => {
                  const nome = String(item.Produto ?? item.produto ?? "-");
                  const valor = Number(item.Preco ?? item.preco ?? 0);
                  return (
                    <tr key={`${nome}-${index}`} className="border-b">
                      <td className="px-3 py-2 text-slate-700">{nome}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {valor.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
