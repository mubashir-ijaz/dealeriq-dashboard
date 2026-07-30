// src/components/Activity.js
// Date-filtered view across all sources, grouped per-source.
// Uses the existing global dateFilter from context.
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { parseAnyDate } from '../utils/dateFilter';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Calendar, DollarSign, Car, TrendingUp, ChevronDown, ChevronUp,
  ArrowUpDown, ArrowUp, ArrowDown, ImageOff,
} from 'lucide-react';

const fmt   = n => '$' + Math.round(n||0).toLocaleString();
const fmtN  = n => (n||0).toLocaleString();
const fmtDate = d => {
  if (!d) return '';
  const dt = parseAnyDate(d);
  if (!dt) return String(d);
  return `${dt.getMonth()+1}/${dt.getDate()}/${dt.getFullYear()}`;
};

const PREVIEW_COUNT = 5; // cars shown when collapsed

export default function Activity() {
  const { sheets, normalized } = useData();

  // Top-level KPIs across all sources
  const allRows = useMemo(() => {
    const rows = [];
    Object.entries(normalized).forEach(([label, src]) => {
      (src || []).forEach(r => rows.push({ ...r, _label: label }));
    });
    return rows;
  }, [normalized]);

  const kpi = useMemo(() => {
    const count = allRows.length;
    const spend = allRows.reduce((s,r) => s + (Number(r.totalCost) || Number(r.price) || 0), 0);
    const avg   = count ? spend / count : 0;
    return { count, spend, avg };
  }, [allRows]);

  // Per-source bar chart data
  const bySource = useMemo(() => {
    return sheets.map(sheet => {
      const rows = normalized[sheet.label] || [];
      const spend = rows.reduce((s,r) => s + (Number(r.totalCost) || Number(r.price) || 0), 0);
      return {
        name: sheet.label,
        count: rows.length,
        spend,
        source: sheet.source,
        color: SOURCE_META[sheet.source]?.color || '#888',
      };
    });
  }, [sheets, normalized]);

  if (!allRows.length) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text2)' }}>
        <Calendar size={42} style={{ opacity: 0.4, marginBottom: 14 }} />
        <p style={{ fontSize: 15, fontWeight: 600 }}>No purchases in the selected period</p>
        <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text3)' }}>
          Try changing the date filter at the top right
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KPI label="Cars in Period"   value={fmtN(kpi.count)}            icon={<Car size={16} color="#e8720c" />}        accent="#e8720c" />
        <KPI label="Total Spent"      value={fmt(kpi.spend)}             icon={<DollarSign size={16} color="#10b981" />} accent="#10b981" />
        <KPI label="Avg per Vehicle"  value={fmt(kpi.avg)}               icon={<TrendingUp size={16} color="#3b82f6" />} accent="#3b82f6" />
        <KPI label="Active Sources"   value={fmtN(bySource.filter(s => s.count > 0).length)} icon={<Calendar size={16} color="#8b5cf6" />} accent="#8b5cf6" />
      </div>

      {/* Per-source bar chart */}
      <Card title="Vehicles by Source">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={bySource} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text2)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => fmtN(v)}
            />
            <Bar dataKey="count" name="Cars" radius={[4, 4, 0, 0]}>
              {bySource.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Per-source sections */}
      {sheets.map(sheet => (
        <SourceSection
          key={sheet.label}
          sheet={sheet}
          rows={normalized[sheet.label] || []}
        />
      ))}
    </div>
  );
}


