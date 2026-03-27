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
        <h1 className="text-2xl font-bold text-slate-900">Caixas Lojas</h1>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Novo Registro de Caixa
        </button>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Loja</th>
                <th className="px-3 py-2">Quantidade</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    Carregando...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro, index) => {
                  const quantidadeExibida = Number(registro.caixas_benverde ?? registro.total ?? 0);
                  const totalExibido = Number(registro.total ?? 0);
                  return (
                    <tr key={`${registro.data || "sem-data"}-${registro.loja || "sem-loja"}-${index}`} className="border-b">
                      <td className="px-3 py-2 text-slate-700">{formatarData(registro.data)}</td>
                      <td className="px-3 py-2 text-slate-700">{registro.loja || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{quantidadeExibida.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-slate-700">{totalExibido.toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Novo Registro de Caixa</h2>
            <form className="mt-4 space-y-4" onSubmit={handleSalvar}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Loja</label>
                <input
                  type="text"
                  value={loja}
                  onChange={(e) => setLoja(e.target.value)}
                  placeholder="Ex: Loja 01"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
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
