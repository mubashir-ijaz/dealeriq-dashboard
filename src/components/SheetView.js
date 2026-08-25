// src/components/SheetView.js
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META, parseDate, daysSince, formatAge } from '../utils/schema';
import { filterByAge } from '../utils/ageFilter';
import { exportRowsToExcel } from '../utils/exportExcel';
import useSoldByVin from '../hooks/useSoldByVin';
import CarDetailModal from './CarDetailModal';
import AgeFilter from './AgeFilter';
import { Search, ChevronUp, ChevronDown, ExternalLink, LayoutGrid, List, ImageOff, Download, CheckCircle, AlertTriangle, HelpCircle, DollarSign, Clock3 } from 'lucide-react';

const PAGE_SIZE = 50;

// Which raw column holds title status, per source (only sources that track it)
const TITLE_RAW_COLUMN = { carmax: 'CM_Title', valuemyvehicle: 'CM_Title', adesa: 'Title' };

const STATUS_COLOR = {
  Available: '#10b981', Released: '#10b981', Received: '#3b82f6',
  Unavailable: '#ef4444', 'Not Received': '#ef4444',
  Unknown: '#f59e0b', Ineligible: '#f59e0b',
};
function statusColor(v) { return STATUS_COLOR[v] || 'var(--text3)'; }
function statusIcon(v) {
  if (v === 'Available' || v === 'Released' || v === 'Received') return <CheckCircle size={12} />;
  if (v === 'Unavailable' || v === 'Not Received') return <AlertTriangle size={12} />;
  return <HelpCircle size={12} />;
}

