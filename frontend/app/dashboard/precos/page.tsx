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
      <h1 className="text-2xl font-bold text-gray-100">Busca de Precos</h1>

      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto por nome..."
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-benverde-accent focus:ring-1 focus:ring-benverde-accent transition-all"
          />
          <button
            type="button"
            onClick={() => setOrdem((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="bg-benverde-accent/20 hover:bg-benverde-accent/30 text-benverde-accent border border-benverde-accent/30 hover:border-benverde-accent/50 px-4 py-2 rounded-xl transition-all font-medium"
          >
            Ordenar: {ordem === "asc" ? "Preco crescente" : "Preco decrescente"}
          </button>
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse bg-transparent text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Produto</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Preco</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 border-b border-white/5 py-4 text-gray-400" colSpan={2}>
                    Carregando...
                  </td>
                </tr>
              ) : precosFiltradosOrdenados.length === 0 ? (
                <tr>
                  <td className="px-3 border-b border-white/5 py-4 text-gray-400" colSpan={2}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                precosFiltradosOrdenados.map((item, index) => {
                  const nome = String(item.Produto ?? item.produto ?? "-");
                  const valor = Number(item.Preco ?? item.preco ?? 0);
                  return (
                    <tr key={`${nome}-${index}`}>
                      <td className="px-3 border-b border-white/5 py-4 text-gray-200">{nome}</td>
                      <td className="px-3 border-b border-white/5 py-4 text-gray-200">
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
