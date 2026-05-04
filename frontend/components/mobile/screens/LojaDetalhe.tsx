import React from 'react';
import { C } from '@/lib/mobile/constants';
import * as UI from '@/components/mobile/ui';
import * as Icons from '@/components/mobile/icons';

const fmtMoeda = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (v: number) =>
  v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function ScreenLojaDetalhe({ lojaData, onBack, onNav }: any) {
  if (!lojaData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
        <UI.StatusBar />
        <UI.ScreenHeader title="Detalhes" onBack={onBack} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: 'Space Grotesk' }}>
          Nenhuma loja selecionada.
        </div>
        <UI.BottomNav active="lojas" onNav={onNav} />
      </div>
    );
  }

  const { loja, caixas: storeCaixas = [] } = lojaData;
  const produtos = loja.produtos || [];

  const totalMassa = produtos.reduce((a: number, p: any) => a + (p.massa ?? 0), 0);
  const totalUnidades = produtos.reduce((a: number, p: any) => a + (p.unidades ?? 0), 0);
  const totalValor = produtos.reduce((a: number, p: any) => a + (p.valor ?? 0), 0);

  const cxEntregue = storeCaixas.filter((c: any) => c.entregue === 'sim').length;
  const cxPendente = storeCaixas.filter((c: any) => c.entregue !== 'sim').length;
  const cxTotal = storeCaixas.length;

  const totalBenverde = storeCaixas.reduce((a: number, c: any) => a + (c.caixas_benverde ?? 0), 0);
  const totalCcj = storeCaixas.reduce((a: number, c: any) => a + (c.caixas_ccj ?? 0), 0);
  const totalBananas = storeCaixas.reduce((a: number, c: any) => a + (c.caixas_bananas ?? 0), 0);
  const tiposCaixa = [
    { tipo: 'Benverde', un: totalBenverde },
    { tipo: 'CCJ', un: totalCcj },
    { tipo: 'Bananas', un: totalBananas },
  ].filter(t => t.un > 0);

  const sortedProdutos = [...produtos].sort((a: any, b: any) => (b.massa ?? 0) - (a.massa ?? 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <UI.StatusBar />
      <UI.ScreenHeader title={`${loja.grupo || 'Geral'} - Loja ${loja.id}`} subtitle={`Loja · ${loja.nome}`} onBack={onBack} />

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', flexShrink: 0 }}>
        <UI.KpiCard label="Massa Total" value={`${fmtNum(totalMassa)} KG`} sub="Volume distribuído" icon={<Icons.BoxIcon size={14} color={C.muted} />} />
        <UI.KpiCard label="Unidades" value={fmtNum(totalUnidades)} sub="Itens unitários" icon={<Icons.BoxIcon size={14} color={C.muted} />} />
        <UI.KpiCard label="Faturamento" value={fmtMoeda(totalValor)} sub="Valor da venda" accent="16,185,129" icon={<Icons.TrendingUpIcon size={14} color={C.green} />} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px' }} className="no-scrollbar">
        {/* Caixas section */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Caixas</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.green, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Entregue</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, color: C.text }}>{cxEntregue}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.yellow, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Pendente</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, color: C.text }}>{cxPendente}</div>
            </div>
            <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Total</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, color: C.text }}>{cxTotal}</div>
            </div>
          </div>
          {tiposCaixa.length > 0 && (
            <UI.Card>
              {tiposCaixa.map((tc, i) => (
                <div key={tc.tipo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < tiposCaixa.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icons.BoxIcon size={13} color={C.muted2} />
                    </div>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.text }}>{tc.tipo}</span>
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.text }}>{tc.un} un</div>
                </div>
              ))}
            </UI.Card>
          )}
        </div>

        {/* Composição por Produto */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Composição por Produto</div>
          {sortedProdutos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.muted, fontFamily: 'Space Grotesk', fontSize: 13 }}>Sem dados de composição</div>
          ) : (
            <UI.Card>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 44px 70px', padding: '8px 14px', borderBottom: `1px solid ${C.border}`, gap: 4 }}>
                {['Produto', 'KG', 'Un', 'Valor'].map(h => (
                  <div key={h} style={{ fontFamily: 'Space Grotesk', fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7, textAlign: h !== 'Produto' ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>
              {sortedProdutos.map((item: any, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 44px 70px', padding: '9px 14px', gap: 4, borderBottom: i < sortedProdutos.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 600, color: C.text, paddingRight: 4 }}>{item.produto}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted2, textAlign: 'right' }}>{fmtNum(item.massa)}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted2, textAlign: 'right' }}>{fmtNum(item.unidades)}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.green, textAlign: 'right' }}>{fmtMoeda(item.valor)}</div>
                </div>
              ))}
            </UI.Card>
          )}
        </div>
      </div>

      <UI.BottomNav active="lojas" onNav={onNav} />
    </div>
  );
}
