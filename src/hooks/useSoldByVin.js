// src/hooks/useSoldByVin.js
// Shared "has this VIN sold at Manheim, and for how much/what profit"
// lookup — used by PurchasesTab (CarMax/Value My Vehicle) and Activity
// (all 5 sources) so every purchase table can show the same Sold badge
// without each component re-implementing the fetch/join.
import { useState, useEffect } from 'react';
import { fetchProfitSheet } from '../utils/sheets';

export default function useSoldByVin() {
  const [soldByVin, setSoldByVin] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetchProfitSheet().then(profitRows => {
      if (cancelled) return;
      const map = {};
      profitRows.forEach(r => {
        if (r.Matched !== 'Yes' || !r.VIN) return;
        map[String(r.VIN).trim().toUpperCase()] = {
          salePrice: Number(r.Sale_Price) || 0,
          profit: Number(r.Profit) || 0,
          daysHeld: r.Days_Held !== '' ? Number(r.Days_Held) : null,
          saleDate: r.Sale_Date || '',
        };
      });
      setSoldByVin(map);
    });
    return () => { cancelled = true; };
  }, []);
  return soldByVin;
}
