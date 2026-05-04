// ─── PREÇOS SCREEN ─────────────────────────────────────────

const COMPARATIVO = {
  'Banana Nanica': [
    { loja: 'Loja Sul',        val: 'R$ 1,80/kg', best: true  },
    { loja: 'Loja Centro',     val: 'R$ 2,00/kg', best: false },
    { loja: 'Mercado Central', val: 'R$ 2,20/kg', best: false },
    { loja: 'Mercado X',       val: 'R$ 2,50/kg', best: false },
  ],
  'Banana Prata': [
    { loja: 'Loja Centro',     val: 'R$ 2,80/kg', best: true  },
    { loja: 'Loja Norte',      val: 'R$ 3,00/kg', best: false },
    { loja: 'Atacado Norte',   val: 'R$ 3,10/kg', best: false },
    { loja: 'Mercado X',       val: 'R$ 3,20/kg', best: false },
  ],
  'Alface Crespa': [
    { loja: 'Atacado Norte',   val: 'R$ 0,90/un', best: true  },
    { loja: 'Loja Sul',        val: 'R$ 1,10/un', best: false },
    { loja: 'Mercado Central', val: 'R$ 1,20/un', best: false },
    { loja: 'Loja Norte',      val: 'R$ 1,30/un', best: false },
  ],
  'Cenoura': [
    { loja: 'Loja Sul',        val: 'R$ 4,20/kg', best: true  },
    { loja: 'Atacado Norte',   val: 'R$ 4,30/kg', best: false },
    { loja: 'Loja Norte',      val: 'R$ 4,50/kg', best: false },
    { loja: 'Mercado X',       val: 'R$ 4,80/kg', best: false },
  ],
  'Banana Maçã': [
    { loja: 'Loja Centro',     val: 'R$ 2,40/kg', best: true  },
    { loja: 'Atacado Norte',   val: 'R$ 2,60/kg', best: false },
    { loja: 'Loja Sul',        val: 'R$ 2,70/kg', best: false },
    { loja: 'Mercado Central', val: 'R$ 2,90/kg', best: false },
  ],
  'Repolho Verde': [
    { loja: 'Mercado Central', val: 'R$ 1,20/kg', best: true  },
    { loja: 'Loja Norte',      val: 'R$ 1,35/kg', best: false },
    { loja: 'Atacado Norte',   val: 'R$ 1,40/kg', best: false },
    { loja: 'Loja Sul',        val: 'R$ 1,50/kg', best: false },
  ],
};

function ComparativoModal({ produto, onClose }) {
  const lojas = COMPARATIVO[produto] || [];
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
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 17, fontWeight: 700, color: C.text }}>{produto}</div>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted }}>Comparativo de preços — {lojas.length} estabelecimentos</div>
        </div>

        {/* Comparison table */}
        <div style={{ overflowX: 'auto' }} className="no-scrollbar">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${lojas.length}, 1fr)`, gap: 8, minWidth: 300 }}>
            {/* Row 1 — store names */}
            {lojas.map((item, i) => (
              <div key={i} style={{
                background: item.best ? 'rgba(16,185,129,0.1)' : C.surface2,
                border: `1px solid ${item.best ? C.emeraldBorder : C.border}`,
                borderRadius: '12px 12px 0 0',
                padding: '10px 8px',
                textAlign: 'center',
              }}>
                {item.best && (
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 8, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                    ★ Melhor
                  </div>
                )}
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 600, color: item.best ? C.green : C.muted2, lineHeight: 1.3 }}>
                  {item.loja}
                </div>
              </div>
            ))}
            {/* Row 2 — prices */}
            {lojas.map((item, i) => (
              <div key={i} style={{
                background: item.best ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${item.best ? C.emeraldBorder : C.border}`,
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                padding: '12px 8px',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: item.best ? C.green : C.text }}>
                  {item.val.split('/')[0]}
                </div>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted }}>
                  /{item.val.split('/')[1]}
                </div>
              </div>
            ))}
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

