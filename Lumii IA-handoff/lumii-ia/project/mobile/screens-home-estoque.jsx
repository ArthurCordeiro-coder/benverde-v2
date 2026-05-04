// ─── HOME SCREEN ───────────────────────────────────────────

function ScreenHome({ onNav, onGoEstoque, onGoLojas, onGoMita }) {
  const { useState } = React;
  const [chip, setChip] = useState('Tudo');
  const [open, setOpen] = useState({ estoque: true, metas: false, precos: false, lojas: false });
  const toggle = k => setOpen(o => ({ ...o, [k]: !o[k] }));

  const chips = ['Tudo', 'Estoque', 'Metas', 'Preços', 'Lojas'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <StatusBar />

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
              <LeafIcon size={17} color="#070d09" />
            </div>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: C.text }}>Benverde</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RefreshIcon size={14} color={C.muted2} />
            </button>
            <button
              onClick={() => onNav('mita')}
              style={{ background: 'rgba(16,185,129,0.1)', border: `1px solid ${C.emeraldBorder}`, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <BotIcon size={16} color={C.green} />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}
          className="no-scrollbar">
          {chips.map(c => (
            <Chip key={c} label={c} active={chip === c} onClick={() => setChip(c)} />
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 12px', flexShrink: 0 }}>
        {[
          { label: 'Saldo KG', value: '19.057', sub: 'em estoque', accent: null },
          { label: 'Metas',    value: '12',      sub: 'ativas',     accent: '16,185,129' },
          { label: 'Entrega',  value: '84%',     sub: 'média',      accent: '251,191,36' },
        ].map((k, i) => (
          <div key={k.label} style={{ flex: 1, animation: `fadeSlideUp 0.4s ease ${i * 0.07}s both` }}>
            <KpiCard label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
          </div>
        ))}
      </div>

      {/* Scrollable feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }} className="no-scrollbar">

        {/* Mita proactive insight */}
        <div style={{ marginBottom: 12 }}>
          <MitaBanner
            text="Banana da Terra com saldo crítico (80 kg). Considere reabastecer nas próximas 48h."
            onChat={() => onNav('mita')}
          />
        </div>

        {/* ── Estoque ── */}
        <SectionBlock
          icon={<BoxIcon size={16} color={C.green} />}
          label="Estoque"
          meta="19.057 kg"
          open={open.estoque}
          onToggle={() => toggle('estoque')}
          onViewAll={onGoEstoque}
        >
          <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              ['Banana Nanica', 16635, 87],
              ['Banana Prata',   2054, 11],
              ['Banana Maçã',     288,  2],
              ['Banana da Terra',  80, 0.4],
            ].map(([n, v, p]) => (
              <div key={n}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted2 }}>{n}</span>
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: C.text }}>{Number(v).toLocaleString('pt-BR')} kg</span>
                </div>
                <Bar pct={p} height={5} />
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* ── Metas ── */}
        <SectionBlock
          icon={<TrendingUpIcon size={16} color={C.yellow} />}
          label="Metas Ativas"
          meta={<StatusChip label="12 metas" type="warning" />}
          open={open.metas}
          onToggle={() => toggle('metas')}
          onViewAll={() => {}}
        >
          <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              ['Alface Crespa', 100, 'success'],
              ['Banana Nanica', 83, 'warning'],
              ['Cenoura',        72, 'warning'],
              ['Banana Prata',   41, 'muted'],
            ].map(([n, p, t]) => (
              <div key={n}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted2 }}>{n}</span>
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: C.text }}>{p}%</span>
                </div>
                <Bar pct={p} color={t === 'success' ? `linear-gradient(90deg, ${C.emerald}, ${C.green})` : t === 'warning' ? `linear-gradient(90deg, #f59e0b, ${C.yellow})` : undefined} />
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* ── Preços ── */}
        <SectionBlock
          icon={<TagIcon size={16} color={C.muted2} />}
          label="Preços Concorrentes"
          meta="R$ 2,40 /kg"
          open={open.precos}
          onToggle={() => toggle('precos')}
          onViewAll={() => onNav('precos')}
        >
          <div style={{ padding: '8px 14px 12px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: 'Space Grotesk', marginBottom: 2 }}>Mais barato</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: 'Space Grotesk' }}>R$ 1,80</div>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: 'Space Grotesk' }}>Loja Sul</div>
              </div>
              <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: 'Space Grotesk', marginBottom: 2 }}>Mais caro</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.red, fontFamily: 'Space Grotesk' }}>R$ 3,20</div>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: 'Space Grotesk' }}>Mercado X</div>
              </div>
            </div>
          </div>
        </SectionBlock>

        {/* ── Lojas ── */}
        <SectionBlock
          icon={<StoreIcon size={16} color={C.muted2} />}
          label="Lojas"
          meta="5 cadastradas"
          open={open.lojas}
          onToggle={() => toggle('lojas')}
          onViewAll={() => onNav('lojas')}
        >
          <div style={{ padding: '4px 0 4px' }}>
            {[
              ['Loja 01', 'Alto Tietê', 'R$ 37.194,46', 'success'],
              ['Loja 02', 'Centro',     'R$ 44.800,00', 'success'],
              ['Loja 03', 'Sul',        'R$ 33.600,00', 'success'],
            ].map(([nome, cidade, fat, t]) => (
              <div key={nome} onClick={() => onNav('lojas')} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.text }}>{nome}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted }}>{cidade}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: C.green }}>{fat}</span>
                  <ChevronRightIcon size={14} color={C.muted} />
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* Mita CTA */}
        <div style={{
          marginTop: 4, background: '#0a1f12', border: `1px solid ${C.emeraldBorder}`,
          borderRadius: 20, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BotIcon size={15} color={C.green} />
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
            <SendIcon size={14} color={C.green} />
          </div>
        </div>

        <div style={{ height: 12 }} />
      </div>

      <BottomNav active="home" onNav={onNav} />
    </div>
  );
}

