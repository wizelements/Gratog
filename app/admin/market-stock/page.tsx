'use client';

import { useEffect, useState } from 'react';
import { getActiveMarketPickups } from '@/data/markets';
import Link from 'next/link';

type SquareRow={
  slug:string;name:string;
  merchantReportedQuantity:number|null;
  squareVerifiedQuantity:number|null;
  requiresReconciliation:boolean;
};
const markets=getActiveMarketPickups();
const inputClass='w-full rounded-lg border border-stone-300 bg-white px-3 py-2';

export default function AdminMarketStockPage() {
  const [marketId,setMarketId]=useState(markets[0]?.id||'');
  const [serviceDate,setServiceDate]=useState('');
  const [rows,setRows]=useState<SquareRow[]>([]);
  const [counts,setCounts]=useState<Record<string,string>>({});
  const [confirmed,setConfirmed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [working,setWorking]=useState('');

  const refresh=async()=>{
    setLoading(true);setMessage('');
    try{
      const response=await fetch('/api/admin/square-menu-inventory',{cache:'no-store',credentials:'same-origin'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)throw new Error(data.error||'Sign in as an inventory administrator to view Square readback.');
      setRows(data.merchantRecount?.comparison||[]);
    }catch(error){setMessage(error instanceof Error?error.message:'Square readback unavailable.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void refresh();},[]);

  async function reconcile(slug:string){
    const count=Number(counts[slug]);
    if(!confirmed||!marketId||!serviceDate||!Number.isSafeInteger(count)||count<0){
      setMessage('Choose market and date, enter a real physical count, and confirm you recounted the bottles.');return;
    }
    setWorking(slug);setMessage('');
    try{
      const response=await fetch('/api/admin/market-stock/reconcile',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
        body:JSON.stringify({marketId,serviceDate,slug,physicallyCountedUnits:count,physicalCountConfirmed:true}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)
        throw new Error(data.code||'Market count could not be reconciled.');
      setMessage(`${slug} physical count recorded. Digital checkout remains locked until Square payments and market channel isolation are certified.`);
    }catch(error){setMessage(error instanceof Error?error.message:'Reconciliation failed.');}
    finally{setWorking('');}
  }

  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-stone-950">
    <header>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Taste of Gratitude Admin</p>
      <h1 className="mt-1 text-3xl font-bold">Market stock reconciliation</h1>
      <p className="mt-3 text-sm leading-6 text-stone-700">
        Compare a fresh physical count at your booth against the actual Square
        variation-level inventory. Counts here do not change Square or enable online
        checkout. Never substitute the dated October inventory report for a new physical count.
      </p>
    </header>
    <section className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Market
        <select className={inputClass} value={marketId} onChange={e=>setMarketId(e.target.value)}>
          {markets.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Market date
        <input type="date" className={inputClass} value={serviceDate} onChange={e=>setServiceDate(e.target.value)}/>
      </label>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>
        <span>I personally checked the physical count for these products and understand this does not authorize online purchases or Square stock adjustments.</span>
      </label>
    </section>
    {message&&<p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">{message}</p>}
    {loading?<p className="text-sm">Loading live Square stock…</p>
      :<section className="grid gap-3 sm:grid-cols-2" aria-label="Current approved bottles and sea moss">
        {rows.map(row=><article key={row.slug} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">{row.name}</h2>
          <p className="text-sm">Square verified: <strong>{row.squareVerifiedQuantity??'Unknown / not verified'}</strong></p>
          <p className="text-xs text-stone-600">Earlier owner-reported count: {row.merchantReportedQuantity??'Not recorded'}</p>
          {row.requiresReconciliation&&<p className="text-xs font-semibold text-amber-800">Count mismatch requires review</p>}
          <label className="block text-sm font-semibold">Today's physical market count
            <input type="number" min={0} max={500} step={1} value={counts[row.slug]||''}
              className={inputClass} placeholder="Count bottles or jars"
              onChange={e=>setCounts(c=>({...c,[row.slug]:e.target.value}))}/>
          </label>
          <button type="button" disabled={working!==''||!confirmed||row.squareVerifiedQuantity===null||row.squareVerifiedQuantity===undefined}
            onClick={()=>reconcile(row.slug)}
            className="w-full rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {working===row.slug?'Reconciling…':'Verify physical count'}
          </button>
        </article>)}
      </section>}
    <div className="flex flex-wrap gap-4 text-sm">
      <button onClick={()=>void refresh()} type="button" className="font-semibold text-emerald-800 underline">Refresh Square counts</button>
      <Link href="/admin/qr-generator" className="font-semibold text-emerald-800 underline">Market QR codes</Link>
    </div>
    <p className="text-xs leading-5 text-stone-600">Product authorization requires matching Square variation, checked physical count and dedicated allocation. Payments stay disabled until actual Square Sandbox transaction, refund, webhook, and recovery evidence pass.</p>
  </main>;
}
