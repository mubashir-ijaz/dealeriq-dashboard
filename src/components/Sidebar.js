// src/components/Sidebar.js
import React from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { LayoutDashboard, GitMerge, MessageSquare, Car, Circle, FileCheck, Calendar, LogOut, Trophy, DollarSign } from 'lucide-react';

const NAV = [
  { id:'overview',   icon:<LayoutDashboard size={15}/>, label:'Overview',              color:'#6366f1' },
  { id:'activity',   icon:<Calendar size={15}/>,        label:'Activity',              color:'#0ea5e9' },
  { id:'profit',     icon:<DollarSign size={15}/>,      label:'Profit',                color:'#16a34a' },
  { id:'crossmatch', icon:<GitMerge size={15}/>,        label:'Cross-Match VINs',      color:'#8b5cf6' },
  { id:'titles',     icon:<FileCheck size={15}/>,       label:'Title Status',          color:'#f59e0b' },
  { id:'carmax',     icon:<Car size={15}/>,             label:'CarMax',                color:'#ef4444' },
  { id:'vmv',        icon:<Car size={15}/>,             label:'Value My Vehicle',      color:'#ec4899' },
  { id:'backlots',   icon:<Trophy size={15}/>,          label:"Today's Opportunities", color:'#eab308' },
  { id:'chat',       icon:<MessageSquare size={15}/>,   label:'AI Assistant',          color:'#06b6d4' },
];

// hex -> rgba, for tinted backgrounds/borders per nav color above
function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// The sidebar is deliberately its own dark panel (professional CRM look —
// dark nav rail, light content area) so it uses its own local color tokens
// instead of the app's light-theme CSS variables.
const SB_BG     = '#0a0a10';
const SB_BORDER = 'rgba(255,255,255,0.08)';
const SB_TEXT   = '#f5f6fa';
const SB_TEXT2  = '#b6bac8';
const SB_TEXT3  = '#787d8f';
const SB_HOVER  = 'rgba(255,255,255,0.06)';
const SB_ACCENT = '#818cf8';

