// src/components/SheetView.js
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { Search, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';

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

  // Use raw column headers for display
  const columns = rawRows.length ? Object.keys(rawRows[0]) : [];

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
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
          {filtered.length.toLocaleString()} rows
        </div>
      </div>

      {/* Table */}
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
                    const isMoney = /price|cost|total|spend|fee|amount/i.test(col) && !isNaN(parseFloat(String(val).replace(/[$,]/g, '')));
                    const num = isMoney ? parseFloat(String(val).replace(/[$,]/g, '')) : null;
                    return (
                      <td key={col} style={{ padding: '8px 12px', color: isMoney ? 'var(--green)' : 'var(--text2)', fontFamily: 'var(--mono)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isMoney ? 600 : 400 }}>
                        {isUrl
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
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
    </div>
  );
}
