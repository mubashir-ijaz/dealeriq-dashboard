// src/components/CrossMatch.js
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { GitMerge, Search } from 'lucide-react';

export default function CrossMatch() {
  const { crossMatch } = useData();
  const [search, setSearch] = useState('');
  const { matched } = crossMatch;
  const filtered = search ? matched.filter(({ vin }) => vin.toLowerCase().includes(search.toLowerCase())) : matched;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {[
          ['VINs in 2+ Sources',   matched.length, '#8b5cf6'],
          ['Sources Compared',     3,               '#3b82f6'],
          ['Possible Duplicates',  matched.length, '#10b981'],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px', borderTop:`2px solid ${c}` }}>
            <div style={{ fontSize:26, fontWeight:800 }}>{v}</div>
            <div style={{ fontSize:11, color:'var(--text2)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.8px' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Explainer */}
      <div style={{ background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:12, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <GitMerge size={15} color="#8b5cf6"/>
          <span style={{ fontWeight:700, fontSize:13 }}>What does cross-match mean?</span>
        </div>
        <p style={{ color:'var(--text2)', fontSize:13, lineHeight:1.7 }}>
          A cross-match means the same VIN (vehicle ID) appears in more than one data source — e.g. a car purchased at CarMax <em>also</em> appears in OpenLane. This can indicate a duplicate record, a car that was re-purchased/resold, or a pricing discrepancy worth investigating.
        </p>
      </div>

      {matched.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
          <GitMerge size={40} style={{ marginBottom:14, opacity:0.3 }}/>
          <p style={{ fontSize:15, fontWeight:700 }}>No Cross-Matches Found</p>
          <p style={{ fontSize:13, marginTop:6 }}>No VINs appear in more than one sheet.</p>
        </div>
      ) : (
        <>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search VIN…"
              style={{ width:'100%', padding:'9px 12px 9px 34px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:13, fontFamily:'var(--mono)', outline:'none' }}
            />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(({ vin, entries }) => {
              const prices  = entries.map(e => e.row.totalCost || e.row.price || 0).filter(Boolean);
              const spread  = prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0;
              return (
                <div key={vin} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                    <code style={{ fontSize:13, fontWeight:800, color:'var(--amber)', fontFamily:'var(--mono)', letterSpacing:1 }}>{vin}</code>
                    <span style={{ background:'rgba(139,92,246,0.15)', color:'var(--purple)', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{entries.length} Sources</span>
                    {spread > 0 && <span style={{ background:'rgba(16,185,129,0.12)', color:'var(--green)', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>Spread: ${spread.toLocaleString()}</span>}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${entries.length},1fr)`, gap:10 }}>
                    {entries.map((e,i) => {
                      const meta  = SOURCE_META[e.row.source] || {};
                      const r     = e.row;
                      const price = r.totalCost || r.price || 0;
                      return (
                        <div key={i} style={{ background:'var(--bg2)', border:`1px solid ${meta.color}33`, borderLeft:`3px solid ${meta.color}`, borderRadius:9, padding:12 }}>
                          <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', color:meta.color, marginBottom:8 }}>{e.label}</div>
                          {[['Year', r.year],['Make', r.make],['Model', r.model],['Miles', r.miles?Number(r.miles).toLocaleString():''],['Price', price?'$'+price.toLocaleString():''],['Date', r.date],['Seller', r.seller]].map(([l,v])=>
                            v ? <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                              <span style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</span>
                              <span style={{ fontSize:11, fontFamily:'var(--mono)', color: l==='Price'?'var(--green)':'var(--text2)', fontWeight: l==='Price'?700:400 }}>{v}</span>
                            </div> : null
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
