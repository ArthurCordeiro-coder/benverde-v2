"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import {
  FileUp,
  Leaf,
  PackageCheck,
  Plus,
  Save,
  Trash2,
  Waypoints,
} from "lucide-react";

import api from "@/lib/api";
import {
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  CARD_GLASS,
  INPUT_GLASS,
  LOJAS_OPERACIONAIS,
  VARIEDADES_OFICIAIS,
  createUid,
  formatDateTime,
  getTodayDateInputValue,
  normalizarVariedadeOficial,
  toLocalDayKey,
  type LinhaOperacionalTipo,
} from "@/lib/operacional";

type LinhaRegistro = {
  id: string;
  selecionada: boolean;
  produto: string;
  quant: string;
  loja: string;
  tipo: LinhaOperacionalTipo;
};

type MovimentacaoItem = {
  id?: number;
  data?: string | null;
  tipo?: string | null;
  produto?: string | null;
  quant?: number | null;
  unidade?: string | null;
  loja?: string | null;
  arquivo?: string | null;
};

type UploadResultadoItem = {
  produto?: string | null;
  quant?: number | string | null;
};

function createLinhaRegistro(initial?: Partial<LinhaRegistro>): LinhaRegistro {
  return {
    id: createUid("registro"),
    selecionada: false,
    produto: "",
    quant: "",
    loja: "Entrada",
    tipo: "entrada",
    ...initial,
  };
}

