// src/components/ProfitPage.js
// Profit analysis — Manheim sold cars matched back to their buy record by
// VIN (see carmax sale/dealeriq/manheim_profit.py). Answers the two
// questions that actually matter for buying decisions:
//   1. Which cars/periods were most profitable? (sortable table + trend)
//   2. Which BUYING auction location gives the cheapest cars with the best
//      profit? (bar chart, avg profit + avg buy cost per location)
import React, { useState, useEffect, useMemo } from 'react';
import { fetchProfitSheet, PROFIT_SHEET_ID } from '../utils/sheets';
import { parseDate } from '../utils/schema';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, MapPin, Search, ArrowUpDown,
  ArrowUp, ArrowDown, AlertTriangle, Trophy,
} from 'lucide-react';

const fmt   = n => '$' + Math.round(n || 0).toLocaleString();
const fmtN  = n => (n || 0).toLocaleString();
const GREEN = '#10b981';
const RED   = '#ef4444';
const GRID  = 'var(--border)';
const AXIS  = { fill: 'var(--text2)', fontSize: 11 };

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function ProfitPage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('profit');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProfitSheet().then(r => { if (!cancelled) { setRows(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const parsed = useMemo(() => rows.map(r => ({
    vin:        r.VIN || '',
    vehicle:    [r.Year, r.Make, r.Model].filter(Boolean).join(' '),
    buySource:  r.Buy_Source || '',
    buyDate:    r.Buy_Date || '',
    buyLocation: r.Buy_Location || '—',
    buyCost:    num(r.Buy_Cost),
    saleDate:   r.Sale_Date || '',
    salePrice:  num(r.Sale_Price),
    profit:     num(r.Profit),
    profitPct:  num(r.Profit_Pct),
    daysHeld:   num(r.Days_Held),
    titleStatus: r.Title_Status || '',
    matched:    r.Matched === 'Yes',
  })), [rows]);

  const matched   = useMemo(() => parsed.filter(r => r.matched && r.profit !== null), [parsed]);
  const unmatched = useMemo(() => parsed.filter(r => !r.matched), [parsed]);

  const kpi = useMemo(() => {
    const totalProfit = matched.reduce((s, r) => s + r.profit, 0);
    const avgProfit    = matched.length ? totalProfit / matched.length : 0;
    const winners       = matched.filter(r => r.profit > 0).length;
    const losers         = matched.filter(r => r.profit < 0).length;
    return { totalProfit, avgProfit, winners, losers, sold: parsed.length, matchedCount: matched.length };
  }, [matched, parsed]);

  // Profit by month
  const byMonth = useMemo(() => {
    const m = {};
    matched.forEach(r => {
      const d = parseDate(r.saleDate);
      if (!d) return;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!m[k]) m[k] = { month: k, profit: 0, count: 0 };
      m[k].profit += r.profit;
      m[k].count += 1;
    });
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(x => ({ ...x, label: x.month.slice(5) + '/' + x.month.slice(2, 4), avg: x.profit / x.count }));
  }, [matched]);

  // Profit by buying location — the "which auction gives cheap + profitable
  // cars" view. Sorted by avg profit descending so the best locations lead.
  const byLocation = useMemo(() => {
    const m = {};
    matched.forEach(r => {
      const loc = r.buyLocation || 'Unknown';
      if (!m[loc]) m[loc] = { location: loc, profit: 0, count: 0, cost: 0 };
      m[loc].profit += r.profit;
      m[loc].count += 1;
      m[loc].cost += r.buyCost || 0;
    });
    return Object.values(m)
      .map(x => ({ ...x, avgProfit: x.profit / x.count, avgCost: x.cost / x.count }))
      .filter(x => x.count >= 1)
      .sort((a, b) => b.avgProfit - a.avgProfit);
  }, [matched]);

  const filtered = useMemo(() => {
    let list = search
      ? matched.filter(r => r.vin.toLowerCase().includes(search.toLowerCase()) || r.vehicle.toLowerCase().includes(search.toLowerCase()))
      : matched;
    list = [...list].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
      av = av ?? -Infinity; bv = bv ?? -Infinity;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [matched, search, sortKey, sortDir]);

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const SortIcon = ({ k }) => sortKey !== k
    ? <ArrowUpDown size={11} style={{ opacity: 0.5 }} />
    : (sortDir === 'asc' ? <ArrowUp size={11} color="var(--accent)" /> : <ArrowDown size={11} color="var(--accent)" />);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text2)' }}>Loading profit data…</div>;
  }

  if (!PROFIT_SHEET_ID) {
    return (
      <div style={{ textAlign: 'left', padding: '40px 20px', color: 'var(--text2)', maxWidth: 640 }}>
        <DollarSign size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Profit page isn't wired up yet</p>
        <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
          Run <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 5 }}>python manheim_profit.py</code> once
          from <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 5 }}>carmax sale/dealeriq/</code> — it
          matches every Manheim-sold car back to its buy record by VIN, computes profit, and publishes to a "Profit" tab inside
          the CarMax Google Sheet. Then set <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 5 }}>PROFIT_SHEET_ID</code> in <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 5 }}>src/utils/sheets.js</code>
          and this page goes live.
        </p>
      </div>
    );
  }

  if (!parsed.length) {
    return (
      <div style={{ textAlign: 'left', padding: '40px 20px', color: 'var(--text2)' }}>
        <DollarSign size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
        <p style={{ fontSize: 15, fontWeight: 700 }}>No profit data yet</p>
        <p style={{ fontSize: 13, marginTop: 6 }}>Run manheim_profit.py after your next Manheim CSV export.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left' }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        <KPI label="Total Profit"     value={fmt(kpi.totalProfit)} accent={kpi.totalProfit >= 0 ? GREEN : RED} icon={<DollarSign size={16} color={kpi.totalProfit >= 0 ? GREEN : RED} />} />
        <KPI label="Avg Profit / Car" value={fmt(kpi.avgProfit)}   accent={kpi.avgProfit >= 0 ? GREEN : RED}   icon={<TrendingUp size={16} color="#3b82f6" />} />
        <KPI label="Winners"          value={fmtN(kpi.winners)}    accent={GREEN} icon={<TrendingUp size={16} color={GREEN} />} sub="Sold above buy cost" />
        <KPI label="Losers"           value={fmtN(kpi.losers)}     accent={RED}   icon={<TrendingDown size={16} color={RED} />} sub="Sold below buy cost" />
        <KPI label="Cars Sold"        value={fmtN(kpi.sold)}       accent="#8b5cf6" icon={<Trophy size={16} color="#8b5cf6" />} sub={`${kpi.matchedCount} matched to a buy`} />
      </div>

      {unmatched.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: 'var(--text2)' }}>
          <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span><strong style={{ color: '#f59e0b' }}>{unmatched.length}</strong> Manheim-sold car{unmatched.length === 1 ? '' : 's'} couldn't be matched to a buy record in any source — profit not computed for {unmatched.length === 1 ? 'it' : 'them'}. Usually means the buy happened before that source's sheet started, or the VIN was mistyped on export.</span>
        </div>
      )}

      {/* Profit by date + Profit by location */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Profit by Month" subtitle="Total profit and cars sold per month — check this against your buy volume that month">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} />
              <YAxis tick={AXIS} tickFormatter={v => '$' + Math.round(v / 1000) + 'k'} />
              <Tooltip
                contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => name === 'profit' ? [fmt(v), 'Total Profit'] : [v, name]}
                labelFormatter={l => `Month: ${l}`}
              />
              <ReferenceLine y={0} stroke="var(--text3)" />
              <Bar dataKey="profit" name="profit" radius={[4, 4, 0, 0]}>
                {byMonth.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? GREEN : RED} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Profit by Buying Location" subtitle="Avg profit per car at each auction you buy from — where the cheap-but-profitable cars are coming from">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byLocation.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 24, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis type="number" tick={AXIS} tickFormatter={v => '$' + Math.round(v / 1000) + 'k'} />
              <YAxis dataKey="location" type="category" tick={{ ...AXIS, fontSize: 10 }} width={110} />
              <Tooltip
                contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name, p) => [fmt(v), `Avg Profit (${p.payload.count} cars, avg buy ${fmt(p.payload.avgCost)})`]}
              />
              <ReferenceLine x={0} stroke="var(--text3)" />
              <Bar dataKey="avgProfit" radius={[0, 4, 4, 0]}>
                {byLocation.slice(0, 8).map((d, i) => <Cell key={i} fill={d.avgProfit >= 0 ? GREEN : RED} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Location breakdown table — the actual "cheap + profitable" answer */}
      <Card title="Buying Location Breakdown" subtitle="Sorted by avg profit — best locations to buy from, first">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                <Th>Location</Th>
                <Th align="right">Cars</Th>
                <Th align="right">Avg Buy Cost</Th>
                <Th align="right">Avg Profit</Th>
                <Th align="right">Total Profit</Th>
              </tr>
            </thead>
            <tbody>
              {byLocation.map(l => (
                <tr key={l.location} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={12} color="var(--text3)" />{l.location}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{l.count}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(l.avgCost)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: l.avgProfit >= 0 ? GREEN : RED }}>{fmt(l.avgProfit)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: l.profit >= 0 ? GREEN : RED }}>{fmt(l.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Most / least profitable cars — sortable, searchable */}
      <Card title="All Matched Cars" subtitle="Sort by any column — default is highest profit first">
        <div style={{ position: 'relative', marginBottom: 12, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search VIN or vehicle…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                <SortTh k="vehicle" label="Vehicle" onClick={toggleSort} sortKey={sortKey}><SortIcon k="vehicle" /></SortTh>
                <SortTh k="vin" label="VIN" onClick={toggleSort} sortKey={sortKey}><SortIcon k="vin" /></SortTh>
                <SortTh k="buySource" label="Buy Source" onClick={toggleSort} sortKey={sortKey}><SortIcon k="buySource" /></SortTh>
                <SortTh k="buyLocation" label="Buy Location" onClick={toggleSort} sortKey={sortKey}><SortIcon k="buyLocation" /></SortTh>
                <SortTh k="buyCost" label="Buy Cost" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="buyCost" /></SortTh>
                <SortTh k="salePrice" label="Sale Price" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="salePrice" /></SortTh>
                <SortTh k="profit" label="Profit" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="profit" /></SortTh>
                <SortTh k="daysHeld" label="Days Held" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="daysHeld" /></SortTh>
                <SortTh k="saleDate" label="Sale Date" onClick={toggleSort} sortKey={sortKey}><SortIcon k="saleDate" /></SortTh>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.vin} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.vehicle || '—'}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{r.vin}</td>
                  <td style={{ padding: '8px 10px' }}>{r.buySource}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text2)' }}>{r.buyLocation}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.buyCost)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.salePrice)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, color: r.profit >= 0 ? GREEN : RED }}>{fmt(r.profit)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r.daysHeld ?? '—'}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text2)', fontSize: 11 }}>{r.saleDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KPI({ label, value, sub, icon, accent }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${accent}`, boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text2)' }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.5px', color: accent }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
function Card({ title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 13, padding: 18, boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: subtitle ? 3 : 14, textAlign: 'left' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 14, textAlign: 'left' }}>{subtitle}</p>}
      {children}
    </div>
  );
}
function Th({ children, align = 'left' }) {
  return <th style={{ padding: '8px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text2)', textAlign: align }}>{children}</th>;
}
function SortTh({ k, label, align = 'left', onClick, children }) {
  return (
    <th onClick={() => onClick(k)} style={{ padding: '8px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text2)', textAlign: align, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{label}{children}</span>
    </th>
  );
}
