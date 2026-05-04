import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { C } from '@/lib/mobile/constants';
import * as UI from '@/components/mobile/ui';
import * as Icons from '@/components/mobile/icons';
import api from '@/lib/api';
import { asArray, coerceNumber, coerceString, isRecord } from '@/lib/dashboard/client';

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

interface CaixaRegistro {
  id: number;
  loja: string | null;
  n_loja: number;
  caixas_benverde: number;
  caixas_ccj: number;
  caixas_bananas: number;
  total: number;
  entregue: string;
}

function sanitizeProduto(raw: unknown): ProdutoData | null {
  if (!isRecord(raw)) return null;
  return {
    produto: coerceString(raw.produto) || 'Sem produto',
    massa: coerceNumber(raw.massa, 0),
    unidades: coerceNumber(raw.unidades, 0),
    valor: coerceNumber(raw.valor, 0),
  };
}

function sanitizeLoja(raw: unknown): LojaData | null {
  if (!isRecord(raw)) return null;
  return {
    id: coerceString(raw.id) || '',
    nome: coerceString(raw.nome) || 'Sem nome',
    grupo: coerceString(raw.grupo) || null,
    produtos: asArray(raw.produtos).map(sanitizeProduto).filter((p): p is ProdutoData => p !== null),
  };
}

function sanitizeCaixa(raw: unknown): CaixaRegistro | null {
  if (!isRecord(raw)) return null;
  const id = Math.trunc(coerceNumber(raw.id));
  if (id <= 0) return null;
  return {
    id,
    loja: coerceString(raw.loja) || null,
    n_loja: Math.trunc(coerceNumber(raw.n_loja)),
    caixas_benverde: Math.trunc(coerceNumber(raw.caixas_benverde)),
    caixas_ccj: Math.trunc(coerceNumber(raw.caixas_ccj)),
    caixas_bananas: Math.trunc(coerceNumber(raw.caixas_bananas)),
    total: Math.trunc(coerceNumber(raw.total)),
    entregue: String(raw.entregue ?? '').trim().toLowerCase() === 'sim' ? 'sim' : 'nao',
  };
}

const fmt = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ScreenLojas({ onBack, onNav, onSelectLoja }: any) {
  const [search, setSearch] = useState('');
  const [mes, setMes] = useState('');
  const [lojas, setLojas] = useState<LojaData[]>([]);
  const [caixas, setCaixas] = useState<CaixaRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);

  const fetchData = useCallback(async () => {
    setCarregando(true);
    try {
      const q = mes ? `?mes=${mes}` : '';
      const [lojasRes, caixasRes] = await Promise.all([
        api.get(`/api/dashboard/lojas${q}`),
        api.get(`/api/caixas${q}`),
      ]);
      const lojasRaw = isRecord(lojasRes.data) ? lojasRes.data.lojas : lojasRes.data;
      setLojas(asArray(lojasRaw).map(sanitizeLoja).filter((l): l is LojaData => l !== null));
      setCaixas(asArray(caixasRes.data).map(sanitizeCaixa).filter((c): c is CaixaRegistro => c !== null));
    } catch (e) {
      console.error('Erro ao carregar lojas:', e);
    } finally {
      setCarregando(false);
    }
  }, [mes]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const enriched = useMemo(() => lojas.map(loja => {
    const sc = caixas.filter(c => String(c.n_loja || '').padStart(2, '0') === String(loja.id).padStart(2, '0'));
    return {
      ...loja,
      totalValor: loja.produtos.reduce((a, p) => a + p.valor, 0),
      caixasPendente: sc.filter(c => c.entregue !== 'sim').length,
      storeCaixas: sc,
    };
  }), [lojas, caixas]);

  const filtered = enriched.filter(l =>
    !search.trim() || l.nome.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <UI.StatusBar />
      <UI.ScreenHeader title="Lojas" subtitle="Toque para ver detalhes e caixas" onBack={onBack} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }} className="no-scrollbar">
        <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <UI.SearchBar placeholder="Buscar loja..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ flexShrink: 0 }}>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={{
                background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                borderRadius: 12, padding: '0 8px', fontFamily: 'Space Grotesk', fontSize: 13,
                outline: 'none', height: 35, width: 130, maxWidth: '100%', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontFamily: 'Space Grotesk', fontSize: 13 }}>Carregando lojas...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontFamily: 'Space Grotesk', fontSize: 13 }}>Nenhuma loja encontrada.</div>
        ) : (
          <UI.Card>
            {filtered.map((loja, i) => (
              <div
                key={loja.id || loja.nome}
                onClick={() => onSelectLoja({ loja, caixas: loja.storeCaixas })}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 14px', cursor: 'pointer',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                    background: 'rgba(16,185,129,0.1)', border: `1px solid ${C.emeraldBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icons.StoreIcon size={16} color={C.green} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 14, color: C.text }}>
                      {loja.grupo || 'Geral'} - Loja {loja.id}
                    </div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted }}>{loja.nome}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: loja.totalValor > 0 ? C.green : C.muted }}>
                    {loja.totalValor > 0 ? fmt(loja.totalValor) : '—'}
                  </span>
                  {loja.caixasPendente > 0 && (
                    <UI.StatusChip label={`${loja.caixasPendente} pendente${loja.caixasPendente > 1 ? 's' : ''}`} type="warning" />
                  )}
                </div>
              </div>
            ))}
          </UI.Card>
        )}
        <div style={{ height: 12 }} />
      </div>
      <UI.BottomNav active="lojas" onNav={onNav} />
    </div>
  );
}
