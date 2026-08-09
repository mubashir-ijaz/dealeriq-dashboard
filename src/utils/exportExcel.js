// src/utils/exportExcel.js
import * as XLSX from 'xlsx';

// Export an array of normalized row objects to a downloadable .xlsx file.
// `columns` is an array of { key, header } — keys read off each row, in order.
export function exportRowsToExcel(rows, columns, filename) {
  const data = rows.map(r => {
    const obj = {};
    columns.forEach(({ key, header }) => { obj[header] = r[key] ?? ''; });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`);
}
