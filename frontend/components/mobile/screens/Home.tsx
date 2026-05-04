import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { C } from '@/lib/mobile/constants';
import * as UI from '@/components/mobile/ui';
import * as Icons from '@/components/mobile/icons';
import api from '@/lib/api';
import {
  asArray,
  coerceNumber,
  coerceString,
  isRecord,
  normalizeDashboardText,
} from '@/lib/dashboard/client';

type HistoricoItem = {
  tipo?: string;
  produto?: string;
  quant?: number;
};

type MetaItem = {
  produto: string;
  meta: number;
  pedido: number;
  progresso: number;
  status: string;
  categoria: string;
};

function normalizeText(value: string): string {
  return normalizeDashboardText(value);
}

function formatQuantity(value: number, unit = 'kg'): string {
  if (value == null || !Number.isFinite(value)) return `0 ${unit}`;
  const hasDecimals = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return `${formatted} ${unit}`;
}

export function ScreenHome({ onNav, onGoEstoque, onGoLojas, onGoMita }: any) {
  const [open, setOpen] = useState({ estoque: false, metas: false });
  const toggle = (k: keyof typeof open) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const [loading, setLoading] = useState(true);
  const [saldoEstoque, setSaldoEstoque] = useState(0);
  const [metasAtivas, setMetasAtivas] = useState(0);
  const [mediaEntrega, setMediaEntrega] = useState(0);
  const [metas, setMetas] = useState<MetaItem[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, estoqueRes] = await Promise.all([
        api.get('/api/dashboard/summary'),
        api.get('/api/estoque/saldo'),
      ]);

      // Summary
      const summaryPayload = isRecord(summaryRes.data) ? summaryRes.data : {};
      const summary = isRecord(summaryPayload.summary) ? summaryPayload.summary : {};
      setSaldoEstoque(coerceNumber(summary.saldoEstoque, 0));
      setMetasAtivas(coerceNumber(summary.metasAtivas, 0));
      setMediaEntrega(coerceNumber(summary.mediaEntrega, 0));

      const rawMetas = asArray(summaryPayload.metas).map((raw: unknown) => {
        if (!isRecord(raw)) return null;
        return {
          produto: coerceString(raw.produto || raw.Produto),
          meta: coerceNumber(raw.meta ?? raw.Meta, 0),
          pedido: coerceNumber(raw.pedido ?? raw.Pedido, 0),
          progresso: coerceNumber(raw.progresso ?? raw.Progresso, 0),
          status: coerceString((raw.status ?? raw.Status) || 'Pendente'),
          categoria: coerceString((raw.categoria ?? raw.Categoria) || 'Frutas'),
        };
      }).filter((m): m is MetaItem => m !== null && !!m.produto);
      setMetas(rawMetas);

      // Estoque historico
      const estoquePayload = isRecord(estoqueRes.data) ? estoqueRes.data : {};
      const hist = asArray(estoquePayload.historico).map((raw: unknown) => {
        if (!isRecord(raw)) return null;
        return {
          tipo: coerceString(raw.tipo) || undefined,
          produto: coerceString(raw.produto) || undefined,
          quant: coerceNumber(raw.quant, 0),
        };
      }).filter((h) => h !== null);
      setHistorico(hist);
    } catch (error) {
      console.error('Erro ao carregar Home:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Ranking de estoque por variedade
  const ranking = useMemo(() => {
    const rankingMap = new Map<string, number>();
    for (const item of historico) {
      const nome = String(item.produto ?? 'SEM PRODUTO').trim() || 'SEM PRODUTO';
      const sinal = normalizeText(item.tipo ?? '') === 'ENTRADA' ? 1 : -1;
      const qtd = Number(item.quant ?? 0) * sinal;
      rankingMap.set(nome, (rankingMap.get(nome) ?? 0) + qtd);
    }
    return Array.from(rankingMap.entries())
      .map(([nome, saldo]) => ({ nome, saldo }))
      .sort((a, b) => b.saldo - a.saldo);
  }, [historico]);

  // Risco
  const riscoVariedade = useMemo(() => {
    const positives = ranking.filter(i => i.saldo > 0);
    return positives.sort((a, b) => a.saldo - b.saldo)[0] ??
      ranking[ranking.length - 1] ??
      { nome: 'Sem dados', saldo: 0 };
  }, [ranking]);

  const insightText = loading
    ? 'Carregando análise...'
    : riscoVariedade.saldo <= 0
      ? `Saldo zerado para ${riscoVariedade.nome}. Priorize reposição imediata.`
      : `${riscoVariedade.nome} com saldo crítico (${formatQuantity(riscoVariedade.saldo)}). Considere reabastecer nas próximas 48h.`;

  // Top metas
  const topMetas = useMemo(() =>
    [...metas].sort((a, b) => b.progresso - a.progresso).slice(0, 5),
    [metas]
  );

  const formatKpi = (value: number): string => {
    if (value >= 1000) return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <UI.StatusBar />

      {/* Header */}
      <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #4ade80, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(16,185,129,0.35)',
            }}>
              <Icons.LeafIcon size={17} color="#070d09" />
            </div>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: C.text }}>Benverde</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void loadData()}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icons.RefreshIcon size={14} color={C.muted2} />
            </button>
            <button
              onClick={() => onNav('mita')}
              style={{ background: 'rgba(16,185,129,0.1)', border: `1px solid ${C.emeraldBorder}`, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icons.BotIcon size={16} color={C.green} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 12px', flexShrink: 0 }}>
        {[
          { label: 'Saldo KG', value: loading ? '...' : formatKpi(saldoEstoque), sub: 'em estoque', accent: null },
          { label: 'Metas', value: loading ? '...' : String(metasAtivas), sub: 'ativas', accent: '16,185,129' },
          { label: 'Entrega', value: loading ? '...' : `${Math.round(mediaEntrega)}%`, sub: 'média', accent: '251,191,36' },
        ].map((k, i) => (
          <div key={k.label} style={{ flex: 1, animation: `fadeSlideUp 0.4s ease ${i * 0.07}s both` }}>
            <UI.KpiCard label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
          </div>
        ))}
      </div>

      {/* Scrollable feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }} className="no-scrollbar">

        {/* Mita proactive insight */}
        <div style={{ marginBottom: 12 }}>
          <UI.MitaBanner
            text={insightText}
            onChat={() => onNav('mita')}
          />
        </div>

        {/* ── Estoque ── */}
        <UI.SectionBlock
          icon={<Icons.BoxIcon size={16} color={C.green} />}
          label="Estoque"
          meta={loading ? '...' : `${formatKpi(saldoEstoque)} kg`}
          open={open.estoque}
          onToggle={() => toggle('estoque')}
          onViewAll={onGoEstoque}
        >
          <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {loading ? (
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: 8 }}>Carregando...</div>
            ) : ranking.length === 0 ? (
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: 8 }}>Sem dados disponíveis.</div>
            ) : (
              ranking.slice(0, 6).map((item) => {
                const pct = saldoEstoque === 0 ? 0 : (item.saldo / saldoEstoque) * 100;
                return (
                  <div key={item.nome}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted2 }}>{item.nome}</span>
                      <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: C.text }}>{Number(item.saldo).toLocaleString('pt-BR')} kg</span>
                    </div>
                    <UI.Bar pct={Math.max(0, Math.min(100, pct))} height={5} />
                  </div>
                );
              })
            )}
          </div>
        </UI.SectionBlock>

        {/* ── Metas ── */}
        <UI.SectionBlock
          icon={<Icons.TrendingUpIcon size={16} color={C.yellow} />}
          label="Metas Ativas"
          meta={loading ? '...' : <UI.StatusChip label={`${metasAtivas} metas`} type="warning" />}
          open={open.metas}
          onToggle={() => toggle('metas')}
        >
          <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {loading ? (
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: 8 }}>Carregando...</div>
            ) : topMetas.length === 0 ? (
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: 8 }}>Nenhuma meta configurada.</div>
            ) : (
              topMetas.map((m) => {
                const p = Math.min(m.progresso, 100);
                const statusColor = m.status === 'Atingida' ? C.green : m.status === 'Proxima' ? C.yellow : C.muted2;
                const statusType = m.status === 'Atingida' ? 'success' as const : m.status === 'Proxima' ? 'warning' as const : 'muted' as const;
                return (
                  <div key={m.produto}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted2 }}>{m.produto}</span>
                        <UI.StatusChip label={m.status} type={statusType} />
                      </div>
                      <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: statusColor }}>{Math.round(p)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: C.muted }}>
                        {formatQuantity(m.pedido)} / {formatQuantity(m.meta)} meta
                      </span>
                    </div>
                    <UI.Bar pct={p} color={statusType === 'success' ? `linear-gradient(90deg, ${C.emerald}, ${C.green})` : statusType === 'warning' ? `linear-gradient(90deg, #f59e0b, ${C.yellow})` : undefined} />
                  </div>
                );
              })
            )}
            {!loading && metas.length > 0 && (
              <button
                onClick={() => {
                  const rows = [...metas].sort((a, b) => b.progresso - a.progresso);
                  const ths = ['Produto','Categoria','Meta','Pedido','Progresso','Status'].map(h => '<th>' + h + '</th>').join('');
                  const trs = rows.map(m => '<tr><td>' + m.produto + '</td><td>' + m.categoria + '</td><td>' + m.meta.toLocaleString('pt-BR') + ' kg</td><td>' + m.pedido.toLocaleString('pt-BR') + ' kg</td><td>' + m.progresso.toFixed(1) + '%</td><td>' + m.status + '</td></tr>').join('');
                  const css = 'body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#052e16;color:#fff;padding:8px}td{padding:7px;border-bottom:1px solid #e5e7eb}';
                  const html = '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body><h1>Metas</h1><table><thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody></table></body></html>';
                  const w = window.open('', '_blank');
                  if (w) { w.document.write(html); w.document.close(); w.print(); }
                }}
                style={{ marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                📄 Tabela completa ({metas.length} metas)
              </button>
            )}
          </div>
        </UI.SectionBlock>

        {/* Mita CTA */}
        <div style={{
          marginTop: 4, background: '#0a1f12', border: `1px solid ${C.emeraldBorder}`,
          borderRadius: 20, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.BotIcon size={15} color={C.green} />
            </div>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 13, color: C.text }}>Pergunte à Mita</span>
          </div>
          <div
            onClick={() => onNav('mita')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '9px 12px', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
            <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted }}>Como está o estoque hoje?</span>
            <Icons.SendIcon size={14} color={C.green} />
          </div>
        </div>

        <div style={{ height: 12 }} />
      </div>

      <UI.BottomNav active="home" onNav={onNav} />
    </div>
  );
}
