// src/components/ChartsPage.js
import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { SOURCE_META } from '../utils/schema';

const COLORS = ['#e8720c','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#a78bfa'];
const TT = { contentStyle:{ background:'#0d0d15', border:'1px solid #181828', borderRadius:9, color:'#eef2ff', fontSize:12 }, labelStyle:{ color:'#7880a0' } };
const fmtK = v => '$'+Math.round(v/1000)+'k';
const fmt  = v => '$'+Math.round(v||0).toLocaleString();

export default function ChartsPage() {
  const { stats } = useData();

  // Per-source bar data
  const sourceBar = stats.map(s => ({
    name:  s.label.replace(' Pipeline','').replace(' / BackLot',''),
    veh:   s.count,
    spend: Math.round(s.totalSpend),
    avg:   Math.round(s.avgPrice),
    color: SOURCE_META[s.source]?.color || '#64748b',
  }));

  // Combined makes
  const makeData = useMemo(() => {
    const m = {};
    stats.forEach(s => Object.entries(s.byMake).forEach(([k,v]) => { if(k&&k!=='Unknown') m[k]=(m[k]||0)+v; }));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value}));
  }, [stats]);

  // Monthly
  const monthData = useMemo(() => {
    const m = {};
    stats.forEach(s => Object.entries(s.byMonth).forEach(([k,v]) => { m[k]=(m[k]||0)+v; }));
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b))
      .map(([mo,count]) => ({ month: mo.slice(5)+'/'+mo.slice(2,4), count }));
  }, [stats]);

  // Year dist
  const yearData = useMemo(() => {
    const y = {};
    stats.forEach(s => Object.entries(s.byYear).forEach(([k,v]) => { if(/^\d{4}$/.test(k)) y[k]=(y[k]||0)+v; }));
    return Object.entries(y).sort(([a],[b])=>Number(a)-Number(b)).map(([year,count])=>({year,count}));
  }, [stats]);

  const priceRange = stats.map(s => ({
    name: s.label.replace(' Pipeline','').replace(' / BackLot',''),
    min: Math.round(s.minPrice), avg: Math.round(s.avgPrice), max: Math.round(s.maxPrice),
  }));

  const pieData = stats.map(s => ({ name: s.label, value: s.count, color: SOURCE_META[s.source]?.color }));

  // Top sellers per source combined
  const sellerData = useMemo(() => {
    const m = {};
    stats.forEach(s => Object.entries(s.bySeller).forEach(([k,v]) => { if(k&&k!=='Unknown') m[k]=(m[k]||0)+v; }));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name:name.length>20?name.slice(0,18)+'…':name,value}));
  }, [stats]);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

      <CC title="Vehicles per Source">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={sourceBar} margin={{top:0,right:8,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181828"/>
            <XAxis dataKey="name" tick={{fill:'#7880a0',fontSize:11}}/>
            <YAxis tick={{fill:'#7880a0',fontSize:11}} allowDecimals={false}/>
            <Tooltip {...TT}/>
            <Bar dataKey="veh" name="Vehicles" radius={[6,6,0,0]}>
              {sourceBar.map((s,i)=><Cell key={i} fill={s.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CC>

      <CC title="Total Spend per Source">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={sourceBar} margin={{top:0,right:8,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181828"/>
            <XAxis dataKey="name" tick={{fill:'#7880a0',fontSize:11}}/>
            <YAxis tickFormatter={fmtK} tick={{fill:'#7880a0',fontSize:11}}/>
            <Tooltip {...TT} formatter={v=>fmt(v)}/>
            <Bar dataKey="spend" name="Total Spend" radius={[6,6,0,0]}>
              {sourceBar.map((s,i)=><Cell key={i} fill={s.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CC>

      <CC title="Monthly Purchase Volume (All Sources)" wide>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181828"/>
            <XAxis dataKey="month" tick={{fill:'#7880a0',fontSize:10}}/>
            <YAxis tick={{fill:'#7880a0',fontSize:11}} allowDecimals={false}/>
            <Tooltip {...TT}/>
            <Line type="monotone" dataKey="count" stroke="#e8720c" strokeWidth={2.5} dot={{fill:'#e8720c',r:3}} name="Vehicles"/>
          </LineChart>
        </ResponsiveContainer>
      </CC>

      <CC title="Top 10 Makes — All Sources">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={makeData} layout="vertical" margin={{left:6}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181828"/>
            <XAxis type="number" tick={{fill:'#7880a0',fontSize:11}} allowDecimals={false}/>
            <YAxis dataKey="name" type="category" tick={{fill:'#7880a0',fontSize:11}} width={65}/>
            <Tooltip {...TT}/>
            <Bar dataKey="value" name="Count" radius={[0,5,5,0]}>
              {makeData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CC>

      <CC title="Price Range — Min / Avg / Max per Source">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={priceRange}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181828"/>
            <XAxis dataKey="name" tick={{fill:'#7880a0',fontSize:11}}/>
            <YAxis tickFormatter={fmtK} tick={{fill:'#7880a0',fontSize:11}}/>
            <Tooltip {...TT} formatter={v=>fmt(v)}/>
            <Legend iconType="circle" wrapperStyle={{fontSize:11,color:'#7880a0'}}/>
            <Bar dataKey="min" name="Min"  fill="#3b82f6" radius={[4,4,0,0]}/>
            <Bar dataKey="avg" name="Avg"  fill="#e8720c" radius={[4,4,0,0]}/>
            <Bar dataKey="max" name="Max"  fill="#8b5cf6" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </CC>

      <CC title="Vehicle Model Year Distribution">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={yearData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181828"/>
            <XAxis dataKey="year" tick={{fill:'#7880a0',fontSize:10}}/>
            <YAxis tick={{fill:'#7880a0',fontSize:11}} allowDecimals={false}/>
            <Tooltip {...TT}/>
            <Bar dataKey="count" name="Vehicles" radius={[4,4,0,0]}>
              {yearData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CC>

      <CC title="Source Split (Vehicle Count)">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={85} dataKey="value"
              label={({name,percent})=>`${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
              labelLine={{stroke:'#363660'}}>
              {pieData.map((d,i)=><Cell key={i} fill={d.color||COLORS[i]}/>)}
            </Pie>
            <Tooltip {...TT}/>
          </PieChart>
        </ResponsiveContainer>
      </CC>

      <CC title="Top Sellers / Auctions — All Sources">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={sellerData} layout="vertical" margin={{left:6}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#181828"/>
            <XAxis type="number" tick={{fill:'#7880a0',fontSize:11}} allowDecimals={false}/>
            <YAxis dataKey="name" type="category" tick={{fill:'#7880a0',fontSize:10}} width={90}/>
            <Tooltip {...TT}/>
            <Bar dataKey="value" name="Vehicles" fill="#10b981" radius={[0,5,5,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </CC>

    </div>
  );
}

function CC({ title, children, wide }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:13, padding:20, gridColumn: wide?'span 2':'auto' }}>
      <h3 style={{ fontSize:10, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', marginBottom:14 }}>{title}</h3>
      {children}
    </div>
  );
}
