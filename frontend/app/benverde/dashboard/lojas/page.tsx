"use client";
import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import api from "@/lib/api";
import {
    Store, ArrowLeft, Loader2, TrendingUp, Package, Scale, ArrowDownAZ, ArrowUpAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, CalendarRange, ArrowUpDown, Check, ChevronDown
} from 'lucide-react';

// --- Types ---
interface ProdutoData {
    produto: string;
    massa: number;
    unidades: number;
    valor: number;
}

interface LojaData {
    id: string;
    nome: string;
    grupo: string | null;
    produtos: ProdutoData[];
}

type SortKey = 'alfabetica' | 'faturamento';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; dir: SortDir; label: string; icon: ReactNode }[] = [
    { key: 'faturamento', dir: 'desc', label: 'Maior faturamento', icon: <ArrowDownWideNarrow size={16} /> },
    { key: 'faturamento', dir: 'asc', label: 'Menor faturamento', icon: <ArrowUpWideNarrow size={16} /> },
    { key: 'alfabetica', dir: 'asc', label: 'Ordem alfabética (A–Z)', icon: <ArrowDownAZ size={16} /> },
    { key: 'alfabetica', dir: 'desc', label: 'Ordem alfabética (Z–A)', icon: <ArrowUpAZ size={16} /> },
];

interface ColumnDef<T> {
    header: string;
    accessor: (row: T) => ReactNode;
    align?: 'left' | 'center' | 'right';
}
interface SimpleTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
}

const formatarMoeda = (valor: number): string => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatarNumero = (valor: number): string => valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const totalValorLoja = (loja: LojaData): number => loja.produtos.reduce((acc, p) => acc + p.valor, 0);

const formatarMesLabel = (mes: string): string => {
    const [ano, m] = mes.split('-');
    const data = new Date(Number(ano), Number(m) - 1, 1);
    const label = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
};

// --- Components ---

function GlassCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: ReactNode }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-[40px]" />
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-emerald-400 ring-1 ring-white/10">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight text-white">{value}</h3>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function SimpleTable<T>({ columns, data }: SimpleTableProps<T>) {
    return (
        <>
            {/* Tabela — tablet e desktop */}
            <div className="hidden overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md md:block">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 bg-white/[0.02] uppercase border-b border-white/10">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className={`px-4 py-4 font-semibold ${col.align === 'right' ? 'text-right' : ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-white/[0.04] transition-colors">
                                {columns.map((col, j) => (
                                    <td key={j} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : ''}`}>
                                        {col.accessor(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                                    Nenhum dado encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Cards — celular */}
            <div className="space-y-3 md:hidden">
                {data.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-slate-500">
                        Nenhum dado encontrado.
                    </div>
                ) : (
                    data.map((row, i) => (
                        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <dl className="space-y-2">
                                {columns.map((col, j) => (
                                    <div key={j} className="flex items-start justify-between gap-3">
                                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{col.header}</dt>
                                        <dd className="text-right text-sm text-slate-200">{col.accessor(row)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

// --- Main Page ---

export default function LojasPage() {
    const [lojas, setLojas] = useState<LojaData[]>([]);

    // Período selecionado. Vazio até o primeiro fetch definir o mês mais recente.
    const [inicio, setInicio] = useState('');
    const [fim, setFim] = useState('');
    const [agruparMeses, setAgruparMeses] = useState(false);

    // Ordenação
    const [sortKey, setSortKey] = useState<SortKey>('faturamento');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [sortOpen, setSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    const [selectedLoja, setSelectedLoja] = useState<LojaData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelado = false;
        async function fetchLojas() {
            try {
                setIsLoading(true);
                const params = new URLSearchParams();
                if (inicio) params.set('inicio', inicio);
                if (fim) params.set('fim', fim);
                const q = params.toString();
                const { data } = await api.get<{
                    lojas?: LojaData[];
                    meses?: string[];
                    inicio?: string;
                    fim?: string;
                }>(`/api/dashboard/lojas${q ? `?${q}` : ''}`);
                if (cancelado) return;

                setLojas(data.lojas || []);

                // Primeira carga: adota o período padrão (mês mais recente) vindo do servidor.
                if (!inicio && data.inicio) setInicio(data.inicio);
                if (!fim && data.fim) setFim(data.fim);
            } catch (e) {
                if (!cancelado) console.error(e);
            } finally {
                if (!cancelado) setIsLoading(false);
            }
        }
        fetchLojas();
        return () => { cancelado = true; };
    }, [inicio, fim]);

    // Fecha o dropdown de ordenação ao clicar fora.
    useEffect(() => {
        function handleClickFora(e: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setSortOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    const lojasOrdenadas = useMemo(() => {
        const arr = [...lojas];
        const fator = sortDir === 'asc' ? 1 : -1;
        arr.sort((a, b) => {
            if (sortKey === 'faturamento') {
                return (totalValorLoja(a) - totalValorLoja(b)) * fator;
            }
            return a.nome.localeCompare(b.nome, 'pt-BR') * fator;
        });
        return arr;
    }, [lojas, sortKey, sortDir]);

    function setOrdenacao(key: SortKey, dir: SortDir) {
        setSortKey(key);
        setSortDir(dir);
    }

    const sortOptionAtual = SORT_OPTIONS.find(o => o.key === sortKey && o.dir === sortDir) ?? SORT_OPTIONS[0];

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex animate-pulse flex-col items-center gap-4 text-emerald-400">
                    <Loader2 size={32} className="animate-spin" />
                    <p className="text-sm font-medium">Carregando dados das lojas...</p>
                </div>
            </div>
        );
    }

    if (selectedLoja) {
        // --- DETAIL PAGE ---
        const entityData = selectedLoja;
        const totalMassa = entityData.produtos.reduce((acc, p) => acc + p.massa, 0);
        const totalUnidades = entityData.produtos.reduce((acc, p) => acc + p.unidades, 0);
        const totalValor = entityData.produtos.reduce((acc, p) => acc + p.valor, 0);

        return (
            <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <button
                    onClick={() => setSelectedLoja(null)}
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar para Lojas
                </button>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        {(entityData.grupo || 'Geral')} - Loja {entityData.id}
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Loja • {entityData.nome}
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <GlassCard
                        title="Massa Total"
                        value={`${formatarNumero(totalMassa)} KG`}
                        subtitle="Volume distribuído"
                        icon={<Scale size={24} />}
                    />
                    <GlassCard
                        title="Unidades"
                        value={`${formatarNumero(totalUnidades)}`}
                        subtitle="Itens unitários"
                        icon={<Package size={24} />}
                    />
                    <GlassCard
                        title="Faturamento"
                        value={formatarMoeda(totalValor)}
                        subtitle="Valor total da venda"
                        icon={<TrendingUp size={24} />}
                    />
                </div>

                <h2 className="text-xl font-bold text-white mb-4">Composição por Produto</h2>
                <SimpleTable<ProdutoData>
                    columns={[
                        { header: 'Produto', accessor: row => <span className="font-medium text-white">{row.produto}</span> },
                        { header: 'Massa (KG)', accessor: row => <span className="text-slate-300">{formatarNumero(row.massa)} KG</span>, align: 'right' },
                        { header: 'Unidades', accessor: row => <span className="text-slate-300">{formatarNumero(row.unidades)}</span>, align: 'right' },
                        { header: 'Valor Emitido', accessor: row => <span className="font-semibold text-emerald-400">{formatarMoeda(row.valor)}</span>, align: 'right' },
                    ]}
                    data={[...entityData.produtos].sort((a,b) => b.massa - a.massa)}
                />
            </div>
        );
    }

    const sortBtn = (active: boolean) =>
        `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            active
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
        }`;

    return (
        <div className="w-full space-y-8">
            <header className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Análise por Loja</h1>
                        <p className="mt-1 pb-1 text-sm text-slate-400">
                            Visualize indicadores de performance das unidades.
                        </p>
                    </div>

                    {/* Filtro de período */}
                    <div className="flex flex-wrap items-center gap-3">
                        {agruparMeses ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="month"
                                    value={inicio}
                                    max={fim || undefined}
                                    onChange={(e) => setInicio(e.target.value)}
                                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-md outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-500">até</span>
                                <input
                                    type="month"
                                    value={fim}
                                    min={inicio || undefined}
                                    onChange={(e) => setFim(e.target.value)}
                                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-md outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        ) : (
                            <input
                                type="month"
                                value={inicio}
                                onChange={(e) => { setInicio(e.target.value); setFim(e.target.value); }}
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-md outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        )}
                        <button
                            onClick={() => {
                                setAgruparMeses(prev => {
                                    // Ao desativar o agrupamento, volta para um único mês (o de início).
                                    if (prev) setFim(inicio);
                                    return !prev;
                                });
                            }}
                            className={sortBtn(agruparMeses)}
                            title="Agrupar vários meses para análise"
                        >
                            <CalendarRange size={16} /> Agrupar meses
                        </button>
                    </div>
                </div>

                {/* Ordenação */}
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Ordenar por</span>
                    <div className="relative" ref={sortRef}>
                        <button
                            onClick={() => setSortOpen(prev => !prev)}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/10"
                        >
                            <ArrowUpDown size={16} className="text-emerald-400" />
                            {sortOptionAtual?.label}
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {sortOpen && (
                            <div className="absolute left-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
                                {SORT_OPTIONS.map(opt => {
                                    const active = sortKey === opt.key && sortDir === opt.dir;
                                    return (
                                        <button
                                            key={`${opt.key}-${opt.dir}`}
                                            onClick={() => { setOrdenacao(opt.key, opt.dir); setSortOpen(false); }}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                                                active ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <span className={active ? 'text-emerald-400' : 'text-slate-400'}>{opt.icon}</span>
                                            <span className="flex-1">{opt.label}</span>
                                            {active && <Check size={16} className="text-emerald-400" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {agruparMeses && inicio && fim && (
                        <span className="ml-auto text-xs text-slate-400">
                            Período: {formatarMesLabel(inicio)} – {formatarMesLabel(fim)}
                        </span>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {lojasOrdenadas.map(loja => (
                    <div
                        key={loja.id}
                        onClick={() => setSelectedLoja(loja)}
                        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-lg backdrop-blur-2xl transition-all hover:bg-white/[0.05] hover:shadow-emerald-500/10 hover:border-emerald-500/30"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-emerald-400 ring-1 ring-white/10 group-hover:bg-emerald-500/10 group-hover:text-emerald-300">
                                    <Store size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                                        {loja.grupo || 'Geral'} - Loja {loja.id}
                                    </h3>
                                    <p className="text-xs text-slate-400">{loja.nome}</p>
                                </div>
                            </div>
                            <div className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/5 line-clamp-1 truncate max-w-[80px]" title={loja.id}>
                                ID {loja.id}
                            </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                            <div>
                                <p className="text-xs text-slate-500">Massa (KG)</p>
                                <p className="font-semibold text-slate-200">
                                    {formatarNumero(loja.produtos.reduce((acc, p) => acc + p.massa, 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Valor</p>
                                <p className="font-semibold text-emerald-400">
                                    {formatarMoeda(totalValorLoja(loja))}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {lojasOrdenadas.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500">Nenhuma loja encontrada nos pedidos.</div>
                )}
            </div>
        </div>
    );
}
