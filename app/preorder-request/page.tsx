'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

const ITEMS = [
  {slug:'calm-waters',name:'Calm Waters',price:11.99},
  {slug:'supplemint',name:'SuppleMint',price:11.99},
  {slug:'gracious-roots',name:'Gracious Roots',price:11.99},
  {slug:'kissed-by-gods',name:'Kissed by Gods',price:11.99},
  {slug:'melon-rita',name:'Melon Rita',price:11.99},
  {slug:'passion-guava-pineapple',name:'Passion Guava Pineapple Lemonade',price:11.99},
  {slug:'apg',name:'Always Pursue Gratitude',price:12.99},
  {slug:'herbal-vibe',name:'Herbal Vibe',price:15.99},
  {slug:'soursop-chai-gel',name:'Soursop Chai Gel',price:36},
];
type Method = 'pickup_market' | 'pickup' | 'delivery' | 'shipping';

function PreorderForm() {
  const query = useSearchParams();
  const requested = query.get('product') || '';
  const requestedAlias = requested === 'always-pursue-gratitude' ? 'apg'
    : requested === 'passion-guava-pineapple-lemonade' ? 'passion-guava-pineapple'
    : requested === 'soursop-chai' ? 'soursop-chai-gel' : requested;
  const initial = ITEMS.some(x=>x.slug===requestedAlias) ? requestedAlias : ITEMS[0].slug;
  const [product,setProduct] = useState(initial);
  const [quantity,setQuantity] = useState(1);
  const [method,setMethod] = useState<Method>('pickup_market');
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [phone,setPhone] = useState('');
  const [locationId,setLocationId] = useState('');
  const [date,setDate] = useState('');
  const [street,setStreet] = useState('');
  const [city,setCity] = useState('');
  const [state,setState] = useState('GA');
  const [zip,setZip] = useState('');
  const [window,setWindow] = useState('');
  const [ack,setAck] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [confirmation,setConfirmation] = useState<null | {requestId:string;message:string}>(null);
  const [requestId,setRequestId] = useState<string|null>(null);
  const item = ITEMS.find(p=>p.slug===product)!;
  const style = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900';
  const canSubmit = ack && !busy && Boolean(name.trim() && email.trim()) &&
    (method.startsWith('pickup') ? Boolean(locationId.trim() && date) :
      Boolean(street.trim() && city.trim() && zip.trim() && (method==='shipping'||window.trim())));
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(!canSubmit)return;
    setBusy(true);setError('');
    const id=requestId || crypto.randomUUID();
    setRequestId(id);
    try {
      const response = await fetch('/api/preorder-requests', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          requestId:id,product,quantity,customer:{name,email,phone},
          fulfillmentType:method,
          pickup:method.startsWith('pickup')?{locationId,date}:undefined,
          address:method==='shipping'||method==='delivery'?{street,city,state,zip}:undefined,
          deliveryTimeSlot:method==='delivery'?window:undefined,
          shippingMethod:method==='shipping'?'pending_verified_quote':undefined,
          preorderAcknowledged:ack,
          confirmedFulfillment:ack,
          preorderTermsVersion:'2026-10-31',
        }),
      });
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.error||'Could not save your preorder request.');
      setConfirmation({requestId:result.requestId,message:result.message});
    } catch(e) {setError(e instanceof Error?e.message:'Could not submit request.');}
    finally{setBusy(false);}
  }
  if(confirmation) return <main className="mx-auto max-w-xl space-y-5 px-4 py-12">
    <h1 className="text-3xl font-bold text-emerald-950">Preorder request received</h1>
    <p>{confirmation.message}</p>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-medium text-amber-950">
      This is not a paid or guaranteed order. We will confirm production capacity,
      the pickup or delivery schedule, and final fulfillment eligibility before collecting payment.
    </p>
    <p className="break-all text-sm text-stone-600">Reference: {confirmation.requestId}</p>
    <Link href="/catalog" className="font-semibold text-emerald-700 underline">Back to the menu</Link>
  </main>;
  return <main className="mx-auto max-w-2xl px-4 py-10">
    <h1 className="text-3xl font-bold text-emerald-950">Request a fresh-batch preorder</h1>
    <p className="mt-3 text-stone-700">
      Out of stock does not mean you cannot request it. Choose your drink,
      quantity, and preferred fulfillment method. You must acknowledge this is
      a preorder before submitting. The team confirms batch capacity and schedule
      before sending payment instructions. <strong>No charge is made now.</strong>
    </p>
    <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-stone-200 bg-white p-5">
      <label className="block space-y-1 font-medium">Item
        <select className={style} value={product} onChange={e=>{setProduct(e.target.value);setRequestId(null);}}>
          {ITEMS.map(x=><option key={x.slug} value={x.slug}>{x.name} — ${x.price.toFixed(2)}</option>)}
        </select>
      </label>
      <label className="block space-y-1 font-medium">Quantity of 16 oz bottles/jars
        <input className={style} type="number" min={1} max={32} required value={quantity}
          onChange={e=>{setQuantity(Number(e.target.value));setRequestId(null);}} />
      </label>
      <div className="rounded-lg bg-stone-50 p-3 text-sm">
        Estimated merchandise amount: <strong>${(item.price*quantity).toFixed(2)}</strong>.
        Delivery, shipping and any approved fees are not included and must be confirmed before payment.
      </div>
      <label className="block space-y-1 font-medium">Fulfillment method — choose before requesting
        <select className={style} value={method} onChange={e=>{setMethod(e.target.value as Method);setRequestId(null);}}>
          <option value="pickup_market">Farmers market pickup</option>
          <option value="pickup">Scheduled local pickup</option>
          <option value="delivery">Georgia local delivery (subject to coverage)</option>
          <option value="shipping">Georgia shipping eligibility review</option>
        </select>
      </label>
      {method.startsWith('pickup') ? <div className="space-y-3">
        <label className="block space-y-1 font-medium">Preferred market or pickup location
          <input className={style} required maxLength={100} value={locationId} onChange={e=>{setLocationId(e.target.value);setRequestId(null);}}
            placeholder={method==='pickup_market'?'e.g. Serenbe Farmers Market':'e.g. agreed local pickup point'} />
        </label>
        <label className="block space-y-1 font-medium">Preferred pickup date
          <input className={style} required type="date" min={new Date().toISOString().slice(0,10)} value={date}
            onChange={e=>{setDate(e.target.value);setRequestId(null);}} />
        </label>
      </div> : <div className="space-y-3">
        <label className="block space-y-1 font-medium">Street address
          <input className={style} required maxLength={120} value={street} onChange={e=>{setStreet(e.target.value);setRequestId(null);}} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block space-y-1 font-medium">City
            <input className={style} required value={city} onChange={e=>{setCity(e.target.value);setRequestId(null);}} />
          </label>
          <label className="block space-y-1 font-medium">State
            <input className={style} required value={state} onChange={e=>{setState(e.target.value);setRequestId(null);}} />
          </label>
          <label className="block space-y-1 font-medium">ZIP code
            <input className={style} required value={zip} onChange={e=>{setZip(e.target.value);setRequestId(null);}} />
          </label>
        </div>
        {method==='delivery' && <label className="block space-y-1 font-medium">Requested delivery window
          <input className={style} required value={window} onChange={e=>{setWindow(e.target.value);setRequestId(null);}}
            placeholder="e.g. Saturday afternoon" />
        </label>}
        {method==='shipping' && <p className="text-sm text-amber-900">
          Shipping is a request only. The team must verify product suitability, costs,
          cold-chain handling, and destination before payment.
        </p>}
      </div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1 font-medium">Full name
          <input className={style} autoComplete="name" required value={name} onChange={e=>{setName(e.target.value);setRequestId(null);}} />
        </label>
        <label className="block space-y-1 font-medium">Email
          <input className={style} type="email" autoComplete="email" required value={email} onChange={e=>{setEmail(e.target.value);setRequestId(null);}} />
        </label>
      </div>
      <label className="block space-y-1 font-medium">Phone (optional)
        <input className={style} type="tel" autoComplete="tel" value={phone} onChange={e=>{setPhone(e.target.value);setRequestId(null);}} />
      </label>
      <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
        <input className="mt-1 h-4 w-4" type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} />
        <span className="text-sm text-amber-950">
          <strong>I understand this is a PREORDER REQUEST, not available on-hand stock.</strong>
          {' '}I confirm the selected pickup, market pickup, delivery, or shipping-review method.
          Production capacity, exact timing, and fulfillment eligibility are subject to merchant confirmation
          before I can pay.
        </span>
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      <button className="w-full rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white disabled:opacity-50"
        disabled={!canSubmit} type="submit">{busy?'Submitting...':'Submit preorder request — no charge'}</button>
      <p className="text-xs text-stone-600">No payment or confirmed pickup is created by this request.</p>
    </form>
  </main>;
}
export default function PreorderRequestPage(){
  return <Suspense fallback={<p className="p-8">Loading preorder form...</p>}><PreorderForm /></Suspense>;
}
