// src/hooks/useChat.js
import { useState, useCallback } from 'react';

const GREETING = `Hi! I'm **DealerIQ AI** 🚗

I have full access to your **real** data — Edge Pipeline (4,744 vehicles), CarMax (1,929 vehicles), and OpenLane (884 vehicles).

Try asking me:
- *"What's our total spend across all 3 sources?"*
- *"Which make do we buy most from Edge Pipeline?"*
- *"Are there any VINs that appear in CarMax AND OpenLane?"*
- *"What's our average purchase price from CarMax?"*
- *"Show me the most expensive cars we've bought"*
- *"Which auction sells us the most cars?"*`;

export function useChat(aiSummary) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [loading,  setLoading]  = useState(false);

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setLoading(true);

    const apiKey = process.env.REACT_APP_ANTHROPIC_KEY;
    if (!apiKey || apiKey.includes('your_')) {
      setMessages(p => [...p, {
        role: 'assistant',
        content: '⚠️ **No AI Key Set**\n\nAdd to `.env`:\n```\nREACT_APP_ANTHROPIC_KEY=sk-ant-...\n```\nGet one free at **console.anthropic.com** — then redeploy on Vercel.',
      }]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: `You are an expert automotive dealer business analyst for Major Auto Sales LLC. You have complete access to their vehicle purchase data from three sources.

IMPORTANT RULES:
- Answer ONLY based on the data provided below
- Format all dollar amounts with $ and commas: $12,500
- Use bullet points for lists
- Cross-matched VINs mean the same car appears in 2+ purchase sources — highlight the price difference if any
- Be concise and business-focused
- If data doesn't contain something, say so clearly

${aiSummary}`,
          messages: updated.filter((_,i) => i > 0).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${res.status}`);
      }

      const data  = await res.json();
      const reply = data.content?.[0]?.text || 'No response.';
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: `⚠️ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, aiSummary]);

  const clear = useCallback(() => {
    setMessages([{ role: 'assistant', content: 'Cleared! What would you like to know?' }]);
  }, []);

  return { messages, loading, send, clear };
}
