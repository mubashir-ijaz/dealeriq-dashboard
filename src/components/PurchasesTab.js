// src/components/PurchasesTab.js
// Generic "browse one source's purchases" page — filter by title status
// (Available / Unavailable / Unknown / …) and by car age, switch between
// table/gallery view, click a car for full details, and export to Excel.
// Parameterized by sheetLabel/source/itemLabel so CarMax and Value My
// Vehicle (both title-tracked CarMax-schema sources) can share one
// implementation instead of two near-identical copies.
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META, parseDate, formatAge } from '../utils/schema';
import { filterByAge } from '../utils/ageFilter';
import { exportRowsToExcel } from '../utils/exportExcel';
import CarDetailModal from './CarDetailModal';
import AgeFilter from './AgeFilter';
import { Search, ChevronUp, ChevronDown, ImageOff, Download, LayoutGrid, List, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

const PAGE_SIZE = 50;

const STATUS_COLOR = { Available: '#10b981', Unavailable: '#ef4444', Unknown: '#f59e0b' };
function statusColor(v) { return STATUS_COLOR[v] || 'var(--text3)'; }
function statusIcon(v) {
  if (v === 'Available') return <CheckCircle size={12} />;
  if (v === 'Unavailable') return <AlertTriangle size={12} />;
  return <HelpCircle size={12} />;
}

const EXPORT_COLUMNS = [
  { key: 'vin',         header: 'VIN' },
  { key: 'year',        header: 'Year' },
  { key: 'make',        header: 'Make' },
  { key: 'model',       header: 'Model' },
  { key: 'color',       header: 'Color' },
  { key: 'miles',       header: 'Miles' },
  { key: 'date',        header: 'Sale Date' },
  { key: 'ageDays',     header: 'Age (Days)' },
  { key: 'price',       header: 'Price' },
  { key: 'totalCost',   header: 'Total Cost' },
  { key: 'seller',      header: 'Location' },
  { key: 'buyer',       header: 'Purchaser' },
  { key: 'titleStatus', header: 'Title Status' },
  { key: 'stockNo',     header: 'Stock #' },
];

const TABLE_COLUMNS = [
  ['vin', 'VIN'], ['year', 'Year'], ['make', 'Make'], ['model', 'Model'],
  ['color', 'Color'], ['miles', 'Miles'], ['date', 'Date'], ['age', 'Age'], ['seller', 'Location'],
  ['totalCost', 'Total Cost'], ['titleStatus', 'Title Status'],
];

const DETAIL_FIELDS = [
  ['vin', 'VIN'], ['year', 'Year'], ['make', 'Make'], ['model', 'Model'], ['color', 'Color'],
  ['miles', 'Miles'], ['date', 'Sale Date'], ['age', 'Age'], ['totalCost', 'Total Cost'], ['price', 'Selling Price'],
  ['buyFee', 'Buyers Fee'], ['adminFee', 'Admin Fee'], ['seller', 'Location'], ['buyer', 'Purchaser'],
  ['payType', 'Pay Type'], ['titleStatus', 'Title Status'], ['stockNo', 'Stock #'], ['announcements', 'Announcements'],
];

export default function PurchasesTab({ sheetLabel, source, itemLabel }) {
  const { normalized } = useData();
  const meta = SOURCE_META[source];
  const rows = useMemo(() => normalized[sheetLabel] || [], [normalized, sheetLabel]);

  const [statusFilter, setStatusFilter] = useState('Unavailable');
  const [ageFilter, setAgeFilter] = useState('all');
  const [search,  setSearch]  = useState('');
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page,    setPage]    = useState(0);
  const [view,    setView]    = useState('table'); // table | gallery
  const [modalIndex, setModalIndex] = useState(null);

  // Distinct title-status values present, with counts (Available/Unavailable/
  // Unknown first, then anything else the sheet happens to contain)
  const statusTabs = useMemo(() => {
    const counts = {};
    rows.forEach(r => {
      const v = r.titleStatus && r.titleStatus !== '—' ? r.titleStatus : 'Unknown';
      counts[v] = (counts[v] || 0) + 1;
    });
    const priority = ['Available', 'Unavailable', 'Unknown'];
    const keys = [...priority.filter(k => counts[k]), ...Object.keys(counts).filter(k => !priority.includes(k))];
    return keys.map(k => ({ value: k, count: counts[k] }));
  }, [rows]);

  const filtered = useMemo(() => {
    let out = statusFilter === 'all'
      ? rows
      : rows.filter(r => (r.titleStatus && r.titleStatus !== '—' ? r.titleStatus : 'Unknown') === statusFilter);
    out = filterByAge(out, ageFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r => Object.values(r).some(v => v != null && String(v).toLowerCase().includes(q)));
    }
    if (sortCol) {
      const isDate = sortCol === 'date';
      out = [...out].sort((a, b) => {
        const av = a[sortCol] ?? '';
        const bv = b[sortCol] ?? '';
        let cmp;
        if (isDate) {
          const ad = parseDate(av), bd = parseDate(bv);
          cmp = (ad ? ad.getTime() : 0) - (bd ? bd.getTime() : 0);
        } else {
          const an = parseFloat(String(av).replace(/[$,]/g, ''));
          const bn = parseFloat(String(bv).replace(/[$,]/g, ''));
          cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, statusFilter, ageFilter, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const handleExport = () => {
    const prefix = itemLabel.replace(/\s+/g, '_');
    const filename = statusFilter === 'all' ? `${prefix}_Cars` : `${prefix}_${statusFilter.replace(/\s+/g, '_')}_Cars`;
    exportRowsToExcel(filtered, EXPORT_COLUMNS, filename);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid var(--text3)', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{rows.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total {itemLabel} Vehicles</div>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid #dc2626', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{rows.filter(r => r.titleStatus === 'Unavailable').length}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>⚠ Title Issue (Unavailable)</div>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid #059669', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{rows.filter(r => r.titleStatus === 'Available').length}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>✅ Title Available</div>
        </div>
      </div>

      {/* Title status tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <StatusTab active={statusFilter === 'all'} color="var(--text)" label="All" count={rows.length}
          onClick={() => { setStatusFilter('all'); setPage(0); }} />
        {statusTabs.map(({ value, count }) => (
          <StatusTab key={value} active={statusFilter === value} color={statusColor(value)} icon={statusIcon(value)}
            label={value} count={count} onClick={() => { setStatusFilter(value); setPage(0); }} />
        ))}
      </div>

      {/* Age filter — how long a car has been sitting since it was bought */}
      <AgeFilter value={ageFilter} onChange={id => { setAgeFilter(id); setPage(0); }} accentColor={meta.color} />

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder={`Search ${itemLabel}…`}
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = meta.color}
            onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
          />
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setView('gallery')} title="Gallery view"
            style={{ display: 'flex', alignItems: 'center', padding: '6px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'gallery' ? 'var(--card)' : 'transparent', color: view === 'gallery' ? meta.color : 'var(--text3)', boxShadow: view === 'gallery' ? 'var(--shadow-sm)' : 'none' }}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => setView('table')} title="Table view"
            style={{ display: 'flex', alignItems: 'center', padding: '6px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === 'table' ? 'var(--card)' : 'transparent', color: view === 'table' ? meta.color : 'var(--text3)', boxShadow: view === 'table' ? 'var(--shadow-sm)' : 'none' }}>
            <List size={14} />
          </button>
        </div>

        <button onClick={handleExport} disabled={filtered.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: 12.5, fontWeight: 700, cursor: filtered.length ? 'pointer' : 'default', opacity: filtered.length ? 1 : 0.5, whiteSpace: 'nowrap' }}>
          <Download size={13} /> Download Excel
        </button>

        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
          {filtered.length.toLocaleString()} rows
        </div>
      </div>

      {view === 'gallery' ? (
        <PurchasesGallery rows={paged} pageOffset={page * PAGE_SIZE} meta={meta} onOpen={setModalIndex} />
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto', maxHeight: '62vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text3)', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>Photo</th>
                  {TABLE_COLUMNS.map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)}
                      style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: sortCol === key ? meta.color : 'var(--text3)', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, zIndex: 1 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {label}
                        {sortCol === key
                          ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                          : <ChevronUp size={10} style={{ opacity: 0.15 }} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={(r.vin || i) + '-' + i}
                    onClick={() => setModalIndex(page * PAGE_SIZE + i)}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '6px 12px' }}>
                      {r.image
                        ? <img src={r.image} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                        : <div style={{ width: 60, height: 44, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={14} color="var(--text3)" /></div>
                      }
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.vin || '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)' }}>{r.year}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.make}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text2)' }}>{r.model}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text2)' }}>{r.color}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r.miles ? Number(r.miles).toLocaleString() : '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--text2)', fontSize: 11 }}>{r.date}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: r.ageDays >= 30 ? '#ef4444' : 'var(--text2)', fontWeight: r.ageDays >= 30 ? 700 : 400 }}>{formatAge(r.ageDays)}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.seller}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 600 }}>{r.totalCost ? '$' + Math.round(r.totalCost).toLocaleString() : '—'}</td>
                    <td style={{ padding: '8px 12px' }}><TitleBadge status={r.titleStatus} /></td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                      No results{search ? ` for "${search}"` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg2)' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            Page {page + 1} of {totalPages} · {filtered.length.toLocaleString()} rows
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['«', () => setPage(0)], ['‹', () => setPage(p => p - 1)], ['›', () => setPage(p => p + 1)], ['»', () => setPage(totalPages - 1)]].map(([lbl, fn], idx) => {
              const disabled = idx < 2 ? page === 0 : page >= totalPages - 1;
              return (
                <button key={lbl} onClick={fn} disabled={disabled}
                  style={{ padding: '4px 11px', border: '1px solid var(--border2)', borderRadius: 6, background: 'transparent', color: disabled ? 'var(--text3)' : 'var(--text)', cursor: disabled ? 'default' : 'pointer', fontSize: 13, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = disabled ? 'var(--text3)' : 'var(--text)'; }}
                >{lbl}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail popup — click a car (table row or gallery card) for full details + Prev/Next */}
      {modalIndex !== null && filtered[modalIndex] && (() => {
        const r = filtered[modalIndex];
        return (
          <CarDetailModal
            open
            onClose={() => setModalIndex(null)}
            onPrev={() => setModalIndex(i => Math.max(0, i - 1))}
            onNext={() => setModalIndex(i => Math.min(filtered.length - 1, i + 1))}
            hasPrev={modalIndex > 0}
            hasNext={modalIndex < filtered.length - 1}
            image={r.image}
            title={`${r.year || ''} ${r.make || ''} ${r.model || ''}`.trim() || `${itemLabel} vehicle`}
            subtitle={r.vin}
            badge={<TitleBadge status={r.titleStatus} />}
            fields={DETAIL_FIELDS.map(([key, label]) => [label, key === 'totalCost' || key === 'price' || key === 'buyFee' || key === 'adminFee'
              ? (r[key] ? '$' + Math.round(r[key]).toLocaleString() : '')
              : key === 'age' ? formatAge(r.ageDays)
              : (key === 'miles' ? (r[key] ? Number(r[key]).toLocaleString() : '') : r[key])])}
            accentColor={meta.color}
          />
        );
      })()}
    </div>
  );
}

