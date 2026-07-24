// src/pages/Dashboard.js
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import Sidebar from '../components/Sidebar';
import Overview from '../components/Overview';
import SheetView from '../components/SheetView';
import CrossMatch from '../components/CrossMatch';
import ChartsPage from '../components/ChartsPage';
import ChatBot from '../components/ChatBot';
import TitleStatus from '../components/TitleStatus';
import DateFilter from '../components/DateFilter';
import Activity from '../components/Activity';
import { RefreshCw, Loader, AlertCircle } from 'lucide-react';

const PAGE_TITLE = {
  overview:   '📊  Overview',
  activity:   '📅  Activity',
  charts:     '📈  Charts & Trends',
  crossmatch: '🔗  Cross-Match VINs',
  titles:     '📋  Title Status',
  chat:       '🤖  AI Assistant',
};

export default function Dashboard() {
  const { loading, error, reload, lastRefresh, duplicatesRemoved } = useData();
  const [page,   setPage]   = useState('overview');
  const [active, setActive] = useState(null);

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, background:'var(--bg)' }}>
      <Loader size={38} color="var(--accent)" style={{ animation:'spin 1s linear infinite' }} />
      <p style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text2)' }}>Loading your data…</p>
      <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)' }}>Edge · CarMax · OpenLane · ADESA</p>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:14, padding:40, background:'var(--bg)', textAlign:'center' }}>
      <AlertCircle size={44} color="var(--red)" />
      <p style={{ fontSize:18, fontWeight:800 }}>Failed to load sheets</p>
      <p style={{ color:'var(--red)', fontFamily:'var(--mono)', fontSize:12, maxWidth:520 }}>{error}</p>
      <p style={{ color:'var(--text2)', fontSize:13, maxWidth:420, lineHeight:1.8 }}>
        Make sure all 4 sheets are set to<br/>
        <strong>Share → Anyone with the link → Viewer</strong>
      </p>
      <button onClick={reload} style={{ marginTop:8, padding:'10px 30px', background:'var(--accent)', border:'none', borderRadius:9, color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer' }}>
        Retry
      </button>
    </div>
  );

  const title = page === 'sheet' ? active : PAGE_TITLE[page];
  const nav   = (p, sh) => { setPage(p); if (sh !== undefined) setActive(sh); };
  const showDateFilter = ['overview','activity','charts','crossmatch','titles'].includes(page);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar page={page} active={active} onNav={nav} />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0, gap:16, flexWrap:'wrap', boxShadow:'var(--shadow-sm)', zIndex:1 }}>
          <div>
            <h1 style={{ fontSize:17, fontWeight:800, letterSpacing:'-0.3px' }}>{title}</h1>
            {lastRefresh && (
              <p style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)', marginTop:1 }}>
                Live · synced {lastRefresh.toLocaleTimeString()}
                {duplicatesRemoved > 0 && <span style={{ color:'var(--amber)' }}> · {duplicatesRemoved} duplicate VIN{duplicatesRemoved===1?'':'s'} auto-removed</span>}
              </p>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {showDateFilter && <DateFilter />}
            <button onClick={reload}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:'1px solid var(--border2)', borderRadius:8, background:'transparent', color:'var(--text2)', fontSize:12, fontWeight:600, transition:'all 0.2s', flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text2)'; }}
            >
              <RefreshCw size={13}/> Refresh
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflow:'auto', padding:'20px 24px', animation:'fadeUp 0.25s ease' }}>
          {page === 'overview'   && <Overview />}
          {page === 'activity'   && <Activity />}
          {page === 'charts'     && <ChartsPage />}
          {page === 'crossmatch' && <CrossMatch />}
          {page === 'titles'     && <TitleStatus />}
          {page === 'chat'       && <ChatBot />}
          {page === 'sheet'      && <SheetView label={active} />}
        </div>
      </div>
    </div>
  );
}
