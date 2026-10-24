'use client';
import { useState } from 'react';
import Link from 'next/link';
type Cap = {sku:string;limitUnits:number;heldUnits:number;active:boolean};
type Order = {orderNumber:string;waitlistNumber?:string;customerName?:string;items?:Array<{quantity:number;name:string}>;paymentStatus?:string;status?:string};
function dateNY() {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const val=(key:string)=>parts.find(part=>part.type===key)?.value;
  return val('year')+'-'+val('month')+'-'+val('day');
}
const getCsrf=()=>decodeURIComponent((document.cookie.split('; ').find(x=>x.startsWith('admin_csrf='))||'').split('=')[1]||'');
export default function PreorderCapacityPage(){
  const [marketId,M]=useState(''),[dateKey,D]=useState(dateNY),[sku,S]=useState('');
  const [limit,L]=useState('0'),[active,A]=useState(true),[caps,C]=useState<Cap[]>([]);
  const [orders,O]=useState<Order[]>([]),[summary,U]=useState<Array<{_id:string;orders:number}>>([]);
  const [demand,G]=useState<Array<{_id:{sku:string;paymentStatus:string};units:number}>>([]);
  const [waitlist,W]=useState(0),[cursor,N]=useState<string|null>(null);
  const [waitlistEntries,WE]=useState<Array<{_id:string;customerName:string;customerEmail:string;items:Array<{name:string;quantity:number}>}>>([]);
  const [waitlistCursor,WN]=useState<string|null>(null);
  const [bundleSku,BS]=useState(''),[bundleComponents,BC]=useState('');
  const [error,E]=useState(''),[busy,B]=useState(false);
  async function load(more=false){
    if(!marketId || !dateKey){E('Enter market and date');return;}
    B(true);try{
      const q=new URLSearchParams({marketId,dateKey}), k=new URLSearchParams(q);
      if(more&&cursor)k.set('after',cursor);
      const [c,o]=await Promise.all([
        fetch('/api/admin/preorder-capacity?'+q,{cache:'no-store'}),
        fetch('/api/admin/preorder-operations?'+k,{cache:'no-store'})]);
      const [cd,od]=await Promise.all([c.json(),o.json()]);
      if(!c.ok||!o.ok)throw new Error(cd.error||od.error||'Batch unavailable');
      C(cd.rows||[]);G(od.demand||[]);U(od.summary||[]);W(od.waitlistCount||0);
      O(prev=>more?prev.concat(od.orders||[]):od.orders||[]);N(od.nextCursor||null);E('');
    }catch(e){E(e instanceof Error?e.message:'Unavailable')}finally{B(false)}
  }
  async function save(){
    B(true);try{
      if(!getCsrf())throw new Error('Admin security session required');
      const res=await fetch('/api/admin/preorder-capacity',{method:'PUT',headers:{
        'Content-Type':'application/json','x-csrf-token':getCsrf()},
        body:JSON.stringify({marketId,dateKey,sku,limitUnits:Number(limit),active})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'Cannot set limit');
      await load();E('Saved; existing customer commitments preserved');
    }catch(e){E(e instanceof Error?e.message:'Unable to save')}finally{B(false)}
  }
  async function loadWaitlist(more=false){
    B(true);
    try{
      const q=new URLSearchParams({marketId,dateKey});if(more&&waitlistCursor)q.set('after',waitlistCursor);
      const res=await fetch('/api/admin/preorder-waitlist?'+q,{cache:'no-store'});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'Waitlist unavailable');
      WE(old=>more?old.concat(data.entries||[]):data.entries||[]);
      WN(data.nextCursor||null);E('');
    }catch(e){E(e instanceof Error?e.message:'Waitlist unavailable')}finally{B(false)}
  }
  async function saveBundle(){
    B(true);
    try{
      const components=bundleComponents.split(',').map(x=>{
        const split=x.trim().split(':');return {sku:split[0],quantity:Number(split[1])};
      });
      const res=await fetch('/api/admin/preorder-capacity',{
        method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':getCsrf()},
        body:JSON.stringify({sku:bundleSku,components,active:true})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Bundle recipe rejected');
      E('Approved recipe saved. Confirm all component capacities before selling.');
    }catch(e){E(e instanceof Error?e.message:'Bundle update failed')}finally{B(false)}
  }
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 text-stone-950">
    <Link href="/admin" className="text-emerald-800 underline">Back to admin</Link>
    <h1 className="text-3xl font-bold">Preorder capacity & preparation list</h1>
    <p className="text-stone-600">Control each pickup day, product variation, ingredient and total order capacity. Pending payment reserves stock; a no-charge waitlist is separate.</p>
    <section className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-3">
      <label>Market ID<input className="mt-1 w-full rounded border p-2" value={marketId} onChange={e=>M(e.target.value)} placeholder="From Admin Markets"/></label>
      <label>Pickup date<input className="mt-1 w-full rounded border p-2" type="date" value={dateKey} onChange={e=>D(e.target.value)}/></label>
      <button disabled={busy} className="self-end rounded bg-emerald-700 p-3 text-white" onClick={()=>load()}>Load production batch</button>
    </section>
    {error&&<p role="status" className="rounded bg-amber-50 p-4">{error}</p>}
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">Daily capacity limits</h2>
      <p className="text-sm">Set <code>preorder_slot</code> to the daily number of orders staff can prepare, then configure every sellable SKU/component. Unconfigured means unavailable; never silently unlimited.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <label>SKU<input className="mt-1 w-full rounded border p-2" value={sku} onChange={e=>S(e.target.value)}/></label>
        <label>Maximum units<input className="mt-1 w-full rounded border p-2" type="number" min="0" max="100000" value={limit} onChange={e=>L(e.target.value)}/></label>
        <label className="self-center"><input type="checkbox" checked={active} onChange={e=>A(e.target.checked)}/> Accept new orders</label>
        <button disabled={busy} onClick={save} className="rounded bg-emerald-700 p-3 text-white">Save</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr><th>SKU</th><th>Limit</th><th>Committed</th><th>Available</th></tr></thead>
        <tbody>{caps.map(row=><tr className="border-t" key={row.sku}><td>{row.sku}</td><td>{row.limitUnits}</td><td>{row.heldUnits}</td><td>{row.active?row.limitUnits-row.heldUnits:0}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">Approved bundle components</h2>
      <p className="text-sm">Create the bill of materials for an existing, merchant-priced bundle SKU. Enter component SKUs and units. Prices remain server-authoritative.</p>
      <label>Bundle SKU<input value={bundleSku} onChange={e=>BS(e.target.value)} className="ml-3 rounded border p-2"/></label>
      <label>Components (SKU:units comma separated)<input value={bundleComponents} onChange={e=>BC(e.target.value)} className="ml-3 w-full rounded border p-2" placeholder="strawberry:2,pineapple:1"/></label>
      <button disabled={busy} onClick={saveBundle} className="rounded bg-emerald-700 p-3 text-white">Save approved recipe</button>
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">Batch demand</h2>
      <p>{waitlist} no-charge waitlist requests</p>
      <ul className="grid gap-2 sm:grid-cols-3">{summary.map(x=><li key={x._id} className="rounded bg-emerald-50 p-3">{x._id}: {x.orders} orders</li>)}</ul>
      <h3 className="font-semibold">Required units, separated by payment state</h3>
      <ul className="grid gap-2 sm:grid-cols-2">{demand.filter(x=>x._id.sku!=='preorder_slot').map(x=><li className="rounded border p-2" key={x._id.sku+x._id.paymentStatus}>{x._id.sku}: {x.units} ({x._id.paymentStatus})</li>)}</ul>
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">No-charge customer waitlist</h2>
      <p className="text-sm">These people have not paid and no ingredients are reserved. Approve more capacity before inviting anyone to checkout.</p>
      <button disabled={busy} onClick={()=>loadWaitlist()} className="rounded border p-3">Load waiting customers</button>
      <ul>{waitlistEntries.map(x=><li key={x._id} className="border-b p-3">
        <strong>{x.customerName}</strong> · {x.customerEmail} · {(x.items||[]).map(i=>i.quantity+'× '+i.name).join(', ')}
      </li>)}</ul>
      {waitlistCursor&&<button disabled={busy} onClick={()=>loadWaitlist(true)} className="rounded border p-3">Load next 50 requests</button>}
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">Staff preorder queue</h2>
      <p className="text-sm">Only paid and verified orders are preparation commitments; unpaid links are holds, not confirmed sales.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr><th>Queue</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>{orders.map(x=><tr key={x.orderNumber} className="border-t">
          <td>{x.waitlistNumber||x.orderNumber}</td><td>{x.customerName}</td>
          <td>{(x.items||[]).map(i=>i.quantity+'× '+i.name).join(', ')}</td><td>{x.paymentStatus}</td><td>{x.status}</td>
        </tr>)}</tbody></table></div>
      {cursor&&<button disabled={busy} className="rounded border p-3" onClick={()=>load(true)}>Load 50 more orders</button>}
    </section>
  </main>;
}