function formatarQuantidade(valor?: number | null): string {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function labelTipo(tipo?: string | null): string {
  if (tipo === "bonificacao") {
    return "Bonificacao";
  }
  if (tipo === "saida") {
    return "Saida";
  }
  return "Entrada";
}

export default function RegistroPage() {
  const [linhas, setLinhas] = useState<LinhaRegistro[]>([createLinhaRegistro()]);
  const [movimentacoesHoje, setMovimentacoesHoje] = useState<MovimentacaoItem[]>([]);
  const [carregandoTabela, setCarregandoTabela] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoDocumento, setEnviandoDocumento] = useState(false);

  const carregarMovimentacoesHoje = async () => {
    setCarregandoTabela(true);
    try {
      const response = await api.get("/api/estoque/movimentacoes");
      const hoje = getTodayDateInputValue();
      const registros = Array.isArray(response.data) ? response.data : [];
      const filtrados = registros
        .filter((item: MovimentacaoItem) => toLocalDayKey(item.data) === hoje)
        .sort((a: MovimentacaoItem, b: MovimentacaoItem) => Number(b.id ?? 0) - Number(a.id ?? 0));
      setMovimentacoesHoje(filtrados);
    } catch (error) {
      console.error("Erro ao carregar movimentacoes manuais:", error);
      window.alert("Nao foi possivel carregar as movimentacoes de hoje.");
    } finally {
      setCarregandoTabela(false);
    }
  };

  useEffect(() => {
    void carregarMovimentacoesHoje();
  }, []);

  const atualizarLinha = (
    id: string,
    campo: keyof Omit<LinhaRegistro, "id">,
    valor: string | boolean,
  ) => {
    setLinhas((current) =>
      current.map((linha) => {
        if (linha.id !== id) {
          return linha;
        }

        if (campo === "tipo") {
          const proximoTipo = valor as LinhaOperacionalTipo;
          return {
            ...linha,
            tipo: proximoTipo,
            loja: proximoTipo === "entrada" ? "Entrada" : "",
          };
        }

        return {
          ...linha,
          [campo]: valor,
        };
      }),
    );
  };

  const adicionarLinha = () => {
    setLinhas((current) => [...current, createLinhaRegistro()]);
  };

  const removerSelecionadas = () => {
    const selecionadas = linhas.filter((linha) => linha.selecionada);
    if (selecionadas.length === 0) {
      window.alert("Selecione ao menos uma linha para remover.");
      return;
    }

    const restantes = linhas.filter((linha) => !linha.selecionada);
    setLinhas(restantes.length > 0 ? restantes : [createLinhaRegistro()]);
  };

  const handleUploadDocumento = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      return;
    }

    setEnviandoDocumento(true);
    try {
      const formData = new FormData();
      formData.append("file", arquivo);

      const response = await api.post("/api/upload/pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const resultado = Array.isArray(response.data?.resultado)
        ? (response.data.resultado as UploadResultadoItem[])
        : [];
      const novasLinhas = resultado
        .map((item) => {
          const quant = Number(item.quant ?? 0);
          if (!Number.isFinite(quant) || quant <= 0) {
            return null;
          }
          return createLinhaRegistro({
            produto: normalizarVariedadeOficial(item.produto),
            quant: String(quant),
            loja: "Entrada",
            tipo: "entrada",
          });
        })
        .filter(Boolean) as LinhaRegistro[];

      if (novasLinhas.length === 0) {
        window.alert(
          "Documento enviado, mas nenhuma linha de banana foi identificada. Voce pode preencher manualmente abaixo.",
        );
      } else {
        setLinhas((current) => {
          const possuiConteudo = current.some(
            (linha) => linha.produto || Number(linha.quant) > 0 || linha.tipo !== "entrada",
          );
          return possuiConteudo ? [...current, ...novasLinhas] : novasLinhas;
        });
        window.alert(
          `${novasLinhas.length} linha(s) adicionada(s) ao formulario. Revise tipo e loja antes de salvar.`,
        );
      }
    } catch (error: any) {
      console.error("Erro ao enviar documento de estoque:", error);
      const detail = error?.response?.data?.detail ?? error?.message;
      window.alert(typeof detail === "string" ? detail : "Falha ao enviar o documento.");
    } finally {
      setEnviandoDocumento(false);
      event.target.value = "";
    }
  };

  const handleSalvar = async () => {
    const linhasPreenchidas = linhas.filter((linha) => linha.produto && Number(linha.quant) > 0);
    if (linhasPreenchidas.length === 0) {
      window.alert("Adicione ao menos uma linha com variedade e quantidade validas.");
      return;
    }

    for (const linha of linhasPreenchidas) {
      if (linha.tipo !== "entrada" && !linha.loja) {
        window.alert("Selecione a loja para todas as linhas de saida ou bonificacao.");
        return;
      }
    }

    const payload = linhasPreenchidas.map((linha) => ({
      data: new Date().toISOString(),
      tipo: linha.tipo,
      produto: linha.produto,
      quant: Number(linha.quant),
      unidade: "KG",
      loja: linha.tipo === "entrada" ? "Entrada" : linha.loja,
      arquivo: "manual-ui",
    }));

    setSalvando(true);
    try {
      await api.post("/api/estoque/movimentacao", payload);
      setLinhas([createLinhaRegistro()]);
      await carregarMovimentacoesHoje();
      window.alert(`${payload.length} movimentacao(oes) salva(s) com sucesso.`);
    } catch (error: any) {
      console.error("Erro ao salvar movimentacoes:", error);
      const detail = error?.response?.data?.detail ?? error?.message;
      window.alert(
        typeof detail === "string" ? detail : "Nao foi possivel salvar as movimentacoes.",
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id?: number) => {
    if (!id) {
      return;
    }

    if (!window.confirm("Deseja realmente excluir esta movimentacao?")) {
      return;
    }

    try {
      await api.delete(`/api/estoque/movimentacao/${id}`);
      await carregarMovimentacoesHoje();
    } catch (error: any) {
      console.error("Erro ao excluir movimentacao:", error);
      const detail = error?.response?.data?.detail ?? error?.message;
      window.alert(
        typeof detail === "string" ? detail : "Nao foi possivel excluir a movimentacao.",
      );
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className={`${CARD_GLASS} p-6`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Leaf size={14} />
                Operacional
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-100">Registro de Estoque</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  Lance entradas, saidas e bonificacoes sem acessar o painel gerencial.
                  O documento ajuda a preencher o formulario, mas a revisao final fica sob
                  nosso controle.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/registro" className={BUTTON_PRIMARY}>
                <PackageCheck size={16} />
                Estoque
              </Link>
              <Link
                href="/registro-caixas"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-gray-200 transition-all hover:bg-white/10"
              >
                <Waypoints size={16} />
                Registro de Caixas
              </Link>
            </div>
          </div>
        </header>

        <section className={`${CARD_GLASS} p-6`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Formulario dinamico</h2>
              <p className="mt-1 text-sm text-gray-400">
                Use o upload como apoio e finalize as linhas antes de salvar.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                id="upload-documento-estoque"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUploadDocumento}
              />
              <label
                htmlFor="upload-documento-estoque"
                className={`${BUTTON_PRIMARY} ${enviandoDocumento ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
              >
                <FileUp size={16} />
                {enviandoDocumento ? "Enviando documento..." : "Enviar documento (NF-e/Semar)"}
              </label>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {linhas.map((linha, index) => (
              <div
                key={linha.id}
                className="grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 md:grid-cols-[72px_1.6fr_1fr_1.4fr_1.1fr]"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={linha.selecionada}
                    onChange={(event) =>
                      atualizarLinha(linha.id, "selecionada", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-black/20 text-benverde-accent focus:ring-benverde-accent"
                  />
                  <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Variedade</label>
                  <select
                    value={linha.produto}
                    onChange={(event) => atualizarLinha(linha.id, "produto", event.target.value)}
                    className={`${INPUT_GLASS} appearance-none`}
                    required
                  >
                    <option value="" disabled className="bg-benverde-base text-gray-500">
                      Selecione a variedade...
                    </option>
                    {VARIEDADES_OFICIAIS.map((variedade) => (
                      <option
                        key={variedade}
                        value={variedade}
                        className="bg-benverde-base text-white"
                      >
                        {variedade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Qtd (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.quant}
                    onChange={(event) => atualizarLinha(linha.id, "quant", event.target.value)}
                    className={INPUT_GLASS}
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Loja</label>
                  {linha.tipo === "entrada" ? (
                    <select value="Entrada" disabled className={`${INPUT_GLASS} opacity-80`}>
                      <option value="Entrada" className="bg-benverde-base text-white">
                        Entrada
                      </option>
                    </select>
                  ) : (
                    <select
                      value={linha.loja}
                      onChange={(event) => atualizarLinha(linha.id, "loja", event.target.value)}
                      className={`${INPUT_GLASS} appearance-none`}
                    >
                      <option value="" disabled className="bg-benverde-base text-gray-500">
                        Selecione a loja...
                      </option>
                      {LOJAS_OPERACIONAIS.map((loja) => (
                        <option
                          key={loja.value}
                          value={loja.value}
                          className="bg-benverde-base text-white"
                        >
                          {loja.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Tipo</label>
                  <select
                    value={linha.tipo}
                    onChange={(event) => atualizarLinha(linha.id, "tipo", event.target.value)}
                    className={`${INPUT_GLASS} appearance-none`}
                  >
                    <option value="entrada" className="bg-benverde-base text-white">
                      Entrada
                    </option>
                    <option value="saida" className="bg-benverde-base text-white">
                      Saida
                    </option>
                    <option value="bonificacao" className="bg-benverde-base text-white">
                      Bonificacao
                    </option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={adicionarLinha} className={BUTTON_PRIMARY}>
              <Plus size={16} />
              Adicionar linha
            </button>
            <button type="button" onClick={removerSelecionadas} className={BUTTON_DANGER}>
              <Trash2 size={16} />
              Remover selecionadas
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className={`${BUTTON_PRIMARY} ${salvando ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <Save size={16} />
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </section>

        <section className={`${CARD_GLASS} p-6`}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Movimentacoes de hoje</h2>
              <p className="mt-1 text-sm text-gray-400">
                Somente os registros manuais do dia atual aparecem aqui para conferencia rapida.
              </p>
            </div>
            <p className="text-sm font-medium text-gray-500">
              Data de referencia: {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse bg-transparent text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 pr-4 font-medium text-gray-400 border-b border-white/10">
                    Horario
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Tipo
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Produto
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Qtd
                  </th>
                  <th className="px-4 pb-3 font-medium text-gray-400 border-b border-white/10">
                    Loja
                  </th>
                  <th className="pl-4 pb-3 font-medium text-gray-400 border-b border-white/10 text-right">
                    Acao
                  </th>
                </tr>
              </thead>
              <tbody>
                {carregandoTabela ? (
                  <tr>
                    <td className="py-4 text-gray-400 border-b border-white/5" colSpan={6}>
                      Carregando registros do dia...
                    </td>
                  </tr>
                ) : movimentacoesHoje.length === 0 ? (
                  <tr>
                    <td className="py-4 text-gray-400 border-b border-white/5" colSpan={6}>
                      Nenhuma movimentacao manual registrada hoje.
                    </td>
                  </tr>
                ) : (
                  movimentacoesHoje.map((movimentacao) => (
                    <tr key={movimentacao.id ?? createUid("mov")}>
                      <td className="py-4 pr-4 text-gray-200 border-b border-white/5">
                        {formatDateTime(movimentacao.data)}
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {labelTipo(movimentacao.tipo)}
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {movimentacao.produto || "-"}
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {formatarQuantidade(movimentacao.quant)} kg
                      </td>
                      <td className="px-4 py-4 text-gray-200 border-b border-white/5">
                        {movimentacao.loja || "-"}
                      </td>
                      <td className="pl-4 py-4 text-right border-b border-white/5">
                        <button
                          type="button"
                          onClick={() => void handleExcluir(movimentacao.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 transition-all hover:border-rose-500/40 hover:bg-rose-500/20"
                          aria-label="Excluir movimentacao"
                        >
                          <Trash2 size={16} />
                        </button>
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
