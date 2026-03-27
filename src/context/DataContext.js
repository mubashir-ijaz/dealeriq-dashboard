// src/context/DataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllSheets } from '../utils/sheets';
import { normalizeSheet, computeStats, crossMatchVINs, buildAISummary } from '../utils/schema';
import { applyDateFilter } from '../utils/dateFilter';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [raw, setRaw] = useState({
    sheets: [], normalized: {}, loading: true, error: null, lastRefresh: null,
  });
  const [dateFilter, setDateFilter] = useState('all');

  const load = useCallback(async () => {
    setRaw(s => ({ ...s, loading: true, error: null }));
    try {
      const sheets     = await fetchAllSheets();
      const normalized = {};
      sheets.forEach(sheet => {
        normalized[sheet.label] = normalizeSheet(sheet.rows, sheet.source);
      });
      setRaw({ sheets, normalized, loading: false, error: null, lastRefresh: new Date() });
    } catch (e) {
      setRaw(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const derived = useMemo(() => {
    if (raw.loading || raw.error || !raw.sheets.length) {
      return { filteredNorm: {}, stats: [], crossMatch: { vinMap:{}, matched:[] }, aiSummary: '' };
    }
    const filteredNorm = applyDateFilter(raw.normalized, dateFilter);
    const stats        = raw.sheets.map(s => computeStats(filteredNorm[s.label] || [], s.label, s.source));
    const crossMatch   = crossMatchVINs(filteredNorm);
    const aiSummary    = buildAISummary(stats, crossMatch, filteredNorm);
    return { filteredNorm, stats, crossMatch, aiSummary };
  }, [raw, dateFilter]);

  return (
    <DataContext.Provider value={{
      sheets:        raw.sheets,
      normalized:    derived.filteredNorm,
      allNormalized: raw.normalized,
      stats:         derived.stats,
      crossMatch:    derived.crossMatch,
      aiSummary:     derived.aiSummary,
      loading:       raw.loading,
      error:         raw.error,
      lastRefresh:   raw.lastRefresh,
      dateFilter,    setDateFilter,
      reload:        load,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
