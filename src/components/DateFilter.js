// src/components/DateFilter.js
import React from 'react';
import { useData } from '../context/DataContext';
import { DATE_FILTERS } from '../utils/dateFilter';
import { Calendar } from 'lucide-react';

export default function DateFilter() {
  const { dateFilter, setDateFilter, stats } = useData();
  const total = stats.reduce((s,x) => s + x.count, 0);

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text3)', fontSize:12 }}>
        <Calendar size={13}/>
        <span style={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', fontSize:10 }}>Period</span>
      </div>
      <div style={{ display:'flex', gap:4, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:9, padding:3 }}>
        {DATE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setDateFilter(f.id)}
            style={{ padding:'5px 12px', borderRadius:7, border:'none', background: dateFilter===f.id ? 'var(--accent)' : 'transparent', color: dateFilter===f.id ? '#fff' : 'var(--text2)', fontSize:12, fontWeight: dateFilter===f.id ? 700 : 500, cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s', whiteSpace:'nowrap' }}
            onMouseEnter={e=>{ if(dateFilter!==f.id){ e.currentTarget.style.color='var(--text)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}}
            onMouseLeave={e=>{ if(dateFilter!==f.id){ e.currentTarget.style.color='var(--text2)'; e.currentTarget.style.background='transparent'; }}}
          >{f.label}</button>
        ))}
      </div>
      <span style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)' }}>
        {total.toLocaleString()} vehicles
      </span>
    </div>
  );
}
