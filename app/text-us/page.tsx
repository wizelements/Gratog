import Link from 'next/link';
import { redirect } from 'next/navigation';
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
  // A Square Online "Website" toggle does not install a texting widget here.
  // Without a verified Square contact destination, send customers straight
  // to the working website message form, never to another informational page.
  if (!smsHref && !hosted) {
    redirect('/contact?source=message-us#send-message');
  }
  return (
    <main className="min-h-screen bg-[#faf8f2] px-4 py-10 text-stone-950">
      <div className="mx-auto max-w-xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Taste of Gratitude</p>
          <h1 className="mt-3 text-3xl font-bold">Message our team</h1>
          <p className="mt-3 text-sm leading-6 text-stone-700">
            Questions about a flavor, pickup, or delivery? We’re happy to help.
            We’ll confirm your order and total before sending a secure payment link.
          </p>
        </header>
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
          {smsHref ? (
            <>
              <h2 className="text-xl font-bold">Text Taste of Gratitude</h2>
              <p className="text-sm text-stone-700">Tap below to open your phone’s text messages. We’ll be glad to hear from you.</p>
              <a href={smsHref} className="inline-flex min-h-12 items-center rounded-full bg-emerald-800 px-6 py-3 font-bold text-white">Text us</a>
            </>
          ) : hosted ? (
            <>
              <h2 className="text-xl font-bold">Contact us through Square</h2>
              <p className="text-sm leading-6 text-stone-700">
                You can reach our team using the button below.
                We’ll be glad to help.
              </p>
              <a href={hosted} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center rounded-full bg-emerald-800 px-6 py-3 font-bold text-white">
                Message our team
              </a>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Send a website message</h2>
              <p className="text-sm leading-6 text-stone-700">
                Texting isn’t available here right now, but you can still send us a note.
                We’ll follow up using the contact details you share.
              </p>
              <Link href="/contact?source=message-us#send-message"
                className="inline-flex min-h-12 items-center rounded-full bg-emerald-800 px-6 py-3 font-bold text-white">
                Send website message
              </Link>
            </>
          )}
          <p className="border-t pt-4 text-xs leading-5 text-stone-600">
            A message doesn’t place or pay for an order. We’ll confirm what’s available and
            send a secure payment link when you’re ready. Please don’t text card details.
          </p>
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-bold">Ready to order?</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            Choose your favorite drinks or sea moss, then tell us how you’d like to get them.
            We’ll check availability and confirm the full price before you pay.
          </p>
          <Link href="/order-request" className="mt-4 inline-block font-bold text-emerald-800 underline">
            Start an order
          </Link>
        </section>
      </div>
    </main>
  );
}
