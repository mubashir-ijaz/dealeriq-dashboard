// src/utils/schema.js
// Exact column mappings based on confirmed sheet structure
/* eslint-disable no-unused-vars */

export const SOURCE_META = {
  edge:     { label: 'Edge Pipeline', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
  carmax:   { label: 'CarMax',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)'  },
  openlane: { label: 'OpenLane',      color: '#e8720c', bg: 'rgba(232,114,12,0.12)', border: 'rgba(232,114,12,0.25)' },
  adesa:    { label: 'ADESA',         color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  valuemyvehicle: { label: 'Value My Vehicle', color: '#d4af5a', bg: 'rgba(212,175,90,0.12)', border: 'rgba(212,175,90,0.25)' },
};

// Title status normalizer — maps any source's title field to standard values
export const TITLE_STATUS = {
  RELEASED:     'Released',
  NOT_RECEIVED: 'Not Received',
  RECEIVED:     'Received',
  AVAILABLE:    'Available',
  UNKNOWN:      'Unknown',
  UNAVAILABLE:  'Unavailable',
  NONE:         '—',
};

export function normalizeTitleStatus(val) {
  if (!val) return TITLE_STATUS.NONE;
  const v = String(val).trim().toLowerCase();
  if (v === 'released')     return TITLE_STATUS.RELEASED;
  if (v === 'received')     return TITLE_STATUS.RECEIVED;
  if (v.includes('not received') || v === 'not received') return TITLE_STATUS.NOT_RECEIVED;
  if (v === 'available')    return TITLE_STATUS.AVAILABLE;
  if (v === 'unavailable')  return TITLE_STATUS.UNAVAILABLE;
  if (v === 'unknown')      return TITLE_STATUS.UNKNOWN;
  return String(val).trim();
}

// ── Edge Pipeline columns ──────────────────────────────────────────────────────
// Auction Name, Picture Count, Stock #, Year, Make, Model, Style, Color,
// Odometer, CR, Grade, Sale Date, Buyer, If Hurdle, VIN, Vin Last Six,
// Buyer Charge Total, Price, Total Cost
function normalizeEdge(r) {
  const price     = money(r['Price']);
  const buyCharge = money(r['Buyer Charge Total']);
  const totalCost = money(r['Total Cost']) || buyCharge;
  const buyFee    = buyCharge - price;
  return {
    source:    'edge',
    vin:       str(r['VIN']).toUpperCase(),
    vinLast6:  str(r['Vin Last Six']).toUpperCase(),
    year:      str(r['Year']).replace('.0',''),
    make:      str(r['Make']),
    model:     str(r['Model']),
    style:     str(r['Style']),
    color:     str(r['Color']),
    miles:     miles(r['Odometer']),
    date:      str(r['Sale Date']),
    price,
    buyFee:    buyFee > 0 ? buyFee : 0,
    transFee:  0,
    totalCost,
    seller:    str(r['Auction Name']),
    buyer:     str(r['Buyer']),
    status:    str(r['If Hurdle']) === 'Yes' ? 'Hurdle' : 'Purchased',
    grade:     str(r['CR']) || str(r['Grade']),
    stockNo:   str(r['Stock #']).replace('.0',''),
    orderNo:   str(r['Stock #']).replace('.0',''),
    announcements: '',
    invoiceUrl: '',
    image:     str(r['Image_URL']),
    _raw: r,
  };
}

// ── CarMax columns ─────────────────────────────────────────────────────────────
// File_Name, Stock_Number, CM_Stock_No, VIN, CM_VIN, Year, Make, Model,
// Color, CM_Vehicle, Odometer, CM_Miles, Sale_Date, CM_Sale_Date, CM_Location,
// CM_Status, Selling_Price, Buyers_Fee, Admin_Fee, Total, CM_Total_Cost,
// CM_Pay_Type, CM_Title, Announcements, Seller, CM_Buyer, Purchaser_Name,
// Company, Address, City, State_ZIP, Bidder_Number, Entry_No, Error
function normalizeCarmax(r, source = 'carmax') {
  const price  = money(r['Selling_Price']);
  const bfee   = money(r['Buyers_Fee']);
  const admin  = money(r['Admin_Fee']);
  const total  = money(r['Total'] || r['CM_Total_Cost']) || (price + bfee + admin);
  return {
    source,
    vin:       str(r['VIN'] || r['CM_VIN']).toUpperCase(),
    vinLast6:  str(r['VIN'] || r['CM_VIN']).slice(-6).toUpperCase(),
    year:      str(r['Year']).replace('.0',''),
    make:      str(r['Make']),
    model:     str(r['Model']),
    style:     '',
    color:     str(r['Color']),
    miles:     miles(r['Odometer'] || r['CM_Miles']),
    date:      str(r['Sale_Date'] || r['CM_Sale_Date']),
    price,
    buyFee:    bfee,
    adminFee:  admin,
    transFee:  0,
    totalCost: total,
    seller:    str(r['CM_Location'] || r['Seller']),
    buyer:     str(r['Purchaser_Name'] || r['CM_Buyer']),
    status:    str(r['CM_Status']) || 'Purchased',
    grade:     '',
    stockNo:   str(r['Stock_Number'] || r['CM_Stock_No']).replace('.0',''),
    orderNo:   str(r['Stock_Number'] || r['CM_Stock_No']).replace('.0',''),
    announcements: str(r['Announcements']),
    payType:   str(r['CM_Pay_Type']),
    titleStatus: normalizeTitleStatus(r['CM_Title']),
    invoiceUrl: '',
    image:     str(r['Image_URL']),
    _raw: r,
  };
}

// ── OpenLane columns ───────────────────────────────────────────────────────────
// #, Page, Purchase ID, Order Number, Invoice Date, Due Date, Gate Release Code,
// Vehicle, VIN, Mileage, Purchase Date, Buyer Company, Buyer Attn, Buyer Address,
// Buyer Email, Seller Company, Seller Contact, Seller Address, Seller Email,
// Pickup Location, Pickup Address, Pickup Contact, Pickup Primary Phone, Pickup Mobile Phone,
// Pickup Instructions, Item 1..8 (name/desc/price/qty/total),
// Pre-tax Total, Tax, Total Payments, Balance Due / Total,
// Payment Type, Payment Date, Payment Amount, Invoice URL, Scrape Error
function normalizeOpenlane(r) {
  const vehicle = str(r['Vehicle']);
  const parts   = vehicle.trim().split(/\s+/);
  const year    = parts[0] || '';
  const make    = parts[1] || '';
  const model   = parts.slice(2).join(' ');

  // Vehicle price is Item 1
  const price   = money(r['Item 1 Price']) || money(r['Pre-tax Total']);
  const buyFee  = money(r['Item 3 Price']); // "Buy fee"
  const trans   = money(r['Item 4 Price']); // "Transportation"
  const total   = money(r['Pre-tax Total']) || money(r['Balance Due / Total']) || price;

  // Build line items array
  const items = [];
  for (let i = 1; i <= 8; i++) {
    const name = str(r[`Item ${i}`]);
    if (name) items.push({
      name,
      desc:  str(r[`Item ${i} Desc`]),
      price: money(r[`Item ${i} Price`]),
      qty:   str(r[`Item ${i} Qty`]),
      total: money(r[`Item ${i} Total`]),
    });
  }

  return {
    source:    'openlane',
    vin:       str(r['VIN']).toUpperCase(),
    vinLast6:  str(r['VIN']).slice(-6).toUpperCase(),
    year,
    make,
    model,
    style:     '',
    color:     '',
    miles:     miles(r['Mileage']),
    date:      str(r['Purchase Date'] || r['Invoice Date']),
    price,
    buyFee,
    transFee:  trans,
    totalCost: total,
    seller:    str(r['Seller Company']),
    buyer:     str(r['Buyer Company']),
    status:    'Purchased',
    grade:     '',
    stockNo:   str(r['Purchase ID']),
    orderNo:   str(r['Order Number']),
    gateCode:  str(r['Gate Release Code']),
    invoiceUrl: str(r['Invoice URL']),
    sellerEmail: str(r['Seller Email']),
    pickupLocation: str(r['Pickup Location']),
    pickupPhone: str(r['Pickup Primary Phone']),
    pickupInstructions: str(r['Pickup Instructions']),
    lineItems: items,
    announcements: '',
    image:     str(r['Image URL']),
    detailUrl: str(r['Vehicle Detail URL']),
    _raw: r,
  };
}

// ── ADESA columns ──────────────────────────────────────────────────────────────
// Purchased, VIN, Year, Make, Model, Dealership, Pickup Location,
// Total Amount, Amount Due, Payment Status, Release, Title,
// PSI, Arbitration, Trim, Exterior Color, Odometer, Rep Notes
function normalizeAdesa(r) {
  const total = money(r['Total Amount']);
  const due   = money(r['Amount Due']);
  // Parse Google's Date(yyyy,m,d) format
  const rawDate = str(r['Purchased']);
  let dateStr = rawDate;
  const dm = rawDate.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (dm) {
    const d = new Date(Number(dm[1]), Number(dm[2]), Number(dm[3]));
    dateStr = d.toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' });
  }
  return {
    source:    'adesa',
    vin:       str(r['VIN']).toUpperCase(),
    vinLast6:  str(r['VIN']).slice(-6).toUpperCase(),
    year:      str(r['Year']).replace('.0',''),
    make:      str(r['Make']),
    model:     str(r['Model']),
    trim:      str(r['Trim']),
    style:     str(r['Trim']),
    color:     str(r['Exterior Color']),
    miles:     miles(r['Odometer']),
    date:      dateStr,
    _rawDate:  rawDate,
    price:     total,
    buyFee:    0,
    transFee:  0,
    totalCost: total,
    amountDue: due,
    paymentStatus: str(r['Payment Status']),
    seller:    str(r['Pickup Location']) || str(r['Dealership']),
    buyer:     str(r['Dealership']),
    status:    str(r['Payment Status']),
    titleStatus: normalizeTitleStatus(r['Title']),
    releaseStatus: str(r['Release']),
    psi:       str(r['PSI']),
    arbitration: str(r['Arbitration']),
    repNotes:  str(r['Rep Notes']),
    grade:     '',
    stockNo:   str(r['VIN']).slice(-6),
    orderNo:   str(r['VIN']).slice(-6),
    announcements: '',
    invoiceUrl: '',
    _raw: r,
  };
}

export function normalizeRow(row, source) {
  switch (source) {
    case 'edge':     return normalizeEdge(row);
    case 'carmax':   return normalizeCarmax(row);
    case 'valuemyvehicle': return normalizeCarmax(row, 'valuemyvehicle');
    case 'openlane': return normalizeOpenlane(row);
    case 'adesa':    return normalizeAdesa(row);
    default:         return { source: 'unknown', vin: '', _raw: row };
  }
}

export function normalizeSheet(rows, source) {
  return rows.map(r => normalizeRow(r, source));
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export function computeStats(normalizedRows, label, source) {
  const prices    = normalizedRows.map(r => r.totalCost || r.price || 0).filter(v => v > 0);
  const totalSpend = prices.reduce((s,v) => s+v, 0);
  const avgPrice   = prices.length ? totalSpend / prices.length : 0;
  const byMake={}, byYear={}, byMonth={}, bySeller={}, byStatus={}, byGrade={}, byTitle={};

  normalizedRows.forEach(r => {
    const mk = r.make || 'Unknown';  byMake[mk]   = (byMake[mk]||0)+1;
    const yr = r.year || 'Unknown';  byYear[yr]   = (byYear[yr]||0)+1;
    const sl = r.seller||'Unknown';  bySeller[sl] = (bySeller[sl]||0)+1;
    const st = r.status||'Unknown';  byStatus[st] = (byStatus[st]||0)+1;
    if (r.grade) { byGrade[r.grade] = (byGrade[r.grade]||0)+1; }
    if (r.titleStatus && r.titleStatus !== '—') {
      byTitle[r.titleStatus] = (byTitle[r.titleStatus]||0)+1;
    }
    const d = parseDate(r.date);
    if (d) {
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      byMonth[k] = (byMonth[k]||0)+1;
    }
  });

  return {
    label, source, count: normalizedRows.length,
    totalSpend, avgPrice,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    minPrice: prices.length ? Math.min(...prices) : 0,
    byMake, byYear, byMonth, bySeller, byStatus, byGrade, byTitle,
  };
}

// Find VINs that appear in multiple sheets
export function crossMatchVINs(normalizedSheets) {
  const vinMap = {};
  Object.entries(normalizedSheets).forEach(([label, rows]) => {
    rows.forEach(row => {
      const vin = String(row.vin || '').trim().toUpperCase();
      if (!vin || vin.length < 6) return;
      if (!vinMap[vin]) vinMap[vin] = [];
      vinMap[vin].push({ label, row });
    });
  });
  const matched = Object.entries(vinMap)
    .filter(([, entries]) => entries.length > 1)
    .map(([vin, entries]) => ({ vin, entries }))
    .sort((a, b) => b.entries.length - a.entries.length);
  return { vinMap, matched };
}

// Build text summary for AI chatbot
export function buildAISummary(allStats, crossMatch, normalizedSheets) {
  const lines = ['=== MAJOR AUTO SALES — VEHICLE PURCHASE DATA ===\n'];
  const grand = allStats.reduce((s,x) => ({ count: s.count+x.count, spend: s.spend+x.totalSpend }), { count:0, spend:0 });
  lines.push(`TOTAL: ${grand.count} vehicles | $${Math.round(grand.spend).toLocaleString()} spent across ${allStats.length} sources\n`);

  allStats.forEach(s => {
    lines.push(`── ${s.label} [${s.source}] ──`);
    lines.push(`  Vehicles:    ${s.count}`);
    lines.push(`  Total Spend: $${Math.round(s.totalSpend).toLocaleString()}`);
    lines.push(`  Avg Price:   $${Math.round(s.avgPrice).toLocaleString()}`);
    lines.push(`  Price Range: $${Math.round(s.minPrice).toLocaleString()} – $${Math.round(s.maxPrice).toLocaleString()}`);
    const topMakes   = Object.entries(s.byMake).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const topSellers = Object.entries(s.bySeller).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const topYears   = Object.entries(s.byYear).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (topMakes.length)   lines.push(`  Top Makes:   ${topMakes.map(([m,c])=>`${m}(${c})`).join(', ')}`);
    if (topYears.length)   lines.push(`  Top Years:   ${topYears.map(([y,c])=>`${y}(${c})`).join(', ')}`);
    if (topSellers.length) lines.push(`  Top Sellers: ${topSellers.map(([s,c])=>`${s}(${c})`).join(', ')}`);
    if (Object.keys(s.byTitle).length) lines.push(`  Title Status: ${Object.entries(s.byTitle).map(([t,c])=>`${t}(${c})`).join(', ')}`);
    lines.push('');
  });

  lines.push(`CROSS-MATCHED VINs (same car in 2+ sources): ${crossMatch.matched.length}`);
  crossMatch.matched.forEach(({ vin, entries }) => {
    const detail = entries.map(e => {
      const p = e.row.totalCost || e.row.price || 0;
      return `${e.label}[$${p.toLocaleString()}]`;
    }).join(' AND ');
    lines.push(`  ${vin}: ${detail}`);
  });

  lines.push('\n=== SAMPLE DATA (3 rows per source) ===');
  Object.entries(normalizedSheets).forEach(([label, rows]) => {
    lines.push(`\n${label}:`);
    rows.slice(0,3).forEach((r,i) => {
      lines.push(`  [${i+1}] ${r.year} ${r.make} ${r.model} | VIN:${r.vin} | Miles:${Number(r.miles||0).toLocaleString()} | Cost:$${(r.totalCost||r.price||0).toLocaleString()} | Date:${r.date} | Seller:${r.seller}`);
    });
  });

  return lines.join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function money(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g,''));
  return isNaN(n) ? 0 : n;
}

export function miles(v) {
  if (!v) return 0;
  const n = parseInt(String(v).replace(/[,\s]/g,''), 10);
  return isNaN(n) ? 0 : n;
}

export function parseDate(v) {
  if (!v) return null;
  const s = String(v);
  // Defensive: handle Google's raw Date(yyyy,m,d) format if it ever slips through
  const gm = s.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (gm) return new Date(Number(gm[1]), Number(gm[2]), Number(gm[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Remove rows with a duplicate VIN within the same source (keeps the first
// occurrence — sheets are upserted with newest rows at the top).
export function dedupeByVIN(rows) {
  const seen = new Set();
  const deduped = [];
  let duplicates = 0;
  rows.forEach(r => {
    const vin = String(r.vin || '').trim().toUpperCase();
    if (!vin || vin.length < 6) { deduped.push(r); return; }
    if (seen.has(vin)) { duplicates++; return; }
    seen.add(vin);
    deduped.push(r);
  });
  return { rows: deduped, duplicates };
}

function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }
