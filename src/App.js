import React, { useState } from 'react';
import { DataProvider } from './context/DataContext';
import Dashboard from './pages/Dashboard';
import Login, { isUnlocked, lockDashboard } from './components/Login';

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  if (!unlocked) return <Login onUnlock={() => setUnlocked(true)} />;
  return (
    <DataProvider>
      <Dashboard onLogout={() => { lockDashboard(); setUnlocked(false); }} />
    </DataProvider>
  );
}
