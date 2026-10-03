'use client';

import { FormEvent, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

type Summary = { totalOrders:number; openExceptions:number; criticalExceptions:number; requestedActions:number; runningActions:number };
type Exception = { id:string; code:string; title:string; severity:string; lastDetectedAt:string; order:{incrementId:string; currentState:string} };
type Order = { id:string; incrementId:string; currentState:string; paymentStatus?:string|null; invoiceStatus?:string|null; omsStatus?:string|null; shipmentStatus?:string|null; updatedAt:string };

export default function Home() {
  const [token,setToken]=useState<string|null>(null);
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [summary,setSummary]=useState<Summary|null>(null);
  const [exceptions,setExceptions]=useState<Exception[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);

  async function load(t:string) {
    const headers={Authorization:`Bearer ${t}`};
    const [s,e,o]=await Promise.all([
      fetch(`${API}/dashboard/summary`,{headers}),
      fetch(`${API}/dashboard/exceptions`,{headers}),
      fetch(`${API}/dashboard/orders`,{headers}),
    ]);
    if([s,e,o].some(r=>r.status===401)){ localStorage.removeItem('tower_token'); setToken(null); return; }
    setSummary(await s.json()); setExceptions(await e.json()); setOrders(await o.json());
  }

  useEffect(()=>{ const t=localStorage.getItem('tower_token'); if(t){setToken(t); load(t);} },[]);

  async function login(e:FormEvent) {
    e.preventDefault(); setError('');
    const r=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    const data=await r.json();
    if(!r.ok){setError(data.message||'Login failed');return;}
    localStorage.setItem('tower_token',data.accessToken); setToken(data.accessToken); load(data.accessToken);
  }

  if(!token) return <main className="login"><form className="login-card" onSubmit={login}>
    <h1>AI Order Control Tower</h1><div className="muted">Secure operations console</div>
    <div className="field"><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username"/></div>
    <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></div>
    <button className="primary">Sign in</button>{error&&<div className="error">{error}</div>}
  </form></main>;

  return <div className="shell">
    <aside className="sidebar"><div className="brand">AI Control Tower</div><div className="nav"><div className="active">Overview</div><div>Exceptions</div><div>Orders</div><div>AI RCA</div><div>Actions</div><div>Audit Trail</div></div></aside>
    <main className="main">
      <div className="topbar"><div><h1>Operations Overview</h1><div className="muted">Live order lifecycle and exception visibility</div></div><button className="logout" onClick={()=>{localStorage.removeItem('tower_token');setToken(null)}}>Sign out</button></div>
      <div className="cards">
        {[
          ['Orders',summary?.totalOrders??0],['Open Exceptions',summary?.openExceptions??0],['Critical',summary?.criticalExceptions??0],['Awaiting Approval',summary?.requestedActions??0],['Actions Running',summary?.runningActions??0]
        ].map(([label,value])=><div className="card" key={String(label)}><div className="card-label">{label}</div><div className="card-value">{value}</div></div>)}
      </div>
      <div className="grid">
        <section className="panel"><div className="panel-head"><strong>Open Exceptions</strong><span className="muted">{exceptions.length} active</span></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Exception</th><th>Severity</th><th>State</th><th>Detected</th></tr></thead><tbody>{exceptions.map(x=><tr key={x.id}><td>{x.order.incrementId}</td><td>{x.code}</td><td><span className={`badge badge-${x.severity.toLowerCase()}`}>{x.severity}</span></td><td className="state">{x.order.currentState}</td><td>{new Date(x.lastDetectedAt).toLocaleString()}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><div className="panel-head"><strong>Recent Orders</strong><span className="muted">{orders.length} shown</span></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>State</th><th>Payment</th><th>Invoice</th></tr></thead><tbody>{orders.slice(0,12).map(x=><tr key={x.id}><td>{x.incrementId}</td><td className="state">{x.currentState}</td><td>{x.paymentStatus||'—'}</td><td>{x.invoiceStatus||'—'}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  </div>;
}
