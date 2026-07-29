// src/components/SheetView.js
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { Search, ChevronUp, ChevronDown, ExternalLink, LayoutGrid, List, ImageOff } from 'lucide-react';

const PAGE_SIZE = 50;

export default function SheetView({ label }) {
  const { sheets, stats } = useData();
  const sheet  = sheets.find(s => s.label === label);
  const stat   = stats.find(s => s.label === label);
  const meta   = SOURCE_META[sheet?.source] || {};
  const rawRows = useMemo(() => sheet?.rows || [], [sheet]);

  const [search,  setSearch]  = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page,    setPage]    = useState(0);
  const [view,    setView]    = useState('table'); // table | gallery

  // Use raw column headers for display
  const columns = rawRows.length ? Object.keys(rawRows[0]) : [];
  const hasImageCol = columns.some(c => /image/i.test(c));

  const filtered = useMemo(() => {
    let rows = rawRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    }
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol] ?? '';
        const bv = b[sortCol] ?? '';
        const an = parseFloat(String(av).replace(/[$,]/g, ''));
        const bn = parseFloat(String(bv).replace(/[$,]/g, ''));
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [rawRows, search, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Sheet stats */}
      {stat && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            ['Rows',       stat.count.toLocaleString()],
            ['Total Spend','$' + Math.round(stat.totalSpend).toLocaleString()],
            ['Avg Price',  '$' + Math.round(stat.avgPrice).toLocaleString()],
            ['Min Price',  '$' + Math.round(stat.minPrice).toLocaleString()],
            ['Max Price',  '$' + Math.round(stat.maxPrice).toLocaleString()],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--card)', border: `1px solid var(--border)`, borderTop: `2px solid ${meta.color}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--mono)' }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder={`Search ${label}…`}
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = meta.color}
            onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
          />
        </div>
        {hasImageCol && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setView('gallery')} title="Image preview"
              style={{ display: 'flex', alignItems: 'center', padding: '6px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'gallery' ? 'var(--card)' : 'transparent', color: view === 'gallery' ? meta.color : 'var(--text3)', boxShadow: view === 'gallery' ? 'var(--shadow-sm)' : 'none' }}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setView('table')} title="Sheet view"
              style={{ display: 'flex', alignItems: 'center', padding: '6px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'table' ? 'var(--card)' : 'transparent', color: view === 'table' ? meta.color : 'var(--text3)', boxShadow: view === 'table' ? 'var(--shadow-sm)' : 'none' }}>
              <List size={14} />
            </button>
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
          {filtered.length.toLocaleString()} rows
        </div>
      </div>

      {view === 'gallery' && hasImageCol ? (
        <GalleryGrid rows={paged} columns={columns} meta={meta} />
      ) : (
      /* Table */
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto', maxHeight: '62vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} onClick={() => handleSort(col)}
                    style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: sortCol === col ? meta.color : 'var(--text3)', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, zIndex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col}
                      {sortCol === col
                        ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                        : <ChevronUp size={10} style={{ opacity: 0.15 }} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {columns.map(col => {
                    const val = row[col] ?? '';
                    const isUrl = String(val).startsWith('http');
                    const isImage = isUrl && /image/i.test(col);
                    const isMoney = /price|cost|total|spend|fee|amount/i.test(col) && !isNaN(parseFloat(String(val).replace(/[$,]/g, '')));
                    const num = isMoney ? parseFloat(String(val).replace(/[$,]/g, '')) : null;
                    return (
                      <td key={col} style={{ padding: isImage ? '6px 12px' : '8px 12px', color: isMoney ? 'var(--green)' : 'var(--text2)', fontFamily: 'var(--mono)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isMoney ? 600 : 400 }}>
                        {isImage
                          ? <a href={val} target="_blank" rel="noreferrer">
                              <img src={val} alt="" style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                            </a>
                          : isUrl
                          ? <a href={val} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              Open <ExternalLink size={10} />
                            </a>
                          : isMoney && num
                          ? '$' + num.toLocaleString()
                          : <span title={String(val)}>{String(val)}</span>
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                    No results for "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Pagination — shared by table and gallery views */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg2)' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            Page {page + 1} of {totalPages} · {filtered.length.toLocaleString()} rows
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['«', ()=>setPage(0)], ['‹', ()=>setPage(p=>p-1)], ['›', ()=>setPage(p=>p+1)], ['»', ()=>setPage(totalPages-1)]].map(([lbl, fn], idx) => {
              const disabled = idx < 2 ? page === 0 : page >= totalPages - 1;
              return (
                <button key={lbl} onClick={fn} disabled={disabled}
                  style={{ padding: '4px 11px', border: '1px solid var(--border2)', borderRadius: 6, background: 'transparent', color: disabled ? 'var(--text3)' : 'var(--text)', cursor: disabled ? 'default' : 'pointer', fontSize: 13, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; }}}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = disabled ? 'var(--text3)' : 'var(--text)'; }}
                >{lbl}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Gallery view — image-first cards, generic across any sheet that has an
// "Image" column (currently OpenLane; works automatically for future sources
// that add one, same idea as BacklotsOpportunities' gallery).
function pickCol(columns, patterns, exclude) {
  for (const p of patterns) {
    const found = columns.find(c => c !== exclude && p.test(c));
    if (found) return found;
  }
  return null;
}

function galleryCard(row, columns) {
  const imageCol = columns.find(c => /image/i.test(c) && String(row[c] || '').startsWith('http'));
  const linkCol  = pickCol(columns, [/detail/i, /invoice/i, /url/i], imageCol)
                    || columns.find(c => c !== imageCol && String(row[c] || '').startsWith('http'));
  const titleCol = pickCol(columns, [/^vehicle$/i, /vehicle|model/i]);
  const vinCol    = pickCol(columns, [/^vin$/i, /vin/i]);
  const dateCol   = pickCol(columns, [/purchase date|sale date|invoice date/i, /date/i]);
  const priceCol  = pickCol(columns, [/balance due|pre-tax total/i, /price|cost|total/i]);
  const sellerCol = pickCol(columns, [/seller company/i, /seller|location/i]);

  return {
    image:  imageCol ? row[imageCol]  : '',
    link:   linkCol  ? row[linkCol]   : '',
    title:  titleCol ? row[titleCol]  : '',
    vin:    vinCol   ? row[vinCol]    : '',
    date:   dateCol  ? row[dateCol]   : '',
    price:  priceCol ? row[priceCol]  : '',
    seller: sellerCol ? row[sellerCol] : '',
  };
}

function GalleryGrid({ rows, columns, meta }) {
  if (rows.length === 0) {
    return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>No results</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
      {rows.map((row, i) => {
        const c = galleryCard(row, columns);
        const priceNum = parseFloat(String(c.price).replace(/[$,]/g, ''));
        return (
          <div key={(c.vin || i) + '-' + i}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: `2px solid ${meta.color}`, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ width: '100%', height: 150, background: 'var(--bg3)', position: 'relative' }}>
              {c.image
                ? <img src={c.image} alt={c.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><ImageOff size={28} /></div>
              }
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title || '—'}</div>
              {c.vin && <div style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{c.vin}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>{c.date || ''}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>
                  {!isNaN(priceNum) && c.price ? '$' + priceNum.toLocaleString() : ''}
                </span>
              </div>
              {c.seller && (
                <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.seller}>{c.seller}</div>
              )}
              {c.link && (
                <a href={c.link} target="_blank" rel="noreferrer"
                  style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: meta.color, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  View <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
