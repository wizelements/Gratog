import Link from 'next/link';
import { OrderChatPanel } from '@/components/OrderChatWidget';

export const metadata = {
  title: 'Chat About an Order | Taste of Gratitude',
  description: 'Ask us about small-batch preorders, Georgia delivery and farmers market pickup. Confirm availability before payment.',
};

export default function OrderHelpPage() {
  return (
    <main id="order-help-main" className="min-h-screen bg-[#fbfaf5] pb-24">
      <section className="bg-emerald-950 px-4 py-12 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Order your way</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Want to preorder or ask about delivery?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-emerald-50">Tell us what you want, tap Send Request once, and we'll alert both team phones automatically when messaging is available. No need to choose a recipient.</p>
        <Link href="/preorder" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 font-bold text-emerald-950 hover:bg-emerald-50">Market pickup: reserve and pay securely</Link>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-10">
        <OrderChatPanel embedded />
        <p className="mt-6 text-center text-sm leading-6 text-stone-600">Prefer shopping without texting? <Link className="font-semibold text-emerald-800 underline" href="/catalog">Browse the online shop</Link>. Online availability and payment are handled separately from enquiries.</p>
      </section>
    </main>
  );
}