// ─── Source Section ────────────────────────────────────────────────────
function SourceSection({ sheet, rows }) {
  const meta = SOURCE_META[sheet.source] || {};
  const [expanded, setExpanded] = useState(false);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Stats for this source
  const stats = useMemo(() => {
    const count = rows.length;
    const spend = rows.reduce((s,r) => s + (Number(r.totalCost) || Number(r.price) || 0), 0);
    const avg   = count ? spend / count : 0;
    const max   = rows.reduce((m,r) => Math.max(m, Number(r.totalCost) || Number(r.price) || 0), 0);
    return { count, spend, avg, max };
  }, [rows]);

  // Sort rows
  const sorted = useMemo(() => {
    const data = [...rows];
    data.sort((a,b) => {
      let av, bv;
      if (sortKey === 'date') {
        av = parseAnyDate(a.date)?.getTime() || 0;
        bv = parseAnyDate(b.date)?.getTime() || 0;
      } else if (sortKey === 'price') {
        av = Number(a.totalCost) || Number(a.price) || 0;
        bv = Number(b.totalCost) || Number(b.price) || 0;
      } else {
        av = String(a[sortKey] || '').toLowerCase();
        bv = String(b[sortKey] || '').toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [rows, sortKey, sortDir]);

  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT);
  const hasImages = rows.some(r => r.image);

  const toggleSort = key => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ArrowUpDown size={11} style={{ opacity: 0.5 }} />;
    return sortDir === 'asc'
      ? <ArrowUp size={11} color={meta.color} />
      : <ArrowDown size={11} color={meta.color} />;
  };

  if (rows.length === 0) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, borderTop: `3px solid ${meta.color}`, opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color }} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>{sheet.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>0 cars in period</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: `3px solid ${meta.color}`, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
          <span style={{ fontWeight: 800, fontSize: 15 }}>{sheet.label}</span>
          <span style={{
            fontSize: 11, color: meta.color,
            background: meta.bg, border: `1px solid ${meta.border}`,
            padding: '2px 10px', borderRadius: 20, fontWeight: 700, marginLeft: 'auto',
          }}>
            {stats.count} {stats.count === 1 ? 'vehicle' : 'vehicles'}
          </span>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Pill label="Total Spent" value={fmt(stats.spend)} accent={meta.color} />
          <Pill label="Avg Price"   value={fmt(stats.avg)}   accent={meta.color} />
          <Pill label="Max Price"   value={fmt(stats.max)}   accent={meta.color} />
          <Pill label="Cars"        value={fmtN(stats.count)} accent={meta.color} />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
              {hasImages && <Th>Photo</Th>}
              <Th onClick={() => toggleSort('date')}>Date <SortIcon k="date" /></Th>
              <Th onClick={() => toggleSort('vin')}>VIN <SortIcon k="vin" /></Th>
              <Th onClick={() => toggleSort('year')}>Year <SortIcon k="year" /></Th>
              <Th onClick={() => toggleSort('make')}>Make <SortIcon k="make" /></Th>
              <Th onClick={() => toggleSort('model')}>Model <SortIcon k="model" /></Th>
              <Th onClick={() => toggleSort('price')} align="right">Price <SortIcon k="price" /></Th>
              <Th onClick={() => toggleSort('status')}>Status <SortIcon k="status" /></Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={`${r.vin}-${i}`}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {hasImages && (
                  <Td>
                    {r.image
                      ? <img src={r.image} alt="" style={{ width:44, height:32, objectFit:'cover', borderRadius:5, display:'block' }} />
                      : <div style={{ width:44, height:32, borderRadius:5, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center' }}><ImageOff size={13} color="var(--text3)" /></div>
                    }
                  </Td>
                )}
                <Td>{fmtDate(r.date)}</Td>
                <Td mono>{r.vin}</Td>
                <Td>{r.year}</Td>
                <Td>{r.make}</Td>
                <Td>{r.model}</Td>
                <Td align="right" mono>{fmt(r.totalCost || r.price)}</Td>
                <Td>{r.status}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand/collapse footer */}
      {sorted.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%', padding: '10px 18px',
            background: 'var(--bg3)', border: 'none', borderTop: '1px solid var(--border)',
            color: meta.color, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg3)'}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} />
              Show only first {PREVIEW_COUNT}
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Show all {sorted.length} {sorted.length === 1 ? 'car' : 'cars'}
            </>
          )}
        </button>
      )}
    </div>
  );
}


// ─── Subcomponents ─────────────────────────────────────────────────────
function KPI({ label, value, icon, accent }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: `3px solid ${accent}`, borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function Pill({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 10px',
    }}>
      <div style={{
        fontSize: 9, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function Th({ children, onClick, align = 'left' }) {
  return (
    <th onClick={onClick}
      style={{
        padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.8px', color: 'var(--text2)', cursor: 'pointer', userSelect: 'none',
        textAlign: align, whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{children}</span>
    </th>
  );
}

function Td({ children, align = 'left', mono = false }) {
  return (
    <td style={{
      padding: '9px 12px', textAlign: align, fontFamily: mono ? 'var(--mono)' : 'inherit',
      whiteSpace: 'nowrap', color: 'var(--text)',
    }}>
      {children}
    </td>
  );
}
