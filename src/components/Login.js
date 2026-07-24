// src/components/Login.js
import React, { useState } from 'react';
import { Car, Lock, Eye, EyeOff } from 'lucide-react';

const SESSION_KEY = 'dealeriq_unlocked';

// Password comes from REACT_APP_DASHBOARD_PASSWORD, set in .env (local) and
// in Vercel's Environment Variables (production) — never hardcoded here,
// since this file ships in the public source bundle.
const PASSWORD = process.env.REACT_APP_DASHBOARD_PASSWORD || 'set-REACT_APP_DASHBOARD_PASSWORD';

export function isUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export default function Login({ onUnlock }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (value === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <form onSubmit={submit}
        style={{
          width: 360, background:'var(--card)', border:'1px solid var(--border)', borderRadius:16,
          padding:'34px 32px', boxShadow:'var(--shadow-md)',
          animation: shake ? 'shake 0.4s' : undefined,
        }}
      >
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:26 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'rgba(79,70,229,0.1)', border:'1px solid rgba(79,70,229,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
            <Car size={26} color="var(--accent)" />
          </div>
          <div style={{ fontSize:19, fontWeight:800, letterSpacing:'-0.3px' }}>DealerIQ</div>
          <div style={{ fontSize:11, color:'var(--text3)', letterSpacing:'1.2px', textTransform:'uppercase', marginTop:2 }}>Major Auto Sales</div>
        </div>

        <label style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.6px', display:'block', marginBottom:8 }}>
          Dashboard Password
        </label>
        <div style={{ position:'relative', marginBottom: error ? 8 : 22 }}>
          <Lock size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} />
          <input
            autoFocus
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); setError(false); }}
            placeholder="Enter password"
            style={{
              width:'100%', padding:'11px 40px', background:'var(--bg3)',
              border:`1px solid ${error ? 'var(--red)' : 'var(--border2)'}`, borderRadius:10,
              color:'var(--text)', fontSize:14, outline:'none', transition:'border-color 0.2s',
            }}
          />
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', display:'flex' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {error && <p style={{ color:'var(--red)', fontSize:12, marginBottom:14 }}>Incorrect password — try again.</p>}

        <button type="submit"
          style={{ width:'100%', padding:'12px', background:'var(--accent)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:14, transition:'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
        >
          Unlock Dashboard
        </button>
      </form>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
