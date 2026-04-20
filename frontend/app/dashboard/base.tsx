import { useEffect, useState } from 'react';
import api from "@/lib/api";
import React, { ReactNode } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, TooltipProps
} from 'recharts';
import {
    TrendingUp, Store, DollarSign, Package, PieChart as PieIcon,
    Target, ArrowRightLeft, Tag, LineChart as LineIcon, LucideIcon,
    Banana, PackageSearch, Tags
} from 'lucide-react';

interface GlassCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    trend: "up" | "down" | "neutral";
}

function GlassCard({ title, value, subtitle, icon, trend }: GlassCardProps) {
    return (
        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
                <div className="rounded-2xl bg-slate-50 p-3 shadow-inner">{icon}</div>
                {trend === "up" ? <TrendingUp size={20} className="text-emerald-500" /> : null}
                {trend === "down" ? (
                    <TrendingUp size={20} className="rotate-180 transform text-red-500" />
                ) : null}
            </div>
            <div>
                <p className="mb-1 text-sm font-medium text-slate-500">{title}</p>
                <h3 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
                <p className="text-xs font-medium text-slate-400">{subtitle}</p>
            </div>
        </div>
    );
}



// --- TIPAGENS DOS DADOS ---

interface Faturamento {
    produto: string;
    quant: number;
    valor: number;
}

interface LojaCompra {
    loja: string;
    valor: number;
}

interface ValorUnitario {
    produto: string;
    valor: number;
}

interface CaixaLoja {
    loja: string;
    total: number;
    status: 'Entregue' | 'Pendente';
}

interface TipoCaixa {
    nome: string;
    valor: number;
}

interface Meta {
    produto: string;
    meta: number;
    real: number;
    percentual: number;
}

interface Movimentacao {
    categoria: string;
    entrada: number;
    saida: number;
}

interface Estabelecimento {
    est: string;
    cat: string;
    precoMedio: number;
}

interface ComparativoPreco {
    data: string;
    interno: number;
    mercado: number;
}

// --- DADOS REAIS ---

// --- DADOS REAIS ---



const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// --- TIPAGENS DE COMPONENTES ---

interface CardProps {
    title: string;
    icon: LucideIcon;
    children: ReactNode;
    className?: string;
}

interface ColumnDef<T> {
    header: string;
    accessor: (row: T) => ReactNode;
    align?: 'left' | 'center' | 'right';
}

interface SimpleTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
}

// --- COMPONENTES DE UI ---

