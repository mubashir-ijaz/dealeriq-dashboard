// src/components/ChatBot.js
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useChat } from '../hooks/useChat';
import { Send, Trash2, Bot, User, Loader, Zap } from 'lucide-react';

const QUICK = [
  'What is our total spend across all 3 sources?',
  'Which source has the highest average price?',
  'What are our top 5 most purchased makes?',
  'Show me the cross-matched VINs with price differences',
  'How many vehicles did we buy from Edge Pipeline vs CarMax?',
  'What is our most expensive purchase ever?',
  'Which auction sells us the most cars?',
  'Compare avg price: Edge Pipeline vs CarMax vs OpenLane',
  'How many Ram 1500s have we purchased total?',
  'What months do we buy the most cars?',
];

export default function ChatBot() {
  const { aiSummary } = useData();
  const { messages, loading, send, clear } = useChat(aiSummary);
  const [input,  setInput]  = useState('');
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submit = (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    send(msg);
    setInput('');
    inputRef.current?.focus();
  };

  const hasKey = process.env.REACT_APP_ANTHROPIC_KEY && !process.env.REACT_APP_ANTHROPIC_KEY.includes('your_');

  return (
    <div style={{ display: 'flex', gap: 18, height: 'calc(100vh - 130px)' }}>

      {/* Chat panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={17} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>DealerIQ AI</div>
              <div style={{ fontSize: 11, color: hasKey ? 'var(--green)' : 'var(--amber)' }}>
                {hasKey ? '● Live · Claude Sonnet' : '● Add API key to enable AI'}
              </div>
            </div>
          </div>
          <button onClick={clear}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar role="assistant" />
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '0 12px 12px 12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader size={14} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Analyzing your data…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '13px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 9 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
              placeholder="Ask anything about your Edge, CarMax, or OpenLane data…"
              disabled={loading}
              style={{ flex: 1, padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
            />
            <button onClick={() => submit()} disabled={loading || !input.trim()}
              style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: loading || !input.trim() ? 'var(--border2)' : 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0, cursor: loading || !input.trim() ? 'default' : 'pointer' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick questions */}
      <div style={{ width: 242, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Zap size={13} color="var(--amber)" />
            <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)' }}>Quick Questions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {QUICK.map((q, i) => (
              <button key={i} onClick={() => submit(q)} disabled={loading}
                style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, textAlign: 'left', lineHeight: 1.45, fontFamily: 'var(--font)', cursor: loading ? 'default' : 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
              >{q}</button>
            ))}
          </div>
        </div>

        {/* API key hint if missing */}
        {!hasKey && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, marginBottom: 6 }}>⚡ Enable AI Chat</p>
            <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.7 }}>
              Add your Claude API key to Vercel environment variables:<br />
              <code style={{ color: 'var(--accent)', fontSize: 10 }}>REACT_APP_ANTHROPIC_KEY</code><br />
              Get one free at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>console.anthropic.com</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ role }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: role === 'assistant' ? 'rgba(79,70,229,0.1)' : 'rgba(37,99,235,0.1)' }}>
      {role === 'assistant' ? <Bot size={14} color="var(--accent)" /> : <User size={14} color="var(--blue)" />}
    </div>
  );
}

function Bubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <Avatar role={role} />
      <div style={{
        maxWidth: '76%',
        background: isUser ? 'var(--accent)' : 'var(--bg2)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
        padding: '11px 15px',
        color: isUser ? '#fff' : 'var(--text)',
        fontSize: 13,
        lineHeight: 1.65,
        wordBreak: 'break-word',
      }}>
        {renderMd(content)}
      </div>
    </div>
  );
}

// Lightweight markdown renderer
function renderMd(text) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <div key={i} style={{ fontWeight: 800, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{inlineFmt(line.slice(4))}</div>;
    if (line.startsWith('## '))  return <div key={i} style={{ fontWeight: 800, fontSize: 15, marginTop: 12, marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{inlineFmt(line.slice(3))}</div>;
    if (line.startsWith('# '))   return <div key={i} style={{ fontWeight: 800, fontSize: 16, marginTop: 10 }}>{inlineFmt(line.slice(2))}</div>;
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <div key={i} style={{ display: 'flex', gap: 7, paddingLeft: 4, marginBottom: 2 }}>
        <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>•</span>
        <span>{inlineFmt(line.replace(/^[-•]\s/, ''))}</span>
      </div>;
    }
    if (line.startsWith('```')) return null;
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    return <div key={i}>{inlineFmt(line)}</div>;
  });
}

function inlineFmt(text) {
  // Bold **text** and inline `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--hover)', padding: '1px 5px', borderRadius: 4 }}>{p.slice(1,-1)}</code>;
    return p;
  });
}
