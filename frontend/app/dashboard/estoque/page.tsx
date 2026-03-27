"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import api from "@/lib/api";

type HistoricoItem = {
  data?: string | null;
  tipo?: string;
  produto?: string;
  quant?: number;
  unidade?: string;
  arquivo?: string;
};

export default function EstoquePage() {
  const [saldo, setSaldo] = useState(0);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvandoMovimentacao, setSalvandoMovimentacao] = useState(false);

  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");

  const inputFileRef = useRef<HTMLInputElement>(null);

  const buscarEstoque = async () => {
    setCarregando(true);
    try {
      const response = await api.get("/api/estoque/saldo");
      setSaldo(Number(response.data?.saldo ?? 0));
      setHistorico(Array.isArray(response.data?.historico) ? response.data.historico : []);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
      alert("Nao foi possivel carregar os dados de estoque.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void buscarEstoque();
  }, []);

  const formatarData = (valor?: string | null) => {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-BR");
  };

  const abrirSeletorArquivo = () => {
    inputFileRef.current?.click();
  };

  const handleUploadPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setEnviandoPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", arquivo);
      await api.post("/api/upload/pdf", formData);
      alert("DANFE enviada com sucesso.");
      await buscarEstoque();
    } catch (error) {
      console.error("Erro no upload do PDF:", error);
      alert("Falha ao enviar o PDF.");
    } finally {
      setEnviandoPdf(false);
      event.target.value = "";
    }
  };

  const handleSalvarMovimentacao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quant = Number(quantidade);

    if (!produto.trim() || !quant || quant <= 0) {
      alert("Preencha produto e quantidade validos.");
      return;
    }

    setSalvandoMovimentacao(true);
    try {
      await api.post("/api/estoque/movimentacao", {
        produto: produto.trim(),
        quant,
        tipo,
      });

      setModalAberto(false);
      setProduto("");
      setQuantidade("");
      setTipo("entrada");
      await buscarEstoque();
    } catch (error) {
      console.error("Erro ao salvar movimentacao:", error);
      alert("Nao foi possivel salvar a movimentacao.");
    } finally {
      setSalvandoMovimentacao(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Registro de Estoque</h1>

        <div className="flex gap-2">
          <input
            ref={inputFileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUploadPdf}
          />

          <button
            type="button"
            onClick={abrirSeletorArquivo}
            disabled={enviandoPdf}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {enviandoPdf ? "Enviando..." : "Enviar DANFE (PDF)"}
          </button>

          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Nova Movimentacao
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-sm text-slate-500">Saldo atual</p>
        <p
          className={`mt-2 text-4xl font-bold ${
            saldo > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
          kg
        </p>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Historico</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Quantidade</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    Carregando...
                  </td>
                </tr>
              ) : historico.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                historico.map((item, index) => {
                  const tipoTexto = String(item.tipo || "-");
                  const tipoNormalizado = tipoTexto.toLowerCase();
                  const isEntrada = tipoNormalizado === "entrada";
                  const tipoClasse = isEntrada ? "text-green-600" : "text-red-600";

                  return (
                    <tr key={`${item.data || "sem-data"}-${item.produto || "sem-produto"}-${index}`} className="border-b">
                      <td className="px-3 py-2 text-slate-700">{formatarData(item.data)}</td>
                      <td className={`px-3 py-2 font-semibold ${tipoClasse}`}>{tipoTexto}</td>
                      <td className="px-3 py-2 text-slate-700">{item.produto || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {(Number(item.quant || 0) || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{item.unidade || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{item.arquivo || "-"}</td>
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
            <h3 className="text-lg font-semibold text-slate-900">Nova Movimentacao</h3>
            <form className="mt-4 space-y-4" onSubmit={handleSalvarMovimentacao}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Produto</label>
                <input
                  type="text"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as "entrada" | "saida")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="entrada">entrada</option>
                  <option value="saida">saida</option>
                </select>
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
                  disabled={salvandoMovimentacao}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {salvandoMovimentacao ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
