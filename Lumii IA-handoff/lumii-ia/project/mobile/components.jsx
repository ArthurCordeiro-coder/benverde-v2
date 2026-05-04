// ─── SHARED TOKENS & PRIMITIVES ────────────────────────────

const C = {
  bg:       '#070d09',
  surface:  'rgba(255,255,255,0.03)',
  surface2: 'rgba(255,255,255,0.06)',
  border:   'rgba(255,255,255,0.08)',
  border2:  'rgba(255,255,255,0.14)',
  green:    '#4ade80',
  emerald:  '#10b981',
  emeraldDim:'rgba(16,185,129,0.12)',
  emeraldBorder:'rgba(16,185,129,0.25)',
  text:     '#f1f5f9',
  muted:    '#64748b',
  muted2:   '#94a3b8',
  yellow:   '#fbbf24',
  red:      '#f87171',
  redDim:   'rgba(248,113,113,0.12)',
  yellowDim:'rgba(251,191,36,0.12)',
};

// Bottom nav definition
const NAV = [
  { key: 'home',    icon: HomeIcon,    label: 'Início'  },
  { key: 'estoque', icon: BoxIcon,     label: 'Estoque' },
  { key: 'precos',  icon: TagIcon,     label: 'Preços'  },
  { key: 'lojas',   icon: StoreIcon,   label: 'Lojas'   },
  { key: 'mita',    icon: BotIcon,     label: 'Mita'    },
];

// ─── SVG ICONS ─────────────────────────────────────────────

