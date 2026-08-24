// src/components/Sidebar.js
import React from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { LayoutDashboard, BarChart2, GitMerge, MessageSquare, Car, Circle, FileCheck, Calendar, LogOut, Trophy, DollarSign } from 'lucide-react';

const NAV = [
  { id:'overview',   icon:<LayoutDashboard size={15}/>, label:'Overview'         },
  { id:'activity',   icon:<Calendar size={15}/>,        label:'Activity'         },
  { id:'charts',     icon:<BarChart2 size={15}/>,       label:'Charts & Trends'  },
  { id:'profit',     icon:<DollarSign size={15}/>,      label:'Profit'           },
  { id:'crossmatch', icon:<GitMerge size={15}/>,        label:'Cross-Match VINs' },
  { id:'titles',     icon:<FileCheck size={15}/>,       label:'Title Status'     },
  { id:'carmax',     icon:<Car size={15}/>,             label:'CarMax'           },
  { id:'vmv',        icon:<Car size={15}/>,             label:'Value My Vehicle' },
  { id:'backlots',   icon:<Trophy size={15}/>,          label:"Today's Opportunities" },
  { id:'chat',       icon:<MessageSquare size={15}/>,   label:'AI Assistant'     },
];

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
    <aside style={{ width:220, minWidth:220, background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-sm)', zIndex:2 }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 14px 13px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ width:34, height:34, borderRadius:9, background:'rgba(79,70,229,0.1)', border:'1px solid rgba(79,70,229,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Car size={17} color="var(--accent)"/>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.3px' }}>DealerIQ</div>
          <div style={{ fontSize:9, color:'var(--text3)', letterSpacing:'1.5px', textTransform:'uppercase' }}>Major Auto Sales</div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ padding:'10px 7px 0' }}>
        <Lbl>Dashboard</Lbl>
        {NAV.map(n => (
          <Btn key={n.id} active={page===n.id && !active} onClick={()=>onNav(n.id)}>
            {n.icon}
            <span style={{ flex:1 }}>{n.label}</span>
            {n.id === 'crossmatch' && crossMatch.matched.length > 0 && (
              <span style={{ fontSize:10, background:'rgba(139,92,246,0.2)', color:'var(--purple)', padding:'1px 7px', borderRadius:10, fontWeight:700 }}>
                {crossMatch.matched.length}
              </span>
            )}
            {n.id === 'titles' && titleAlerts > 0 && (
              <span style={{ fontSize:10, background:'rgba(239,68,68,0.2)', color:'var(--red)', padding:'1px 7px', borderRadius:10, fontWeight:700 }}>
                {titleAlerts}
              </span>
            )}
            {n.id === 'carmax' && carmaxTitleIssues > 0 && (
              <span style={{ fontSize:10, background:'rgba(239,68,68,0.2)', color:'var(--red)', padding:'1px 7px', borderRadius:10, fontWeight:700 }}>
                {carmaxTitleIssues}
              </span>
            )}
            {n.id === 'vmv' && vmvTitleIssues > 0 && (
              <span style={{ fontSize:10, background:'rgba(239,68,68,0.2)', color:'var(--red)', padding:'1px 7px', borderRadius:10, fontWeight:700 }}>
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
              style={{ display:'flex', alignItems:'center', gap:8, width:'calc(100% - 4px)', padding:'8px 10px', border:'none', borderRadius:8, margin:'1px 2px', background: isActive?`${meta.color}18`:'transparent', color: isActive?meta.color:'var(--text2)', fontSize:12, fontWeight: isActive?700:400, cursor:'pointer', transition:'all 0.15s', textAlign:'left' }}
              onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background='var(--hover)'; e.currentTarget.style.color='var(--text)'; }}}
              onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)'; }}}
            >
              <Circle size={8} fill={meta.color} color={meta.color} style={{ flexShrink:0 }}/>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sheet.label}</span>
              {stat && <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)', flexShrink:0 }}>{stat.count.toLocaleString()}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:'13px 14px', borderTop:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.9, marginBottom:10 }}>
          <span style={{ color:'var(--accent)', fontWeight:800, fontSize:20 }}>{grand.toLocaleString()}</span>
          <span style={{ display:'block' }}>vehicles in period</span>
          <span style={{ fontSize:10 }}>{sheets.length} sources · live Google Sheets</span>
        </div>
        <button onClick={onLogout}
          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 10px', border:'1px solid var(--border2)', borderRadius:8, background:'transparent', color:'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={13} /> Log Out
        </button>
      </div>
    </aside>
  );
}

function Lbl({ children }) {
  return <div style={{ fontSize:9, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', padding:'3px 10px 5px' }}>{children}</div>;
}
function Btn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:9, width:'calc(100% - 4px)', padding:'9px 10px', border:'none', borderRadius:8, margin:'1px 2px', background: active?'rgba(79,70,229,0.1)':'transparent', color: active?'var(--accent)':'var(--text2)', fontSize:13, fontWeight: active?700:500, cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)' }}
      onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='var(--hover)'; e.currentTarget.style.color='var(--text)'; }}}
      onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)'; }}}
    >
      {children}
    </button>
  );
}
