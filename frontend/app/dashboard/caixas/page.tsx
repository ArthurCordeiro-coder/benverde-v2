"use client";

import { FormEvent, useEffect, useState } from "react";
import api from "@/lib/api";

type CaixaRegistro = {
  data?: string | null;
  loja?: string;
  total?: number;
  caixas_benverde?: number;
};

export default function CaixasPage() {
  const [registros, setRegistros] = useState<CaixaRegistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [loja, setLoja] = useState("");
  const [data, setData] = useState("");
  const [quantidade, setQuantidade] = useState("");

  const carregarRegistros = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/caixas");
      setRegistros(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erro ao carregar caixas:", error);
      alert("Nao foi possivel carregar os registros de caixas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void carregarRegistros();
  }, []);

  const formatarData = (valor?: string | null) => {
    if (!valor) return "-";
    const parsed = new Date(valor);
    if (Number.isNaN(parsed.getTime())) return valor;
    return parsed.toLocaleDateString("pt-BR");
  };

  const handleSalvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const qtd = Number(quantidade);

    if (!loja.trim() || !data || !qtd || qtd <= 0) {
      alert("Preencha loja, data e quantidade validos.");
      return;
    }

    setSalvando(true);
    try {
      await api.post("/api/caixas", {
        loja: loja.trim(),
        data,
        total: qtd,
        caixas_benverde: qtd,
      });

      setModalAberto(false);
      setLoja("");
      setData("");
      setQuantidade("");
      await carregarRegistros();
    } catch (error) {
      console.error("Erro ao salvar registro de caixa:", error);
      alert("Nao foi possivel salvar o registro.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-100">Caixas Lojas</h1>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="bg-benverde-accent/20 hover:bg-benverde-accent/30 text-benverde-accent border border-benverde-accent/30 hover:border-benverde-accent/50 px-4 py-2 rounded-xl transition-all font-medium"
        >
          Novo Registro de Caixa
        </button>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse bg-transparent text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Data</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Loja</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Quantidade</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 border-b border-white/5 py-4 text-gray-400" colSpan={4}>
                    Carregando...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td className="px-3 border-b border-white/5 py-4 text-gray-400" colSpan={4}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro, index) => {
                  const quantidadeExibida = Number(registro.caixas_benverde ?? registro.total ?? 0);
                  const totalExibido = Number(registro.total ?? 0);
                  return (
                    <tr key={`${registro.data || "sem-data"}-${registro.loja || "sem-loja"}-${index}`}>
                      <td className="px-3 border-b border-white/5 py-4 text-gray-200">{formatarData(registro.data)}</td>
                      <td className="px-3 border-b border-white/5 py-4 text-gray-200">{registro.loja || "-"}</td>
                      <td className="px-3 border-b border-white/5 py-4 text-gray-200">{quantidadeExibida.toLocaleString("pt-BR")}</td>
                      <td className="px-3 border-b border-white/5 py-4 text-gray-200">{totalExibido.toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-gray-100">Novo Registro de Caixa</h2>
            <form className="mt-4 space-y-4" onSubmit={handleSalvar}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Loja</label>
                <input
                  type="text"
                  value={loja}
                  onChange={(e) => setLoja(e.target.value)}
                  placeholder="Ex: Loja 01"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-benverde-accent focus:ring-1 focus:ring-benverde-accent transition-all"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-benverde-accent focus:ring-1 focus:ring-benverde-accent transition-all"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-benverde-accent focus:ring-1 focus:ring-benverde-accent transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 px-4 py-2 rounded-xl transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="bg-benverde-accent/20 hover:bg-benverde-accent/30 text-benverde-accent border border-benverde-accent/30 hover:border-benverde-accent/50 px-4 py-2 rounded-xl transition-all font-medium disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
