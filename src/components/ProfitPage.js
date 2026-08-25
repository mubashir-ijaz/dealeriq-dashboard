// src/components/ProfitPage.js
// Profit analysis — Manheim sold cars matched back to their buy record by
// VIN (see carmax sale/dealeriq/manheim_profit.py). Answers the questions
// that actually matter for buying decisions:
//   1. Which cars/periods were most profitable? (sortable table + trend)
//   2. Which BUYING PLATFORM (CarMax, Edge, OpenLane, ADESA, VMV) is most
//      profitable?
//   3. Which BUYING auction LOCATION gives the cheapest cars with the best
//      profit?
//   ...filterable by platform, location, and sale date so you can drill in.
import React, { useState, useEffect, useMemo } from 'react';
import { fetchProfitSheet, PROFIT_SHEET_ID } from '../utils/sheets';
import { parseDate, SOURCE_META } from '../utils/schema';
import { DATE_FILTERS, getDateCutoff } from '../utils/dateFilter';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, MapPin, Search, ArrowUpDown,
  ArrowUp, ArrowDown, AlertTriangle, Trophy, Filter, X, Building2,
  ChevronDown, ChevronRight, ChevronsLeft, ChevronLeft, ChevronsRight,
  Clock, TriangleAlert, Sparkles,
} from 'lucide-react';

const fmt   = n => '$' + Math.round(n || 0).toLocaleString();
const fmtN  = n => (n || 0).toLocaleString();
const GREEN = '#10b981';
const RED   = '#ef4444';
// Literal colors, not CSS var() strings — recharts' SVG attributes render
// reliably with plain values; matches the pattern already proven out in
// ChartsPage.js.
const GRID  = '#e6e8f0';
const AXIS  = { fill: '#5b5f6d', fontSize: 11 };
const GRAY  = '#94a3b8';

// Buy_Source values (written by manheim_profit.py) match SOURCE_META's
// `label` exactly ("CarMax", "Edge Pipeline", ...) — build a reverse lookup
// so platform bars/badges use the same colors as the rest of the dashboard.
const LABEL_TO_META = Object.fromEntries(Object.values(SOURCE_META).map(m => [m.label, m]));
const metaFor = label => LABEL_TO_META[label] || { color: GRAY, bg: '#94a3b822', border: '#94a3b855' };

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

const MIN_LOCATION_OPTIONS = [1, 2, 3, 5, 10];

