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
  data?: string | null;
  tipo?: string;
  produto?: string;
  quant?: number;
  unidade?: string;
  loja?: string;
  arquivo?: string;
};

function sanitizeHistoricoItem(raw: unknown): HistoricoItem | null {
  if (!isRecord(raw)) return null;
  return {
    data: coerceString(raw.data) || null,
    tipo: coerceString(raw.tipo) || undefined,
    produto: coerceString(raw.produto) || undefined,
    quant: coerceNumber(raw.quant, 0),
    unidade: coerceString(raw.unidade) || undefined,
    loja: coerceString(raw.loja) || undefined,
    arquivo: coerceString(raw.arquivo) || undefined,
  };
}

function normalizeText(value: string): string {
  return normalizeDashboardText(value);
}

function formatQuantity(value: number, unit = 'kg'): string {
  const hasDecimals = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return `${formatted} ${unit}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('pt-BR');
  if (value.includes('-')) return value.split('-').reverse().join('/');
  return value;
}

export function ScreenEstoque({ onBack, onNav }: any) {
  const [saldo, setSaldo] = useState(0);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buscarEstoque = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') setCarregando(true);
    else setIsRefreshing(true);

    try {
      const response = await api.get('/api/estoque/saldo');
      const payload = isRecord(response.data) ? response.data : {};
      const saldoAtual = coerceNumber(payload.saldo, 0);
      const historicoAtual = asArray(payload.historico)
        .map(sanitizeHistoricoItem)
        .filter((item): item is HistoricoItem => item !== null);

      historicoAtual.sort((a, b) => {
        const aTime = new Date(a.data ?? '').getTime();
        const bTime = new Date(b.data ?? '').getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
      });

      setSaldo(Number.isFinite(saldoAtual) ? saldoAtual : 0);
      setHistorico(historicoAtual);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
    } finally {
      setCarregando(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void buscarEstoque('initial');
  }, [buscarEstoque]);

  const stats = useMemo(() => {
    const totalSaidas = historico
      .filter((item) => normalizeText(item.tipo ?? '') === 'SAIDA')
      .reduce((total, item) => total + Number(item.quant ?? 0), 0);

    const rankingMap = new Map<string, number>();
    for (const item of historico) {
      const nome = String(item.produto ?? 'SEM PRODUTO').trim() || 'SEM PRODUTO';
      const sinal = normalizeText(item.tipo ?? '') === 'ENTRADA' ? 1 : -1;
      const qtd = Number(item.quant ?? 0) * sinal;
      rankingMap.set(nome, (rankingMap.get(nome) ?? 0) + qtd);
    }

    const ranking = Array.from(rankingMap.entries())
      .map(([nome, s]) => ({ nome, saldo: s }))
      .sort((a, b) => b.saldo - a.saldo);

    const riscoVariedade =
      ranking.filter((i) => i.saldo > 0).sort((a, b) => a.saldo - b.saldo)[0] ??
      ranking[ranking.length - 1] ??
      { nome: 'Sem dados', saldo: 0 };

    return { saldoAtual: saldo, totalSaidas, ranking, riscoVariedade };
  }, [historico, saldo]);

  const insightText =
    stats.riscoVariedade.saldo <= 0
      ? `Saldo zerado para ${stats.riscoVariedade.nome}. Priorize reposição imediata.`
      : `Menor cobertura para ${stats.riscoVariedade.nome} (${formatQuantity(stats.riscoVariedade.saldo)}). Reposição recomendada nas próximas 48h.`;

  const riscoLabel =
    stats.riscoVariedade.nome === 'Sem dados'
      ? '—'
      : stats.riscoVariedade.nome.replace(/^banana\s+/i, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <UI.StatusBar />
      <UI.ScreenHeader
        title="Estoque de Bananas"
        subtitle="Saldo e movimentações em tempo real"
        onBack={onBack}
        right={
          <button
            onClick={() => void buscarEstoque('refresh')}
            disabled={isRefreshing}
            style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: isRefreshing ? 0.5 : 1 }}
          >
            <Icons.RefreshIcon size={13} color={C.muted2} />
          </button>
        }
      />

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', flexShrink: 0 }}>
        <UI.KpiCard
          label="Saldo Total"
          value={carregando ? '...' : formatQuantity(stats.saldoAtual)}
          sub="consolidado"
        />
        <UI.KpiCard
          label="Saídas"
          value={carregando ? '...' : formatQuantity(stats.totalSaidas)}
          sub="acumuladas"
          accent="251,191,36"
        />
        <UI.KpiCard
          label="Risco"
          value={carregando ? '...' : riscoLabel}
          sub="menor saldo"
          accent="248,113,113"
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px' }} className="no-scrollbar">
        {/* Mita insight */}
        <div style={{ marginBottom: 14 }}>
          <UI.MitaBanner
            text={carregando ? 'Carregando análise...' : insightText}
            onChat={() => onNav('mita')}
          />
        </div>

        {/* Distribuição */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Distribuição de Saldo</div>
          <UI.Card>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {carregando ? (
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: 8 }}>Carregando...</div>
              ) : stats.ranking.length === 0 ? (
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: 8 }}>Sem dados disponíveis.</div>
              ) : (
                stats.ranking.map((item) => {
                  const pct = stats.saldoAtual === 0 ? 0 : (item.saldo / stats.saldoAtual) * 100;
                  return (
                    <div key={item.nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, color: C.muted2 }}>{item.nome}</span>
                        <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 700, color: C.text }}>{item.saldo.toLocaleString('pt-BR')} kg</span>
                      </div>
                      <UI.Bar pct={Math.max(0, Math.min(100, pct))} height={6} />
                    </div>
                  );
                })
              )}
            </div>
          </UI.Card>
        </div>

        {/* Fluxo recente */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Fluxo Recente</div>
          <UI.Card>
            {carregando ? (
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: '11px 14px' }}>Carregando movimentações...</div>
            ) : historico.length === 0 ? (
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, padding: '11px 14px' }}>Nenhum movimento encontrado.</div>
            ) : (
              historico.map((item, i) => {
                const isEntrada = normalizeText(item.tipo ?? '') === 'ENTRADA';
                return (
                  <div key={`${item.data ?? 'sd'}-${item.produto ?? 'sp'}-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px',
                    borderBottom: i < historico.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                      background: isEntrada ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                      border: `1px solid ${isEntrada ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isEntrada
                        ? <Icons.ArrowUpIcon size={14} color={C.green} />
                        : <Icons.ArrowDownIcon size={14} color={C.red} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: C.text }}>{item.produto || 'Sem produto'}</div>
                      <div style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: C.muted }}>
                        {(item.loja || item.arquivo || 'Operação manual')} · {formatDate(item.data)}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 700, color: isEntrada ? C.green : C.red }}>
                      {isEntrada ? '+' : '-'}{formatQuantity(Number(item.quant ?? 0), item.unidade || 'kg')}
                    </div>
                  </div>
                );
              })
            )}
          </UI.Card>
        </div>
      </div>

      <UI.BottomNav active="estoque" onNav={onNav} />
    </div>
  );
}
