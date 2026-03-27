// src/components/Overview.js
import React from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { DollarSign, Car, GitMerge, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const fmt  = n => '$' + Math.round(n||0).toLocaleString();
const fmtN = n => (n||0).toLocaleString();

export default function Overview() {
  const { stats, crossMatch, normalized } = useData();

  const grand = stats.reduce((acc,s) => ({
    count: acc.count + s.count,
    spend: acc.spend + s.totalSpend,
  }), { count:0, spend:0 });
  grand.avg = grand.count ? grand.spend / grand.count : 0;

  // Title alerts across ADESA + CarMax
  const titleAlerts = ['ADESA','CarMax'].reduce((sum, label) => {
    return sum + (normalized[label]||[]).filter(r => ['Not Received','Unavailable'].includes(r.titleStatus)).length;
  }, 0);
  const titlesOk = ['ADESA','CarMax'].reduce((sum, label) => {
    return sum + (normalized[label]||[]).filter(r => ['Released','Available','Received'].includes(r.titleStatus)).length;
  }, 0);

  // All makes combined
  const allMakes = {};
  stats.forEach(s => Object.entries(s.byMake).forEach(([m,c]) => {
    if (m && m !== 'Unknown') allMakes[m] = (allMakes[m]||0)+c;
  }));
  const topMakes   = Object.entries(allMakes).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxMakeCnt = topMakes[0]?.[1] || 1;

  // All years combined
  const allYears = {};
  stats.forEach(s => Object.entries(s.byYear).forEach(([y,c]) => {
    if (/^\d{4}$/.test(y)) allYears[y] = (allYears[y]||0)+c;
  }));
  const topYears = Object.entries(allYears).sort((a,b)=>Number(b[0])-Number(a[0])).slice(0,6);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
        <KPI label="Total Vehicles"  value={fmtN(grand.count)} sub="All 4 sources"       icon={<Car size={16} color="#e8720c"/>}        accent="#e8720c" span={1}/>
        <KPI label="Total Spent"     value={fmt(grand.spend)}  sub="Gross cost"          icon={<DollarSign size={16} color="#10b981"/>}  accent="#10b981" span={1}/>
        <KPI label="Avg Price / Car" value={fmt(grand.avg)}    sub="All sources"         icon={<TrendingUp size={16} color="#3b82f6"/>}  accent="#3b82f6" span={1}/>
        <KPI label="Cross-Matches"   value={fmtN(crossMatch.matched.length)} sub="Same VIN 2+ sheets" icon={<GitMerge size={16} color="#8b5cf6"/>} accent="#8b5cf6" span={1}/>
        <KPI label="Titles OK"       value={fmtN(titlesOk)}   sub="Released / Available" icon={<CheckCircle size={16} color="#10b981"/>} accent="#10b981" span={1}/>
        <KPI label="Title Alerts"    value={fmtN(titleAlerts)} sub="Need action"         icon={<AlertTriangle size={16} color="#ef4444"/>} accent="#ef4444" span={1}/>
      </div>

      {/* Per-source cards */}
      <Row title="Source Breakdown">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {stats.map(s => {
            const meta  = SOURCE_META[s.source] || {};
            const topMk = Object.entries(s.byMake).sort((a,b)=>b[1]-a[1]).slice(0,2);
            const topSl = Object.entries(s.bySeller).sort((a,b)=>b[1]-a[1])[0];
            const titleBad = s.byTitle
              ? Object.entries(s.byTitle).filter(([t])=>['Not Received','Unavailable'].includes(t)).reduce((s,[,c])=>s+c,0)
              : null;
            return (
              <div key={s.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:18, borderTop:`3px solid ${meta.color}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:13 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:meta.color, flexShrink:0 }}/>
                  <span style={{ fontWeight:800, fontSize:13, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.label}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                  <Chip label="Vehicles"  value={fmtN(s.count)} />
                  <Chip label="Spend"     value={fmt(s.totalSpend)} />
                  <Chip label="Avg Price" value={fmt(s.avgPrice)} />
                  <Chip label="Max"       value={fmt(s.maxPrice)} />
                  {topMk.length > 0 && <div style={{ gridColumn:'span 2', background:'var(--bg3)', borderRadius:7, padding:'7px 9px' }}>
                    <div style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:2 }}>Top Makes</div>
                    <div style={{ fontSize:12, fontWeight:600 }}>{topMk.map(([m,c])=>`${m} (${c})`).join(' · ')}</div>
                  </div>}
                  {titleBad !== null && <div style={{ gridColumn:'span 2', background: titleBad > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border:`1px solid ${titleBad>0?'rgba(239,68,68,0.2)':'rgba(16,185,129,0.2)'}`, borderRadius:7, padding:'7px 9px' }}>
                    <div style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:2 }}>Title Alerts</div>
                    <div style={{ fontSize:13, fontWeight:800, color: titleBad > 0 ? '#ef4444' : '#10b981' }}>
                      {titleBad > 0 ? `⚠ ${titleBad} need action` : '✅ All clear'}
                    </div>
                  </div>}
                </div>
              </div>
            );
          })}
        </div>
      </Row>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        {/* Top Makes */}
        <Card title="Top Makes — All Sources">
          {topMakes.map(([make, count]) => (
            <div key={make} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{make}</span>
                <span style={{ fontSize:12, color:'var(--text2)', fontFamily:'var(--mono)' }}>{count}</span>
              </div>
              <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${(count/maxMakeCnt)*100}%`, height:'100%', background:'var(--accent)', borderRadius:3 }}/>
              </div>
            </div>
          ))}
        </Card>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Years */}
          <Card title="Vehicle Model Years">
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {topYears.map(([yr, count]) => (
                <div key={yr} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9, padding:'8px 13px', textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:800 }}>{yr}</div>
                  <div style={{ fontSize:11, color:'var(--text2)' }}>{count}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cross-match preview */}
          <Card title="Cross-Matched VINs">
            {crossMatch.matched.length === 0
              ? <p style={{ color:'var(--text3)', fontSize:13 }}>No VINs found in multiple sheets.</p>
              : <>
                  <p style={{ color:'var(--text2)', fontSize:13, marginBottom:10 }}>
                    <span style={{ color:'var(--purple)', fontWeight:800, fontSize:22 }}>{crossMatch.matched.length}</span>
                    {' '}VINs in 2+ sources
                  </p>
                  {crossMatch.matched.slice(0,4).map(({ vin, entries }) => (
                    <div key={vin} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5, flexWrap:'wrap' }}>
                      <code style={{ color:'var(--amber)', fontSize:10, fontFamily:'var(--mono)' }}>{vin.slice(-10)}</code>
                      {entries.map(e => {
                        const c = SOURCE_META[e.row.source]?.color || '#64748b';
                        return <span key={e.label} style={{ background:`${c}20`, color:c, padding:'1px 7px', borderRadius:10, fontSize:11, fontWeight:600 }}>{e.label}</span>;
                      })}
                    </div>
                  ))}
                </>
            }
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, icon, accent }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:accent }}/>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text2)' }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px' }}>{value}</div>
      <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{sub}</div>
    </div>
  );
}
function Chip({ label, value }) {
  return (
    <div style={{ background:'var(--bg3)', borderRadius:7, padding:'7px 9px' }}>
      <div style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)' }}>{value||'—'}</div>
    </div>
  );
}
function Row({ title, children }) {
  return (
    <div>
      <h3 style={{ fontSize:10, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', marginBottom:12 }}>{title}</h3>
      {children}
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>
      <h3 style={{ fontSize:10, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', marginBottom:13 }}>{title}</h3>
      {children}
    </div>
  );
}
