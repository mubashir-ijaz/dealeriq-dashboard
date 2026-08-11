// src/components/CarMaxTab.js
// Dedicated CarMax page — see PurchasesTab.js for the shared implementation.
import React from 'react';
import PurchasesTab from './PurchasesTab';

export default function CarMaxTab() {
  return <PurchasesTab sheetLabel="CarMax" source="carmax" itemLabel="CarMax" />;
}
