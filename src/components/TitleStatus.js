// src/components/TitleStatus.js
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META, formatAge } from '../utils/schema';
import { filterByAge } from '../utils/ageFilter';
import AgeFilter from './AgeFilter';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronUp, ImageOff } from 'lucide-react';

// Config: which sources have title data and what their statuses mean
const TITLE_CONFIG = {
  adesa: {
    good:    ['Released'],
    warn:    ['Not Received'],
    ok:      ['Received'],
    neutral: [],
    field:   'titleStatus',
    releaseField: 'releaseStatus',
  },
  carmax: {
    good:    ['Available'],
    warn:    ['Unavailable'],
    ok:      [],
    neutral: ['Unknown'],
    field:   'titleStatus',
  },
};

const STATUS_STYLE = {
  Released:     { color:'#10b981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.25)',  icon:<CheckCircle size={14}/>,   label:'Released'     },
  Available:    { color:'#10b981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.25)',  icon:<CheckCircle size={14}/>,   label:'Available'    },
  Received:     { color:'#3b82f6', bg:'rgba(59,130,246,0.12)',  border:'rgba(59,130,246,0.25)',  icon:<CheckCircle size={14}/>,   label:'Received'     },
  'Not Received':{ color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.25)',   icon:<AlertTriangle size={14}/>, label:'Not Received' },
  Unavailable:  { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.25)',   icon:<XCircle size={14}/>,       label:'Unavailable'  },
  Unknown:      { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)',  icon:<HelpCircle size={14}/>,    label:'Unknown'      },
  Ineligible:   { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)',  icon:<HelpCircle size={14}/>,    label:'Ineligible'   },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { color:'var(--text3)', bg:'var(--bg3)', border:'var(--border)', icon:null, label: status };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:s.bg, border:`1px solid ${s.border}`, color:s.color, fontSize:11, fontWeight:700 }}>
      {s.icon}{s.label}
    </span>
  );
}

