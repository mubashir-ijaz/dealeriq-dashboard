// src/utils/dateFilter.js
/* eslint-disable no-unused-vars */

export const DATE_FILTERS = [
  { id: 'all',    label: 'All Time'    },
  { id: '7d',     label: 'Last 7 Days' },
  { id: '10d',    label: 'Last 10 Days'},
  { id: '30d',    label: 'Last 30 Days'},
  { id: '90d',    label: 'Last 90 Days'},
  { id: 'year',   label: 'This Year'   },
];

export function getDateCutoff(filterId) {
  const now = new Date();
  switch (filterId) {
    case '7d':   return new Date(now - 7  * 86400000);
    case '10d':  return new Date(now - 10 * 86400000);
    case '30d':  return new Date(now - 30 * 86400000);
    case '90d':  return new Date(now - 90 * 86400000);
    case 'year': return new Date(now.getFullYear(), 0, 1);
    default:     return null; // all time
  }
}

// Parse any date string to Date object
export function parseAnyDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  // Google's Date(yyyy,m,d) format
  const gm = s.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (gm) return new Date(Number(gm[1]), Number(gm[2]), Number(gm[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Filter normalized rows by date cutoff
export function filterByDate(rows, cutoff) {
  if (!cutoff) return rows;
  return rows.filter(r => {
    const d = parseAnyDate(r.date || r._rawDate);
    return d && d >= cutoff;
  });
}

// Apply date filter across entire normalized sheets map
export function applyDateFilter(normalized, filterId) {
  const cutoff = getDateCutoff(filterId);
  if (!cutoff) return normalized;
  const result = {};
  Object.entries(normalized).forEach(([label, rows]) => {
    result[label] = filterByDate(rows, cutoff);
  });
  return result;
}
