// src/utils/backlotsSheets.js
// Reads the backlots car-flipping pipeline's Google Sheet — a separate
// spreadsheet from the main DealerIQ purchase-ledger sheets, so this is
// kept fully self-contained (own fetch, own shape, doesn't touch
// sheets.js / schema.js / DataContext).
// Same free gviz technique: sheet must be "Anyone with link -> Viewer".

const SHEET_ID = '1S8ulo9ifGNOUryW1CAtroDiGHkjU3Ywo-oBLS6DZqPc';
const TABS = [
  { tab: 'Clean',        bucket: 'clean' },
  { tab: 'Minor Damage', bucket: 'minor' },
];

function parseGviz(raw) {
  const match = raw.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error('Cannot parse Google Sheets response');
  return JSON.parse(match[1]);
}

function cellValue(cell) {
  if (cell == null) return '';
  return cell.v ?? cell.f ?? '';
}

async function fetchTab({ tab, bucket }) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching "${tab}"`);
  const raw = await res.text();
  const data = parseGviz(raw);

  if (data.status === 'error') {
    const msg = data.errors?.[0]?.detailed_message || `Error reading "${tab}"`;
    throw new Error(msg);
  }

  const table = data.table || {};
  const cols  = (table.cols || []).map(c => c.label || c.id || '');
  const rows  = (table.rows || []).map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = cellValue(row.c?.[i]); });
    return obj;
  });

  return rows
    .filter(r => r.vin)
    .map(r => normalizeCar(r, bucket));
}

function toNum(v) {
  const n = parseFloat(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

function normalizeCar(r, bucket) {
  return {
    bucket,
    year:        r.year,
    title:       r.title || `${r.year || ''} Vehicle`.trim(),
    price:       toNum(r.price),
    mmr:         toNum(r.after_grade),
    mileage:     toNum(r.millage),
    vin:         r.vin,
    carfax:      r.car_fax,
    carfaxAccidents:   toNum(r.carfax_acc_number) || 0,
    autocheckAccidents: toNum(r.acc_autocheck_number) || 0,
    galves:      toNum(r['total galves']),
    jdPower:     toNum(r['total JD']),
    jdProfit:    toNum(r.jd_profit),
    profit:      toNum(r.profit),
    damageNotes: r.damage_notes,
    image:       r.image,
    url:         r.url,
  };
}

export async function fetchBacklotsCars() {
  const results = await Promise.all(TABS.map(fetchTab));
  return results.flat();
}
