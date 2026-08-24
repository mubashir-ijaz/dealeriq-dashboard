// src/utils/sheets.js
// FREE method — no API key needed.
// Works for any Google Sheet set to "Anyone with link → Viewer"

const SHEETS = [
  {
    id:    '1A-rUUn-aTEJqUOJ-CvjK71IdAxQCrpgouRf7XWRNlSk',
    tab:   'Edge',
    label: 'Edge Pipeline',
    source:'edge',
  },
  {
    id:    '1flfLQ1VEFDxjN6yPkn5XvQWvU7UkFEgh_qkxxbtOZ5M',
    tab:   'CarMax',
    label: 'CarMax',
    source:'carmax',
  },
  {
    id:    '1Ci-1wF5eNfcanAAhdarHhSC2YMNJF4rBYeveNXfnXzw',
    tab:   'OpenLane',
    label: 'OpenLane',
    source:'openlane',
  },
  {
    id:    '1u0qNoXuGAJYi5lqEE1HSY2saknapvqckR_9p51eiynM',
    tab:   'adesa_purchases',
    label: 'ADESA',
    source:'adesa',
  },
  {
    // Moved to its own spreadsheet 2026-08-11 — no longer shares the CarMax
    // spreadsheet, just a tab name coincidence with it before.
    id:    '1IYS5CHmGyWX9Ag2QeYSmKgCZ-V-vk23GH3YFcgAaBoA',
    tab:   'ValueMyVehicle',
    label: 'Value My Vehicle',
    source:'valuemyvehicle',
  },
];

// "Profit" tab (Manheim sold cars matched back to their buy record by VIN,
// with profit computed) — published by carmax sale/dealeriq/manheim_profit.py
// into a "Profit" tab inside the CarMax spreadsheet (same ID as above — the
// service account has no Drive storage of its own to create a separate
// spreadsheet, so it reuses one it's already an Editor on). Not part of
// SHEETS above since it's a different row shape (one row per sold+matched
// car, not a purchase record) — fetched separately by ProfitPage.js via
// fetchProfitSheet() below.
const PROFIT_SHEET_ID  = '1flfLQ1VEFDxjN6yPkn5XvQWvU7UkFEgh_qkxxbtOZ5M';
const PROFIT_SHEET_TAB = 'Profit';

// Parse Google's gviz JSON wrapper
function parseGviz(raw) {
  const match = raw.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error('Cannot parse Google Sheets response');
  return JSON.parse(match[1]);
}

// Google's gviz wraps date/datetime cells as v:"Date(2025,11,9)" (JS-style,
// zero-indexed month, unparseable by `new Date()`) but always ships a clean
// human-readable string in f (e.g. "2025-12-09"). Prefer f for those columns
// so dates never render as "Date(...)" or fail to parse downstream.
function cellValue(cell, colType) {
  if (cell == null) return '';
  if ((colType === 'date' || colType === 'datetime') && cell.f) return cell.f;
  return cell.v ?? cell.f ?? '';
}

// Fetch one sheet tab → array of row objects
async function fetchSheet({ id, tab }) {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching sheet`);
  const raw  = await res.text();
  const data = parseGviz(raw);

  if (data.status === 'error') {
    const msg = data.errors?.[0]?.detailed_message || 'Sheet error';
    throw new Error(msg);
  }

  const table    = data.table || {};
  const cols     = (table.cols || []).map(c => c.label || c.id || '');
  const colTypes = (table.cols || []).map(c => c.type || '');
  const rawRows  = table.rows || [];

  return rawRows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      obj[col] = cellValue(row.c?.[i], colTypes[i]);
    });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));
}

// Fetch all sheets in parallel
export async function fetchAllSheets() {
  const results = await Promise.all(
    SHEETS.map(async sheet => {
      const rows = await fetchSheet(sheet);
      return { ...sheet, rows };
    })
  );
  return results;
}

// Fetch the Profit sheet (see PROFIT_SHEET_ID above). Returns [] before an
// ID has been pasted in, or if manheim_profit.py hasn't been run yet /
// the sheet can't be reached — callers show an empty state rather than
// treating this as a fatal load error like the main SHEETS.
export async function fetchProfitSheet() {
  if (!PROFIT_SHEET_ID) return [];
  try {
    return await fetchSheet({ id: PROFIT_SHEET_ID, tab: PROFIT_SHEET_TAB });
  } catch (e) {
    console.warn('[sheets] Profit sheet fetch failed:', e.message);
    return [];
  }
}

export { SHEETS, PROFIT_SHEET_ID };