const Card: React.FC<CardProps> = ({ title, icon: Icon, children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col ${className}`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center">
            {children}
        </div>
    </div>
);

function SimpleTable<T>({ columns, data }: SimpleTableProps<T>) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase rounded-t-lg border-b border-slate-200">
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} className={`px-4 py-3 font-semibold ${col.align === 'right' ? 'text-right' : ''}`}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                            {columns.map((col, j) => (
                                <td key={j} className={`px-4 py-3 text-slate-700 ${col.align === 'right' ? 'text-right' : ''}`}>
                                    {col.accessor(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// --- UTILITÁRIOS ---
const formatarMoeda = (valor: number): string => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatarNumero = (valor: number): string => valor.toLocaleString('pt-BR');
const formatQuantity = (value: number, suffix?: string): string => {
    const formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return suffix ? `${formatted} ${suffix}` : formatted;
};

// --- DASHBOARD PRINCIPAL ---

export default function App() {
    const [summary, setSummary] = useState<any>(null);
    const [dadosFaturamento, setDadosFaturamento] = useState<Faturamento[]>([]);
    const [dadosLojasCompras, setDadosLojasCompras] = useState<LojaCompra[]>([]);
    const [dadosValorUnitario, setDadosValorUnitario] = useState<ValorUnitario[]>([]);
    const [dadosCaixasLojas, setDadosCaixasLojas] = useState<CaixaLoja[]>([]);
    const [dadosTipoCaixa, setDadosTipoCaixa] = useState<TipoCaixa[]>([]);
    const [dadosMetas, setDadosMetas] = useState<Meta[]>([]);
    const [dadosMovimentacao, setDadosMovimentacao] = useState<Movimentacao[]>([]);
    const [dadosEstabelecimentosBaratos, setDadosEstabelecimentosBaratos] = useState<Estabelecimento[]>([]);
    const [dadosComparativoPrecos, setDadosComparativoPrecos] = useState<ComparativoPreco[]>([]);
    const [produtoComparativo, setProdutoComparativo] = useState("-produto-");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                setIsLoading(true);
                const { data } = await api.get("/api/dashboard/summary");
                setSummary(data.summary);
                setDadosFaturamento(data.faturamento);
                setDadosLojasCompras(data.comprasPorLoja);
                setDadosValorUnitario(data.valorUnitario);
                setDadosCaixasLojas(data.caixasLojas);
                setDadosTipoCaixa(data.tiposCaixa);
                setDadosMetas((data.metas || []).map((m: any) => ({
                    produto: m.produto,
                    meta: Number(m.meta),
                    real: Number(m.pedido),
                    percentual: Number(m.progresso)
                })));
                setDadosMovimentacao(data.movimentacao.map((m: any) => ({
                    categoria: m.categoria,
                    entrada: m.valor,
                    saida: m.valor * 0.95
                })));
                setDadosComparativoPrecos(data.comparativoPrecos || []);
                setProdutoComparativo(data.produtoComparativo || "-produto-");
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Visão Executiva</h1>
                    <p className="text-slate-500 mt-1 text-sm md:text-base">Análise consolidada de Vendas, Logística, Estoque e Mercado</p>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                    Última atualização: Hoje, 11:30
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
                <GlassCard
                    title="Saldo de Estoque"
                    value={isLoading || !summary ? "Carregando..." : formatQuantity(summary.saldoEstoque, "kg")}
                    subtitle="Consolidado real das movimentações registradas."
                    icon={<Banana className="text-yellow-500" size={24} />}
                    trend={summary?.saldoEstoque > 0 ? "up" : "down"}
                />
                <GlassCard
                    title="Metas Ativas"
                    value={isLoading || !summary ? "Carregando..." : `${summary.metasAtivas} un`}
                    subtitle="Metas salvas no banco."
                    icon={<PackageSearch className="text-blue-500" size={24} />}
                    trend="neutral"
                />
                <GlassCard
                    title="Média de Entrega"
                    value={isLoading || !summary ? "Carregando..." : `${summary.mediaEntrega.toFixed(1)}%`}
                    subtitle="Progresso geral em relação às metas."
                    icon={<Tags className="text-emerald-500" size={24} />}
                    trend={summary?.mediaEntrega >= 80 ? "up" : summary?.mediaEntrega > 0 ? "down" : "neutral"}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                {/* 1. Top 5 Faturamento */}
                <Card title="Top 5 Produtos (Faturamento)" icon={TrendingUp} className="xl:col-span-1">
                    <SimpleTable<Faturamento>
                        columns={[
                            { header: 'Produto', accessor: row => <span className="font-medium">{row.produto}</span> },
                            { header: 'Qtd.', accessor: row => formatarNumero(row.quant), align: 'right' },
                            { header: 'Valor Total', accessor: row => <span className="text-emerald-600 font-semibold">{formatarMoeda(row.valor)}</span>, align: 'right' },
                        ]}
                        data={dadosFaturamento}
                    />
                </Card>

                {/* 2. Top 5 Lojas Compras */}
                <Card title="Volume de Compras por Loja" icon={Store} className="xl:col-span-3">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosLojasCompras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="loja" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value: number) => `R$ ${value / 1000}k`} />
                                <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="valor" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 3. Top 3 Valor Unitário */}
                <Card title="Maior Valor Unitário (Top 3)" icon={DollarSign}>
                    <SimpleTable<ValorUnitario>
                        columns={[
                            { header: 'Produto', accessor: row => <span className="font-medium">{row.produto}</span> },
                            { header: 'Preço Médio', accessor: row => <span className="font-semibold text-indigo-600">{formatarMoeda(row.valor)}</span>, align: 'right' },
                        ]}
                        data={dadosValorUnitario}
                    />
                </Card>

                {/* 4. Top 5 Caixas Lojas */}
                <Card title="Volume de Caixas por Loja" icon={Package}>
                    <SimpleTable<CaixaLoja>
                        columns={[
                            { header: 'Loja', accessor: row => <span className="font-medium truncate block max-w-[120px]">{row.loja}</span> },
                            { header: 'Caixas', accessor: row => formatarNumero(row.total), align: 'right' },
                            {
                                header: 'Status', accessor: row => (
                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${row.status === 'Entregue' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {row.status}
                                    </span>
                                ), align: 'right'
                            },
                        ]}
                        data={dadosCaixasLojas}
                    />
                </Card>

                {/* 5. Tipos Caixa */}
                <Card title="Distribuição por Embalagem" icon={PieIcon}>
                    <div className="h-56 w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dadosTipoCaixa}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="valor"
                                    stroke="none"
                                >
                                    {dadosTipoCaixa.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: number) => `${value}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none mb-8">
                            <span className="text-2xl font-bold text-slate-800">100%</span>
                            <span className="text-xs text-slate-400">Total</span>
                        </div>
                    </div>
                </Card>

                {/* 6. Metas */}
                <Card title="Mais Próximos da Meta" icon={Target}>
                    <SimpleTable<Meta>
                        columns={[
                            { header: 'Produto', accessor: row => <span className="font-medium">{row.produto}</span> },
                            {
                                header: 'Progresso', accessor: row => (
                                    <div className="flex items-center gap-2">
                                        <div className="w-full bg-slate-100 rounded-full h-2 min-w-[50px]">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${row.percentual}%` }}></div>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-600">{row.percentual}%</span>
                                    </div>
                                )
                            },
                        ]}
                        data={dadosMetas}
                    />
                </Card>

                {/* 7. Movimentação Estoque */}
                <Card title="Movimentação de Estoque (Kg)" icon={ArrowRightLeft} className="md:col-span-2">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosMovimentacao} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value: number) => `${value / 1000}k`} />
                                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="entrada" name="Entrada" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={60} />
                                <Bar dataKey="saida" name="Saída" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 8. Estabelecimentos Baratos */}
                <Card title="Mais Baratos por Categoria" icon={Tag} className="md:col-span-2 xl:col-span-4">
                    <SimpleTable<Estabelecimento>
                        columns={[
                            { header: 'Categoria', accessor: row => <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">{row.cat}</span> },
                            { header: 'Local', accessor: row => <span className="font-medium">{row.est}</span> },
                            { header: 'Média', accessor: row => <span className="font-semibold text-slate-800">{formatarMoeda(row.precoMedio)}</span>, align: 'right' },
                        ]}
                        data={dadosEstabelecimentosBaratos}
                    />
                </Card>

                {/* 9. Comparativo Preços */}
                <Card title={`Comparativo: ${produtoComparativo} (Nós x Mercado)`} icon={LineIcon} className="md:col-span-2 xl:col-span-4">
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dadosComparativoPrecos} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={['dataMin - 0.2', 'dataMax + 0.2']} tickFormatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => formatarMoeda(value)} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="interno" name="Nosso Preço" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="mercado" name="Média Mercado" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, strokeWidth: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

            </div>
        </div>
    );
}