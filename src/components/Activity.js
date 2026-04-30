// src/components/Activity.js
// Date-filtered view across all sources. Uses the existing global dateFilter.
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { SOURCE_META } from '../utils/schema';
import { parseAnyDate } from '../utils/dateFilter';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar, DollarSign, Car, TrendingUp } from 'lucide-react';

const fmt   = n => '$' + Math.round(n||0).toLocaleString();
const fmtN  = n => (n||0).toLocaleString();
const fmtDate = d => {
  if (!d) return '';
  const dt = parseAnyDate(d);
  if (!dt) return String(d);
  return `${dt.getMonth()+1}/${dt.getDate()}/${dt.getFullYear()}`;
};

export default function Activity() {
  const { normalized, dateFilter } = useData();

  // Flatten all sources into one combined list
  const all = useMemo(() => {
    const rows = [];
    Object.entries(normalized).forEach(([label, src]) => {
      (src || []).forEach(r => rows.push({ ...r, _label: label }));
    });
    return rows;
  }, [normalized]);

  // KPIs
  const kpi = useMemo(() => {
    const count = all.length;
    const spend = all.reduce((s,r) => s + (Number(r.totalCost) || Number(r.price) || 0), 0);
    const avg   = count ? spend / count : 0;
    return { count, spend, avg };
  }, [all]);

  // Per-source breakdown (for bar chart)
  const bySource = useMemo(() => {
    const m = {};
    all.forEach(r => {
      const k = r._label;
      if (!m[k]) m[k] = { name: k, count: 0, spend: 0, source: r.source };
      m[k].count++;
      m[k].spend += Number(r.totalCost) || Number(r.price) || 0;
    });
    return Object.values(m).sort((a,b) => b.count - a.count);
  }, [all]);

  // Per-day timeline (for line chart) — only when date filter is short range
  const byDay = useMemo(() => {
    const m = {};
    all.forEach(r => {
      const d = parseAnyDate(r.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!m[key]) m[key] = { day: key, count: 0, spend: 0 };
      m[key].count++;
      m[key].spend += Number(r.totalCost) || Number(r.price) || 0;
    });
    return Object.values(m).sort((a,b) => a.day.localeCompare(b.day));
  }, [all]);

  // Table sorting
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const data = [...all];
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
  }, [all, sortKey, sortDir]);

  // Pagination — table can be huge
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  // Reset to page 0 when filter changes
  React.useEffect(() => { setPage(0); }, [dateFilter, sortKey, sortDir]);

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
      ? <ArrowUp size={11} color="var(--accent)" />
      : <ArrowDown size={11} color="var(--accent)" />;
  };

  if (!all.length) {
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
        <KPI label="Cars in Period"   value={fmtN(kpi.count)}  icon={<Car size={16} color="#e8720c" />}        accent="#e8720c" />
        <KPI label="Total Spent"      value={fmt(kpi.spend)}   icon={<DollarSign size={16} color="#10b981" />} accent="#10b981" />
        <KPI label="Avg per Vehicle"  value={fmt(kpi.avg)}     icon={<TrendingUp size={16} color="#3b82f6" />} accent="#3b82f6" />
        <KPI label="Active Sources"   value={fmtN(bySource.length)} icon={<Calendar size={16} color="#8b5cf6" />} accent="#8b5cf6" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card title="Vehicles by Source">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bySource} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text2)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => name === 'spend' ? [fmt(v), 'Spend'] : [fmtN(v), 'Cars']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="#e8720c" name="Cars" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Daily Purchases">
          {byDay.length === 0 ? (
            <Empty msg="No dated purchases in period" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byDay} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'var(--text2)' }}
                  tickFormatter={d => {
                    const parts = d.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="count" stroke="#e8720c" strokeWidth={2} dot={{ r: 3 }} name="Cars" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800 }}>All Purchases ({fmtN(sorted.length)})</h3>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                style={btnStyle(page === 0)}>
                ← Prev
              </button>
              <span style={{ color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}
                style={btnStyle(page === totalPages - 1)}>
                Next →
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                <Th onClick={() => toggleSort('date')}>Date <SortIcon k="date" /></Th>
                <Th onClick={() => toggleSort('_label')}>Source <SortIcon k="_label" /></Th>
                <Th onClick={() => toggleSort('vin')}>VIN <SortIcon k="vin" /></Th>
                <Th onClick={() => toggleSort('year')}>Year <SortIcon k="year" /></Th>
                <Th onClick={() => toggleSort('make')}>Make <SortIcon k="make" /></Th>
                <Th onClick={() => toggleSort('model')}>Model <SortIcon k="model" /></Th>
                <Th onClick={() => toggleSort('price')} align="right">Price <SortIcon k="price" /></Th>
                <Th onClick={() => toggleSort('status')}>Status <SortIcon k="status" /></Th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => {
                const meta = SOURCE_META[r.source] || {};
                return (
                  <tr key={`${r.vin}-${r._label}-${i}`}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Td>{fmtDate(r.date)}</Td>
                    <Td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
                        {r._label}
                      </span>
                    </Td>
                    <Td mono>{r.vin}</Td>
                    <Td>{r.year}</Td>
                    <Td>{r.make}</Td>
                    <Td>{r.model}</Td>
                    <Td align="right" mono>{fmt(r.totalCost || r.price)}</Td>
                    <Td>{r.status}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────
function KPI({ label, value, icon, accent }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: `3px solid ${accent}`, borderRadius: 12, padding: 16 }}>
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
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>
      {msg}
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

const btnStyle = disabled => ({
  padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border2)',
  background: 'transparent', color: disabled ? 'var(--text3)' : 'var(--text)',
  fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