function ScreenPrecos({ onBack, onNav }) {
  const { useState } = React;
  const [catChip, setCatChip] = useState('Todos');
  const [modal, setModal] = useState(null);

  const precos = [
    { p: 'Banana Nanica',   est: 'Loja Sul',         val: 'R$ 1,80/kg', cat: 'Frutas',   destaque: true  },
    { p: 'Banana Nanica',   est: 'Mercado Central',  val: 'R$ 2,20/kg', cat: 'Frutas',   destaque: false },
    { p: 'Banana Prata',    est: 'Mercado X',        val: 'R$ 3,20/kg', cat: 'Frutas',   destaque: false },
    { p: 'Alface Crespa',   est: 'Atacado Norte',    val: 'R$ 0,90/un', cat: 'Verduras', destaque: false },
    { p: 'Cenoura',         est: 'Loja Norte',       val: 'R$ 4,50/kg', cat: 'Legumes',  destaque: false },
    { p: 'Banana Maçã',     est: 'Atacado Norte',    val: 'R$ 2,60/kg', cat: 'Frutas',   destaque: false },
    { p: 'Repolho Verde',   est: 'Mercado Central',  val: 'R$ 1,20/kg', cat: 'Verduras', destaque: false },
  ];

  // deduplicate by product for the list
  const seen = new Set();
  const unique = precos.filter(p => {
    if (seen.has(p.p)) return false;
    seen.add(p.p);
    return true;
  });

  const filtered = catChip === 'Todos' ? unique : unique.filter(p => p.cat === catChip);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, position: 'relative' }}>
      <StatusBar />
      <ScreenHeader title="Preços Concorrentes" subtitle="Comparativo de mercado" onBack={onBack} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }} className="no-scrollbar">
        {/* Search */}
        <div style={{ marginBottom: 10 }}>
          <SearchBar placeholder="Buscar produto ou estabelecimento..." />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }} className="no-scrollbar">
          {['Todos', 'Frutas', 'Legumes', 'Verduras'].map(c => (
            <Chip key={c} label={c} active={catChip === c} onClick={() => setCatChip(c)} />
          ))}
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.7 }}>Preço Médio</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: C.text }}>R$ 2,40</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted }}>por kg</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(74,222,128,0.05)', border: `1px solid rgba(74,222,128,0.2)`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.7 }}>Mais Barato</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: C.green }}>R$ 1,80</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted }}>Loja Sul</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(248,113,113,0.05)', border: `1px solid rgba(248,113,113,0.18)`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.7 }}>Mais Caro</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 700, color: C.red }}>R$ 3,20</div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted }}>Mercado X</div>
          </div>
        </div>

        {/* Price list */}
        <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Lista de Produtos <span style={{ fontWeight: 400, color: C.muted, textTransform: 'none', letterSpacing: 0 }}>· toque para comparar</span>
        </div>
        <Card>
          {filtered.map((item, i) => (
            <div
              key={i}
              onClick={() => setModal(item.p)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', cursor: 'pointer',
                background: item.destaque ? 'rgba(74,222,128,0.04)' : 'transparent',
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.15s',
              }}
            >
              <div>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.text }}>{item.p}</div>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted, marginTop: 1 }}>
                  {COMPARATIVO[item.p] ? `${COMPARATIVO[item.p].length} estabelecimentos` : 'ver preços'}
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: 700, color: item.destaque ? C.green : C.text }}>{item.val}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <StatusChip label={item.cat} type="muted" />
                  <ChevronRightIcon size={13} color={C.muted} />
                </div>
              </div>
            </div>
          ))}
        </Card>
        <div style={{ height: 12 }} />
      </div>

      {/* Comparativo modal */}
      {modal && <ComparativoModal produto={modal} onClose={() => setModal(null)} />}

      <BottomNav active="precos" onNav={onNav} />
    </div>
  );
}

// ─── LOJAS DATA ────────────────────────────────────────────

const LOJAS = [
  {
    nome: 'Loja 01', cidade: 'Alto Tietê', status: 'Ativa',
    massa: '1.979,6 kg', unidades: '9.136', fat: 'R$ 37.194,46',
    caixas: { entregue: 18, pendente: 3, total: 21 },
    tiposCaixa: [
      { tipo: 'Caixa P', un: 8,  kg: '240 kg'     },
      { tipo: 'Caixa M', un: 9,  kg: '720 kg'     },
      { tipo: 'Caixa G', un: 4,  kg: '1.019,6 kg' },
    ],
    produtos: [
      { p: 'Batata Lavada KG',             kg: '1.000 KG', un: '1.000', val: 'R$ 3.850,00' },
      { p: 'Repolho Verde KG',             kg: '427 KG',   un: '427',   val: 'R$ 1.678,11' },
      { p: 'Mexerica Ponkan KG',           kg: '360 KG',   un: '360',   val: 'R$ 1.404,00' },
      { p: 'Morango 250g',                 kg: '120 KG',   un: '480',   val: 'R$ 3.969,00' },
      { p: 'Pimentão Verde KG',            kg: '30 KG',    un: '30',    val: 'R$ 294,00'   },
      { p: 'Repolho Roxo KG',              kg: '21 KG',    un: '21',    val: 'R$ 104,37'   },
      { p: 'Couve Manteiga Hig. 200g',     kg: '2,4 KG',   un: '12',    val: 'R$ 56,64'    },
    ],
  },
  { nome: 'Loja 02', cidade: 'Centro',     status: 'Ativa',    massa: '2.400 kg',  unidades: '11.200', fat: 'R$ 44.800,00', caixas: { entregue: 22, pendente: 1, total: 23 }, tiposCaixa: [], produtos: [] },
  { nome: 'Loja 03', cidade: 'Sul',        status: 'Ativa',    massa: '1.800 kg',  unidades: '8.400',  fat: 'R$ 33.600,00', caixas: { entregue: 16, pendente: 2, total: 18 }, tiposCaixa: [], produtos: [] },
  { nome: 'Loja 04', cidade: 'Norte',      status: 'Pendente', massa: '900 kg',    unidades: '4.200',  fat: 'R$ 16.800,00', caixas: { entregue: 8,  pendente: 4, total: 12 }, tiposCaixa: [], produtos: [] },
  { nome: 'Loja 05', cidade: 'Oeste',      status: 'Inativa',  massa: '—',         unidades: '—',      fat: '—',            caixas: { entregue: 0,  pendente: 0, total: 0  }, tiposCaixa: [], produtos: [] },
];

