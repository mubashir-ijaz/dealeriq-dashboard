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

function toDateMs(v) {
  if (!v) return null;
  const s = String(v).trim();
  const gm = s.match(/Date\((\d+),(\d+),(\d+)\)/); // Google's Date(yyyy,m,d) format
  if (gm) return new Date(Number(gm[1]), Number(gm[2]), Number(gm[3])).getTime();
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
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
    dateListed:  toDateMs(r.date_listed),
    image:       r.image,
    url:         r.url,
  };
}

export async function fetchBacklotsCars() {
  const results = await Promise.all(TABS.map(fetchTab));
  const all = results.flat();

  // The pipeline's own merges can occasionally leave the same VIN more
  // than once in a tab (or in both tabs) — collapse to one row per VIN
  // here so the dashboard never shows a car twice.
  const seen = new Map();
  for (const car of all) {
    const vin = String(car.vin || '').trim().toUpperCase();
    if (!vin) continue;
    const existing = seen.get(vin);
    // If a VIN somehow appears in both buckets, prefer the more
    // cautious "minor" classification over "clean".
    if (!existing || (existing.bucket === 'clean' && car.bucket === 'minor')) {
      seen.set(vin, car);
    }
  }
  return Array.from(seen.values());
}
