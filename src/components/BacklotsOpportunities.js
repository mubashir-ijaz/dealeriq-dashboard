// src/components/BacklotsOpportunities.js
// Today's candidate cars from the backlots auto-scraping pipeline —
// self-contained page: own fetch (see utils/backlotsSheets.js), own
// state, own detail modal. Doesn't touch DataContext.
import React, { useState, useEffect, useMemo } from 'react';
import { fetchBacklotsCars } from '../utils/backlotsSheets';
import {
  Loader, AlertCircle, RefreshCw, Search, ChevronUp, ChevronDown,
  ExternalLink, X, ShieldCheck, ShieldAlert, Trophy, ImageOff, LayoutGrid, List,
} from 'lucide-react';

const PAGE_SIZE = 50;
const GALLERY_PAGE_SIZE = 24;

const LISTED_FILTERS = [
  { id: 'all', label: 'Any time', days: null },
  { id: '1d',  label: 'Today',    days: 1 },
  { id: '3d',  label: '3 Days',   days: 3 },
  { id: '7d',  label: '7 Days',   days: 7 },
  { id: '30d', label: '30 Days',  days: 30 },
];

export default function BacklotsOpportunities() {
  const [cars, setCars]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const [bucket, setBucket]   = useState('all'); // all | clean | minor
  const [view, setView]       = useState('gallery'); // gallery | table
  const [search, setSearch]   = useState('');
  const [sortCol, setSortCol] = useState('dateListed');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [listedFilter, setListedFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchBacklotsCars();
      setCars(rows);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let rows = cars;
    if (bucket !== 'all') rows = rows.filter(c => c.bucket === bucket);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(c =>
        [c.title, c.vin, c.damageNotes].some(v => String(v || '').toLowerCase().includes(q))
      );
    }
    const listedDays = LISTED_FILTERS.find(f => f.id === listedFilter)?.days;
    if (listedDays) {
      // Calendar-day cutoff, not a rolling N*24h window — a car published
      // yesterday evening shouldn't still count as "Today" just because
      // fewer than 24 raw hours have elapsed since then.
      const cutoff = startOfDay(Date.now()) - (listedDays - 1) * 86400000;
      rows = rows.filter(c => c.dateListed && c.dateListed >= cutoff);
    }
    const min = priceMin !== '' ? Number(priceMin) : null;
    const max = priceMax !== '' ? Number(priceMax) : null;
    if (min !== null) rows = rows.filter(c => (c.price || 0) >= min);
    if (max !== null) rows = rows.filter(c => (c.price || 0) <= max);
    rows = [...rows].sort((a, b) => {
      const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [cars, bucket, search, sortCol, sortDir, listedFilter, priceMin, priceMax]);

  const pageSize = view === 'gallery' ? GALLERY_PAGE_SIZE : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPage(0);
  };

  const cleanCount = cars.filter(c => c.bucket === 'clean').length;
  const minorCount = cars.filter(c => c.bucket === 'minor').length;
  const totalProfit = cars.reduce((s, c) => s + (c.profit || 0), 0);
  const avgProfit = cars.length ? totalProfit / cars.length : 0;

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:16 }}>
      <Loader size={38} color="var(--accent)" style={{ animation:'spin 1s linear infinite' }} />
      <p style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text2)' }}>Loading today's opportunities…</p>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:14, padding:40, textAlign:'center' }}>
      <AlertCircle size={44} color="var(--red)" />
      <p style={{ fontSize:18, fontWeight:800 }}>Failed to load backlots sheet</p>
      <p style={{ color:'var(--red)', fontFamily:'var(--mono)', fontSize:12, maxWidth:520 }}>{error}</p>
      <p style={{ color:'var(--text2)', fontSize:13 }}>
        Make sure the sheet is set to <strong>Share → Anyone with the link → Viewer</strong>
      </p>
      <button onClick={load} style={{ marginTop:8, padding:'10px 30px', background:'var(--accent)', border:'none', borderRadius:9, color:'#fff', fontWeight:800, fontSize:14 }}>
        Retry
      </button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
        <StatCard label="Total Candidates" value={cars.length.toLocaleString()} color="var(--accent)" />
        <StatCard label="Clean (Cheap Fix)" value={cleanCount.toLocaleString()} color="var(--green)" />
        <StatCard label="Minor Damage" value={minorCount.toLocaleString()} color="var(--amber)" />
        <StatCard label="Avg Profit" value={'$' + Math.round(avgProfit).toLocaleString()} color="var(--purple)" />
      </div>

      {lastRefresh && (
        <p style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)', margin:'-8px 0 0' }}>
          Live · synced {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {/* Filter + search + refresh */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All'],['clean','Clean'],['minor','Minor Damage']].map(([id,label]) => (
            <button key={id} onClick={() => { setBucket(id); setPage(0); }}
              style={{
                padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer',
                border: bucket===id ? '1px solid var(--accent)' : '1px solid var(--border2)',
                background: bucket===id ? 'rgba(79,70,229,0.1)' : 'transparent',
                color: bucket===id ? 'var(--accent)' : 'var(--text2)',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:9, padding:3 }}>
          {[['profit','Profit'],['dateListed','Recently Added']].map(([col,label]) => (
            <button key={col} onClick={() => { setSortCol(col); setSortDir('desc'); setPage(0); }}
              style={{ padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontFamily:'var(--font)',
                fontWeight: sortCol===col ? 700 : 500,
                background: sortCol===col ? 'var(--accent)' : 'transparent',
                color: sortCol===col ? '#fff' : 'var(--text2)' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search title, VIN, or damage notes…"
            style={{ width:'100%', padding:'9px 12px 9px 34px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:13, fontFamily:'var(--mono)', outline:'none' }}
          />
        </div>

        <button onClick={load}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:'1px solid var(--border2)', borderRadius:8, background:'transparent', color:'var(--text2)', fontSize:12, fontWeight:600 }}>
          <RefreshCw size={13}/> Refresh
        </button>

        <div style={{ display:'flex', gap:4, background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, padding:3 }}>
          <button onClick={() => { setView('gallery'); setPage(0); }} title="Gallery view"
            style={{ display:'flex', alignItems:'center', padding:'6px 9px', borderRadius:6, border:'none', background: view==='gallery' ? 'var(--card)' : 'transparent', color: view==='gallery' ? 'var(--accent)' : 'var(--text3)', boxShadow: view==='gallery' ? 'var(--shadow-sm)' : 'none' }}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => { setView('table'); setPage(0); }} title="Table view"
            style={{ display:'flex', alignItems:'center', padding:'6px 9px', borderRadius:6, border:'none', background: view==='table' ? 'var(--card)' : 'transparent', color: view==='table' ? 'var(--accent)' : 'var(--text3)', boxShadow: view==='table' ? 'var(--shadow-sm)' : 'none' }}>
            <List size={14} />
          </button>
        </div>

        <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
          {filtered.length.toLocaleString()} cars
        </div>
      </div>

      {/* Listed-date + price filters */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:9, padding:3 }}>
          {LISTED_FILTERS.map(f => (
            <button key={f.id} onClick={() => { setListedFilter(f.id); setPage(0); }}
              style={{ padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontFamily:'var(--font)',
                fontWeight: listedFilter===f.id ? 700 : 500,
                background: listedFilter===f.id ? 'var(--accent)' : 'transparent',
                color: listedFilter===f.id ? '#fff' : 'var(--text2)' }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>Price</span>
          <input type="number" placeholder="Min" value={priceMin}
            onChange={e => { setPriceMin(e.target.value); setPage(0); }}
            style={{ width:80, padding:'7px 10px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'var(--mono)', outline:'none' }} />
          <span style={{ color:'var(--text3)' }}>–</span>
          <input type="number" placeholder="Max" value={priceMax}
            onChange={e => { setPriceMax(e.target.value); setPage(0); }}
            style={{ width:80, padding:'7px 10px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:12, fontFamily:'var(--mono)', outline:'none' }} />
        </div>

        {(listedFilter !== 'all' || priceMin !== '' || priceMax !== '') && (
          <button onClick={() => { setListedFilter('all'); setPriceMin(''); setPriceMax(''); setPage(0); }}
            style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border2)', background:'transparent', color:'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Clear filters
          </button>
        )}
      </div>

      {view === 'gallery' ? (
        <GalleryGrid cars={paged} onSelect={setSelected} />
      ) : (
        <TableView cars={paged} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} onSelect={setSelected} />
      )}

      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', border:'1px solid var(--border)', borderRadius:10, background:'var(--bg2)' }}>
          <span style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)' }}>Page {page+1} of {totalPages}</span>
          <div style={{ display:'flex', gap:5 }}>
            {[['«',()=>setPage(0)],['‹',()=>setPage(p=>p-1)],['›',()=>setPage(p=>p+1)],['»',()=>setPage(totalPages-1)]].map(([lbl,fn],idx) => {
              const disabled = idx<2 ? page===0 : page>=totalPages-1;
              return <button key={lbl} onClick={fn} disabled={disabled} style={{ padding:'4px 11px', border:'1px solid var(--border2)', borderRadius:6, background:'transparent', color: disabled?'var(--text3)':'var(--text)', fontSize:13 }}>{lbl}</button>;
            })}
          </div>
        </div>
      )}

      {selected && <CarDetailModal car={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function GalleryGrid({ cars, onSelect }) {
  if (cars.length === 0) {
    return <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--text3)', background:'var(--card)', border:'1px solid var(--border)', borderRadius:12 }}>No cars match</div>;
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:14 }}>
      {cars.map((car, i) => {
        const isClean = car.bucket === 'clean';
        return (
          <div key={car.vin + i}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', cursor:'pointer' }}
            onClick={() => onSelect(car)}
          >
            <a href={car.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ display:'block', width:'100%', height:150, background:'var(--bg3)', position:'relative' }}>
              {car.image
                ? <img src={car.image} alt={car.title} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}><ImageOff size={28} /></div>
              }
              {isClean && (
                <span style={{ position:'absolute', top:8, left:8, display:'flex', alignItems:'center', gap:4, background:'rgba(5,150,105,0.92)', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:20 }}>
                  <Trophy size={10} /> Cheap Fix
                </span>
              )}
            </a>

            <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8, flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={car.title}>{car.title}</div>

              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5 }}>
                <span style={{ color:'var(--text3)' }}>Price</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:600 }}>{fmt$(car.price)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5 }}>
                <span style={{ color:'var(--text3)' }}>MMR</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:600 }}>{fmt$(car.mmr)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5 }}>
                <span style={{ color:'var(--text3)' }}>JD Profit</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--purple)' }}>{fmt$(car.jdProfit)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5 }}>
                <span style={{ color:'var(--text3)' }}>Profit</span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:800, color:'var(--green)' }}>{fmt$(car.profit)}</span>
              </div>
              {car.shippingFee != null && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5 }}>
                  <span style={{ color:'var(--text3)' }}>− Shipping (${Math.round(car.shippingFee).toLocaleString()}) =</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:800, color:'var(--green)' }}>{fmt$(car.netProfit)} net</span>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid var(--border)' }}>
                <CarfaxBadge text={car.carfax} />
                {(car.carfaxAccidents > 0 || car.autocheckAccidents > 0) && (
                  <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)' }}>
                    {car.carfaxAccidents}CF / {car.autocheckAccidents}AC
                  </span>
                )}
              </div>

              {car.dateListed && (
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)' }} title={formatPublished(car.dateListed)}>
                  {formatPublished(car.dateListed)} ({daysAgo(car.dateListed)})
                </div>
              )}
              {milesAway(car.distanceMiles) && (
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)' }}>
                  {milesAway(car.distanceMiles)}
                </div>
              )}

              <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }} title={car.damageNotes}>
                {car.damageNotes}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ cars, sortCol, sortDir, onSort, onSelect }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ overflowX:'auto', maxHeight:'58vh', overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr>
              {[
                ['title','Car'], ['price','Price'], ['mmr','MMR'], ['jdProfit','JD Profit'],
                ['profit','Profit'], ['netProfit','Net Profit'], ['mileage','Miles'],
                ['distanceMiles','Away'], ['carfax','Carfax'],
                ['dateListed','Listed'], ['damageNotes','Damage'],
              ].map(([col,label]) => (
                <th key={col} onClick={() => onSort(col)}
                  style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.8px', textTransform:'uppercase', color: sortCol===col?'var(--accent)':'var(--text3)', background:'var(--bg2)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap', cursor:'pointer', userSelect:'none', position:'sticky', top:0 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                    {label}
                    {sortCol===col ? (sortDir==='asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cars.map((car, i) => {
              const isClean = car.bucket === 'clean';
              return (
                <tr key={car.vin + i} onClick={() => onSelect(car)}
                  style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background=''}
                >
                  <td style={{ padding:'8px 12px', fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{car.title}</td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)' }}>{fmt$(car.price)}</td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)' }}>{fmt$(car.mmr)}</td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)', color:'var(--purple)', fontWeight:700 }}>{fmt$(car.jdProfit)}</td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)', color:'var(--green)', fontWeight:700 }}>{fmt$(car.profit)}</td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)', color:'var(--green)', fontWeight:700 }}>{car.netProfit != null ? fmt$(car.netProfit) : '—'}</td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)' }}>{car.mileage ? car.mileage.toLocaleString() : ''}</td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)' }}>{car.distanceMiles != null ? `${Math.round(car.distanceMiles)} mi` : '—'}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <CarfaxBadge text={car.carfax} />
                  </td>
                  <td style={{ padding:'8px 12px', fontFamily:'var(--mono)', color:'var(--text2)', whiteSpace:'nowrap' }} title={formatPublished(car.dateListed)}>
                    {car.dateListed ? daysAgo(car.dateListed) : '—'}
                  </td>
                  <td style={{ padding:'8px 12px', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: isClean ? 'var(--green)' : 'var(--text2)' }} title={car.damageNotes}>
                    {isClean && <ShieldCheck size={11} style={{ verticalAlign:'-2px', marginRight:4 }} />}
                    {car.damageNotes}
                  </td>
                </tr>
              );
            })}
            {cars.length === 0 && (
              <tr><td colSpan={9} style={{ padding:'40px 20px', textAlign:'center', color:'var(--text3)' }}>No cars match</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderTop:`2px solid ${color}`, borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, fontFamily:'var(--mono)' }}>{value}</div>
    </div>
  );
}

