'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
type Product = { id: string; name: string; shippingEligible?: boolean; shippingApprovalNote?: string };
export default function ShippingEligibility() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [notes, setNotes] = useState('');
  const [authority, setAuthority] = useState('');
  const [evidence, setEvidence] = useState('');
  const [packageDetails, setPackageDetails] = useState({ weight: '', length: '', width: '', height: '' });
  const [regulatory, setRegulatory] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const [foodSafety, setFoodSafety] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await adminFetch<{products: Product[]}>('/api/admin/shipping-eligibility',{skipCsrf:true});
      if (!response.success) throw new Error('Unavailable');
      setProducts(response.data?.products || []);
    } catch { setError('Unable to load catalog shipping eligibility.'); }
  }, []);
  useEffect(()=>{ void load(); },[load]);
  const save = async (approved:boolean) => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const response = await adminFetch('/api/admin/shipping-eligibility', {
        method:'PUT', body: JSON.stringify({
          productId:selected.id, approved, notes,
          complianceConfirmed:regulatory, packagingConfirmed:packaging, foodSafetyConfirmed:foodSafety,
          regulatoryAuthority:authority, evidenceReference:evidence,
          packageWeightOz:approved?Number(packageDetails.weight):undefined, packageLengthIn:approved?Number(packageDetails.length):undefined,
          packageWidthIn:approved?Number(packageDetails.width):undefined, packageHeightIn:approved?Number(packageDetails.height):undefined,
        }),
      });
      if (!response.success) throw new Error(response.error || 'Unable to update');
      setSelected(null); setNotes(''); setRegulatory(false); setPackaging(false); setFoodSafety(false);
      await load();
    } catch(caught) {setError(caught instanceof Error ? caught.message : 'Unable to save');}
    finally {setBusy(false);}
  };
  return <main className="mx-auto max-w-4xl space-y-6 p-5">
    <div><Link href="/admin" className="text-emerald-700 underline">← Admin</Link>
      <h1 className="mt-2 text-3xl font-bold">Georgia shipping eligibility</h1>
      <p className="mt-2 text-gray-600">All products are unapproved by default. Only explicitly verified ambient-stable products can be quoted for Georgia parcel shipping. This approval does not replace required permits or shipping tests.</p>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {selected && <section className="space-y-3 rounded-xl border bg-stone-50 p-5">
      <h2 className="text-lg font-semibold">Review: {selected.name}</h2>
      <p className="text-sm">Do not approve a fresh lemonade, juice, prepared tea, sea moss gel, or other refrigerated item unless it is independently verified as legally and safely ambient-stable for the entire transport duration.</p>
      {([['regulatory','Product may legally be produced and sent by parcel under applicable food rules',regulatory,setRegulatory],
        ['packaging','Leakproof package, temperature stability and transport validation completed',packaging,setPackaging],
        ['foodSafety','Shelf stability and labeling verified for this specific product and size',foodSafety,setFoodSafety]] as const).map(([id,label,checked,setter])=>
        <label key={id} className="flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e=>setter(e.target.checked)}/>{label}</label>)}
      <label className="block text-sm">Approval evidence / verification reference
        <textarea className="mt-1 w-full rounded-md border p-3" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={600} rows={3} placeholder="What evidence supports safe, lawful ambient shipping?"/></label>
      <label className="block text-sm">Regulatory authority / qualified food-safety reviewer
        <input className="mt-1 w-full rounded-md border p-3" value={authority}
          onChange={e=>setAuthority(e.target.value)} placeholder="Named authority and authorization basis" />
      </label>
      <label className="block text-sm">Documented approval and packaging evidence reference
        <input className="mt-1 w-full rounded-md border p-3" value={evidence}
          onChange={e=>setEvidence(e.target.value)} placeholder="Controlled record, document or evidence URL" />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['weight','length','width','height'] as const).map(field=>
          <label key={field} className="text-sm capitalize">{field} ({field==='weight'?'oz':'in'})
            <input type="number" min=".01" step=".01" className="mt-1 w-full rounded-md border p-3"
              value={packageDetails[field]}
              onChange={e=>setPackageDetails(prev=>({...prev,[field]:e.target.value}))} />
          </label>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !regulatory || !packaging || !foodSafety || notes.trim().length<10
          || !authority.trim() || !evidence.trim()
          || Object.values(packageDetails).some(value=>!(Number(value)>0))} onClick={()=>void save(true)} className="rounded-md bg-emerald-700 p-3 font-semibold text-white disabled:opacity-40">Approve Georgia shipping</button>
        <button disabled={busy} onClick={()=>void save(false)} className="rounded-md border border-red-300 p-3 text-red-700">Disable shipping for product</button>
        <button onClick={()=>setSelected(null)} className="rounded-md border p-3">Cancel</button>
      </div>
    </section>}
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Catalog approvals</h2>
      {products.map(p=><button type="button" key={p.id} onClick={()=>{setSelected(p); setNotes(p.shippingApprovalNote || '');setRegulatory(false);setPackaging(false);setFoodSafety(false);}} className="flex w-full items-center justify-between gap-2 rounded-md border bg-white p-3 text-left">
        <span>{p.name}</span><span className={p.shippingEligible ? 'font-semibold text-emerald-700':'text-gray-500'}>{p.shippingEligible ? 'Approved' : 'Not approved'}</span>
      </button>)}
    </section>
  </main>;
}
