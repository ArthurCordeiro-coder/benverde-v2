"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { ScreenHome } from '@/components/mobile/screens/Home';
import { ScreenEstoque } from '@/components/mobile/screens/Estoque';
import { ScreenPrecos } from '@/components/mobile/screens/Precos';
import { ScreenLojas } from '@/components/mobile/screens/Lojas';
import { ScreenLojaDetalhe } from '@/components/mobile/screens/LojaDetalhe';
import { ScreenMita } from '@/components/mobile/screens/Mita';
import RegistroCaixas from '@/app/Caixas/page';

const VALID_SCREENS = ['home', 'estoque', 'precos', 'lojas', 'loja-detalhe', 'mita', 'caixas'] as const;
type Screen = typeof VALID_SCREENS[number];

function isValidScreen(s: string | null): s is Screen {
  return s !== null && (VALID_SCREENS as readonly string[]).includes(s);
}

function MobileApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get('screen');
  const safeInitial: Screen = isValidScreen(initial) ? initial : 'home';

  const [screen, setScreen] = useState<Screen>(safeInitial);
  const [selectedLoja, setSelectedLoja] = useState<any>(null);
  const [direction, setDirection] = useState('forward');
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const s = searchParams.get('screen');
    if (isValidScreen(s) && s !== screen) {
      setScreen(s);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get('/api/me');
        setLoadingAuth(false);
      } catch {
        router.replace('/login');
      }
    };
    void checkAuth();
  }, [router]);

  if (loadingAuth) {
    return (
      <div style={{ height: '100dvh', background: '#070d09', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 30, height: 30, border: '3px solid rgba(16, 185, 129, 0.3)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  function navTo(s: string, dir = 'forward') {
    setDirection(dir);
    setScreen(s as Screen);
  }

  function handleNav(tab: string) {
    const tabScreens: Record<string, string> = { home: 'home', estoque: 'estoque', precos: 'precos', lojas: 'lojas', mita: 'mita', caixas: 'caixas' };
    navTo(tabScreens[tab] || tab, 'forward');
  }

  function handleSelectLoja(data: any) {
    setSelectedLoja(data);
    navTo('loja-detalhe', 'forward');
  }

  const animClass = direction === 'forward' ? 'screen-enter' : 'screen-enter-back';

  let screenEl = null;
  switch (screen) {
    case 'home':
      screenEl = <ScreenHome
        onNav={handleNav}
        onGoEstoque={() => navTo('estoque')}
        onGoLojas={() => navTo('lojas')}
        onGoMita={() => navTo('mita')}
      />;
      break;
    case 'estoque':
      screenEl = <ScreenEstoque onBack={() => navTo('home', 'back')} onNav={handleNav} />;
      break;
    case 'precos':
      screenEl = <ScreenPrecos onBack={() => navTo('home', 'back')} onNav={handleNav} />;
      break;
    case 'lojas':
      screenEl = <ScreenLojas onBack={() => navTo('home', 'back')} onNav={handleNav} onSelectLoja={handleSelectLoja} />;
      break;
    case 'loja-detalhe':
      screenEl = <ScreenLojaDetalhe lojaData={selectedLoja} onBack={() => navTo('lojas', 'back')} onNav={handleNav} />;
      break;
    case 'mita':
      screenEl = <ScreenMita onBack={() => navTo('home', 'back')} onNav={handleNav} />;
      break;
    case 'caixas':
      screenEl = (
        <div className="h-full w-full overflow-y-auto">
          <RegistroCaixas />
        </div>
      );
      break;
  }

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', background: '#070d09' }}>
      <div key={screen} className={animClass} style={{ height: '100%' }}>
        {screenEl}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ height: '100dvh', background: '#070d09' }}></div>}>
      <MobileApp />
    </Suspense>
  );
}
