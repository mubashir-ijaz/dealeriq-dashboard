// src/utils/sheets.js
// FREE method — no API key needed.
// Works for any Google Sheet set to "Anyone with link → Viewer"

const SHEETS = [
  {
    id:    '1hCTIZdOnAkOuooDTJOp3xovmReMw1c7T5k1qZRDvRPg',
    tab:   'edgepipeline_purchased_all',
    label: 'Edge Pipeline',
    source:'edge',
  },
  {
    id:    '1JyS0G3kx0HBI8Aila211qeNakzljAAxJ',
    tab:   'last year now carmax',
    label: 'CarMax',
    source:'carmax',
  },
  {
    id:    '16MKzKJyhPif6fHiPhcpYeQPCUQE8EAqk',
    tab:   'openlane_invoices_full',
    label: 'OpenLane',
    source:'openlane',
  },
  {
    id:    '1u0qNoXuGAJYi5lqEE1HSY2saknapvqckR_9p51eiynM',
    tab:   'adesa_purchases',
    label: 'ADESA',
    source:'adesa',
  },
];

// Parse Google's gviz JSON wrapper
function parseGviz(raw) {
  const match = raw.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error('Cannot parse Google Sheets response');
  return JSON.parse(match[1]);
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

  const table   = data.table || {};
  const cols    = (table.cols || []).map(c => c.label || c.id || '');
  const rawRows = table.rows || [];

  return rawRows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row.c?.[i];
      obj[col] = cell?.v ?? cell?.f ?? '';
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

export { SHEETS };