function SourceTitleCard({ sheetLabel, source, ageFilter }) {
  const { normalized } = useData();
  const [expanded, setExpanded] = useState({});
  const rows = filterByAge(normalized[sheetLabel] || [], ageFilter);
  const cfg  = TITLE_CONFIG[source];
  const meta = SOURCE_META[source];

  if (!cfg) {
    const open = !!expanded.__self;
    return (
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
        <button onClick={() => setExpanded(e => ({ ...e, __self: !e.__self }))}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 16px', background:'transparent', border:'none', cursor:'pointer', color:'var(--text)', fontFamily:'var(--font)' }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:meta.color, flexShrink:0 }}/>
          <span style={{ fontWeight:800, fontSize:13 }}>{sheetLabel}</span>
          <span style={{ fontSize:11, color:'var(--text3)', marginLeft:'auto' }}>No title tracking</span>
          {open ? <ChevronUp size={14} color="var(--text3)"/> : <ChevronDown size={14} color="var(--text3)"/>}
        </button>
        {open && (
          <p style={{ fontSize:13, color:'var(--text3)', padding:'0 16px 14px', margin:0 }}>
            This source does not include title status data.
          </p>
        )}
      </div>
    );
  }

  const hasImages = rows.some(r => r.image);

  // Group rows by title status
  const groups = {};
  rows.forEach(r => {
    const t = r[cfg.field] || '—';
    if (!groups[t]) groups[t] = [];
    groups[t].push(r);
  });

  // Order: good first, then ok, then warn, then neutral, then rest
  const order = [...cfg.good, ...cfg.ok, ...cfg.warn, ...cfg.neutral];
  const statusKeys = [...order.filter(k => groups[k]), ...Object.keys(groups).filter(k => !order.includes(k) && groups[k])];

  // Summary counts
  const goodCount    = (cfg.good || []).reduce((s,k) => s+(groups[k]?.length||0), 0);
  const warnCount    = (cfg.warn || []).reduce((s,k) => s+(groups[k]?.length||0), 0);
  const okCount      = (cfg.ok   || []).reduce((s,k) => s+(groups[k]?.length||0), 0);

  return (
    <div style={{ background:'var(--card)', border:`1px solid var(--border)`, borderRadius:13, padding:20, borderTop:`3px solid ${meta.color}`, boxShadow:'var(--shadow-sm)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <div style={{ width:9, height:9, borderRadius:'50%', background:meta.color }}/>
        <span style={{ fontWeight:800, fontSize:15 }}>{sheetLabel}</span>
        <span style={{ fontSize:11, color:meta.color, background:meta.bg, border:`1px solid ${meta.border}`, padding:'2px 8px', borderRadius:20, fontWeight:700, marginLeft:'auto' }}>
          {rows.length} vehicles
        </span>
      </div>

      {/* Summary pills */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {goodCount > 0 && (
          <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:9, padding:'8px 14px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#10b981' }}>{goodCount}</div>
            <div style={{ fontSize:10, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.8px' }}>{cfg.good.join(' / ')}</div>
          </div>
        )}
        {okCount > 0 && (
          <div style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:9, padding:'8px 14px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#3b82f6' }}>{okCount}</div>
            <div style={{ fontSize:10, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.8px' }}>{cfg.ok.join(' / ')}</div>
          </div>
        )}
        {warnCount > 0 && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:9, padding:'8px 14px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#ef4444' }}>{warnCount}</div>
            <div style={{ fontSize:10, color:'#ef4444', textTransform:'uppercase', letterSpacing:'0.8px' }}>
              {cfg.warn.join(' / ')} ⚠
            </div>
          </div>
        )}
      </div>

      {/* Expandable status groups */}
      {statusKeys.map(status => {
        const groupRows = groups[status] || [];
        const style     = STATUS_STYLE[status];
        const isOpen    = expanded[status];
        const isBad     = cfg.warn?.includes(status) || cfg.neutral?.includes(status);

        return (
          <div key={status} style={{ marginBottom:8, border:`1px solid ${style?.border||'var(--border)'}`, borderRadius:9, overflow:'hidden' }}>
            <button
              onClick={() => setExpanded(e => ({ ...e, [status]: !e[status] }))}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: isOpen ? `${style?.bg||'var(--bg2)'}` : 'var(--bg2)', border:'none', cursor:'pointer', color:'var(--text)', fontFamily:'var(--font)', transition:'background 0.15s' }}
            >
              <StatusBadge status={status} />
              <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:style?.color||'var(--text)' }}>{groupRows.length}</span>
              <span style={{ fontSize:12, color:'var(--text2)' }}>vehicles</span>
              {isBad && groupRows.length > 0 && (
                <span style={{ fontSize:10, color:'#ef4444', marginLeft:4 }}>⚠ Action needed</span>
              )}
              <span style={{ marginLeft:'auto', color:'var(--text3)' }}>
                {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </span>
            </button>

            {isOpen && (
              <div style={{ padding:'0 14px 12px', background: style?.bg || 'var(--bg2)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginTop:8 }}>
                  <thead>
                    <tr>
                      {hasImages && <th style={{ padding:'6px 10px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', borderBottom:`1px solid ${style?.border||'var(--border)'}`, borderRight:`1px solid ${style?.border||'var(--border)'}` }}>Photo</th>}
                      {['VIN','Year','Make','Model','Color','Miles','Date','Age','Seller'].map(h => (
                        <th key={h} style={{ padding:'6px 8px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', borderBottom:`1px solid ${style?.border||'var(--border)'}` }}>{h}</th>
                      ))}
                      {cfg.releaseField && <th style={{ padding:'6px 8px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', borderBottom:`1px solid ${style?.border||'var(--border)'}` }}>Release</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${style?.border||'var(--border)'}33` }}>
                        {hasImages && (
                          <td style={{ padding:'8px 10px', borderRight:`1px solid ${style?.border||'var(--border)'}` }}>
                            {r.image
                              ? <img src={r.image} alt="" style={{ width:88, height:64, objectFit:'cover', borderRadius:7, display:'block', boxShadow:'var(--shadow-sm)' }} />
                              : <div style={{ width:88, height:64, borderRadius:7, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center' }}><ImageOff size={18} color="var(--text3)" /></div>
                            }
                          </td>
                        )}
                        <td style={{ padding:'7px 8px', fontFamily:'var(--mono)', fontSize:11, color:style?.color||'var(--text)', fontWeight:600 }}>{r.vin || '—'}</td>
                        <td style={{ padding:'7px 8px', fontFamily:'var(--mono)' }}>{r.year}</td>
                        <td style={{ padding:'7px 8px', fontWeight:600 }}>{r.make}</td>
                        <td style={{ padding:'7px 8px', color:'var(--text2)' }}>{r.model}</td>
                        <td style={{ padding:'7px 8px', color:'var(--text2)' }}>{r.color}</td>
                        <td style={{ padding:'7px 8px', fontFamily:'var(--mono)', color:'var(--text2)' }}>{r.miles ? Number(r.miles).toLocaleString() : '—'}</td>
                        <td style={{ padding:'7px 8px', fontFamily:'var(--mono)', color:'var(--text2)', fontSize:11 }}>{r.date}</td>
                        <td style={{ padding:'7px 8px', fontFamily:'var(--mono)', color: r.ageDays >= 30 ? '#ef4444' : 'var(--text2)', fontWeight: r.ageDays >= 30 ? 700 : 400, fontSize:11 }}>{formatAge(r.ageDays)}</td>
                        <td style={{ padding:'7px 8px', color:'var(--text2)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.seller}</td>
                        {cfg.releaseField && <td style={{ padding:'7px 8px' }}><StatusBadge status={r[cfg.releaseField]}/></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TitleStatus() {
  const { sheets, normalized } = useData();
  const [ageFilter, setAgeFilter] = useState('all');

  // Grand title summary across all sources with title data — respects the
  // age filter so e.g. "1 Month+" shows only cars bought 30+ days ago.
  const allTitled = ['ADESA','CarMax','Value My Vehicle'];
  const agedNormalized = {};
  allTitled.forEach(label => { agedNormalized[label] = filterByAge(normalized[label] || [], ageFilter); });

  const grandNeedAction = allTitled.reduce((sum, label) => {
    return sum + agedNormalized[label].filter(r => ['Not Received','Unavailable'].includes(r.titleStatus)).length;
  }, 0);
  const grandReleased = allTitled.reduce((sum, label) => {
    return sum + agedNormalized[label].filter(r => ['Released','Available'].includes(r.titleStatus)).length;
  }, 0);
  const grandTotal = allTitled.reduce((sum, label) => sum + agedNormalized[label].length, 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Age filter */}
      <AgeFilter value={ageFilter} onChange={setAgeFilter} />

      {/* Grand summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderTop:'2px solid #059669', borderRadius:12, padding:'16px 20px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#059669' }}>{grandReleased}</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.8px' }}>✅ Released / Available</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Titles cleared across all sources</div>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderTop:'2px solid #dc2626', borderRadius:12, padding:'16px 20px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#dc2626' }}>{grandNeedAction}</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.8px' }}>⚠ Not Received / Unavailable</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Action required</div>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderTop:'2px solid var(--text3)', borderRadius:12, padding:'16px 20px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:28, fontWeight:800 }}>{grandTotal}</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.8px' }}>Total Tracked Vehicles</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>ADESA + CarMax</div>
        </div>
      </div>

      {/* Explainer */}
      <div style={{ background:'rgba(79,70,229,0.06)', border:'1px solid rgba(79,70,229,0.18)', borderRadius:11, padding:'12px 16px', fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
        <strong style={{ color:'var(--accent)' }}>Title tracking</strong> is available for <strong>ADESA</strong> and <strong>CarMax</strong> only. Edge Pipeline and OpenLane do not include title status in their data. Click any status row to expand and see individual vehicles.
      </div>

      {/* Sources with title data — one full-width card per row */}
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {sheets.filter(s => TITLE_CONFIG[s.source]).map(sheet => (
          <SourceTitleCard key={sheet.label} sheetLabel={sheet.label} source={sheet.source} ageFilter={ageFilter} />
        ))}
      </div>

      {/* Sources with no title data — compact, collapsed by default */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sheets.filter(s => !TITLE_CONFIG[s.source]).map(sheet => (
          <SourceTitleCard key={sheet.label} sheetLabel={sheet.label} source={sheet.source} ageFilter={ageFilter} />
        ))}
      </div>
    </div>
  );
}