function CarfaxBadge({ text }) {
  const clean = /no accidents/i.test(text || '');
  const Icon = clean ? ShieldCheck : ShieldAlert;
  const color = clean ? 'var(--green)' : 'var(--amber)';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color, fontWeight:600 }}>
      <Icon size={12} />
      {clean ? 'Clean' : 'Reported'}
    </span>
  );
}

function fmt$(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '$' + Math.round(n).toLocaleString();
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysAgo(ms) {
  // Calendar-day difference, not raw elapsed hours / 24 — otherwise a
  // car published at 11pm yesterday still reads "today" at 1am.
  const days = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function formatPublished(ms) {
  if (!ms) return null;
  const d = new Date(ms);
  return 'Published ' +
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function milesAway(n) {
  if (n === null || n === undefined || isNaN(n)) return null;
  return `${Math.round(n).toLocaleString()} miles away`;
}

function CarDetailModal({ car, onClose }) {
  const isClean = car.bucket === 'clean';
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,15,25,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--card)', borderRadius:14, maxWidth:620, width:'100%', maxHeight:'85vh', overflow:'auto', boxShadow:'var(--shadow-md)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {isClean && <Trophy size={18} color="var(--green)" />}
            <h2 style={{ fontSize:18, fontWeight:800 }}>{car.title}</h2>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text3)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:18 }}>
          {car.image && (
            <img src={car.image} alt={car.title} style={{ width:'100%', maxHeight:280, objectFit:'cover', borderRadius:10 }} />
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
            <Field label="Price" value={fmt$(car.price)} />
            <Field label="MMR (After Grade)" value={fmt$(car.mmr)} />
            <Field label="Profit" value={fmt$(car.profit)} color="var(--green)" />
            <Field label="Shipping Fee" value={car.shippingFee != null ? fmt$(car.shippingFee) : '—'} />
            <Field label="Net Profit (after shipping)" value={car.netProfit != null ? fmt$(car.netProfit) : '—'} color="var(--green)" />
            <Field label="Distance" value={milesAway(car.distanceMiles) || '—'} />
            <Field label="Galves" value={fmt$(car.galves)} />
            <Field label="JD Power" value={fmt$(car.jdPower)} />
            <Field label="JD Profit" value={fmt$(car.jdProfit)} color="var(--purple)" />
            <Field label="Mileage" value={car.mileage ? car.mileage.toLocaleString() : '—'} />
            <Field label="VIN" value={car.vin} mono />
            <Field label="Carfax Accidents" value={car.carfaxAccidents} />
            <Field label="Listed" value={car.dateListed ? formatPublished(car.dateListed) : '—'} />
          </div>

          <div>
            <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Carfax Report</div>
            <div style={{ fontSize:13, color: /no accidents/i.test(car.carfax||'') ? 'var(--green)' : 'var(--amber)', fontWeight:600 }}>{car.carfax}</div>
          </div>

          <div>
            <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Damage Notes</div>
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
              {car.damageNotes || 'No issues flagged'}
            </div>
          </div>

          {car.url && (
            <a href={car.url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'var(--accent)', color:'#fff', borderRadius:9, fontWeight:800, fontSize:14, textDecoration:'none' }}>
              View Listing on OpenLane <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, color, mono }) {
  return (
    <div>
      <div style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color: color || 'var(--text)', fontFamily: mono ? 'var(--mono)' : 'var(--font)', wordBreak:'break-all' }}>{value}</div>
    </div>
  );
}
