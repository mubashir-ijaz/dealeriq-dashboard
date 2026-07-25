// src/components/Login.js
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const SESSION_KEY = 'dealeriq_unlocked';

// Password comes from REACT_APP_DASHBOARD_PASSWORD, set in .env (local) and
// in Vercel's Environment Variables (production) — never hardcoded here,
// since this file ships in the public source bundle.
const PASSWORD = process.env.REACT_APP_DASHBOARD_PASSWORD || 'set-REACT_APP_DASHBOARD_PASSWORD';

const BG_IMAGE = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=80';

export function isUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function lockDashboard() {
  sessionStorage.removeItem(SESSION_KEY);
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
    <div style={{
      position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', width:'100vw', overflow:'hidden', background:'#05050a',
    }}>
      {/* Background car photo */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`url(${BG_IMAGE})`, backgroundSize:'cover', backgroundPosition:'center',
        filter:'brightness(0.85) saturate(1.15) contrast(1.05)', transform:'scale(1.04)',
      }} />
      {/* Dark gradient for legibility + gold vignette */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(110% 90% at 50% 32%, rgba(5,5,10,0.15) 0%, rgba(5,5,10,0.72) 68%, rgba(5,5,10,0.92) 100%)',
      }} />
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(180deg, rgba(5,5,10,0.35) 0%, rgba(5,5,10,0.05) 28%, rgba(5,5,10,0.55) 100%)',
      }} />

      <form onSubmit={submit}
        style={{
          position:'relative', zIndex:1, width:380,
          background:'rgba(10,10,14,0.78)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          border:'1px solid rgba(212,175,90,0.3)', borderRadius:20,
          padding:'40px 36px', boxShadow:'0 25px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          animation: shake ? 'shake 0.4s' : 'riseIn 0.5s ease',
        }}
      >
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:30 }}>
          <div style={{
            width:56, height:56, borderRadius:'50%',
            background:'linear-gradient(135deg, #d4af5a, #a9793a)',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16,
            boxShadow:'0 8px 24px rgba(212,175,90,0.35)',
          }}>
            <ShieldCheck size={26} color="#05050a" strokeWidth={2.4} />
          </div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.3px', color:'#fff' }}>Welcome back, Ricky</div>
          <div style={{ fontSize:11, color:'#c9a15f', letterSpacing:'2px', textTransform:'uppercase', marginTop:6, fontWeight:700 }}>
            DealerIQ · Major Auto Sales
          </div>
        </div>

        <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.8px', display:'block', marginBottom:9 }}>
          Enter Password
        </label>
        <div style={{ position:'relative', marginBottom: error ? 8 : 24 }}>
          <Lock size={14} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)' }} />
          <input
            autoFocus
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); setError(false); }}
            placeholder="••••••••"
            style={{
              width:'100%', padding:'13px 42px', background:'rgba(255,255,255,0.06)',
              border:`1px solid ${error ? '#e05252' : 'rgba(255,255,255,0.14)'}`, borderRadius:12,
              color:'#fff', fontSize:15, outline:'none', transition:'border-color 0.2s',
            }}
            onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(212,175,90,0.6)'; }}
            onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.14)'; }}
          />
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.4)', display:'flex' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <p style={{ color:'#f27979', fontSize:12, marginBottom:16 }}>Incorrect password — try again.</p>}

        <button type="submit"
          style={{
            width:'100%', padding:'14px', border:'none', borderRadius:12,
            background:'linear-gradient(135deg, #e6c179, #b8863f)',
            color:'#1a1400', fontWeight:800, fontSize:14.5, letterSpacing:'0.3px',
            boxShadow:'0 8px 20px rgba(212,175,90,0.28)', transition:'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 26px rgba(212,175,90,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(212,175,90,0.28)'; }}
        >
          Unlock Dashboard
        </button>

        <p style={{ textAlign:'center', fontSize:10.5, color:'rgba(255,255,255,0.3)', marginTop:20, letterSpacing:'0.4px' }}>
          Authorized personnel only
        </p>
      </form>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