export default function ProfitPage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('profit');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage]       = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [unmatchedSearch, setUnmatchedSearch] = useState('');
  const [unmatchedPage, setUnmatchedPage] = useState(0);

  // Filters
  const [sourceFilter, setSourceFilter]     = useState(new Set()); // empty = all
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilterId, setDateFilterId]     = useState('all');
  const [minLocationCars, setMinLocationCars] = useState(2);
  const [expandedLocations, setExpandedLocations] = useState(new Set());
  const [expandedPlatforms, setExpandedPlatforms] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProfitSheet().then(r => { if (!cancelled) { setRows(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const parsed = useMemo(() => rows.map(r => ({
    vin:        r.VIN || '',
    year:       r.Year || '',
    make:       r.Make || '',
    model:      r.Model || '',
    vehicle:    [r.Year, r.Make, r.Model].filter(Boolean).join(' '),
    mileage:    num(r.Mileage),
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
    matchType:  r.Match_Type || '',
    isFuzzy:    (r.Match_Type || '').startsWith('Fuzzy'),
    matched:    r.Matched === 'Yes',
  })), [rows]);

  const matched   = useMemo(() => parsed.filter(r => r.matched && r.profit !== null), [parsed]);
  const unmatched = useMemo(() => parsed.filter(r => !r.matched), [parsed]);

  const availableSources = useMemo(() =>
    [...new Set(matched.map(r => r.buySource).filter(Boolean))].sort(), [matched]);

  const availableLocations = useMemo(() => {
    const counts = {};
    matched.forEach(r => { counts[r.buyLocation] = (counts[r.buyLocation] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [matched]);

  // Apply platform / location / date filters — everything below (KPIs,
  // charts, table) reacts to this one filtered set.
  const filtered = useMemo(() => {
    const cutoff = getDateCutoff(dateFilterId);
    return matched.filter(r => {
      if (sourceFilter.size > 0 && !sourceFilter.has(r.buySource)) return false;
      if (locationFilter !== 'all' && r.buyLocation !== locationFilter) return false;
      if (cutoff) {
        const d = parseDate(r.saleDate);
        if (!d || d < cutoff) return false;
      }
      return true;
    });
  }, [matched, sourceFilter, locationFilter, dateFilterId]);

  const activeFilterCount =
    (sourceFilter.size > 0 ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0) + (dateFilterId !== 'all' ? 1 : 0);

  const kpi = useMemo(() => {
    const totalProfit = filtered.reduce((s, r) => s + r.profit, 0);
    const avgProfit    = filtered.length ? totalProfit / filtered.length : 0;
    const winners       = filtered.filter(r => r.profit > 0).length;
    const losers         = filtered.filter(r => r.profit < 0).length;
    return { totalProfit, avgProfit, winners, losers, count: filtered.length };
  }, [filtered]);

  // Profit by month
  const byMonth = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
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
  }, [filtered]);

  // Profit by buying platform (CarMax / Edge / OpenLane / ADESA / VMV) —
  // the dimension you actually buy through, distinct from physical location.
  const byPlatform = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
      const src = r.buySource || 'Unknown';
      if (!m[src]) m[src] = { source: src, profit: 0, count: 0, cost: 0 };
      m[src].profit += r.profit;
      m[src].count += 1;
      m[src].cost += r.buyCost || 0;
    });
    return Object.values(m)
      .map(x => ({ ...x, avgProfit: x.profit / x.count, avgCost: x.cost / x.count, color: metaFor(x.source).color }))
      .sort((a, b) => b.avgProfit - a.avgProfit);
  }, [filtered]);

  // Profit by buying location — single-car locations are excluded from the
  // ranked chart by default (minLocationCars) since one lucky/unlucky car
  // isn't a meaningful "this location is good" signal; the table below can
  // still show every location at minLocationCars=1.
  const byLocationAll = useMemo(() => {
    const m = {};
    filtered.forEach(r => {
      const loc = r.buyLocation || 'Unknown';
      if (!m[loc]) m[loc] = { location: loc, profit: 0, count: 0, cost: 0 };
      m[loc].profit += r.profit;
      m[loc].count += 1;
      m[loc].cost += r.buyCost || 0;
    });
    return Object.values(m)
      .map(x => ({ ...x, avgProfit: x.profit / x.count, avgCost: x.cost / x.count }))
      .sort((a, b) => b.avgProfit - a.avgProfit);
  }, [filtered]);
  const byLocation = useMemo(() =>
    byLocationAll.filter(x => x.count >= minLocationCars), [byLocationAll, minLocationCars]);
  const byLocationChart = useMemo(() => byLocation.slice(0, 8), [byLocation]);
  const excludedLocationCount = byLocationAll.length - byLocation.length;

  const tableFiltered = useMemo(() => {
    let list = search
      ? filtered.filter(r => r.vin.toLowerCase().includes(search.toLowerCase()) || r.vehicle.toLowerCase().includes(search.toLowerCase()))
      : filtered;
    list = [...list].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
      av = av ?? -Infinity; bv = bv ?? -Infinity;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, search, sortKey, sortDir]);

  // Reset to page 0 whenever the underlying result set changes shape —
  // otherwise a narrower filter/search can leave `page` pointing past the
  // end of the new (shorter) list.
  useEffect(() => { setPage(0); }, [filtered, search, sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(tableFiltered.length / pageSize));
  const pagedTable  = tableFiltered.slice(page * pageSize, (page + 1) * pageSize);

  // Losing cars — sold below buy cost, worst loss first. Days Held called
  // out explicitly since a car that lost money AND sat a long time is the
  // clearest "stop buying/holding like this" signal.
  const losingCars = useMemo(() =>
    [...filtered].filter(r => r.profit < 0).sort((a, b) => a.profit - b.profit), [filtered]);
  const LOSING_CAP = 100;

  // Unmatched — Manheim-sold cars with no buy record anywhere. Its own
  // section (not just a warning banner) with what we DO know (year/make/
  // model/mileage/sale info) so they're checkable by hand.
  const unmatchedFiltered = useMemo(() => {
    let list = unmatchedSearch
      ? unmatched.filter(r => r.vin.toLowerCase().includes(unmatchedSearch.toLowerCase()) || r.vehicle.toLowerCase().includes(unmatchedSearch.toLowerCase()))
      : unmatched;
    return [...list].sort((a, b) => (parseDate(b.saleDate)?.getTime() || 0) - (parseDate(a.saleDate)?.getTime() || 0));
  }, [unmatched, unmatchedSearch]);
  useEffect(() => { setUnmatchedPage(0); }, [unmatchedSearch]);
  const UNMATCHED_PAGE_SIZE = 50;
  const unmatchedTotalPages = Math.max(1, Math.ceil(unmatchedFiltered.length / UNMATCHED_PAGE_SIZE));
  const pagedUnmatched = unmatchedFiltered.slice(unmatchedPage * UNMATCHED_PAGE_SIZE, (unmatchedPage + 1) * UNMATCHED_PAGE_SIZE);

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const SortIcon = ({ k }) => sortKey !== k
    ? <ArrowUpDown size={11} style={{ opacity: 0.5 }} />
    : (sortDir === 'asc' ? <ArrowUp size={11} color="var(--accent)" /> : <ArrowDown size={11} color="var(--accent)" />);

  const toggleSourceFilter = src => {
    setSourceFilter(prev => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src); else next.add(src);
      return next;
    });
  };
  const clearFilters = () => { setSourceFilter(new Set()); setLocationFilter('all'); setDateFilterId('all'); };

  const toggleLocationExpand = loc => setExpandedLocations(prev => {
    const next = new Set(prev);
    if (next.has(loc)) next.delete(loc); else next.add(loc);
    return next;
  });
  const togglePlatformExpand = src => setExpandedPlatforms(prev => {
    const next = new Set(prev);
    if (next.has(src)) next.delete(src); else next.add(src);
    return next;
  });
  // Cars behind one expanded location/platform row — pulled from `filtered`
  // (so it respects the top filter bar too), highest profit first, capped
  // so one huge platform (thousands of cars) can't blow up the page.
  const carsForLocation = loc => filtered.filter(r => r.buyLocation === loc).sort((a, b) => b.profit - a.profit);
  const carsForPlatform = src => filtered.filter(r => r.buySource === src).sort((a, b) => b.profit - a.profit);
  const EXPAND_CAP = 100;

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
          from <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 5 }}>carmax sale/dealeriq/</code>, then
          set <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 5 }}>PROFIT_SHEET_ID</code> in <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 5 }}>src/utils/sheets.js</code>.
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

      {/* Filter bar */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={13} color="var(--text3)" />
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)' }}>Filter</span>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <X size={12} /> Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          {/* Buying platform pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginRight: 2 }}>Platform:</span>
            {availableSources.map(src => {
              const meta = metaFor(src);
              const active = sourceFilter.has(src);
              return (
                <button key={src} onClick={() => toggleSourceFilter(src)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20,
                    border: `1px solid ${active ? meta.color : 'var(--border2)'}`,
                    background: active ? `${meta.color}20` : 'transparent',
                    color: active ? meta.color : 'var(--text2)',
                    fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                  {src}
                </button>
              );
            })}
          </div>

          {/* Location dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={12} color="var(--text3)" />
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 12, outline: 'none', maxWidth: 220 }}>
              <option value="all">All Locations</option>
              {availableLocations.map(([loc, count]) => (
                <option key={loc} value={loc}>{loc} ({count})</option>
              ))}
            </select>
          </div>

          {/* Date presets */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
            {DATE_FILTERS.map(f => (
              <button key={f.id} onClick={() => setDateFilterId(f.id)}
                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: dateFilterId === f.id ? 'var(--accent)' : 'transparent', color: dateFilterId === f.id ? '#fff' : 'var(--text2)', fontSize: 11.5, fontWeight: dateFilterId === f.id ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        <KPI label="Total Profit"     value={fmt(kpi.totalProfit)} accent={kpi.totalProfit >= 0 ? GREEN : RED} icon={<DollarSign size={16} color={kpi.totalProfit >= 0 ? GREEN : RED} />} />
        <KPI label="Avg Profit / Car" value={fmt(kpi.avgProfit)}   accent={kpi.avgProfit >= 0 ? GREEN : RED}   icon={<TrendingUp size={16} color="#3b82f6" />} />
        <KPI label="Winners"          value={fmtN(kpi.winners)}    accent={GREEN} icon={<TrendingUp size={16} color={GREEN} />} sub="Sold above buy cost" />
        <KPI label="Losers"           value={fmtN(kpi.losers)}     accent={RED}   icon={<TrendingDown size={16} color={RED} />} sub="Sold below buy cost" />
        <KPI label="Cars (filtered)"  value={fmtN(kpi.count)}      accent="#8b5cf6" icon={<Trophy size={16} color="#8b5cf6" />} sub={`of ${matched.length} matched total`} />
      </div>

      {unmatched.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: 'var(--text2)' }}>
          <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span><strong style={{ color: '#f59e0b' }}>{unmatched.length}</strong> Manheim-sold car{unmatched.length === 1 ? '' : 's'} couldn't be matched to a buy record — not counted above. See "Couldn't Match" near the bottom of this page for the full list.</span>
        </div>
      )}

      {/* Profit by date + Profit by buying platform */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Profit by Month" subtitle="Total profit and cars sold per month">
          {byMonth.length === 0 ? <Empty text="No dated sales in this filter" /> : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={byMonth} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} />
                <YAxis tick={AXIS} tickFormatter={v => '$' + Math.round(v / 1000) + 'k'} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e6e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [fmt(v), 'Total Profit']}
                  labelFormatter={l => `Month: ${l}`}
                />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {byMonth.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? GREEN : RED} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Profit by Buying Platform" subtitle="Avg profit per car through each buying platform">
          {byPlatform.length === 0 ? <Empty text="No data in this filter" /> : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={byPlatform} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="source" tick={{ ...AXIS, fontSize: 10.5 }} interval={0} angle={-12} textAnchor="end" height={44} />
                <YAxis tick={AXIS} tickFormatter={v => '$' + Math.round(v / 1000) + 'k'} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e6e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name, p) => [fmt(v), `Avg Profit (${p.payload.count} cars, avg buy ${fmt(p.payload.avgCost)})`]}
                />
                <Bar dataKey="avgProfit" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  {byPlatform.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="avgProfit" position="top" formatter={v => fmt(v)} style={{ fontSize: 11, fontWeight: 700, fill: '#12131a' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Buying platform breakdown table — right below the charts, since
          this is the highest-value at-a-glance number: which platform to
          keep buying from. */}
      <Card title="Buying Platform Breakdown" subtitle="CarMax / Edge / OpenLane / ADESA / Value My Vehicle, side by side. Click a row to see the individual cars.">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                <Th></Th>
                <Th>Platform</Th>
                <Th align="right">Cars</Th>
                <Th align="right">Avg Buy Cost</Th>
                <Th align="right">Avg Profit</Th>
                <Th align="right">Total Profit</Th>
              </tr>
            </thead>
            <tbody>
              {byPlatform.map(p => {
                const open = expandedPlatforms.has(p.source);
                return (
                  <React.Fragment key={p.source}>
                    <tr onClick={() => togglePlatformExpand(p.source)}
                      style={{ borderBottom: open ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '8px 4px', width: 20 }}>
                        {open ? <ChevronDown size={13} color="var(--text3)" /> : <ChevronRight size={13} color="var(--text3)" />}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Building2 size={12} color={p.color} />
                        <span style={{ color: p.color }}>{p.source}</span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{p.count}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(p.avgCost)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: p.avgProfit >= 0 ? GREEN : RED }}>{fmt(p.avgProfit)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: p.profit >= 0 ? GREEN : RED }}>{fmt(p.profit)}</td>
                    </tr>
                    {open && (
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={6} style={{ padding: '0 10px 12px 34px', background: 'var(--bg3)' }}>
                          <CarsSubTable cars={carsForPlatform(p.source)} cap={EXPAND_CAP} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profit by buying location */}
      <Card
        title="Profit by Buying Location"
        subtitle="Avg profit per car at each auction/lot you buy from — where the cheap-but-profitable cars come from"
        headerExtra={
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text3)' }}>
            Min cars/location:
            <select value={minLocationCars} onChange={e => setMinLocationCars(Number(e.target.value))}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 11.5, outline: 'none' }}>
              {MIN_LOCATION_OPTIONS.map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </label>
        }
      >
        {byLocationChart.length === 0 ? <Empty text="No location has enough cars at this threshold — lower Min cars/location above" /> : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byLocationChart} layout="vertical" margin={{ top: 4, right: 46, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis type="number" tick={AXIS} tickFormatter={v => '$' + Math.round(v / 1000) + 'k'} />
              <YAxis dataKey="location" type="category" tick={{ ...AXIS, fontSize: 10 }} width={130} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e6e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name, p) => [fmt(v), `Avg Profit (${p.payload.count} cars, avg buy ${fmt(p.payload.avgCost)})`]}
              />
              <Bar dataKey="avgProfit" radius={[0, 5, 5, 0]} isAnimationActive={false}>
                {byLocationChart.map((d, i) => <Cell key={i} fill={d.avgProfit >= 0 ? GREEN : RED} />)}
                <LabelList dataKey="avgProfit" position="right" formatter={v => fmt(v)} style={{ fontSize: 11, fontWeight: 700, fill: '#5b5f6d' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {excludedLocationCount > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
            {excludedLocationCount} location{excludedLocationCount === 1 ? '' : 's'} with fewer than {minLocationCars} car{minLocationCars === 1 ? '' : 's'} hidden from ranking (still counted in totals above) — see full table below.
          </p>
        )}
      </Card>

      {/* Location breakdown table — every location, unfiltered by the min-cars threshold */}
      <Card title="Buying Location Breakdown — All Locations" subtitle="Sorted by avg profit; low-count locations included so nothing's hidden. Click a row to see the individual cars.">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                <Th></Th>
                <Th>Location</Th>
                <Th align="right">Cars</Th>
                <Th align="right">Avg Buy Cost</Th>
                <Th align="right">Avg Profit</Th>
                <Th align="right">Total Profit</Th>
              </tr>
            </thead>
            <tbody>
              {byLocationAll.map(l => {
                const open = expandedLocations.has(l.location);
                return (
                  <React.Fragment key={l.location}>
                    <tr onClick={() => toggleLocationExpand(l.location)}
                      style={{ borderBottom: open ? 'none' : '1px solid var(--border)', opacity: l.count < minLocationCars ? 0.55 : 1, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '8px 4px', width: 20 }}>
                        {open ? <ChevronDown size={13} color="var(--text3)" /> : <ChevronRight size={13} color="var(--text3)" />}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={12} color="var(--text3)" />{l.location}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{l.count}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(l.avgCost)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: l.avgProfit >= 0 ? GREEN : RED }}>{fmt(l.avgProfit)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: l.profit >= 0 ? GREEN : RED }}>{fmt(l.profit)}</td>
                    </tr>
                    {open && (
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={6} style={{ padding: '0 10px 12px 34px', background: 'var(--bg3)' }}>
                          <CarsSubTable cars={carsForLocation(l.location)} cap={EXPAND_CAP} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Losing cars — worst loss first, Days Held called out since a car
          that lost money AND sat a long time is the clearest problem signal. */}
      <Card
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><TriangleAlert size={15} color={RED} />Losing Cars</span>}
        subtitle={`${losingCars.length.toLocaleString()} car${losingCars.length === 1 ? '' : 's'} sold below buy cost — worst loss first, with how long each sat before selling`}
      >
        {losingCars.length === 0 ? <Empty text="No losing cars in this filter — nice." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                  <Th>Vehicle</Th>
                  <Th>VIN</Th>
                  <Th>Platform</Th>
                  <Th align="right">Buy Cost</Th>
                  <Th align="right">Sale Price</Th>
                  <Th align="right">Loss</Th>
                  <Th align="right">Days Held</Th>
                </tr>
              </thead>
              <tbody>
                {losingCars.slice(0, LOSING_CAP).map(r => {
                  const meta = metaFor(r.buySource);
                  const heldLong = r.daysHeld !== null && r.daysHeld >= 90;
                  return (
                    <tr key={r.vin} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.vehicle || '—'}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{r.vin}</td>
                      <td style={{ padding: '8px 10px', color: meta.color, fontWeight: 600 }}>{r.buySource}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.buyCost)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.salePrice)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, color: RED }}>{fmt(r.profit)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontWeight: heldLong ? 800 : 400, color: heldLong ? '#f59e0b' : 'var(--text2)' }}>
                          {heldLong && <Clock size={11} />}
                          {r.daysHeld ?? '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {losingCars.length > LOSING_CAP && (
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
                Showing worst {LOSING_CAP} of {losingCars.length} by loss size — narrow with the filter bar above to see the rest.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Most / least profitable cars — sortable, searchable, paginated */}
      <Card title="All Matched Cars" subtitle="Sort by any column — default is highest profit first. The ✦ icon marks a fuzzy (year/make/model/mileage) match — hover for details.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', maxWidth: 320, flex: 1, minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search VIN or vehicle…"
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
            {tableFiltered.length.toLocaleString()} cars
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                <SortTh k="vehicle" label="Vehicle" onClick={toggleSort} sortKey={sortKey}><SortIcon k="vehicle" /></SortTh>
                <SortTh k="vin" label="VIN" onClick={toggleSort} sortKey={sortKey}><SortIcon k="vin" /></SortTh>
                <SortTh k="buySource" label="Platform" onClick={toggleSort} sortKey={sortKey}><SortIcon k="buySource" /></SortTh>
                <SortTh k="buyLocation" label="Buy Location" onClick={toggleSort} sortKey={sortKey}><SortIcon k="buyLocation" /></SortTh>
                <SortTh k="buyCost" label="Buy Cost" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="buyCost" /></SortTh>
                <SortTh k="salePrice" label="Sale Price" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="salePrice" /></SortTh>
                <SortTh k="profit" label="Profit" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="profit" /></SortTh>
                <SortTh k="daysHeld" label="Days Held" align="right" onClick={toggleSort} sortKey={sortKey}><SortIcon k="daysHeld" /></SortTh>
                <SortTh k="saleDate" label="Sale Date" onClick={toggleSort} sortKey={sortKey}><SortIcon k="saleDate" /></SortTh>
              </tr>
            </thead>
            <tbody>
              {pagedTable.map(r => {
                const meta = metaFor(r.buySource);
                return (
                  <tr key={r.vin} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.vehicle || '—'}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {r.vin}
                        {r.isFuzzy && <Sparkles size={11} color="#8b5cf6" title={r.matchType} />}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: meta.color, fontWeight: 600 }}>{r.buySource}</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text2)' }}>{r.buyLocation}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.buyCost)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.salePrice)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, color: r.profit >= 0 ? GREEN : RED }}>{fmt(r.profit)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r.daysHeld ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text2)', fontSize: 11 }}>{r.saleDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tableFiltered.length === 0 && <Empty text="No cars match the current filters" />}
        </div>
        {tableFiltered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              Showing <strong style={{ color: 'var(--text2)' }}>{(page * pageSize + 1).toLocaleString()}–{Math.min((page + 1) * pageSize, tableFiltered.length).toLocaleString()}</strong> of <strong style={{ color: 'var(--text2)' }}>{tableFiltered.length.toLocaleString()}</strong>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text3)' }}>
                Rows/page:
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                  style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 11.5, outline: 'none' }}>
                  {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <PageBtn onClick={() => setPage(0)} disabled={page === 0}><ChevronsLeft size={14} /></PageBtn>
                <PageBtn onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft size={14} /></PageBtn>
                <span style={{ fontSize: 12, color: 'var(--text2)', margin: '0 8px', fontFamily: 'var(--mono)', minWidth: 70, textAlign: 'center' }}>
                  {page + 1} / {totalPages}
                </span>
                <PageBtn onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight size={14} /></PageBtn>
                <PageBtn onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}><ChevronsRight size={14} /></PageBtn>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Unmatched — its own clearly separated section, not just a banner,
          with what we DO know so these can be checked by hand. */}
      <Card
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><AlertTriangle size={15} color="#f59e0b" />Couldn't Match ({unmatched.length.toLocaleString()})</span>}
        subtitle="Manheim-sold cars with no buy record in any of the 5 sources, even after fuzzy year/make/model/mileage matching. Usually the buy happened before that source's sheet started, or it was bought outside the 5 tracked platforms."
      >
        <div style={{ position: 'relative', marginBottom: 12, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input value={unmatchedSearch} onChange={e => setUnmatchedSearch(e.target.value)} placeholder="Search VIN or vehicle…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        {unmatchedFiltered.length === 0 ? <Empty text="No unmatched cars — everything reconciled." /> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, opacity: 0.85 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                    <Th>Vehicle</Th>
                    <Th>VIN</Th>
                    <Th align="right">Mileage</Th>
                    <Th>Sale Date</Th>
                    <Th align="right">Sale Price</Th>
                    <Th>Title Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUnmatched.map(r => (
                    <tr key={r.vin} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.vehicle || '—'}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{r.vin}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{r.mileage ? r.mileage.toLocaleString() : '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text2)', fontSize: 11 }}>{r.saleDate}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{r.salePrice ? fmt(r.salePrice) : '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text2)' }}>{r.titleStatus || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unmatchedTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 }}>
                <PageBtn onClick={() => setUnmatchedPage(p => p - 1)} disabled={unmatchedPage === 0}><ChevronLeft size={14} /></PageBtn>
                <span style={{ fontSize: 12, color: 'var(--text2)', margin: '0 8px', fontFamily: 'var(--mono)' }}>
                  {unmatchedPage + 1} / {unmatchedTotalPages}
                </span>
                <PageBtn onClick={() => setUnmatchedPage(p => p + 1)} disabled={unmatchedPage >= unmatchedTotalPages - 1}><ChevronRight size={14} /></PageBtn>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// The drill-down shown when a Location/Platform breakdown row is expanded —