export default function Sidebar({ page, active, onNav, onLogout }) {
  const { sheets, stats, crossMatch, normalized } = useData();
  const grand = stats.reduce((s,x) => s+x.count, 0);

  // Count unreleased titles for badge
  const titleAlerts = ['ADESA','CarMax','Value My Vehicle'].reduce((sum, label) => {
    const rows = normalized[label] || [];
    return sum + rows.filter(r => ['Not Received','Unavailable'].includes(r.titleStatus)).length;
  }, 0);

  // Count CarMax title-issue (Unavailable) cars for the CarMax tab badge
  const carmaxTitleIssues = (normalized['CarMax'] || []).filter(r => r.titleStatus === 'Unavailable').length;

  // Same, for the Value My Vehicle tab badge
  const vmvTitleIssues = (normalized['Value My Vehicle'] || []).filter(r => r.titleStatus === 'Unavailable').length;

  return (
    <aside style={{ width:254, minWidth:254, background:SB_BG, borderRight:`1px solid ${SB_BORDER}`, display:'flex', flexDirection:'column', boxShadow:'2px 0 12px rgba(0,0,0,0.25)', zIndex:2 }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 14px 13px', borderBottom:`1px solid ${SB_BORDER}` }}>
        <div style={{ width:34, height:34, borderRadius:9, background:'rgba(129,140,248,0.16)', border:'1px solid rgba(129,140,248,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Car size={17} color={SB_ACCENT}/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.3px', color:SB_TEXT }}>DealerIQ</div>
          <div style={{ fontSize:9, color:SB_TEXT3, letterSpacing:'1.5px', textTransform:'uppercase' }}>Major Auto Sales</div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ padding:'10px 7px 0' }}>
        <Lbl>Dashboard</Lbl>
        {NAV.map(n => (
          <Btn key={n.id} active={page===n.id && !active} color={n.color} onClick={()=>onNav(n.id)}>
            <span style={{ width:26, height:26, borderRadius:7, background:hexToRgba(n.color,0.16), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {n.icon}
            </span>
            <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'uppercase' }}>{n.label}</span>
            {n.id === 'crossmatch' && crossMatch.matched.length > 0 && (
              <span style={{ fontSize:10, background:'rgba(139,92,246,0.22)', color:'#a78bfa', padding:'1px 7px', borderRadius:10, fontWeight:700, flexShrink:0 }}>
                {crossMatch.matched.length}
              </span>
            )}
            {n.id === 'titles' && titleAlerts > 0 && (
              <span style={{ fontSize:10, background:'rgba(248,113,113,0.22)', color:'#f87171', padding:'1px 7px', borderRadius:10, fontWeight:700, flexShrink:0 }}>
                {titleAlerts}
              </span>
            )}
            {n.id === 'carmax' && carmaxTitleIssues > 0 && (
              <span style={{ fontSize:10, background:'rgba(248,113,113,0.22)', color:'#f87171', padding:'1px 7px', borderRadius:10, fontWeight:700, flexShrink:0 }}>
                {carmaxTitleIssues}
              </span>
            )}
            {n.id === 'vmv' && vmvTitleIssues > 0 && (
              <span style={{ fontSize:10, background:'rgba(248,113,113,0.22)', color:'#f87171', padding:'1px 7px', borderRadius:10, fontWeight:700, flexShrink:0 }}>
                {vmvTitleIssues}
              </span>
            )}
          </Btn>
        ))}
      </nav>

      {/* Sheet list */}
      <nav style={{ padding:'14px 7px 0', flex:1 }}>
        <Lbl>Data Sources</Lbl>
        {sheets.map(sheet => {
          const meta   = SOURCE_META[sheet.source] || {};
          const stat   = stats.find(s => s.label === sheet.label);
          const isActive = page === 'sheet' && active === sheet.label;
          return (
            <button key={sheet.label}
              onClick={() => onNav('sheet', sheet.label)}
              style={{ display:'flex', alignItems:'center', gap:8, width:'calc(100% - 4px)', padding:'8px 10px 8px 8px', border:'none', borderLeft: isActive?`3px solid ${meta.color}`:'3px solid transparent', borderRadius:6, margin:'1px 2px', background: isActive?`${meta.color}22`:'transparent', color: isActive?SB_TEXT:SB_TEXT2, fontSize:11.5, fontWeight: isActive?800:600, letterSpacing:'0.3px', cursor:'pointer', transition:'all 0.15s', textAlign:'left' }}
              onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background=SB_HOVER; e.currentTarget.style.color=SB_TEXT; }}}
              onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=SB_TEXT2; }}}
            >
              <Circle size={8} fill={meta.color} color={meta.color} style={{ flexShrink:0 }}/>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'uppercase' }}>{sheet.label}</span>
              {stat && <span style={{ fontSize:10, color:SB_TEXT3, fontFamily:'var(--mono)', flexShrink:0 }}>{stat.count.toLocaleString()}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:'13px 14px', borderTop:`1px solid ${SB_BORDER}` }}>
        <div style={{ fontSize:11, color:SB_TEXT3, lineHeight:1.9, marginBottom:10 }}>
          <span style={{ color:SB_ACCENT, fontWeight:800, fontSize:20 }}>{grand.toLocaleString()}</span>
          <span style={{ display:'block', color:SB_TEXT2 }}>vehicles in period</span>
          <span style={{ fontSize:10 }}>{sheets.length} sources · live Google Sheets</span>
        </div>
        <button onClick={onLogout}
          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 10px', border:`1px solid ${SB_BORDER}`, borderRadius:8, background:'transparent', color:SB_TEXT2, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = SB_BORDER; e.currentTarget.style.color = SB_TEXT2; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={13} /> Log Out
        </button>
      </div>
    </aside>
  );
}

function Lbl({ children }) {
  return <div style={{ fontSize:9, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:SB_TEXT3, padding:'3px 10px 5px' }}>{children}</div>;
}
function Btn({ active, color, onClick, children }) {
  const c = color || SB_ACCENT;
  return (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:9, width:'calc(100% - 4px)', padding:'7px 10px 7px 8px', border:'none', borderLeft: active?`3px solid ${c}`:'3px solid transparent', borderRadius:6, margin:'1px 2px', background: active?hexToRgba(c, 0.14):'transparent', color: active?SB_TEXT:SB_TEXT2, fontSize:11.5, fontWeight: active?800:600, letterSpacing:'0.2px', cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)' }}
      onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background=SB_HOVER; e.currentTarget.style.color=SB_TEXT; }}}
      onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=SB_TEXT2; }}}
    >
      {children}
    </button>
  );
}
