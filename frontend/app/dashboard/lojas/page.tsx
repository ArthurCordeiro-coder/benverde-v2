"use client";
import { useEffect, useState } from 'react';
import api from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    Store, Map, ArrowLeft, DollarSign, TrendingUp, Search
} from 'lucide-react';
import React, { ReactNode } from 'react';

// --- MOCK DATA ---
const LOJAS_MOCK = [
    { id: "01", cidade: "Mogi das Cruzes", grupo: "Alto Tietê" },
    { id: "02", cidade: "Suzano", grupo: "Alto Tietê" },
    { id: "03", cidade: "São José dos Campos", grupo: "Vale do Paraíba" },
    { id: "04", cidade: "Jacareí", grupo: "Vale do Paraíba" },
    { id: "05", cidade: "Taubaté", grupo: "Vale do Paraíba" },
    { id: "06", cidade: "São Paulo", grupo: null }, // órfã
];

const PRODUTOS_LOJA_MOCK = [
    { produto: "Banana Nanica", massa: 1540.5, unidades: 120, valor: 4500.00 },
    { produto: "Laranja Pera", massa: 850.0, unidades: 85, valor: 2100.50 },
    { produto: "Maçã Gala", massa: 420.2, unidades: 45, valor: 1850.20 },
    { produto: "Mamão Formosa", massa: 310.0, unidades: 30, valor: 950.00 },
];

// --- TIPAGENS ---
interface Faturamento { produto: string; quant: number; valor: number; }
interface LojaCompra { loja: string; valor: number; }
interface ValorUnitario { produto: string; valor: number; }

interface CardProps { title: string; icon: any; children: ReactNode; className?: string; }
interface ColumnDef<T> { header: string; accessor: (row: T) => ReactNode; align?: 'left' | 'center' | 'right'; }
interface SimpleTableProps<T> { columns: ColumnDef<T>[]; data: T[]; }

const formatarMoeda = (valor: number): string => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatarNumero = (valor: number): string => valor.toLocaleString('pt-BR');

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

