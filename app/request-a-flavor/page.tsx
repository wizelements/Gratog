import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestFlavorClient from './RequestFlavorClient';

export const metadata: Metadata = {
  title: 'Request a Flavor | Taste of Gratitude Fresh Batch System',
  description:
    'Request a flavor or larger batch for your Georgia online order or market pickup. We confirm availability, pricing, and the fulfillment method before you pay.',
  keywords: [
    'Atlanta fresh batch drinks',
    'request a flavor Taste of Gratitude',
    'farmers market drink request',
    'sea moss lemonade gallon order',
  ],
  alternates: { canonical: '/request-a-flavor' },
  openGraph: {
    title: 'Request a Flavor | Taste of Gratitude',
    description:
      'Tell us what you want to sip next. We confirm availability before you pay.',
    url: 'https://tasteofgratitude.shop/request-a-flavor',
    siteName: 'Taste of Gratitude',
    locale: 'en_US',
    type: 'website',
  },
};

export default async function RequestFlavorPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const params = await searchParams;
  // Only known product-specific inbound requests can prepopulate this form.
  const isBlueLotus = params?.product === 'blue-lotus-gel';
  return (
    <div className="min-h-screen bg-stone-50">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
            Fresh batches guided by customer requests
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            {isBlueLotus ? 'Request Blue Lotus — 16 oz jar' : 'Tell us what you want to sip next.'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-stone-600">
            {isBlueLotus
              ? 'Blue Lotus is $36 for a 16 oz jar. Current inventory cannot support an immediate checkout. Request the next batch for a Georgia order or market pickup; no payment is collected until availability is confirmed.'
              : 'Request a flavor or larger batch for a regular Georgia order or a market preorder. We confirm the price, availability and eligible fulfillment before any payment.'}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" size="lg">
              <Link href="/markets">
                <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                Find a market
              </Link>
            </Button>
          </div>
        </div>

        <div className="min-w-0 w-full rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-8">
          <RequestFlavorClient source={isBlueLotus ? 'product_page' : 'direct'} initialProductSlug={isBlueLotus ? 'blue-lotus-gel' : ''} />
        </div>

        <div className="mt-12 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">How requests work</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-stone-700">
            <li>You request a flavor, profile, or size and choose an online inquiry or market pickup.</li>
            <li>We review ingredients, production capacity, and eligible Georgia fulfillment or market availability.</li>
            <li>We email you when a batch is approved with price, production date, and confirmed fulfillment details.</li>
            <li>You reserve and pay only after you approve the batch.</li>
          </ol>
          <p className="mt-4 text-sm text-stone-500">
            Smaller custom orders may qualify for a dedicated batch option with a setup fee. We confirm
            the best path before payment.
          </p>
        </div>
      </section>
    </div>
  );
}
