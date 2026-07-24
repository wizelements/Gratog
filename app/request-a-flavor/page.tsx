import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestFlavorClient from './RequestFlavorClient';

export const metadata: Metadata = {
  title: 'Request a Flavor | Taste of Gratitude Fresh Batch System',
  description:
    'Request a flavor, reserve a gallon, or meet us at the market to sample what is fresh. We confirm availability before you pay.',
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

export default function RequestFlavorPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
            Fresh batches guided by customer requests
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Tell us what you want to sip next.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-stone-600">
            Request a flavor, reserve a gallon, or meet us at the market to sample what is fresh.
            We confirm availability before you pay.
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

        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <RequestFlavorClient source="direct" />
        </div>

        <div className="mt-12 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">How requests work</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-stone-700">
            <li>You request a flavor, profile, or size and pick your preferred market.</li>
            <li>We collect demand and review ingredient availability and the market schedule.</li>
            <li>We email you when a batch is approved with price, production date, and pickup details.</li>
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
