'use client';
import {useState} from 'react';
import Link from 'next/link';

const FLAVORS=[
  {name:'Calm Waters',productId:'DDM6ISOPLK3ZKP6JAVV36BQU',variationId:'3YUSTFWEJBWIXDCVBIT2DNGN'},
  {name:'SuppleMint',productId:'V3EOGQA2DTWBN4EEC3TWZURN',variationId:'BVBOOMCBBSAWKK4ZP42JGLOV'},
  {name:'Gracious Roots',productId:'2SCG2SA3N4TOEMKSXLSQJGHW',variationId:'K6NKG3C44MQTDXFTTHHCIWKM'},
  {name:'Kissed by Gods',productId:'YSAUUKCZSVHBN6TYFL34JOSZ',variationId:'6PZ7M6XSF3FAH7ELMXAYIDJL'},
  {name:'Melon Rita',productId:'XL76VGNSN5RKNVRKXO5QET25',variationId:'GFMPAA2DCRRIQOPJ47T3WTHV'},
  {name:'Passion Guava Pineapple Lemonade',productId:'LBFLQVN3ZSGQULHNDXE3WP4H',variationId:'VIMU6X34SAMCOKBSAURGOZON'},
] as const;
function upcomingSaturday(){
  const ny=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const val=(key:string)=>ny.find(x=>x.type===key)?.value||'';
  const date=new Date(val('year')+'-'+val('month')+'-'+val('day')+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+((6-date.getUTCDay()+7)%7||7));
  return date.toISOString().slice(0,10);
}
type Selection=Record<string,4|8>;
type Existing={product_id:string;planned_gallons:number;product_name:string;preorder_cap:number};
export default function PreviewBatches(){
  const [pickupDate,setDate]=useState(upcomingSaturday);
  const [selected,setSelected]=useState<Selection>({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [previous,setPrevious]=useState<Existing[]>([]);
  const count=Object.keys(selected).length;
  const slots=Object.values(selected).reduce((sum,g)=>sum+g/4,0);
  const gallons=Object.values(selected).reduce((sum,g)=>sum+g,0);
  const cap=gallons*4, theoretical=gallons*8, market=gallons*3;
  const eligible=count>=4&&count<=5&&slots<=5;
  const csrf=()=>decodeURIComponent((document.cookie.split('; ').find(x=>x.startsWith('admin_csrf='))||'').split('=')[1]||'');
  async function load(){
    setBusy(true);setMessage('');
    try{
      const r=await fetch('/api/admin/preview-batches?'+new URLSearchParams({pickupDate}),{cache:'no-store'});
      const body=await r.json();if(!r.ok)throw new Error(body.error||'Cannot load');
      const selection:Selection={};
      for(const row of body.rows||[])if(FLAVORS.some(f=>f.productId===row.product_id)&&
        (row.planned_gallons===4||row.planned_gallons===8))selection[row.product_id]=row.planned_gallons;
      setSelected(selection);setPrevious(body.rows||[]);
      setMessage(body.schemaReady?'Saved plan loaded. Checkout remains disabled.':'No batch plan saved for this date.');
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to load');}
    finally{setBusy(false);}
  }
  async function save(){
    if(!eligible){setMessage('Choose four or five flavors within five production slots.');return;}
    setBusy(true);setMessage('');
    try{
      const token=csrf();if(!token)throw new Error('Please sign in to Admin before saving.');
      const flavors=FLAVORS.filter(f=>selected[f.productId]).map(f=>({...f,gallons:selected[f.productId]}));
      const r=await fetch('/api/admin/preview-batches',{method:'POST',
        headers:{'Content-Type':'application/json','x-csrf-token':token},
        body:JSON.stringify({pickupDate,flavors})});
      const body=await r.json();if(!r.ok)throw new Error(body.error||'Save failed');
      setPrevious(body.rows.map((r:Existing)=>({
        ...r,product_id:FLAVORS.find(f=>f.name===r.product_name)?.productId||'',
      })));
      setMessage('Plan saved for '+pickupDate+': '+body.approvedPlanningCap+
        ' planned preorder bottles. NOT live for checkout.');
    }catch(e){setMessage(e instanceof Error?e.message:'Save failed');}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-5xl space-y-7 px-4 py-10 text-stone-900">
    <Link href="/admin" className="text-sm font-medium text-emerald-800 underline">← Admin</Link>
    <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Taste of Gratitude • Preview only</p>
      <h1 className="text-3xl font-semibold">Weekly batch planner</h1>
      <p className="max-w-2xl text-stone-600">Merchant-approved starting policy: 16 preorders per planned four-gallon lemonade batch. Select the actual four or five flavors being produced; do not assign capacity to unplanned flavors.</p>
    </header>
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <label className="block text-sm font-semibold">Saturday pickup date
        <input className="mt-2 block w-full max-w-xs rounded-lg border border-stone-300 p-3" type="date"
          value={pickupDate} onChange={e=>{setDate(e.target.value);setSelected({});setPrevious([]);setMessage('');}}/>
      </label><button onClick={load} disabled={busy} className="mt-3 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium">Load previously saved plan</button>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Select weekly flavors</h2>
      <p className="text-sm text-stone-600">A four-gallon batch uses one production slot. An eight-gallon batch uses two slots. No more than five slots across the week.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {FLAVORS.map(f=><div key={f.productId} className="rounded-2xl border border-stone-200 bg-white p-4">
          <label className="flex items-center gap-3 font-medium">
            <input type="checkbox" checked={Boolean(selected[f.productId])}
              onChange={e=>setSelected(old=>{const next={...old};if(e.target.checked)next[f.productId]=4;else delete next[f.productId];return next;})}/>
            {f.name}
          </label><div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-stone-600">Batch size</span>
            <select aria-label={'Batch size for '+f.name} className="rounded-lg border border-stone-300 p-2"
              disabled={!selected[f.productId]} value={selected[f.productId]||4}
              onChange={e=>setSelected(old=>({...old,[f.productId]:Number(e.target.value) as 4|8}))}>
              <option value={4}>4 gallons</option><option value={8}>8 gallons</option>
            </select>
          </div></div>)}
      </div>
    </section>
    <section aria-label="Calculated production plan" className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
      <h2 className="text-xl font-semibold">Proposed production allocation</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><p className="text-sm text-stone-600">Flavors selected</p><p className="text-2xl font-bold">{count}</p></div>
        <div><p className="text-sm text-stone-600">Container slots</p><p className="text-2xl font-bold">{slots} / 5</p></div>
        <div><p className="text-sm text-stone-600">Theoretical bottles</p><p className="text-2xl font-bold">{theoretical}</p></div>
        <div><p className="text-sm text-stone-600">Preorder plan</p><p className="text-2xl font-bold">{cap}</p></div>
      </div>
      <p className="mt-4 text-sm text-stone-600">Production: {gallons} gallons. Market target: {market} bottles. Planning buffer: {gallons} bottles. Actual filled yield, market allocation, and sellable stock remain unverified.</p>
      <p className="mt-2 text-sm font-semibold">Payment and checkout remain disabled by this planner, even after saving.</p>
      <button disabled={!eligible||busy} onClick={save} className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
        Save merchant-approved Preview batch plan
      </button>
      {!eligible&&<p className="mt-2 text-sm text-amber-800">Select 4–5 distinct flavors and no more than five production slots.</p>}
      <p role="status" className="mt-3 text-sm" aria-live="polite">{message}</p>
      {previous.length>0&&<p className="mt-2 text-xs text-stone-500">Last retrieved or saved plan: {previous.length} flavor rows. Physical stock remains separate.</p>}
    </section>
  </main>;
}
