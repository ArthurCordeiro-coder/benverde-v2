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

type PriceSnapshotItem = {
  produto: string;
  prices: Record<string, number | null>;
};

type PriceDateOption = { key: string; label: string };

type PriceOverviewResponse = {
  latestDate?: string | null;
  dates?: PriceDateOption[];
  markets?: string[];
  snapshots?: Record<string, PriceSnapshotItem[]>;
};

function normalizeText(value: string): string {
  return normalizeDashboardText(value);
}

function inferCategory(produto: string): string {
  const norm = normalizeText(produto);
  const legumes = ['BATATA', 'CENOURA', 'BERINJELA', 'MANDIOCA', 'BETERRABA', 'ABOBORA', 'ABOBRINHA', 'CEBOLA', 'PEPINO', 'TOMATE', 'INHAME', 'CHUCHU', 'PIMENTAO', 'VAGEM', 'MILHO'];
  const verduras = ['ALFACE', 'MANJERICAO', 'MOSTARDA', 'RUCULA', 'COUVE', 'ESPINAFRE', 'AGRIAO', 'ALMEIRAO', 'SALSINHA', 'CEBOLINHA', 'COENTRO', 'HORTELA', 'REPOLHO', 'ESCAROLA'];
  if (legumes.some(k => norm.includes(k))) return 'Legumes';
  if (verduras.some(k => norm.includes(k))) return 'Verduras';
  return 'Frutas';
}

type EnrichedProduct = {
  produto: string;
  categoria: string;
  semarPrice: number | null;
  bestPrice: number | null;
  bestMarket: string | null;
  worstPrice: number | null;
  worstMarket: string | null;
  marketCount: number;
  allPrices: Array<{ market: string; price: number }>;
};

function ComparativoModal({ item, onClose }: { item: EnrichedProduct; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: '#0d1f14',
          border: `1px solid ${C.border}`,
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 36px',
          animation: 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 17, fontWeight: 700, color: C.text }}>{item.produto}</div>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted }}>Comparativo de preços — {item.allPrices.length} estabelecimentos</div>
        </div>

        <div style={{ overflowX: 'auto' }} className="no-scrollbar">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(item.allPrices.length, 4)}, 1fr)`, gap: 8, minWidth: 300 }}>
            {item.allPrices.sort((a, b) => a.price - b.price).map((entry, i) => {
              const isBest = i === 0;
              return (
                <div key={entry.market} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{
                    background: isBest ? 'rgba(16,185,129,0.1)' : C.surface2,
                    border: `1px solid ${isBest ? C.emeraldBorder : C.border}`,
                    borderRadius: '12px 12px 0 0',
                    padding: '10px 8px', textAlign: 'center',
                  }}>
                    {isBest && (
                      <div style={{ fontFamily: 'Space Grotesk', fontSize: 8, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                        ★ Melhor
                      </div>
                    )}
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 600, color: isBest ? C.green : C.muted2, lineHeight: 1.3 }}>
                      {entry.market}
                    </div>
                  </div>
                  <div style={{
                    background: isBest ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isBest ? C.emeraldBorder : C.border}`,
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    padding: '12px 8px', textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: isBest ? C.green : C.text }}>
                      R$ {entry.price.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 16, padding: '12px',
            background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 14, cursor: 'pointer',
            fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.muted2,
          }}
        >Fechar</button>
      </div>
    </div>
  );
}

