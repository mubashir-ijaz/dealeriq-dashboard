// src/components/ValueMyVehicleTab.js
// Dedicated Value My Vehicle page — see PurchasesTab.js for the shared
// implementation (same schema/title-tracking as CarMax, separate sheet).
import React from 'react';
import PurchasesTab from './PurchasesTab';

export default function ValueMyVehicleTab() {
  return <PurchasesTab sheetLabel="Value My Vehicle" source="valuemyvehicle" itemLabel="Value My Vehicle" />;
}
