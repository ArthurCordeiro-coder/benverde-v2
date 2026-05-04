import React from 'react';
import { C } from '@/lib/mobile/constants';
import * as Icons from './icons';

export const NAV = [
  { key: 'home',    icon: Icons.HomeIcon,    label: 'Início'  },
  { key: 'estoque', icon: Icons.BoxIcon,     label: 'Estoque' },
  { key: 'precos',  icon: Icons.TagIcon,     label: 'Preços'  },
  { key: 'lojas',   icon: Icons.StoreIcon,   label: 'Lojas'   },
  { key: 'mita',    icon: Icons.BotIcon,     label: 'Mita'    },
];

export function StatusBar() {
  return <div style={{ height: 16, flexShrink: 0 }} />;}

export function BottomNav({ active, onNav }: { active: string, onNav: (key: string) => void }) {
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

export function Bar({ pct, height = 5, color }: { pct: number, height?: number, color?: string }) {
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

export function KpiCard({ label, value, sub, accent, icon }: any) {
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

export function Chip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
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

export function Card({ children, style = {}, accent = false }: { children: React.ReactNode, style?: any, accent?: boolean }) {
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

export function ScreenHeader({ title, subtitle, onBack, right }: any) {
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
          <Icons.ArrowLeftIcon size={16} color={C.green} /> Voltar
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

export function SearchBar({ placeholder, value, onChange }: { placeholder?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: C.surface2, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '5px 12px', // reduced padding slightly for input comfort
    }}>
      <Icons.SearchIcon size={15} color={C.muted} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontFamily: 'Space Grotesk',
          fontSize: 13,
          color: C.text,
          padding: '4px 0',
        }}
      />
    </div>
  );
}

export function MitaBanner({ text, onChat }: any) {
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
        <Icons.SparklesIcon size={14} color={C.green} />
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

export function StatusChip({ label, type }: { label: string, type: 'success' | 'warning' | 'error' | 'muted' }) {
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

export function ListRow({ left, right, sub, sub2, onClick, accent, style = {} }: any) {
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

export function SectionBlock({ icon, label, meta, open, onToggle, onViewAll, children }: any) {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(open ? 'auto' : '0px');
  const [visible, setVisible] = React.useState(open);

  React.useEffect(() => {
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
              <Icons.ChevronDownIcon size={15} color={C.muted} />
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