export default function SheetView({ label }) {
  const { sheets, stats } = useData();
  const sheet  = sheets.find(s => s.label === label);
  const stat   = stats.find(s => s.label === label);
  const meta   = SOURCE_META[sheet?.source] || {};
  const rawRows = useMemo(() => sheet?.rows || [], [sheet]);

  // Use raw column headers for display
  const columns = rawRows.length ? Object.keys(rawRows[0]) : [];
  const hasImageCol = columns.some(c => /image/i.test(c));
  const titleCol = TITLE_RAW_COLUMN[sheet?.source] && columns.includes(TITLE_RAW_COLUMN[sheet.source])
    ? TITLE_RAW_COLUMN[sheet.source] : null;
  const dateCol = findDateColumn(columns);
  const vinCol  = pickCol(columns, [/^vin$/i, /vin/i]);

  // Sold info (Manheim profit match), same as PurchasesTab/Activity — every
  // Data Source (Edge, CarMax, OpenLane, ADESA, Value My Vehicle) shows the
  // same Sold/Waiting-to-sell status here since they all go through this view.
  const soldByVin = useSoldByVin();

  // Attach a computed age-in-days (based on the detected date column) and
  // sold info (by VIN) to each row, so the Car Age filter/column and the
  // Sold badge work on every sheet without a source-specific schema mapping.
  const rows = useMemo(() => {
    return rawRows.map(r => {
      const withAge = dateCol ? { ...r, ageDays: daysSince(r[dateCol]) } : r;
      const vin = vinCol ? String(r[vinCol] || '').trim().toUpperCase() : '';
      const sold = vin ? soldByVin[vin] : null;
      return sold
        ? { ...withAge, sold: true, soldPrice: sold.salePrice, soldProfit: sold.profit, soldDaysHeld: sold.daysHeld, soldDate: sold.saleDate }
        : withAge;
    });
  }, [rawRows, dateCol, vinCol, soldByVin]);

  const [search,  setSearch]  = useState('');
  const [sortCol, setSortCol] = useState(() => dateCol);
  const [sortDir, setSortDir] = useState('desc');
  const [page,    setPage]    = useState(0);
  const [view,    setView]    = useState('table'); // table | gallery
  const [statusFilter, setStatusFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [modalIndex, setModalIndex] = useState(null);

  // Distinct title-status values present in this sheet, with counts — order:
  // Available/Released/Received first, then Unavailable/Not Received, then
  // Unknown, then anything else encountered.
  const statusTabs = useMemo(() => {
    if (!titleCol) return [];
    const counts = {};
    rows.forEach(r => {
      const v = String(r[titleCol] || '').trim() || 'Unknown';
      counts[v] = (counts[v] || 0) + 1;
    });
    const priority = ['Available', 'Released', 'Received', 'Unavailable', 'Not Received', 'Unknown'];
    const keys = [...priority.filter(k => counts[k]), ...Object.keys(counts).filter(k => !priority.includes(k))];
    return keys.map(k => ({ value: k, count: counts[k] }));
  }, [rows, titleCol]);

  const filtered = useMemo(() => {
    let out = rows;
    if (titleCol && statusFilter !== 'all') {
      out = out.filter(r => (String(r[titleCol] || '').trim() || 'Unknown') === statusFilter);
    }
    out = filterByAge(out, ageFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    }
    if (sortCol) {
      const isDate = sortCol === dateCol;
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
  }, [rows, titleCol, statusFilter, ageFilter, search, sortCol, sortDir, dateCol]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const handleExport = () => {
    const exportCols = columns.filter(c => !/image/i.test(c)).map(c => ({ key: c, header: c }));
    const name = `${label.replace(/\s+/g, '_')}${statusFilter !== 'all' ? '_' + statusFilter.replace(/\s+/g, '_') : ''}`;
    exportRowsToExcel(filtered, exportCols, name);
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

      {/* Title status tabs — Available / Unavailable / Unknown / … at the top */}
      {statusTabs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatusTab
            active={statusFilter === 'all'}
            color="var(--text)"
            label="All"
            count={rawRows.length}
            onClick={() => { setStatusFilter('all'); setPage(0); }}
          />
          {statusTabs.map(({ value, count }) => (
            <StatusTab
              key={value}
              active={statusFilter === value}
              color={statusColor(value)}
              icon={statusIcon(value)}
              label={value}
              count={count}
              onClick={() => { setStatusFilter(value); setPage(0); }}
            />
          ))}
        </div>
      )}

      {/* Age filter — how long a car has been sitting since its sale/purchase date */}
      {dateCol && <AgeFilter value={ageFilter} onChange={id => { setAgeFilter(id); setPage(0); }} accentColor={meta.color} />}

      {/* Search + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
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
        <button onClick={handleExport} disabled={filtered.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: 12.5, fontWeight: 700, cursor: filtered.length ? 'pointer' : 'default', opacity: filtered.length ? 1 : 0.5, whiteSpace: 'nowrap' }}>
          <Download size={13} /> Excel
        </button>
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
        <GalleryGrid rows={paged} pageOffset={page * PAGE_SIZE} columns={columns} meta={meta} source={sheet?.source} onOpen={setModalIndex} />
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
                {dateCol && (
                  <th onClick={() => handleSort('ageDays')}
                    style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: sortCol === 'ageDays' ? meta.color : 'var(--text3)', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, zIndex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Age
                      {sortCol === 'ageDays'
                        ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                        : <ChevronUp size={10} style={{ opacity: 0.15 }} />}
                    </span>
                  </th>
                )}
                {vinCol && (
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text3)', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 }}>
                    Sold (Manheim)
                  </th>
                )}
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
                  {dateCol && (
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: row.ageDays >= 30 ? '#ef4444' : 'var(--text2)', fontWeight: row.ageDays >= 30 ? 700 : 400, whiteSpace: 'nowrap' }}>
                      {formatAge(row.ageDays)}
                    </td>
                  )}
                  {vinCol && (
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row.sold ? (
                        <span title={`Sold ${row.soldDate} for $${Math.round(row.soldPrice).toLocaleString()}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: row.soldProfit >= 0 ? '#10b981' : '#ef4444' }}>
                          <DollarSign size={11} />{row.soldProfit >= 0 ? '+' : ''}{'$' + Math.round(row.soldProfit).toLocaleString()}
                          {row.soldDaysHeld !== null && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>· {row.soldDaysHeld}d</span>}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
                          <Clock3 size={10} /> Waiting to sell
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (dateCol ? 1 : 0) + (vinCol ? 1 : 0)} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)' }}>
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

      {/* Detail popup — click a gallery card to see full details + Prev/Next */}
      {modalIndex !== null && filtered[modalIndex] && (() => {
        const row  = filtered[modalIndex];
        const card = galleryCard(row, columns);
        return (
          <CarDetailModal
            open
            onClose={() => setModalIndex(null)}
            onPrev={() => setModalIndex(i => Math.max(0, i - 1))}
            onNext={() => setModalIndex(i => Math.min(filtered.length - 1, i + 1))}
            hasPrev={modalIndex > 0}
            hasNext={modalIndex < filtered.length - 1}
            image={card.image}
            title={card.title || label}
            subtitle={card.vin}
            badge={titleCol && row[titleCol] ? <StatusBadgeSmall status={row[titleCol]} /> : null}
            fields={[
              ...buildDetailFields(row, columns),
              ...(row.sold
                ? [['Sold at Manheim', row.soldDate], ['Sold Price', '$' + Math.round(row.soldPrice).toLocaleString()],
                   ['Profit', '$' + Math.round(row.soldProfit).toLocaleString()], ['Days Held', row.soldDaysHeld !== null ? `${row.soldDaysHeld}d` : '']]
                : [['Sold at Manheim', 'Waiting to sell']]),
            ]}
            link={card.link}
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

function StatusBadgeSmall({ status }) {
  const c = statusColor(status);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--bg2)', border: `1px solid ${c}`, color: c, fontSize: 11, fontWeight: 700 }}>
      {statusIcon(status)} {status}
    </span>
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

// Best-guess date column for default "newest first" sort — tries the common
// purchase/sale/invoice date names first, falls back to any column with
// "date" or "purchased" in its name.
function findDateColumn(columns) {
  return pickCol(columns, [/sale date|purchase date|invoice date/i, /date|purchased/i]);
}

// Build the [label, value]s shown in the detail popup — reuses the same
// money/url formatting as the table, skips the image column (shown big
// above) and URL columns (surfaced separately as the "Open Original" link).
function buildDetailFields(row, columns) {
  return columns
    .filter(c => !/image/i.test(c))
    .map(c => {
      const val = row[c] ?? '';
      if (String(val).startsWith('http')) return [c, null];
      const isMoney = /price|cost|total|spend|fee|amount/i.test(c) && !isNaN(parseFloat(String(val).replace(/[$,]/g, '')));
      const display = isMoney ? '$' + parseFloat(String(val).replace(/[$,]/g, '')).toLocaleString() : val;
      return [c, display];
    })
    .filter(([, v]) => v !== null && v !== '');
}

function galleryCard(row, columns) {
  const imageCol = columns.find(c => /image/i.test(c) && String(row[c] || '').startsWith('http'));
  const linkCol  = pickCol(columns, [/detail/i, /invoice/i, /url/i], imageCol)
                    || columns.find(c => c !== imageCol && String(row[c] || '').startsWith('http'));
  const vinCol    = pickCol(columns, [/^vin$/i, /vin/i]);
  const dateCol   = pickCol(columns, [/purchase date|sale date|invoice date/i, /date|purchased/i]);
  // Ordered MOST-SPECIFIC-first, one exact real-cost column name per source,
  // before any generic fallback. Confirmed live 2026-08-25: the old list
  // ended in a bare /price|cost|total/i, which matched "Buyer Charge Total"
  // (Edge's fee column, ~$700) before ever reaching "Total Cost" or "Price"
  // — since pickCol takes the first COLUMN-ORDER match for whichever
  // pattern is tried, and "Buyer Charge Total" sits earlier in the sheet
  // than either. That made Edge's gallery cards show the fee as if it were
  // the whole purchase price. No pattern below can match a fee/charge
  // column by accident.
  const priceCol  = pickCol(columns, [
    /balance due|pre-tax total/i,   // OpenLane
    /^total cost$/i,                 // Edge
    /^cm_total_cost$/i,              // CarMax / Value My Vehicle
    /^total$/i,                      // CarMax / Value My Vehicle
    /^total amount$/i,               // ADESA
    /^selling_price$/i,              // CarMax / Value My Vehicle fallback
    /^price$/i,                      // Edge fallback
    /price|cost/i,                   // last-resort generic (never matches a bare "...Total" fee column)
  ]);
  const sellerCol = pickCol(columns, [/seller company/i, /cm_location/i, /pickup location/i, /auction name/i, /seller|location/i]);

  // A full "Year Make Model" descriptive string, when the sheet has one
  // (CarMax's CM_Vehicle, OpenLane's Vehicle) — otherwise build it from
  // separate Year/Make/Model columns (Edge, ADESA).
  const vehicleCol = pickCol(columns, [/^vehicle$/i, /^cm_vehicle$/i]);
  const yearCol  = pickCol(columns, [/^year$/i]);
  const makeCol  = pickCol(columns, [/^make$/i]);
  const modelCol = pickCol(columns, [/^model$/i]);
  const title = (vehicleCol && row[vehicleCol])
    ? row[vehicleCol]
    : [yearCol && row[yearCol], makeCol && row[makeCol], modelCol && row[modelCol]].filter(Boolean).join(' ');

  return {
    image:  imageCol ? row[imageCol]  : '',
    link:   linkCol  ? row[linkCol]   : '',
    title,
    vin:    vinCol   ? row[vinCol]    : '',
    date:   dateCol  ? row[dateCol]   : '',
    price:  priceCol ? row[priceCol]  : '',
    seller: sellerCol ? row[sellerCol] : '',
  };
}

function GalleryGrid({ rows, columns, meta, source, pageOffset = 0, onOpen }) {
  const titleCol = TITLE_RAW_COLUMN[source] && columns.includes(TITLE_RAW_COLUMN[source]) ? TITLE_RAW_COLUMN[source] : null;
  if (rows.length === 0) {
    return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>No results</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
      {rows.map((row, i) => {
        const c = galleryCard(row, columns);
        const priceNum = parseFloat(String(c.price).replace(/[$,]/g, ''));
        const status = titleCol ? row[titleCol] : null;
        return (
          <div key={(c.vin || i) + '-' + i} onClick={() => onOpen && onOpen(pageOffset + i)}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: `2px solid ${meta.color}`, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', cursor: onOpen ? 'pointer' : 'default' }}
          >
            <div style={{ width: '100%', height: 150, background: 'var(--bg3)', position: 'relative' }}>
              {c.image
                ? <img src={c.image} alt={c.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><ImageOff size={28} /></div>
              }
              {status && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <StatusBadgeSmall status={status} />
                </div>
              )}
              {row.sold && (
                <div style={{ position: 'absolute', top: 8, left: 8, background: row.soldProfit >= 0 ? '#10b981' : '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 8 }}>
                  SOLD &middot; {row.soldProfit >= 0 ? '+' : ''}{'$' + Math.round(row.soldProfit).toLocaleString()}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title || '—'}</div>
              {c.vin && <div style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{c.vin}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>{c.date || ''}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }} title="Buy price">
                  {!isNaN(priceNum) && c.price ? '$' + priceNum.toLocaleString() : ''}
                </span>
              </div>
              {row.ageDays !== undefined && (
                <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: row.ageDays >= 30 ? '#ef4444' : 'var(--text3)', fontWeight: row.ageDays >= 30 ? 700 : 400 }}>
                  Age: {formatAge(row.ageDays)}
                </div>
              )}
              {row.sold ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontFamily: 'var(--mono)', color: row.soldProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                  <DollarSign size={10} /> Sold {row.soldDate} for {'$' + Math.round(row.soldPrice).toLocaleString()}
                  {row.soldDaysHeld !== null && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({row.soldDaysHeld}d held)</span>}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text3)' }}>
                  <Clock3 size={10} /> Waiting to sell
                </div>
              )}
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
