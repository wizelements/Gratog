'use client';

import { Suspense, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const MENU = [
  {slug:'calm-waters',name:'Calm Waters',price:11.99},
  {slug:'supplemint',name:'SuppleMint',price:11.99},
  {slug:'gracious-roots',name:'Gracious Roots',price:11.99},
  {slug:'kissed-by-gods',name:'Kissed by Gods',price:11.99},
  {slug:'melon-rita',name:'Melon Rita',price:11.99},
  {slug:'passion-guava-pineapple',name:'Passion Guava Pineapple Lemonade',price:11.99},
  {slug:'apg',name:'Always Pursue Gratitude',price:12.99},
  {slug:'herbal-vibe',name:'Herbal Vibe',price:15.99},
  {slug:'soursop-chai-gel',name:'Soursop Chai Gel (16 oz)',price:36},
] as const;
type Method='pickup'|'delivery'|'shipping';
const inputClass='w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-stone-950';

function Form() {
  const query=useSearchParams();
  const requested=query.get('product')||'';
  const initialSlug=requested==='always-pursue-gratitude'?'apg'
    :requested.startsWith('passion-guava')?'passion-guava-pineapple'
    :requested==='soursop-chai'?'soursop-chai-gel':requested;
  const [quantities,setQuantities]=useState<Record<string,number>>(
    MENU.some(item=>item.slug===initialSlug)?{[initialSlug]:1}:{'calm-waters':1});
  const [method,setMethod]=useState<Method>('pickup');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [phone,setPhone]=useState('');
  const [date,setDate]=useState('');
  const [address,setAddress]=useState({street:'',city:'',state:'GA',zip:''});
  const [window,setWindow]=useState('');
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<any>(null);
  const attempt=useRef<string|null>(null);
  const inFlight=useRef(false);
  const items=useMemo(()=>MENU.filter(item=>Number(quantities[item.slug]||0)>0)
    .map(item=>({...item,quantity:quantities[item.slug]})),[quantities]);
  const estimated=items.reduce((sum,item)=>sum+item.price*item.quantity,0);
  const ready=consent&&!busy&&items.length>0&&name.trim()&&email.trim()&&
    (method==='pickup'?Boolean(date):
      Boolean(address.street&&address.city&&address.zip&&(method==='shipping'||window)));
  async function send(event:FormEvent) {
    event.preventDefault();
    if (!ready||inFlight.current) return;
    inFlight.current=true;setBusy(true);setError('');
    const requestId=attempt.current||crypto.randomUUID();
    attempt.current=requestId;
    try {
      const response=await fetch('/api/order-requests',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          requestId,items:items.map(item=>({slug:item.slug,quantity:item.quantity})),
          customer:{name,email,phone},
          fulfillmentType:method,
          pickup:method==='pickup'?{locationId:'browns-mill',date}:undefined,
          address:method!=='pickup'?address:undefined,
          deliveryTimeSlot:method==='delivery'?window:undefined,
          preorderAcknowledged:consent,confirmedFulfillment:consent,
          preorderTermsVersion:'2026-10-31',
        }),
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||!payload.success)throw new Error(payload.error||'Request unavailable.');
      setResult(payload);
    } catch(e) {setError(e instanceof Error?e.message:'Could not submit this request.');}
    finally {inFlight.current=false;setBusy(false);}
  }
  if(result){
    const reference=String(result.requestId||'').slice(-12);
    return <section aria-live="polite" className="mx-auto max-w-xl space-y-5 rounded-xl border border-emerald-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-emerald-950">Your request is saved</h1>
      <p className="text-sm leading-6">Reference: <strong>{reference}</strong>. No payment has been taken.
      Your batch, availability and pickup/delivery window are not reserved yet.</p>
      <p className="text-sm leading-6">
        Contact Taste of Gratitude through Square Messages with this reference.
        We'll review everything, confirm the final amount and then send a secure Square payment link.
      </p>
      {result.squareTextUsPage
        ?<a href={result.squareTextUsPage} target="_blank" rel="noopener noreferrer"
            className="inline-block rounded-full bg-emerald-800 px-6 py-3 font-semibold text-white">
            Continue to Square Text Us</a>
        :<p className="rounded-lg bg-amber-50 p-4 text-sm leading-6">
            Our Square Text Us handoff link isn't verified yet. Our team has the saved
            request. Check for an acknowledgement email, or <Link href="/contact"
            className="font-semibold underline">contact us</Link> with the reference above.
            We don't promise an immediate human response.
          </p>}
      <button type="button" onClick={()=>navigator.clipboard?.writeText(reference)}
        className="text-sm font-semibold text-emerald-800 underline">Copy request reference</button>
    </section>;
  }
  return <main className="min-h-screen bg-[#faf8f2] px-4 py-8 text-stone-950">
    <form onSubmit={send} className="mx-auto max-w-2xl space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-900">Taste of Gratitude</p>
        <h1 className="mt-2 text-3xl font-bold">Build your order request</h1>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          Select bottled lemonades, fresh juices and approved sea moss products. No charge is made now.
          Stock, future batches, final fees and fulfillment must be confirmed before payment.
          For a farmers market pickup, use the <Link href="/preorder" className="font-semibold underline">market preorder flow</Link>.
        </p>
      </header>
      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-lg font-bold">1. Bottled products</legend>
        <div className="space-y-4">
          {MENU.map(item=><label key={item.slug} className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3">
            <span className="text-sm"><strong>{item.name}</strong><span className="block text-stone-600">${item.price.toFixed(2)} estimated each</span></span>
            <input aria-label={`Quantity of ${item.name}`} type="number" inputMode="numeric"
              min={0} max={32} value={quantities[item.slug]||0}
              onChange={e=>{setQuantities(q=>({...q,[item.slug]:Math.max(0,Math.min(32,Number(e.target.value)||0))}));attempt.current=null;}}
              className="w-20 rounded-lg border border-stone-300 px-2 py-2 text-center" />
          </label>)}
        </div>
        <p className="mt-3 text-sm font-semibold">Estimated merchandise: ${estimated.toFixed(2)}</p>
      </fieldset>
      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-lg font-bold">2. Your contact information</legend>
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Name<input required value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></label>
          <label className="block text-sm font-semibold">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className={inputClass}/></label>
          <label className="block text-sm font-semibold">Phone (optional)<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className={inputClass}/></label>
        </div>
      </fieldset>
      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-lg font-bold">3. Choose fulfillment</legend>
        <select value={method} onChange={e=>{setMethod(e.target.value as Method);attempt.current=null;}} className={inputClass}>
          <option value="pickup">Browns Mill-area pickup — Monday 12–5 PM (request)</option>
          <option value="delivery">Local Georgia delivery — eligibility review</option>
          <option value="shipping">Georgia shipping — eligibility and quote review</option>
        </select>
        {method==='pickup'
          ?<label className="mt-4 block text-sm font-semibold">Requested Monday date
              <input type="date" required value={date} onChange={e=>setDate(e.target.value)} className={inputClass}/>
              <span className="mt-1 block text-xs font-normal text-stone-600">Exact pickup location and time are confirmed by the merchant.</span>
            </label>
          :<div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-semibold">Street address<input required className={inputClass} value={address.street} onChange={e=>setAddress(a=>({...a,street:e.target.value}))}/></label>
              <label className="text-sm font-semibold">City<input required className={inputClass} value={address.city} onChange={e=>setAddress(a=>({...a,city:e.target.value}))}/></label>
              <label className="text-sm font-semibold">State<input required className={inputClass} value={address.state} onChange={e=>setAddress(a=>({...a,state:e.target.value}))}/></label>
              <label className="text-sm font-semibold">ZIP code<input required className={inputClass} value={address.zip} onChange={e=>setAddress(a=>({...a,zip:e.target.value}))}/></label>
              {method==='delivery'&&<label className="text-sm font-semibold">Requested delivery window<input required className={inputClass} placeholder="e.g., Monday afternoon" value={window} onChange={e=>setWindow(e.target.value)}/></label>}
              <p className="text-xs text-stone-600 sm:col-span-2">Delivery radius, product shipping eligibility, taxes and final fees must be confirmed before any payment link.</p>
            </div>}
      </fieldset>
      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4"/>
        <span><strong>I understand this is a request, not a confirmed purchase or reserved batch.</strong>
        {' '}I confirm my selected items and requested fulfillment method. No payment is due until availability and final terms are approved.</span>
      </label>
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-950">{error}</p>}
      <button type="submit" disabled={!ready}
        className="min-h-14 w-full rounded-xl bg-emerald-800 px-6 py-3 text-base font-bold text-white disabled:opacity-50">
        {busy?'Saving your request…':'Submit full order request — no charge'}
      </button>
    </form>
  </main>;
}

export default function OrderRequestPage() {
  return <Suspense fallback={<main className="p-8 text-center">Loading order request…</main>}><Form/></Suspense>;
}