export function ScreenPrecos({ onBack, onNav }: any) {
  const [catChip, setCatChip] = useState('Todos');
  const [modal, setModal] = useState<EnrichedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allDates, setAllDates] = useState<PriceDateOption[]>([]);
  const [allSnapshots, setAllSnapshots] = useState<Record<string, PriceSnapshotItem[]>>({});
  const [allMarkets, setAllMarkets] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const loadPrecos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PriceOverviewResponse>('/api/precos/overview');
      const payload = isRecord(response.data) ? response.data : {};
      const markets = asArray(payload.markets).map((m: unknown) => coerceString(m).trim()).filter(Boolean);
      const dates = asArray(payload.dates).map((d: unknown) => {
        if (!isRecord(d)) return null;
        return { key: coerceString(d.key), label: coerceString(d.label) };
      }).filter((d): d is PriceDateOption => d !== null && !!d.key);
      const snapshots = isRecord(payload.snapshots) ? payload.snapshots : {};

      // Use latest date snapshot, or merge all if none
      const latestKey = dates[0]?.key;
      let rawItems: PriceSnapshotItem[] = [];

      if (latestKey && isRecord(snapshots) && Array.isArray((snapshots as any)[latestKey])) {
        rawItems = asArray((snapshots as any)[latestKey]).map((raw: unknown) => {
          if (!isRecord(raw)) return null;
          const produto = coerceString(raw.produto).trim();
          if (!produto) return null;
          const prices: Record<string, number | null> = {};
          if (isRecord(raw.prices)) {
            for (const [k, v] of Object.entries(raw.prices as Record<string, unknown>)) {
              const num = coerceNumber(v, NaN);
              prices[k] = Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : null;
            }
          }
          return { produto, prices };
        }).filter((i): i is PriceSnapshotItem => i !== null);
      }

      // Enrich
      const enriched: EnrichedProduct[] = rawItems.map(item => {
        const allPrices: Array<{ market: string; price: number }> = [];
        for (const [market, price] of Object.entries(item.prices)) {
          if (typeof price === 'number' && price > 0) {
            allPrices.push({ market, price });
          }
        }
        allPrices.sort((a, b) => a.price - b.price);

        return {
          produto: item.produto,
          categoria: inferCategory(item.produto),
          semarPrice: item.prices['Semar'] ?? null,
          bestPrice: allPrices[0]?.price ?? null,
          bestMarket: allPrices[0]?.market ?? null,
          worstPrice: allPrices[allPrices.length - 1]?.price ?? null,
          worstMarket: allPrices[allPrices.length - 1]?.market ?? null,
          marketCount: allPrices.length,
          allPrices,
        };
      }).sort((a, b) => a.produto.localeCompare(b.produto, 'pt-BR'));

      setProducts(enriched);
      setAllDates(dates);
      setAllMarkets(markets);

      // Parse all snapshots for variation calculation
      const parsedSnapshots: Record<string, PriceSnapshotItem[]> = {};
      if (isRecord(snapshots)) {
        for (const [dateKey, dateItems] of Object.entries(snapshots as Record<string, unknown>)) {
          parsedSnapshots[dateKey] = asArray(dateItems).map((raw: unknown) => {
            if (!isRecord(raw)) return null;
            const produto = coerceString(raw.produto).trim();
            if (!produto) return null;
            const prices: Record<string, number | null> = {};
            if (isRecord(raw.prices)) {
              for (const [k, v] of Object.entries(raw.prices as Record<string, unknown>)) {
                const num = coerceNumber(v, NaN);
                prices[k] = Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : null;
              }
            }
            return { produto, prices };
          }).filter((i): i is PriceSnapshotItem => i !== null);
        }
      }
      setAllSnapshots(parsedSnapshots);

      // Extract categories
      const cats = new Set(enriched.map(p => p.categoria));
      setCategories(['Todos', ...Array.from(cats).sort()]);
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrecos();
  }, [loadPrecos]);

  const filtered = useMemo(() => {
    let items = catChip === 'Todos' ? products : products.filter(p => p.categoria === catChip);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(p => 
        p.produto.toLowerCase().includes(q) || 
        p.categoria.toLowerCase().includes(q) ||
        p.allPrices.some(ap => ap.market.toLowerCase().includes(q))
      );
    }
    return items;
  }, [products, catChip, search]);

  // Summary stats — same logic as desktop PrecosPage
  const summaryStats = useMemo(() => {
    // Products with at least one comparable price
    const comparable = products.filter(p => p.bestPrice !== null);
    if (comparable.length === 0) {
      return { winPerc: '0%', competitor: '-', competitorPerc: '0%', variationText: '0,0%', trend: 'neutral' as const };
    }

    // 1. Semar win percentage
    const semarWins = comparable.filter(p => p.semarPrice !== null && p.bestPrice !== null && p.semarPrice <= p.bestPrice).length;
    const winPerc = `${Math.round((semarWins / comparable.length) * 100)}%`;

    // 2. Best competitor (most price-leading items)
    const competitorWins = new Map<string, number>();
    for (const p of comparable) {
      if (p.semarPrice !== null && p.bestPrice !== null && p.semarPrice <= p.bestPrice) continue;
      // Semar is NOT winning — find who is
      const leaders = p.allPrices.filter(ap => ap.price === p.bestPrice && ap.market !== 'Semar');
      if (leaders.length === 0) continue;
      const share = 1 / leaders.length;
      for (const l of leaders) {
        competitorWins.set(l.market, (competitorWins.get(l.market) ?? 0) + share);
      }
    }
    const bestCompEntry = Array.from(competitorWins.entries()).sort((a, b) => b[1] - a[1])[0];
    const competitor = bestCompEntry?.[0] ?? '-';
    const competitorPerc = bestCompEntry ? `${Math.round((bestCompEntry[1] / comparable.length) * 100)}%` : '0%';

    // 3. Variation (inflation between two most recent dates)
    let variationText = '0,0%';
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (allDates.length >= 2) {
      const latestItems = allSnapshots[allDates[0].key] ?? [];
      const prevItems = allSnapshots[allDates[1].key] ?? [];
      const latestSemarPrices = latestItems.map(i => i.prices['Semar']).filter((v): v is number => typeof v === 'number' && v > 0);
      const prevSemarPrices = prevItems.map(i => i.prices['Semar']).filter((v): v is number => typeof v === 'number' && v > 0);
      const latestAvg = latestSemarPrices.length > 0 ? latestSemarPrices.reduce((a, b) => a + b, 0) / latestSemarPrices.length : null;
      const prevAvg = prevSemarPrices.length > 0 ? prevSemarPrices.reduce((a, b) => a + b, 0) / prevSemarPrices.length : null;
      if (latestAvg !== null && prevAvg !== null && prevAvg > 0) {
        const diff = ((latestAvg - prevAvg) / prevAvg) * 100;
        variationText = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')}%`;
        trend = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'neutral';
      }
    }

    return { winPerc, competitor, competitorPerc, variationText, trend };
  }, [products, allDates, allSnapshots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, position: 'relative' }}>
      <UI.StatusBar />
      <UI.ScreenHeader title="Preços Concorrentes" subtitle="Comparativo de mercado" onBack={onBack} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }} className="no-scrollbar">
        {/* Search */}
        <div style={{ marginBottom: 10 }}>
          <UI.SearchBar 
            placeholder="Buscar produto ou estabelecimento..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }} className="no-scrollbar">
          {(categories.length > 0 ? categories : ['Todos']).map(c => (
            <UI.Chip key={c} label={c} active={catChip === c} onClick={() => setCatChip(c)} />
          ))}
        </div>

        {/* Summary cards — Semar Ganhando / Melhor Concorrente / Variação */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'rgba(74,222,128,0.05)', border: `1px solid rgba(74,222,128,0.2)`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.7 }}>Semar Ganhando</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: C.green }}>{loading ? '...' : summaryStats.winPerc}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted }}>dos itens</div>
          </div>
          <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.7 }}>Melhor Concorrente</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loading ? '...' : summaryStats.competitor}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted }}>{loading ? '' : `lidera ${summaryStats.competitorPerc}`}</div>
          </div>
          <div style={{ flex: 1, background: summaryStats.trend === 'down' ? 'rgba(74,222,128,0.05)' : summaryStats.trend === 'up' ? 'rgba(248,113,113,0.05)' : C.surface, border: `1px solid ${summaryStats.trend === 'down' ? 'rgba(74,222,128,0.2)' : summaryStats.trend === 'up' ? 'rgba(248,113,113,0.18)' : C.border}`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.7 }}>Variação</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: summaryStats.trend === 'down' ? C.green : summaryStats.trend === 'up' ? C.red : C.text }}>{loading ? '...' : summaryStats.variationText}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted }}>cesta Semar</div>
          </div>
        </div>

        {/* Price list */}
        <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Lista de Produtos <span style={{ fontWeight: 400, color: C.muted, textTransform: 'none', letterSpacing: 0 }}>· toque para comparar · {loading ? '...' : `${filtered.length} itens`}</span>
        </div>

        {loading ? (
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, color: C.muted, textAlign: 'center', padding: '32px 0' }}>Carregando preços...</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, color: C.muted, textAlign: 'center', padding: '32px 0' }}>Nenhum produto encontrado.</div>
        ) : (
          <UI.Card>
            {filtered.map((item, i) => (
              <div
                key={item.produto}
                onClick={() => setModal(item)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', cursor: 'pointer',
                  background: item.semarPrice !== null && item.bestPrice !== null && item.semarPrice <= item.bestPrice ? 'rgba(74,222,128,0.04)' : 'transparent',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                  transition: 'background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.text }}>{item.produto}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted, marginTop: 1 }}>
                    {item.marketCount} estabelecimentos
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: 700, color: item.semarPrice !== null ? C.green : C.text }}>
                    {item.semarPrice !== null ? `R$ ${item.semarPrice.toFixed(2).replace('.', ',')}` : item.bestPrice !== null ? `R$ ${item.bestPrice.toFixed(2).replace('.', ',')}` : '—'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <UI.StatusChip label={item.categoria} type="muted" />
                    <Icons.ChevronRightIcon size={13} color={C.muted} />
                  </div>
                </div>
              </div>
            ))}
          </UI.Card>
        )}
        <div style={{ height: 12 }} />
      </div>

      {/* Comparativo modal */}
      {modal && <ComparativoModal item={modal} onClose={() => setModal(null)} />}

      <UI.BottomNav active="precos" onNav={onNav} />
    </div>
  );
}