// ─── SECTION BLOCK (collapsible with animation) ───────────

function SectionBlock({ icon, label, meta, open, onToggle, onViewAll, children }) {
  const { useRef, useEffect, useState } = React;
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(open ? 'auto' : '0px');
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      setVisible(true);
      // measure then animate
      const h = bodyRef.current.scrollHeight;
      setHeight('0px');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(h + 'px'));
      });
      // switch to auto after transition so resize works
      const timer = setTimeout(() => setHeight('auto'), 320);
      return () => clearTimeout(timer);
    } else {
      // snapshot current height before collapsing
      const h = bodyRef.current.scrollHeight;
      setHeight(h + 'px');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight('0px'));
      });
      const timer = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div style={{ marginBottom: 8 }}>
      <Card>
        <button
          onClick={onToggle}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: (open || visible) ? `1px solid ${C.border}` : 'none',
            transition: 'border-color 0.3s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: C.surface2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </div>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 14, color: C.text }}>{label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {typeof meta === 'string'
              ? <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.muted2 }}>{meta}</span>
              : meta}
            <div style={{
              color: C.muted,
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}>
              <ChevronDownIcon size={15} color={C.muted} />
            </div>
          </div>
        </button>

        {/* Animated body */}
        <div
          ref={bodyRef}
          style={{
            height,
            overflow: 'hidden',
            transition: 'height 0.32s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {visible && (
            <div style={{ opacity: open ? 1 : 0, transition: 'opacity 0.25s ease' }}>
              {children}
              {onViewAll && (
                <button onClick={onViewAll} style={{
                  width: '100%', padding: '9px', background: 'none', border: 'none',
                  borderTop: `1px solid ${C.border}`, cursor: 'pointer',
                  fontFamily: 'Space Grotesk', fontSize: 12, color: C.green, fontWeight: 600,
                }}>
                  Ver tudo →
                </button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── ESTOQUE SCREEN ────────────────────────────────────────

function ScreenEstoque({ onBack, onNav }) {
  const historico = [
    { tipo: 'entrada', prod: 'Banana Nanica', qtd: '+1.200 kg', loja: 'Importação',  data: 'Hoje 08:32' },
    { tipo: 'saida',   prod: 'Banana Prata',  qtd: '−340 kg',   loja: 'Loja Sul',    data: 'Hoje 07:10' },
    { tipo: 'entrada', prod: 'Banana Nanica', qtd: '+800 kg',    loja: 'Importação',  data: 'Ontem 17:44' },
    { tipo: 'saida',   prod: 'Banana da Terra', qtd: '−20 kg',  loja: 'Loja Norte',  data: 'Ontem 14:20' },
    { tipo: 'saida',   prod: 'Banana Maçã',   qtd: '−50 kg',    loja: 'Loja Centro', data: 'Ontem 11:05' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <StatusBar />
      <ScreenHeader
        title="Estoque de Bananas"
        subtitle="Saldo e movimentações em tempo real"
        onBack={onBack}
        right={
          <button style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshIcon size={13} color={C.muted2} />
          </button>
        }
      />

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', flexShrink: 0 }}>
        <KpiCard label="Saldo Total" value="19.057 kg" sub="consolidado" />
        <KpiCard label="Saídas" value="74.680 kg" sub="acumuladas" accent="251,191,36" />
        <KpiCard label="Risco" value="Terra" sub="menor saldo" accent="248,113,113" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px' }} className="no-scrollbar">
        {/* Mita insight */}
        <div style={{ marginBottom: 14 }}>
          <MitaBanner
            text="Menor cobertura para Banana da Terra (80 kg). Reposição recomendada nas próximas 48h."
            onChat={() => onNav('mita')}
          />
        </div>

        {/* Distribuição */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Distribuição de Saldo</div>
          <Card>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Banana Nanica',    16635, 87],
                ['Banana Prata',      2054, 11],
                ['Banana Maçã',        288,  1.5],
                ['Banana da Terra',     80,  0.4],
              ].map(([n, v, p]) => (
                <div key={n}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, color: C.muted2 }}>{n}</span>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 700, color: C.text }}>{Number(v).toLocaleString('pt-BR')} kg</span>
                  </div>
                  <Bar pct={p} height={6} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Fluxo recente */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Fluxo Recente</div>
          <Card>
            {historico.map((item, i) => {
              const isEntrada = item.tipo === 'entrada';
              return (
                <div key={i} style={{
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
                      ? <ArrowUpIcon size={14} color={C.green} />
                      : <ArrowDownIcon size={14} color={C.red} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: C.text }}>{item.prod}</div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: C.muted }}>{item.loja} · {item.data}</div>
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 700, color: isEntrada ? C.green : C.red }}>
                    {item.qtd}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>

      {/* FAB */}
      <div style={{ position: 'absolute', bottom: 80, right: 20 }}>
        <button style={{
          width: 50, height: 50, borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, #10b981, #4ade80)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(16,185,129,0.45)',
        }}>
          <PlusIcon size={22} color="#070d09" />
        </button>
      </div>

      <BottomNav active="estoque" onNav={onNav} />
    </div>
  );
}

Object.assign(window, { ScreenHome, ScreenEstoque });
