'use client';

import { useCallback, useEffect, useState } from 'react';

type RequestRow={
  _id:string;createdAt:string;status:string;paymentStatus:string;
  customer:{name:string;email:string;phone?:string};
  items:Array<{slug:string;name:string;quantity:number;unitPriceCents:number}>;
  merchandiseTotalCents:number;fulfillmentType:string;
  pickup?:{locationId:string;date:string};
  deliveryAddress?:{street:string;city:string;state:string;zip:string};
  shippingAddress?:{street:string;city:string;state:string;zip:string};
  deliveryTimeSlot?:string;
  customerContact?:{email?:{status?:string;deliveryVerified?:boolean}};
};

const statuses=[
  {value:'contacting_customer',label:'Customer contacted'},
  {value:'awaiting_customer_changes',label:'Needs customer changes'},
  {value:'declined',label:'Decline request'},
] as const;

export default function MerchantOrderRequestsPage(){
  const [rows,setRows]=useState<RequestRow[]>([]);
  const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const reload=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/admin/nonmarket-order-requests',{
        credentials:'same-origin',cache:'no-store',
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)throw new Error('Sign in with order-view permissions to access this inbox.');
      setRows(data.requests||[]);
    }catch(e){setError(e instanceof Error?e.message:'Order queue unavailable.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload]);

  async function setStatus(requestId:string,status:string){
    setBusy(requestId);setError('');
    try{
      const response=await fetch('/api/admin/nonmarket-order-requests',{
        method:'PATCH',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({requestId,status}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)throw new Error(data.code||'Update was not saved.');
      await reload();
    }catch(e){setError(e instanceof Error?e.message:'Unable to update.');}
    finally{setBusy('');}
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <header>
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Taste of Gratitude Admin</p>
      <h1 className="mt-2 text-3xl font-bold">Customer order requests</h1>
      <p className="mt-3 text-sm leading-6 text-stone-700">
        These are unpaid, unreserved website requests—not orders in production.
        Confirm real bottles, current batch capacity, customer fulfillment details,
        eligible shipping and every fee before offering a Square payment link.
        Follow up through your Square Messages inbox after a customer-initiated conversation
        or through an authorized business email channel.
      </p>
      <button type="button" onClick={()=>void reload()} className="mt-4 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white">Refresh requests</button>
    </header>
    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {loading?<p role="status" className="text-sm">Loading secure customer requests…</p>:
      !rows.length?<p className="rounded-xl border border-stone-200 bg-white p-6 text-sm">No active requests found.</p>:
      <section className="space-y-4" aria-label="Unpaid customer requests">
        {rows.map(row=><article key={row._id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-bold">Request {row._id.slice(-12)}</h2>
            <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950">{row.status.replaceAll('_',' ')} · unpaid</span>
          </div>
          <p className="mt-2 text-sm">{row.customer?.name} · <a className="underline" href={`mailto:${row.customer?.email}`}>{row.customer?.email}</a>
          {row.customer?.phone?<> · {row.customer.phone}</>:null}</p>
          <p className="mt-1 text-xs text-stone-600">Submitted {row.createdAt?new Date(row.createdAt).toLocaleString():'recently'} · email provider status: {row.customerContact?.email?.status||'unverified'}</p>
          <ul className="mt-4 space-y-1 border-t pt-3">
            {(row.items||[]).map(item=><li key={item.slug} className="flex justify-between gap-3 text-sm">
              <span>{item.quantity} × {item.name}</span><span>${((item.unitPriceCents*item.quantity)/100).toFixed(2)}</span>
            </li>)}
          </ul>
          <p className="mt-2 text-sm font-semibold">Merchandise estimate: ${(row.merchandiseTotalCents/100).toFixed(2)} before taxes/fees</p>
          <p className="mt-2 text-sm">Requested method: {row.fulfillmentType}
          {row.pickup?.date?` · ${row.pickup.date} at ${row.pickup.locationId}`:''}
          {row.deliveryTimeSlot?` · ${row.deliveryTimeSlot}`:''}</p>
          {(row.deliveryAddress||row.shippingAddress)&&<p className="mt-1 text-sm text-stone-700">
            {(row.deliveryAddress||row.shippingAddress)?.street}, {(row.deliveryAddress||row.shippingAddress)?.city},
            {' '}{(row.deliveryAddress||row.shippingAddress)?.state} {(row.deliveryAddress||row.shippingAddress)?.zip}
          </p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {statuses.map(choice=><button type="button" key={choice.value}
              onClick={()=>setStatus(row._id,choice.value)}
              disabled={busy!==''||(row.status==='declined'&&choice.value!=='declined')}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {busy===row._id?'Saving…':choice.label}
              </button>)}
            <button type="button" onClick={()=>navigator.clipboard?.writeText(row._id.slice(-12))}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold">Copy reference</button>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-600">A status note is not payment evidence. Never mark a customer order paid until Square verifies payment.</p>
        </article>)}
      </section>}
  </main>;
}