function HomeIcon({ size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function BoxIcon({ size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
function TagIcon({ size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}
function StoreIcon({ size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/></svg>;
}
function BotIcon({ size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg>;
}
function ChevronDownIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function ChevronUpIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>;
}
function ChevronRightIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function ArrowLeftIcon({ size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
}
function TrendingUpIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function ArrowUpIcon({ size = 14, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
}
function ArrowDownIcon({ size = 14, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
}
function SearchIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function SparklesIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>;
}
function PlusIcon({ size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function SendIcon({ size = 18, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function LeafIcon({ size = 18, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.11a1 1 0 001.59 1.21C7.13 18 9.37 14.5 12 13c-2 2-2.5 5-2.5 5s4-1 6-5c0 0 2-4 1-5z"/></svg>;
}
function RefreshIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
}

// ─── STATUS BAR ────────────────────────────────────────────

function StatusBar({ time = '9:41' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 20px 6px', flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 14, color: C.text }}>{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="6.5" width="3" height="4.5" rx="0.6" fill={C.muted2}/><rect x="4.5" y="4" width="3" height="7" rx="0.6" fill={C.muted2}/><rect x="9" y="1.5" width="3" height="9.5" rx="0.6" fill={C.text}/><rect x="13.5" y="0" width="3" height="11" rx="0.6" fill={C.text}/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 2.8C10 2.8 11.8 3.6 13.1 4.9L14 4C12.4 2.4 10.3 1.4 8 1.4S3.6 2.4 2 4l.9.9C4.2 3.6 6 2.8 8 2.8z" fill={C.text}/><path d="M8 6.2c1.2 0 2.2.5 3 1.2l.9-.9C10.8 5.4 9.5 4.8 8 4.8S5.2 5.4 4.1 6.5l.9.9C5.8 6.7 6.8 6.2 8 6.2z" fill={C.text}/><circle cx="8" cy="9.5" r="1.4" fill={C.text}/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={C.text} strokeOpacity="0.3" fill="none"/><rect x="2" y="2" width="18" height="8" rx="2" fill={C.text}/><path d="M23 4v4c.7-.3 1.2-1.1 1.2-2s-.5-1.7-1.2-2z" fill={C.text} fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ────────────────────────────────────────────

function BottomNav({ active, onNav }) {
  return (
    <div style={{
      display: 'flex', flexShrink: 0,
      background: 'rgba(7,13,9,0.92)',
      borderTop: `1px solid ${C.border}`,
      backdropFilter: 'blur(20px)',
      paddingBottom: 20,
    }}>
      {NAV.map(item => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onNav(item.key)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 0 4px', border: 'none', background: 'none',
              cursor: 'pointer', position: 'relative',
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute', top: 6, width: 36, height: 36, borderRadius: 12,
                background: C.emeraldDim, border: `1px solid ${C.emeraldBorder}`,
                boxShadow: `0 0 16px rgba(16,185,129,0.15)`,
              }} />
            )}
            <div style={{ position: 'relative', color: isActive ? C.green : C.muted }}>
              <item.icon size={20} color={isActive ? C.green : C.muted} />
            </div>
            <span style={{
              fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: isActive ? 600 : 400,
              color: isActive ? C.green : C.muted, letterSpacing: 0.2,
            }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── BAR CHART ────────────────────────────────────────────

function Bar({ pct, height = 5, color }) {
  const bg = color || `linear-gradient(90deg, ${C.emerald}, ${C.green})`;
  return (
    <div style={{ height, borderRadius: height, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`,
        background: bg, borderRadius: height,
        boxShadow: `0 0 8px rgba(16,185,129,0.3)`,
        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      flex: 1, padding: '10px 10px 8px',
      background: accent ? `rgba(${accent},0.07)` : C.surface,
      border: `1px solid ${accent ? `rgba(${accent},0.18)` : C.border}`,
      borderRadius: 16,
    }}>
      {icon && <div style={{ marginBottom: 5, opacity: 0.7 }}>{icon}</div>}
      <div style={{ fontSize: 9, fontFamily: 'Space Grotesk', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontFamily: 'Space Grotesk', fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── CHIP ─────────────────────────────────────────────────

function Chip({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
      fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 500,
      background: active ? C.green : C.surface2,
      color: active ? '#070d09' : C.muted2,
      flexShrink: 0,
      transition: 'all 0.15s',
    }}>{label}</button>
  );
}

// ─── GLASS CARD ───────────────────────────────────────────

function Card({ children, style = {}, accent = false }) {
  return (
    <div style={{
      background: accent ? 'rgba(16,185,129,0.05)' : C.surface,
      border: `1px solid ${accent ? C.emeraldBorder : C.border}`,
      borderRadius: 20,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── SECTION HEADER (screen top) ─────────────────────────

function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <div style={{
      padding: '6px 20px 12px', flexShrink: 0,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
          cursor: 'pointer', color: C.green, fontFamily: 'Space Grotesk', fontSize: 13,
          padding: 0, marginBottom: 6,
        }}>
          <ArrowLeftIcon size={16} color={C.green} /> Voltar
        </button>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20, color: C.text }}>{title}</div>
          {subtitle && <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────

function SearchBar({ placeholder }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: C.surface2, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '9px 12px',
    }}>
      <SearchIcon size={15} color={C.muted} />
      <span style={{ fontFamily: 'Space Grotesk', fontSize: 13, color: C.muted }}>{placeholder}</span>
    </div>
  );
}

// ─── MITA INSIGHT BANNER ──────────────────────────────────

function MitaBanner({ text, onChat }) {
  return (
    <div style={{
      background: 'rgba(16,185,129,0.05)',
      border: `1px solid ${C.emeraldBorder}`,
      borderRadius: 14, padding: '10px 12px',
      display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: 'rgba(16,185,129,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <SparklesIcon size={14} color={C.green} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: 600, color: C.emerald, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.6 }}>Mita diz</div>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: 'rgba(74,222,128,0.8)', lineHeight: 1.5 }}>{text}</div>
        {onChat && (
          <button onClick={onChat} style={{
            marginTop: 5, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Space Grotesk', fontSize: 11, color: C.green,
            padding: 0, textDecoration: 'underline',
          }}>Perguntar mais →</button>
        )}
      </div>
    </div>
  );
}

// ─── STATUS CHIP ─────────────────────────────────────────

function StatusChip({ label, type }) {
  const configs = {
    success: { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)', color: '#4ade80' },
    warning: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', color: '#fbbf24' },
    error:   { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: '#f87171' },
    muted:   { bg: C.surface2, border: C.border, color: C.muted2 },
  };
  const cfg = configs[type] || configs.muted;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: 600, color: cfg.color,
    }}>{label}</span>
  );
}

// ─── LIST ROW ─────────────────────────────────────────────

function ListRow({ left, right, sub, sub2, onClick, accent, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '11px 14px',
        background: accent ? 'rgba(16,185,129,0.04)' : 'transparent',
        borderRadius: 14,
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: `1px solid ${C.border}`,
        ...style,
      }}
    >
      <div>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 13, color: C.text }}>{left}</div>
        {sub && <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        {right}
        {sub2 && <span style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted }}>{sub2}</span>}
      </div>
    </div>
  );
}

// Export everything to window
Object.assign(window, {
  C, NAV,
  // Icons
  HomeIcon, BoxIcon, TagIcon, StoreIcon, BotIcon,
  ChevronDownIcon, ChevronUpIcon, ChevronRightIcon, ArrowLeftIcon,
  TrendingUpIcon, ArrowUpIcon, ArrowDownIcon, SearchIcon, SparklesIcon,
  PlusIcon, SendIcon, LeafIcon, RefreshIcon,
  // Components
  StatusBar, BottomNav, Bar, KpiCard, Chip, Card,
  ScreenHeader, SearchBar, MitaBanner, StatusChip, ListRow,
});
