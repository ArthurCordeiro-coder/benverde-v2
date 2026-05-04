"use client";
import { useEffect, useState, ReactNode } from 'react';
import api from "@/lib/api";
import {
    Store, Map, ArrowLeft, Loader2, TrendingUp, Package, Scale
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

interface GrupoData {
    id: string; // nome do grupo
    nome: string;
    lojasCount: number;
    produtos: ProdutoData[];
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

const formatarMoeda = (valor: number): string => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatarNumero = (valor: number): string => valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// --- Components ---

function GlassCard({ title, value, subtitle, icon, trend }: { title: string; value: string; subtitle: string; icon: ReactNode; trend?: "up" | "down" | "neutral" }) {
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
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
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
    );
}

// --- Main Page ---

export default function LojasPage() {
    const [viewMode, setViewMode] = useState<'lojas' | 'grupos'>('lojas');
    const [mes, setMes] = useState('');
    const [lojas, setLojas] = useState<LojaData[]>([]);
    const [grupos, setGrupos] = useState<GrupoData[]>([]);
    
    // selectedEntity for detail view. If null, show the list.
    const [selectedEntity, setSelectedEntity] = useState<{ type: 'loja' | 'grupo'; data: LojaData | GrupoData } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchLojas() {
            try {
                setIsLoading(true);
                const q = mes ? `?mes=${mes}` : '';
                const { data } = await api.get(`/api/dashboard/lojas${q}`);
                const lojasData: LojaData[] = data.lojas || [];
                setLojas(lojasData);

                // Build Grupos
                const gruposMap: Record<string, { lojasCount: number, produtos: Record<string, ProdutoData> }> = {};
                for (const loja of lojasData) {
                    const nomeGrupo = loja.grupo || "Sem Grupo";
                    if (!gruposMap[nomeGrupo]) {
                        gruposMap[nomeGrupo] = { lojasCount: 0, produtos: {} };
                    }
                    gruposMap[nomeGrupo].lojasCount += 1;
                    
                    for (const prod of loja.produtos) {
                        if (!gruposMap[nomeGrupo].produtos[prod.produto]) {
                            gruposMap[nomeGrupo].produtos[prod.produto] = { produto: prod.produto, massa: 0, unidades: 0, valor: 0 };
                        }
                        gruposMap[nomeGrupo].produtos[prod.produto].massa += prod.massa;
                        gruposMap[nomeGrupo].produtos[prod.produto].unidades += prod.unidades;
                        gruposMap[nomeGrupo].produtos[prod.produto].valor += prod.valor;
                    }
                }

                const gruposData: GrupoData[] = Object.keys(gruposMap).map(k => ({
                    id: k,
                    nome: k,
                    lojasCount: gruposMap[k].lojasCount,
                    produtos: Object.values(gruposMap[k].produtos).sort((a, b) => a.produto.localeCompare(b.produto))
                }));

                setGrupos(gruposData.sort((a, b) => a.nome.localeCompare(b.nome)));

            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLojas();
    }, [mes]);

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

    if (selectedEntity) {
        // --- DETAIL PAGE ---
        const entityData = selectedEntity.data;
        const totalMassa = entityData.produtos.reduce((acc, p) => acc + p.massa, 0);
        const totalUnidades = entityData.produtos.reduce((acc, p) => acc + p.unidades, 0);
        const totalValor = entityData.produtos.reduce((acc, p) => acc + p.valor, 0);

        return (
            <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <button 
                    onClick={() => setSelectedEntity(null)}
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar para {viewMode === 'lojas' ? 'Lojas' : 'Grupos'}
                </button>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        {selectedEntity.type === 'loja' ? `${(entityData as LojaData).grupo || 'Geral'} - Loja ${(entityData as LojaData).id}` : entityData.nome}
                    </h1>
                    <p className="text-slate-400 mt-1">
                        {selectedEntity.type === 'loja' ? `Loja • ${entityData.nome}` : `Grupo Geográfico • ${(entityData as GrupoData).lojasCount} loja(s)`}
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <GlassCard 
                        title="Massa Total" 
                        value={`${formatarNumero(totalMassa)} KG`} 
                        subtitle="Volume distribuído"
                        icon={<Scale size={24} />} 
                        trend="neutral" 
                    />
                    <GlassCard 
                        title="Unidades" 
                        value={`${formatarNumero(totalUnidades)}`} 
                        subtitle="Itens unitários"
                        icon={<Package size={24} />} 
                        trend="neutral" 
                    />
                    <GlassCard 
                        title="Faturamento" 
                        value={formatarMoeda(totalValor)} 
                        subtitle="Valor total da venda"
                        icon={<TrendingUp size={24} />} 
                        trend="neutral" 
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
                    data={entityData.produtos.sort((a,b) => b.massa - a.massa)}
                />
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Análise por Loja</h1>
                    <p className="mt-1 pb-1 text-sm text-slate-400">
                        Visualize indicadores de performance das unidades.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <input 
                        type="month" 
                        value={mes} 
                        onChange={(e) => setMes(e.target.value)}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-md outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
                        <button
                            onClick={() => setViewMode('lojas')}
                            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                viewMode === 'lojas'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Store size={16} /> Lojas
                        </button>
                        <button
                            onClick={() => setViewMode('grupos')}
                            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                viewMode === 'grupos'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Map size={16} /> Grupos Geográficos
                        </button>
                    </div>
                </div>
            </header>

            {viewMode === 'lojas' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {lojas.map(loja => (
                        <div
                            key={loja.id}
                            onClick={() => setSelectedEntity({ type: 'loja', data: loja })}
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
                                        {formatarMoeda(loja.produtos.reduce((acc, p) => acc + p.valor, 0))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {lojas.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">Nenhuma loja encontrada nos pedidos.</div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {grupos.map(grupo => (
                        <div
                            key={grupo.id}
                            onClick={() => setSelectedEntity({ type: 'grupo', data: grupo })}
                            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-lg backdrop-blur-2xl transition-all hover:bg-white/[0.05] hover:shadow-emerald-500/10 hover:border-emerald-500/30"
                        >
                            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-emerald-400 ring-1 ring-white/10 group-hover:bg-emerald-500/10 group-hover:text-emerald-300">
                                        <Map size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{grupo.nome}</h3>
                                        <p className="text-sm text-slate-400">{grupo.lojasCount} loja{grupo.lojasCount !== 1 ? 's' : ''} na região</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
                                <div>
                                    <p className="text-xs text-slate-500">Massa (KG)</p>
                                    <p className="font-semibold text-slate-200">
                                        {formatarNumero(grupo.produtos.reduce((acc, p) => acc + p.massa, 0))}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Unidades</p>
                                    <p className="font-semibold text-slate-200">
                                        {formatarNumero(grupo.produtos.reduce((acc, p) => acc + p.unidades, 0))}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Faturamento</p>
                                    <p className="font-semibold text-emerald-400">
                                        {formatarMoeda(grupo.produtos.reduce((acc, p) => acc + p.valor, 0))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {grupos.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">Nenhum grupo encontrado.</div>
                    )}
                </div>
            )}
        </div>
    );
}