// ─── LOJAS LIST SCREEN ─────────────────────────────────────

function ScreenLojas({ onBack, onNav, onSelectLoja }) {
  const { useState } = React;
  const [filter, setFilter] = useState('Todas');

  const filtered = filter === 'Todas' ? LOJAS : LOJAS.filter(l => l.status === filter);

  const statusType = s => s === 'Ativa' ? 'success' : s === 'Pendente' ? 'warning' : 'error';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <StatusBar />
      <ScreenHeader title="Lojas" subtitle="Toque para ver detalhes e caixas" onBack={onBack} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }} className="no-scrollbar">
        <div style={{ marginBottom: 10 }}>
          <SearchBar placeholder="Buscar loja..." />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['Todas', 'Ativa', 'Pendente', 'Inativa'].map(c => (
            <Chip key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />
          ))}
        </div>

        <Card>
          {filtered.map((loja, i) => (
            <div
              key={loja.nome}
              onClick={() => onSelectLoja(i)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 14px', cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                  background: loja.status === 'Ativa' ? 'rgba(16,185,129,0.1)' : C.surface2,
                  border: `1px solid ${loja.status === 'Ativa' ? C.emeraldBorder : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <StoreIcon size={16} color={loja.status === 'Ativa' ? C.green : C.muted} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 14, color: C.text }}>{loja.nome}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted }}>{loja.cidade}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <StatusChip label={loja.status} type={statusType(loja.status)} />
                <span style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 600, color: loja.fat === '—' ? C.muted : C.green }}>{loja.fat}</span>
              </div>
            </div>
          ))}
        </Card>

        <div style={{ height: 12 }} />
      </div>

      <BottomNav active="lojas" onNav={onNav} />
    </div>
  );
}

// ─── LOJA DETALHE SCREEN ───────────────────────────────────

function ScreenLojaDetalhe({ lojaIndex, onBack, onNav }) {
  const loja = LOJAS[lojaIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <StatusBar />
      <ScreenHeader
        title={loja.nome}
        subtitle={`Loja · ${loja.cidade}`}
        onBack={onBack}
      />

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', flexShrink: 0 }}>
        <KpiCard
          label="Massa Total"
          value={loja.massa}
          sub="Volume distribuído"
          icon={<BoxIcon size={14} color={C.muted} />}
        />
        <KpiCard
          label="Unidades"
          value={loja.unidades}
          sub="Itens unitários"
          icon={<BoxIcon size={14} color={C.muted} />}
        />
        <KpiCard
          label="Faturamento"
          value={loja.fat}
          sub="Valor da venda"
          accent="16,185,129"
          icon={<TrendingUpIcon size={14} color={C.green} />}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px' }} className="no-scrollbar">

        {/* Caixas section */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Caixas</div>

          {/* Status */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: 'rgba(74,222,128,0.06)', border: `1px solid rgba(74,222,128,0.18)`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.green, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Entregue</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, color: C.text }}>{loja.caixas.entregue}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(251,191,36,0.06)', border: `1px solid rgba(251,191,36,0.18)`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.yellow, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Pendente</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, color: C.text }}>{loja.caixas.pendente}</div>
            </div>
            <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Total</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, color: C.text }}>{loja.caixas.total}</div>
            </div>
          </div>

          {/* Tipos de caixa */}
          {loja.tiposCaixa.length > 0 && (
            <Card>
              {loja.tiposCaixa.map((tc, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px',
                  borderBottom: i < loja.tiposCaixa.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BoxIcon size={13} color={C.muted2} />
                    </div>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.text }}>{tc.tipo}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 13, fontWeight: 600, color: C.text }}>{tc.un} un</div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted }}>{tc.kg}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Composição por Produto */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Composição por Produto</div>

          {loja.produtos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: C.muted, fontFamily: 'Space Grotesk', fontSize: 13 }}>
              Sem dados de composição
            </div>
          ) : (
            <Card>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 44px 70px',
                padding: '8px 14px', borderBottom: `1px solid ${C.border}`,
                gap: 4,
              }}>
                {['Produto', 'KG', 'Un', 'Valor'].map(h => (
                  <div key={h} style={{ fontFamily: 'Space Grotesk', fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7, textAlign: h !== 'Produto' ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>
              {loja.produtos.map((item, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 60px 44px 70px',
                  padding: '9px 14px', gap: 4,
                  borderBottom: i < loja.produtos.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 600, color: C.text, paddingRight: 4 }}>{item.p}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted2, textAlign: 'right' }}>{item.kg}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted2, textAlign: 'right' }}>{item.un}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: C.green, textAlign: 'right' }}>{item.val}</div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <BottomNav active="lojas" onNav={onNav} />
    </div>
  );
}

Object.assign(window, { ScreenPrecos, ScreenLojas, ScreenLojaDetalhe, LOJAS });
