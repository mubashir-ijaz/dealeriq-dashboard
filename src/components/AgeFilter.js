// src/components/AgeFilter.js
// Minimum-age-in-days picker: "show me cars that have been sitting 1 month+".
import React from 'react';
import { AGE_FILTERS } from '../utils/ageFilter';
import { Clock } from 'lucide-react';

export default function AgeFilter({ value, onChange, accentColor = 'var(--accent)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 12 }}>
        <Clock size={13} />
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: 10 }}>Car Age</span>
      </div>
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap' }}>
        {AGE_FILTERS.map(f => (
          <button key={f.id} onClick={() => onChange(f.id)}
            style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: value === f.id ? accentColor : 'transparent', color: value === f.id ? '#fff' : 'var(--text2)', fontSize: 12, fontWeight: value === f.id ? 700 : 500, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { if (value !== f.id) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--hover)'; } }}
            onMouseLeave={e => { if (value !== f.id) { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'transparent'; } }}
          >{f.label}</button>
        ))}
      </div>
    </div>
  );
}
