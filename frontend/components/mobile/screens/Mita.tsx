import React, { useState, useRef, useEffect, useCallback } from 'react';
import { C } from '@/lib/mobile/constants';
import * as UI from '@/components/mobile/ui';
import * as Icons from '@/components/mobile/icons';
import api from '@/lib/api';
import { isRecord, coerceString } from '@/lib/dashboard/client';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function ScreenMita({ onBack, onNav }: any) {
  const SUGGESTIONS = [
    'Como está o saldo de estoque hoje?',
    'Top 5 metas com maior progresso',
    'Há risco de ruptura no estoque?',
    'Resumo operacional do dia',
  ];

  const INITIAL_MESSAGES: ChatMessage[] = [
    { role: 'assistant', content: 'Oi! Sou a Mita, sua gerente de dados. Posso te ajudar com estoque, metas, preços e caixas. O que você precisa hoje?' },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || typing) return;
    setInput('');

    const userMessage: ChatMessage = { role: 'user', content: q };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setTyping(true);

    try {
      const response = await api.post('/api/mita-ai/chat', {
        message: q,
        history: updatedMessages,
        scope: 'overview',
      });

      const payload = isRecord(response.data) ? response.data : {};
      const answer = coerceString(payload.answer).trim();

      if (answer) {
        setMessages(m => [...m, { role: 'assistant', content: answer }]);
      } else {
        // Fallback
        setMessages(m => [...m, { role: 'assistant', content: `Entendido! Estou analisando os dados sobre "${q}". No momento consigo detalhar estoque, metas, preços e operação por loja. Pode ser mais específico?` }]);
      }
    } catch (error) {
      console.error('Erro Mita:', error);
      // Fallback on error
      setMessages(m => [...m, { role: 'assistant', content: 'Desculpa, tive um problema ao processar sua pergunta. Tente novamente em instantes.' }]);
    } finally {
      setTyping(false);
    }
  }, [messages, typing]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, typing]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      <UI.StatusBar />

      {/* Header */}
      <div style={{ padding: '6px 20px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(74,222,128,0.2))',
            border: `1px solid ${C.emeraldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16,185,129,0.2)',
          }}>
            <Icons.BotIcon size={20} color={C.green} />
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 17, color: C.text }}>Mita</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
              <span style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: C.green }}>online · sua gerente de dados</span>
            </div>
          </div>
          <button
            onClick={() => setMessages(INITIAL_MESSAGES)}
            style={{ marginLeft: 'auto', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'Space Grotesk', fontSize: 11, color: C.muted }}
          >Limpar</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }} className="no-scrollbar">

        {/* Suggested questions — show only if no user message yet */}
        {messages.length === 1 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Perguntas sugeridas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => void sendMessage(s)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, color: C.muted2 }}>{s}</span>
                  <Icons.ChevronRightIcon size={13} color={C.muted} />
                </button>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, margin: '14px 0' }} />
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isAssistant ? 'flex-start' : 'flex-end', gap: 8, alignItems: 'flex-end' }}>
              {isAssistant && (
                <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: `1px solid ${C.emeraldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icons.BotIcon size={13} color={C.green} />
                </div>
              )}
              <div style={{
                maxWidth: '78%', padding: '10px 13px', borderRadius: isAssistant ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                background: isAssistant ? 'rgba(16,185,129,0.08)' : C.surface2,
                border: `1px solid ${isAssistant ? C.emeraldBorder : C.border}`,
                fontFamily: 'Space Grotesk', fontSize: 13, lineHeight: 1.55,
                color: isAssistant ? 'rgba(74,222,128,0.9)' : C.text,
              }}>
                {msg.content.split('**').map((part, j) => j % 2 === 1
                  ? <strong key={j} style={{ color: isAssistant ? C.green : C.text }}>{part}</strong>
                  : part
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: `1px solid ${C.emeraldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icons.BotIcon size={13} color={C.green} />
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: `1px solid ${C.emeraldBorder}`, borderRadius: '16px 16px 16px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, opacity: 0.7, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 16px 24px',
        borderTop: `1px solid ${C.border}`,
        background: 'rgba(7,13,9,0.95)',
        backdropFilter: 'blur(20px)',
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '0 12px',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void sendMessage(input); }}
            placeholder="Pergunte sobre seus dados..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'Space Grotesk', fontSize: 13, color: C.text,
              padding: '10px 0',
            }}
          />
        </div>
        <button
          onClick={() => void sendMessage(input)}
          style={{
            width: 42, height: 42, borderRadius: 12, border: 'none',
            background: input.trim() ? 'linear-gradient(135deg, #10b981, #4ade80)' : C.surface2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}>
          <Icons.SendIcon size={16} color={input.trim() ? '#070d09' : C.muted} />
        </button>
      </div>

      <UI.BottomNav active="mita" onNav={onNav} />
    </div>
  );
}
