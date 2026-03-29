"use client";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banana,
  PackageSearch,
  PlusCircle,
  UploadCloud,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "@/lib/api";

type HistoricoItem = {
  data?: string | null;
  tipo?: string;
  produto?: string;
  quant?: number;
  unidade?: string;
  arquivo?: string;
  loja?: string;
};

type RegistroNormalizado = {
  dataBruta: string | null;
  dataObj: Date | null;
  dataFormatada: string;
  diaChave: string | null;
  tipoRaw: string;
  tipoNormalizado: "entrada" | "saida" | "bonificacao" | "outro";
  produtoRaw: string;
  produtoLimpo: string;
  quant: number;
  unidadeRaw: string;
  unidadeLimpa: string;
  loja: string;
  arquivo: string;
};

type FiltroTipo = "todas" | "entradas" | "saidas";

type GlassCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
};

const VARIEDADES_VALIDAS = [
  "BANANA DA TERRA",
  "BANANA MACA",
  "BANANA MA\u00c7\u00c3",
  "BANANA PRATA",
  "BANANA NANICA",
  "BANANA",
];

const PIE_COLORS = [
  "#10b981",
  "#34d399",
  "#14b8a6",
  "#3b82f6",
  "#a78bfa",
  "#f97316",
  "#f43f5e",
  "#22d3ee",
];

const INPUT_CLASS =
  "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-benverde-accent focus:ring-1 focus:ring-benverde-accent transition-all";

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function limparProduto(nome?: string | null): string {
  const texto = String(nome ?? "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!texto) {
    return "-";
  }

  const textoNormalizado = normalizarTexto(texto);
  const variedade = VARIEDADES_VALIDAS.find((item) =>
    textoNormalizado.includes(normalizarTexto(item)),
  );
  if (variedade) {
    return variedade;
  }

  const matchesBanana = [...texto.matchAll(/\bBANANA\b/g)];
  const matchNumero = texto.match(/\b\d[\d.,]*/);

  let limite = texto.length;
  if (matchesBanana.length >= 2) {
    const idxSegundoBanana = matchesBanana[1].index ?? limite;
    limite = Math.min(limite, idxSegundoBanana + "BANANA".length);
  }
  if (typeof matchNumero?.index === "number") {
    limite = Math.min(limite, matchNumero.index);
  }

  const capturado = texto
    .slice(0, limite)
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (capturado) {
    return capturado;
  }

  const fallback = texto.match(/^(.+?)(?=\s+\d|$)/)?.[1]?.trim();
  return fallback || texto;
}

function limparUnidade(unid?: string | null): string {
  const match = String(unid ?? "")
    .toUpperCase()
    .match(/\b(KG|UN|CX|FD|PCT|SC)\b/);
  return match?.[1] ?? "-";
}

function formatarDataCompleta(data: Date | null): string {
  if (!data || Number.isNaN(data.getTime())) {
    return "-";
  }
  return data.toLocaleString("pt-BR");
}

