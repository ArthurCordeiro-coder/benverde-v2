"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightLeft, Boxes, CheckCircle2, Leaf, Save } from "lucide-react";

import api from "@/lib/api";
import {
  BUTTON_PRIMARY,
  CARD_GLASS,
  INPUT_GLASS,
  LOJAS_OPERACIONAIS,
  extractLojaNumero,
  formatDate,
  getTodayDateInputValue,
} from "@/lib/operacional";

type CaixaRegistro = {
  data?: string | null;
  loja?: string | null;
  n_loja?: number | null;
  caixas_benverde?: number | null;
  caixas_bananas?: number | null;
  caixas_ccj?: number | null;
  ccj_banca?: number | null;
  ccj_mercadoria?: number | null;
  ccj_retirada?: number | null;
  total?: number | null;
  entregue?: string | null;
};

function parseNumero(valor: string): number {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

export default function RegistroCaixasPage() {
  const [loja, setLoja] = useState("");
  const [caixasBenverde, setCaixasBenverde] = useState("");
  const [caixasBananas, setCaixasBananas] = useState("");
  const [caixasCcj, setCaixasCcj] = useState("");
  const [ccjBanca, setCcjBanca] = useState("");
  const [ccjMercadoria, setCcjMercadoria] = useState("");
  const [ccjRetirada, setCcjRetirada] = useState("");
  const [entregue, setEntregue] = useState<"Sim" | "Nao">("Nao");

  const [registros, setRegistros] = useState<CaixaRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregarRegistros = async () => {
    setCarregando(true);
    try {
      const response = await api.get("/api/caixas");
      const lista = Array.isArray(response.data) ? (response.data as CaixaRegistro[]) : [];
      setRegistros(lista);
    } catch (error) {
      console.error("Erro ao carregar registros de caixas:", error);
      window.alert("Nao foi possivel carregar os registros de caixas.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarRegistros();
  }, []);

  const somaCcjDetalhada =
    parseNumero(ccjBanca) + parseNumero(ccjMercadoria) + parseNumero(ccjRetirada);
  const totalGeral =
    parseNumero(caixasBenverde) + parseNumero(caixasBananas) + parseNumero(caixasCcj);

  const registrosDaLoja = loja
    ? registros
        .filter((registro) => registro.loja === loja)
        .sort((a, b) => {
          const dataA = new Date(a.data ?? 0).getTime();
          const dataB = new Date(b.data ?? 0).getTime();
          return dataB - dataA;
        })
        .slice(0, 10)
    : [];

  const resetFormulario = () => {
    setCaixasBenverde("");
    setCaixasBananas("");
    setCaixasCcj("");
    setCcjBanca("");
    setCcjMercadoria("");
    setCcjRetirada("");
    setEntregue("Nao");
  };

  const handleRegistrar = async () => {
    if (!loja) {
      window.alert("Selecione a loja antes de registrar.");
      return;
    }

    const caixasCcjNumero = parseNumero(caixasCcj);
    if (somaCcjDetalhada > caixasCcjNumero) {
      window.alert(
        "A soma da distribuicao CCJ nao pode ser maior que o total informado em Caixas CCJ.",
      );
      return;
    }

    setSalvando(true);
    try {
      await api.post("/api/caixas", {
        data: getTodayDateInputValue(),
        loja,
        n_loja: extractLojaNumero(loja),
        caixas_benverde: parseNumero(caixasBenverde),
        caixas_bananas: parseNumero(caixasBananas),
        caixas_ccj: caixasCcjNumero,
        ccj_banca: parseNumero(ccjBanca),
        ccj_mercadoria: parseNumero(ccjMercadoria),
        ccj_retirada: parseNumero(ccjRetirada),
        total: totalGeral,
        entregue,
      });

      resetFormulario();
      await carregarRegistros();
      window.alert("Registro de caixas salvo com sucesso.");
    } catch (error: any) {
      console.error("Erro ao registrar caixas:", error);
      const detail = error?.response?.data?.detail ?? error?.message;
      window.alert(
        typeof detail === "string" ? detail : "Nao foi possivel salvar o registro.",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className={`${CARD_GLASS} p-6`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Leaf size={14} />
                Operacional
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-100">Registro de Caixas</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  Registre o consolidado de caixas por loja, incluindo a distribuicao do
                  estoque CCJ e o status de entrega do dia.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/registro"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-gray-200 transition-all hover:bg-white/10"
              >
                <ArrowRightLeft size={16} />
                Registro de Estoque
              </Link>
              <Link href="/registro-caixas" className={BUTTON_PRIMARY}>
                <Boxes size={16} />
                Caixas
              </Link>
            </div>
          </div>
        </header>

        <section className={`${CARD_GLASS} p-6`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Selecione sua loja
              </label>
              <select
                value={loja}
                onChange={(event) => setLoja(event.target.value)}
                className={`${INPUT_GLASS} appearance-none`}
              >
                <option value="" disabled className="bg-benverde-base text-gray-500">
                  Selecione sua loja...
                </option>
                {LOJAS_OPERACIONAIS.map((opcao) => (
                  <option
                    key={opcao.value}
                    value={opcao.value}
                    className="bg-benverde-base text-white"
                  >
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm font-medium text-gray-400">Resumo automatico</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Total CCJ distribuido</p>
                  <p className="mt-1 font-semibold text-gray-100">{somaCcjDetalhada}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total geral de caixas</p>
                  <p className="mt-1 font-semibold text-gray-100">{totalGeral}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Caixas Benverde
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={caixasBenverde}
                onChange={(event) => setCaixasBenverde(event.target.value)}
                className={INPUT_GLASS}
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Caixas Bananas
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={caixasBananas}
                onChange={(event) => setCaixasBananas(event.target.value)}
                className={INPUT_GLASS}
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Caixas CCJ
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={caixasCcj}
                onChange={(event) => setCaixasCcj(event.target.value)}
                className={INPUT_GLASS}
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Distribuicao CCJ</h2>
                <p className="text-sm text-gray-400">
                  A soma das subcategorias nao pode ultrapassar o total de caixas CCJ.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300">
                <CheckCircle2 size={14} />
                Soma atual: {somaCcjDetalhada}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">
                  Caixas na banca
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={ccjBanca}
                  onChange={(event) => setCcjBanca(event.target.value)}
                  className={INPUT_GLASS}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">
                  Caixas c/ mercadoria
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={ccjMercadoria}
                  onChange={(event) => setCcjMercadoria(event.target.value)}
                  className={INPUT_GLASS}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">
                  Caixas p/ retirada
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={ccjRetirada}
                  onChange={(event) => setCcjRetirada(event.target.value)}
                  className={INPUT_GLASS}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-gray-400">Entregue?</p>
            <div className="flex flex-wrap gap-3">
              {(["Sim", "Nao"] as const).map((opcao) => (
                <label
                  key={opcao}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    entregue === opcao
                      ? "border-benverde-accent/40 bg-benverde-accent/20 text-benverde-accent"
                      : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="entregue"
                    value={opcao}
                    checked={entregue === opcao}
                    onChange={() => setEntregue(opcao)}
                    className="h-4 w-4 border-white/20 bg-black/20 text-benverde-accent focus:ring-benverde-accent"
                  />
                  {opcao}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleRegistrar}
              disabled={salvando}
              className={`${BUTTON_PRIMARY} ${salvando ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <Save size={16} />
              {salvando ? "Registrando..." : "Registrar"}
            </button>
          </div>
        </section>

        <section className={`${CARD_GLASS} p-6`}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Ultimos 10 registros</h2>
              <p className="mt-1 text-sm text-gray-400">
                O historico abaixo responde a loja selecionada no formulario.
              </p>
            </div>
            <p className="text-sm font-medium text-gray-500">
              Loja atual: {loja || "Selecione uma loja"}
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse bg-transparent text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 pr-4 font-medium text-gray-400 border-b border-white/10">
                    Data
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Benverde
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Bananas
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    CCJ
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Total
                  </th>
                  <th className="pl-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Entregue
                  </th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td className="py-4 text-gray-400 border-b border-white/5" colSpan={6}>
                      Carregando registros...
                    </td>
                  </tr>
                ) : !loja ? (
                  <tr>
                    <td className="py-4 text-gray-400 border-b border-white/5" colSpan={6}>
                      Selecione uma loja para ver o historico recente.
                    </td>
                  </tr>
                ) : registrosDaLoja.length === 0 ? (
                  <tr>
                    <td className="py-4 text-gray-400 border-b border-white/5" colSpan={6}>
                      Nenhum registro encontrado para esta loja.
                    </td>
                  </tr>
                ) : (
                  registrosDaLoja.map((registro, index) => (
                    <tr
                      key={`${registro.loja || "loja"}-${registro.data || "data"}-${index}`}
                    >
                      <td className="py-4 pr-4 text-gray-200 border-b border-white/5">
                        {formatDate(registro.data)}
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {Number(registro.caixas_benverde ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {Number(registro.caixas_bananas ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {Number(registro.caixas_ccj ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {Number(registro.total ?? 0)}
                      </td>
                      <td className="pl-4 py-4 text-gray-200 border-b border-white/5">
                        {registro.entregue || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