function StatusTab({ active, color, icon, label, count, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, border: `1px solid ${active ? color : 'var(--border2)'}`, background: active ? `${color}18` : 'var(--bg2)', color: active ? color : 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
      {icon}{label}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.8 }}>{count}</span>
    </button>
  );
}

function TitleBadge({ status }) {
  const c = statusColor(status && status !== '—' ? status : 'Unknown');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${c}20`, border: `1px solid ${c}55`, color: c, fontSize: 11, fontWeight: 700 }}>
      {statusIcon(status)}
      {status && status !== '—' ? status : 'Unknown'}
    </span>
  );
}

function PurchasesGallery({ rows, meta, pageOffset = 0, onOpen }) {
  if (rows.length === 0) {
    return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>No results</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
      {rows.map((r, i) => {
        const isIssue = r.titleStatus === 'Unavailable';
        return (
          <div key={(r.vin || i) + '-' + i} onClick={() => onOpen && onOpen(pageOffset + i)}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: `2px solid ${isIssue ? '#ef4444' : meta.color}`, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
          >
            <div style={{ width: '100%', height: 150, background: 'var(--bg3)', position: 'relative' }}>
              {r.image
                ? <img src={r.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><ImageOff size={28} /></div>
              }
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <TitleBadge status={r.titleStatus} />
              </div>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${r.year} ${r.make} ${r.model}`}>
                {r.year} {r.make} {r.model || '—'}
              </div>
              {r.vin && <div style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{r.vin}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>{r.date || ''}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>
                  {r.totalCost ? '$' + Math.round(r.totalCost).toLocaleString() : ''}
                </span>
              </div>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: r.ageDays >= 30 ? '#ef4444' : 'var(--text3)', fontWeight: r.ageDays >= 30 ? 700 : 400 }}>
                Age: {formatAge(r.ageDays)}
              </div>
              {r.seller && (
                <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.seller}>{r.seller}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