export default function LojasPage() {
    const [viewMode, setViewMode] = useState<'lojas' | 'grupos'>('lojas');
    const [selectedEntity, setSelectedEntity] = useState<{ type: 'loja' | 'grupo'; id: string; title: string; subtitle: string } | null>(null);

    // Global mock data to fill widget structures quickly
    const [dadosFaturamento, setDadosFaturamento] = useState<Faturamento[]>([]);
    const [dadosLojasCompras, setDadosLojasCompras] = useState<LojaCompra[]>([]);
    const [dadosValorUnitario, setDadosValorUnitario] = useState<ValorUnitario[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                setIsLoading(true);
                const { data } = await api.get("/api/dashboard/summary");
                setDadosFaturamento(data.faturamento || []);
                setDadosLojasCompras(data.comprasPorLoja || []);
                setDadosValorUnitario(data.valorUnitario || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const grupos = LOJAS_MOCK.reduce((acc, loja) => {
        if (!loja.grupo) return acc;
        if (!acc[loja.grupo]) acc[loja.grupo] = 0;
        acc[loja.grupo]++;
        return acc;
    }, {} as Record<string, number>);

    if (selectedEntity) {
        // --- DETAIL PAGE ---
        const totalMassa = PRODUTOS_LOJA_MOCK.reduce((acc, p) => acc + p.massa, 0);
        const totalUnidades = PRODUTOS_LOJA_MOCK.reduce((acc, p) => acc + p.unidades, 0);
        const totalValor = PRODUTOS_LOJA_MOCK.reduce((acc, p) => acc + p.valor, 0);

        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
                <button 
                    onClick={() => setSelectedEntity(null)}
                    className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar para {viewMode === 'lojas' ? 'lojas' : 'grupos'}
                </button>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">{selectedEntity.title}</h1>
                    <p className="text-slate-500 mt-1">{selectedEntity.subtitle}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* 1. Maiores Valores Unitários */}
                    <Card title="Maiores Valores Unitários (Top 3)" icon={DollarSign}>
                        {isLoading ? <p className="text-sm text-slate-500">Carregando...</p> : (
                            <SimpleTable<ValorUnitario>
                                columns={[
                                    { header: 'Produto', accessor: row => <span className="font-medium">{row.produto}</span> },
                                    { header: 'Preço Médio', accessor: row => <span className="font-semibold text-indigo-600">{formatarMoeda(row.valor)}</span>, align: 'right' },
                                ]}
                                data={dadosValorUnitario.slice(0, 3)} // mock limits
                            />
                        )}
                    </Card>

                    {/* 2. Top 5 Produtos */}
                    <Card title="Top 5 Produtos" icon={TrendingUp}>
                        {isLoading ? <p className="text-sm text-slate-500">Carregando...</p> : (
                            <SimpleTable<Faturamento>
                                columns={[
                                    { header: 'Produto', accessor: row => <span className="font-medium">{row.produto}</span> },
                                    { header: 'Qtd.', accessor: row => formatarNumero(row.quant), align: 'right' },
                                    { header: 'Valor Total', accessor: row => <span className="text-emerald-600 font-semibold">{formatarMoeda(row.valor)}</span>, align: 'right' },
                                ]}
                                data={dadosFaturamento.slice(0, 5)}
                            />
                        )}
                    </Card>
                </div>

                <div className="mb-8 h-80 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-slate-800 text-lg flex items-center gap-3">
                        <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Store size={20} /></span>
                        Volume de Compras (Histórico)
                    </h3>
                    {isLoading ? <p className="text-sm text-slate-500">Carregando...</p> : (
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dadosLojasCompras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="loja" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `R$${value/1000}k`} />
                                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => formatarMoeda(value)} />
                                    <Bar dataKey="valor" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Tabela Completa */}
                <Card title="Todos os Produtos Vendidos" icon={Search}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Produto</th>
                                    <th className="px-4 py-3 font-semibold text-right">Massa (kg)</th>
                                    <th className="px-4 py-3 font-semibold text-right">Unidades</th>
                                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {PRODUTOS_LOJA_MOCK.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-700">{row.produto}</td>
                                        <td className="px-4 py-3 text-slate-700 text-right">{row.massa.toLocaleString('pt-BR', {minimumFractionDigits: 1})}</td>
                                        <td className="px-4 py-3 text-slate-700 text-right">{row.unidades}</td>
                                        <td className="px-4 py-3 text-slate-700 text-right text-emerald-600 font-semibold">{formatarMoeda(row.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td className="px-4 py-3 text-left">TOTAL</td>
                                    <td className="px-4 py-3 text-right">{totalMassa.toLocaleString('pt-BR', {minimumFractionDigits: 1})}</td>
                                    <td className="px-4 py-3 text-right">{totalUnidades}</td>
                                    <td className="px-4 py-3 text-right">{formatarMoeda(totalValor)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rede Benverde</h1>
                    <p className="text-slate-500 mt-1">Gestão de Lojas e Grupos Geográficos</p>
                </div>
            </header>

            <div className="mb-8 flex items-center p-1 bg-slate-200/50 rounded-xl inline-flex">
                <button
                    onClick={() => setViewMode('lojas')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${viewMode === 'lojas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Store size={16} /> Lojas
                </button>
                <button
                    onClick={() => setViewMode('grupos')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${viewMode === 'grupos' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Map size={16} /> Grupos Geográficos
                </button>
            </div>

            {viewMode === 'lojas' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {LOJAS_MOCK.map((loja) => (
                        <div 
                            key={loja.id}
                            onClick={() => setSelectedEntity({ type: 'loja', id: loja.id, title: `Loja #${loja.id}`, subtitle: loja.cidade })}
                            className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2"
                        >
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                                <Store size={24} />
                            </div>
                            <h3 className="font-bold text-xl text-slate-800">#{loja.id}</h3>
                            <p className="text-slate-500 text-sm font-medium">{loja.cidade}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(grupos).map(([grupo, count]) => (
                        <div 
                            key={grupo}
                            onClick={() => setSelectedEntity({ type: 'grupo', id: grupo, title: grupo, subtitle: `${count} lojas pertencentes` })}
                            className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2"
                        >
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                                <Map size={24} />
                            </div>
                            <h3 className="font-bold text-xl text-slate-800">{grupo}</h3>
                            <p className="text-slate-500 text-sm font-medium">{count} loja(s)</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