function formatarDia(data: Date | null): string | null {
  if (!data || Number.isNaN(data.getTime())) {
    return null;
  }
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function parseData(valor?: string | null): Date | null {
  if (!valor) {
    return null;
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return null;
  }
  return data;
}

function normalizarTipo(tipo?: string | null): "entrada" | "saida" | "bonificacao" | "outro" {
  const base = normalizarTexto(String(tipo ?? ""));
  if (base === "ENTRADA") {
    return "entrada";
  }
  if (base === "SAIDA") {
    return "saida";
  }
  if (base === "BONIFICACAO" || base === "BONIFICACAO.") {
    return "bonificacao";
  }
  return "outro";
}

function formatarPeso(valor: number): string {
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function GlassCard({ title, value, subtitle, icon, trend = "neutral" }: GlassCardProps) {
  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col relative overflow-hidden group hover:bg-white/[0.05] transition-all">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 shadow-inner">{icon}</div>
        {trend === "up" && <ArrowUpCircle size={20} className="text-green-400" />}
        {trend === "down" && <ArrowDownCircle size={20} className="text-red-400" />}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-100 tracking-tight mb-2">{value}</h3>
        <p className="text-xs font-medium text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

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

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todas");
  const [buscaProduto, setBuscaProduto] = useState("");

  const inputFileRef = useRef<HTMLInputElement>(null);

  const buscarEstoque = async () => {
    setCarregando(true);
    try {
      const response = await api.get("/api/estoque/saldo");
      setSaldo(Number(response.data?.saldo ?? 0));
      setHistorico(Array.isArray(response.data?.historico) ? response.data.historico : []);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        return;
      }
      console.error("Erro ao carregar estoque:", error);
      alert("Nao foi possivel carregar os dados de estoque.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void buscarEstoque();
  }, []);

  const abrirSeletorArquivo = () => {
    inputFileRef.current?.click();
  };

  const handleUploadPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      return;
    }

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

  const registrosNormalizados = useMemo<RegistroNormalizado[]>(() => {
    return historico.map((item) => {
      const dataObj = parseData(item.data);
      return {
        dataBruta: item.data ?? null,
        dataObj,
        dataFormatada: formatarDataCompleta(dataObj),
        diaChave: formatarDia(dataObj),
        tipoRaw: String(item.tipo ?? "-"),
        tipoNormalizado: normalizarTipo(item.tipo),
        produtoRaw: String(item.produto ?? "-"),
        produtoLimpo: limparProduto(item.produto),
        quant: Number(item.quant ?? 0),
        unidadeRaw: String(item.unidade ?? "-"),
        unidadeLimpa: limparUnidade(item.unidade),
        loja: String(item.loja ?? "-"),
        arquivo: String(item.arquivo ?? "-"),
      };
    });
  }, [historico]);

  const metricas = useMemo(() => {
    let totalEntradas = 0;
    let totalSaidas = 0;

    for (const item of registrosNormalizados) {
      if (item.tipoNormalizado === "entrada") {
        totalEntradas += item.quant;
      } else if (item.tipoNormalizado === "saida" || item.tipoNormalizado === "bonificacao") {
        totalSaidas += item.quant;
      }
    }

    const saldoCalculado = totalEntradas - totalSaidas;
    const saldoAtual = Number.isFinite(saldo) ? saldo : saldoCalculado;

    return {
      saldoAtual,
      totalEntradas,
      totalSaidas,
      movimentacoes: registrosNormalizados.length,
    };
  }, [registrosNormalizados, saldo]);

  const alertaSaldo = useMemo(() => {
    if (metricas.saldoAtual <= 0) {
      return {
        titulo: "Estoque zerado ou negativo",
        descricao: "Reposicao imediata recomendada para evitar ruptura.",
        container: "bg-red-500/10 border-red-500/30 text-red-200",
        icon: "text-red-300",
      };
    }
    if (metricas.saldoAtual < 50) {
      return {
        titulo: "Estoque em nivel de atencao",
        descricao: "Saldo abaixo de 50 kg. Considere antecipar novas entradas.",
        container: "bg-amber-500/10 border-amber-500/30 text-amber-200",
        icon: "text-amber-300",
      };
    }
    return {
      titulo: "Estoque em nivel saudavel",
      descricao: "Saldo atual em faixa segura para operacao.",
      container: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
      icon: "text-emerald-300",
    };
  }, [metricas.saldoAtual]);

  const dadosTemporais = useMemo(() => {
    const porDia = new Map<string, { entradas: number; saidas: number }>();

    for (const item of registrosNormalizados) {
      if (!item.diaChave) {
        continue;
      }
      const atual = porDia.get(item.diaChave) ?? { entradas: 0, saidas: 0 };
      if (item.tipoNormalizado === "entrada") {
        atual.entradas += item.quant;
      } else if (item.tipoNormalizado === "saida" || item.tipoNormalizado === "bonificacao") {
        atual.saidas += item.quant;
      }
      porDia.set(item.diaChave, atual);
    }

    const chavesOrdenadas = [...porDia.keys()].sort((a, b) => a.localeCompare(b));

    let saldoAcumulado = 0;
    return chavesOrdenadas.map((chave) => {
      const atual = porDia.get(chave) ?? { entradas: 0, saidas: 0 };
      saldoAcumulado += atual.entradas - atual.saidas;
      const [, mes, dia] = chave.split("-");

      return {
        dia: `${dia}/${mes}`,
        entradas: Number(atual.entradas.toFixed(2)),
        saidas: Number(atual.saidas.toFixed(2)),
        saldoAcumulado: Number(saldoAcumulado.toFixed(2)),
      };
    });
  }, [registrosNormalizados]);

  const analiseVariedades = useMemo(() => {
    const mapa = new Map<string, { entradas: number; saidas: number }>();

    for (const item of registrosNormalizados) {
      const chave = item.produtoLimpo || "-";
      const atual = mapa.get(chave) ?? { entradas: 0, saidas: 0 };
      if (item.tipoNormalizado === "entrada") {
        atual.entradas += item.quant;
      } else if (item.tipoNormalizado === "saida" || item.tipoNormalizado === "bonificacao") {
        atual.saidas += item.quant;
      }
      mapa.set(chave, atual);
    }

    const tabela = [...mapa.entries()]
      .map(([produtoNome, valores]) => ({
        produto: produtoNome,
        entradas: Number(valores.entradas.toFixed(2)),
        saidas: Number(valores.saidas.toFixed(2)),
        saldo: Number((valores.entradas - valores.saidas).toFixed(2)),
      }))
      .sort((a, b) => b.saldo - a.saldo);

    const rosca = tabela
      .filter((item) => item.saldo > 0)
      .map((item) => ({
        name: item.produto,
        value: item.saldo,
      }));

    return { tabela, rosca };
  }, [registrosNormalizados]);

  const historicoFiltrado = useMemo(() => {
    const termo = normalizarTexto(buscaProduto);

    return registrosNormalizados.filter((item) => {
      const filtroTipoOk =
        filtroTipo === "todas" ||
        (filtroTipo === "entradas" && item.tipoNormalizado === "entrada") ||
        (filtroTipo === "saidas" &&
          (item.tipoNormalizado === "saida" || item.tipoNormalizado === "bonificacao"));

      const filtroBuscaOk =
        !termo || normalizarTexto(item.produtoLimpo).includes(termo);

      return filtroTipoOk && filtroBuscaOk;
    });
  }, [buscaProduto, filtroTipo, registrosNormalizados]);

  return (
    <section className="space-y-6 text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Registro de Estoque</h1>
          <p className="text-sm text-gray-400">
            Analise temporal, saldo por variedade e historico operacional.
          </p>
        </div>

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
            className="bg-benverde-accent/20 hover:bg-benverde-accent/30 text-benverde-accent border border-benverde-accent/30 hover:border-benverde-accent/50 px-4 py-2 rounded-xl transition-all font-medium disabled:cursor-not-allowed disabled:opacity-70 inline-flex items-center gap-2"
          >
            <UploadCloud size={16} />
            {enviandoPdf ? "Enviando..." : "Enviar DANFE (PDF)"}
          </button>

          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="bg-benverde-accent/20 hover:bg-benverde-accent/30 text-benverde-accent border border-benverde-accent/30 hover:border-benverde-accent/50 px-4 py-2 rounded-xl transition-all font-medium inline-flex items-center gap-2"
          >
            <PlusCircle size={16} />
            Nova Movimentacao
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard
          title="Saldo Atual"
          value={formatarPeso(metricas.saldoAtual)}
          subtitle="Posicao consolidada do estoque"
          icon={<Banana className="text-emerald-300" size={24} />}
          trend={metricas.saldoAtual >= 0 ? "up" : "down"}
        />
        <GlassCard
          title="Total Entradas"
          value={formatarPeso(metricas.totalEntradas)}
          subtitle="Movimentacoes classificadas como entrada"
          icon={<ArrowUpCircle className="text-blue-300" size={24} />}
          trend="up"
        />
        <GlassCard
          title="Total Saidas"
          value={formatarPeso(metricas.totalSaidas)}
          subtitle="Saidas e bonificacao no periodo"
          icon={<ArrowDownCircle className="text-orange-300" size={24} />}
          trend="down"
        />
        <GlassCard
          title="Movimentacoes"
          value={metricas.movimentacoes.toLocaleString("pt-BR")}
          subtitle="Quantidade total de registros"
          icon={<PackageSearch className="text-violet-300" size={24} />}
        />
      </div>

      <div
        className={`rounded-3xl border p-5 backdrop-blur-xl flex items-start gap-3 ${alertaSaldo.container}`}
      >
        <AlertTriangle size={22} className={`mt-0.5 shrink-0 ${alertaSaldo.icon}`} />
        <div>
          <p className="font-semibold">{alertaSaldo.titulo}</p>
          <p className="text-sm opacity-90">{alertaSaldo.descricao}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-gray-100 mb-1">Fluxo Diario de Estoque</h2>
          <p className="text-sm text-gray-400 mb-4">
            Entradas e saidas por dia, com saldo acumulado em linha tracejada.
          </p>
          <div className="h-80">
            {dadosTemporais.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 border border-dashed border-white/10 rounded-2xl">
                Sem dados suficientes para o grafico temporal.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosTemporais}>
                  <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(3, 10, 6, 0.9)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      color: "#e5e7eb",
                    }}
                    formatter={(value: number | string, name: string) => [
                      `${Number(value).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} kg`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="saidas" name="Saidas" fill="#f97316" radius={[8, 8, 0, 0]} />
                  <Line
                    dataKey="saldoAcumulado"
                    name="Saldo Acumulado"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-gray-100 mb-1">Saldo por Variedade</h2>
          <p className="text-sm text-gray-400 mb-4">
            Distribuicao do saldo (entradas menos saidas) por banana limpa.
          </p>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_1fr]">
            <div className="h-64">
              {analiseVariedades.rosca.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400 border border-dashed border-white/10 rounded-2xl">
                  Nenhum saldo positivo por variedade.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(3, 10, 6, 0.9)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        color: "#e5e7eb",
                      }}
                      formatter={(value: number | string) => [
                        `${Number(value).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} kg`,
                        "Saldo",
                      ]}
                    />
                    <Pie
                      data={analiseVariedades.rosca}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {analiseVariedades.rosca.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm bg-transparent">
                <thead>
                  <tr className="text-left">
                    <th className="text-gray-400 border-b border-white/10 pb-3 font-medium pr-4">Produto</th>
                    <th className="text-gray-400 border-b border-white/10 pb-3 font-medium pr-4">Entradas</th>
                    <th className="text-gray-400 border-b border-white/10 pb-3 font-medium pr-4">Saidas</th>
                    <th className="text-gray-400 border-b border-white/10 pb-3 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {analiseVariedades.tabela.length === 0 ? (
                    <tr>
                      <td className="border-b border-white/5 py-4 text-gray-400" colSpan={4}>
                        Sem registros para consolidar variedades.
                      </td>
                    </tr>
                  ) : (
                    analiseVariedades.tabela.map((linha) => (
                      <tr key={linha.produto}>
                        <td className="border-b border-white/5 py-4 text-gray-200 pr-4">{linha.produto}</td>
                        <td className="border-b border-white/5 py-4 text-gray-200 pr-4">
                          {linha.entradas.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="border-b border-white/5 py-4 text-gray-200 pr-4">
                          {linha.saidas.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`border-b border-white/5 py-4 font-medium ${
                            linha.saldo >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {linha.saldo.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Historico de Movimentacoes</h2>
          <div className="grid gap-3 sm:grid-cols-2 w-full md:w-auto md:min-w-[420px]">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
              className={INPUT_CLASS}
            >
              <option value="todas">Todas</option>
              <option value="entradas">Entradas</option>
              <option value="saidas">Saidas</option>
            </select>
            <input
              type="text"
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              placeholder="Buscar por produto..."
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse bg-transparent text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Data</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Tipo</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Produto</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Qtd</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Unid</th>
                <th className="px-3 text-gray-400 border-b border-white/10 pb-3 font-medium">Loja</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td className="px-3 border-b border-white/5 py-4 text-gray-400" colSpan={6}>
                    Carregando...
                  </td>
                </tr>
              ) : historicoFiltrado.length === 0 ? (
                <tr>
                  <td className="px-3 border-b border-white/5 py-4 text-gray-400" colSpan={6}>
                    Nenhum registro encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                historicoFiltrado.map((item, index) => (
                  <tr key={`${item.dataBruta || "sem-data"}-${item.produtoRaw}-${index}`}>
                    <td className="px-3 border-b border-white/5 py-4 text-gray-200">
                      {item.dataFormatada}
                    </td>
                    <td
                      className={`px-3 border-b border-white/5 py-4 font-medium ${
                        item.tipoNormalizado === "entrada"
                          ? "text-emerald-300"
                          : item.tipoNormalizado === "saida" ||
                              item.tipoNormalizado === "bonificacao"
                            ? "text-orange-300"
                            : "text-gray-300"
                      }`}
                    >
                      {item.tipoRaw}
                    </td>
                    <td className="px-3 border-b border-white/5 py-4 text-gray-200">
                      {item.produtoLimpo}
                    </td>
                    <td className="px-3 border-b border-white/5 py-4 text-gray-200">
                      {item.quant.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 border-b border-white/5 py-4 text-gray-200">
                      {item.unidadeLimpa}
                    </td>
                    <td className="px-3 border-b border-white/5 py-4 text-gray-200">
                      {item.loja}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-gray-100">Nova Movimentacao</h3>
            <form className="mt-4 space-y-4" onSubmit={handleSalvarMovimentacao}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Produto</label>
                <select
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-benverde-accent focus:ring-1 focus:ring-benverde-accent transition-all appearance-none"
                  required
                >
                  <option value="" disabled className="text-gray-500 bg-benverde-base">
                    Selecione a variedade...
                  </option>
                  <option value="BANANA NANICA" className="bg-benverde-base text-white">
                    BANANA NANICA
                  </option>
                  <option value="BANANA PRATA" className="bg-benverde-base text-white">
                    BANANA PRATA
                  </option>
                  <option value="BANANA DA TERRA" className="bg-benverde-base text-white">
                    BANANA DA TERRA
                  </option>
                  <option value={"BANANA MA\u00c7\u00c3"} className="bg-benverde-base text-white">
                    {"BANANA MA\u00c7\u00c3"}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className={INPUT_CLASS}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as "entrada" | "saida")}
                  className={INPUT_CLASS}
                >
                  <option value="entrada">entrada</option>
                  <option value="saida">saida</option>
                </select>
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
                  disabled={salvandoMovimentacao}
                  className="bg-benverde-accent/20 hover:bg-benverde-accent/30 text-benverde-accent border border-benverde-accent/30 hover:border-benverde-accent/50 px-4 py-2 rounded-xl transition-all font-medium disabled:cursor-not-allowed disabled:opacity-70"
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