// exactly "source, buy price, sold price, profit" per car, one clean table.
function CarsSubTable({ cars, cap }) {
  if (!cars.length) return <p style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 0' }}>No cars in the current filter.</p>;
  const shown = cars.slice(0, cap);
  return (
    <div style={{ paddingTop: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ padding: '5px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>Vehicle</th>
            <th style={{ padding: '5px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>VIN</th>
            <th style={{ padding: '5px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>Source</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>Buy Price</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>Sold Price</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)' }}>Profit</th>
          </tr>
        </thead>
        <tbody>
          {shown.map(r => {
            const meta = metaFor(r.buySource);
            return (
              <tr key={r.vin} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.vehicle || '—'}</td>
                <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r.vin}</td>
                <td style={{ padding: '6px 8px', color: meta.color, fontWeight: 600 }}>{r.buySource}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.buyCost)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(r.salePrice)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, color: r.profit >= 0 ? GREEN : RED }}>{fmt(r.profit)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {cars.length > cap && (
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
          Showing top {cap} of {cars.length} by profit — narrow with the filter bar above to see the rest.
        </p>
      )}
    </div>
  );
}
function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border2)',
        background: 'var(--bg2)', color: disabled ? 'var(--text3)' : 'var(--text2)',
        fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}>
      {children}
    </button>
  );
}
function Empty({ text }) {
  return <p style={{ color: 'var(--text3)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>{text}</p>;
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
function Card({ title, subtitle, headerExtra, children }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 13, padding: 18, boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: subtitle ? 3 : 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', textAlign: 'left' }}>{title}</h3>
        {headerExtra}
      </div>
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
