"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ScreenHome } from '@/components/mobile/screens/Home';
import { ScreenEstoque } from '@/components/mobile/screens/Estoque';
import { ScreenPrecos } from '@/components/mobile/screens/Precos';
import { ScreenLojas } from '@/components/mobile/screens/Lojas';
import { ScreenLojaDetalhe } from '@/components/mobile/screens/LojaDetalhe';
import { ScreenMita } from '@/components/mobile/screens/Mita';

export default function App() {
  const router = useRouter();
  // screen: 'home' | 'estoque' | 'precos' | 'lojas' | 'loja-detalhe' | 'mita'
  const [screen, setScreen] = useState('home');
  const [selectedLoja, setSelectedLoja] = useState<any>(null);
  const [direction, setDirection] = useState('forward');
  const [loadingAuth, setLoadingAuth] = useState(true);

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
    setScreen(s);
  }

  function handleNav(tab: string) {
    const tabScreens: Record<string, string> = { home: 'home', estoque: 'estoque', precos: 'precos', lojas: 'lojas', mita: 'mita' };
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
  }

  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', background: '#070d09' }}>
      <div key={screen} className={animClass} style={{ height: '100%' }}>
        {screenEl}
      </div>
    </div>
  );
}
