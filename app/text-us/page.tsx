import Link from 'next/link';
import WebsiteMessageForm from '@/components/WebsiteMessageForm';
import { verifiedSquareSmsHref } from '@/lib/square-messages-contact';
import { verifiedSquareTextUsPage } from '@/lib/commerce/nonmarket-order-request';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Message Taste of Gratitude',
  description: 'Contact our team about bottled drinks, sea moss, pickup, delivery and order requests.',
};

export default function MessageUsPage() {
  const smsHref = verifiedSquareSmsHref(
    process.env.SQUARE_MESSAGES_DEDICATED_NUMBER,
    process.env.SQUARE_MESSAGES_NUMBER_VERIFIED,
  );
  const hosted = verifiedSquareTextUsPage(process.env.SQUARE_TEXT_US_HOSTED_URL);
  return (
    <main className="min-h-screen bg-[#faf8f2] px-4 py-10 text-stone-950">
      <div className="mx-auto max-w-xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Taste of Gratitude</p>
          <h1 className="mt-3 text-3xl font-bold">Message our team</h1>
          <p className="mt-3 text-sm leading-6 text-stone-700">
            Ask about drinks, sea moss, pickup, local delivery or a saved order request.
            We confirm inventory and final fees before sending a Square payment link.
          </p>
        </header>
        {smsHref ? (
          <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold">Text Taste of Gratitude</h2>
            <p className="text-sm text-stone-700">
              Open your phone's messaging app to contact our separately verified Square Messages number.
            </p>
            <a href={smsHref} className="inline-flex min-h-12 items-center rounded-full bg-emerald-800 px-6 py-3 font-bold text-white">
              Text us
            </a>
          </section>
        ) : hosted ? (
          <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold">Square-hosted contact option</h2>
            <p className="text-sm leading-6 text-stone-700">
              Square's Text Us control is available only on supported Square-hosted pages.
              If it is not visible, use the website message form directly below.
            </p>
            <a href={hosted} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-full border border-emerald-800 px-6 py-3 font-semibold text-emerald-900">
              Open Square contact page
            </a>
          </section>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Square's native Text Us button cannot be installed on this independently hosted website.
            A Square Messages texting number has not yet been verified for this site.
            Use the website form below to contact our team immediately—no second page required.
          </p>
        )}
        <WebsiteMessageForm />
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-bold">Ordering bottled products?</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            Save your itemized request first. We can then match your reference number to the
            correct products and fulfillment details before issuing a Square payment link.
          </p>
          <Link href="/order-request" className="mt-4 inline-block font-bold text-emerald-800 underline">
            Build an order request
          </Link>
        </section>
      </div>
    </main>
  );
}
