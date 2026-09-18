import Link from 'next/link';
import { Calendar, CheckCircle, MapPin, Package, Store, Users } from 'lucide-react';
import RetentionForm from '@/components/RetentionForm';

export const metadata = {
  title: 'Book Taste of Gratitude for Your Event',
  description: 'Invite Taste of Gratitude to tournaments, corporate events, community gatherings, wellness events, private events, pop-ups, and vendor opportunities.',
  alternates: { canonical: '/events' },
};

const EVENT_TYPES = [
  'Golf and sports tournaments',
  'Corporate and employee events',
  'Community festivals and neighborhood events',
  'Wellness, fitness, and lifestyle events',
  'Private celebrations and gatherings',
  'Pop-ups, vendor markets, and special collaborations',
];

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf5] text-stone-950">
      <section className="border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 py-14 text-white sm:py-20">
        <div className="container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
              Events • tournaments • vendor opportunities
            </p>
            <h1 className="mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              Bring Taste of Gratitude to your event.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/90">
              Our market setup works especially well where people can discover, sample, ask questions, and buy fresh products in person. Golf tournaments have been a strong fit, but we are not limited to them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#event-inquiry" className="rounded-full bg-white px-7 py-3 font-bold text-emerald-950 hover:bg-emerald-50">
                Ask about your event
              </Link>
              <Link href="/weekly-menu" className="rounded-full border border-white/30 px-7 py-3 font-bold text-white hover:bg-white/10">
                See what we make
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">Good fits include</p>
            <div className="mt-5 grid gap-3">
              {EVENT_TYPES.map((item) => (
                <p key={item} className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 text-sm text-emerald-50">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Store, title: 'Vendor setup', text: 'A market-style booth where guests can discover and purchase products.' },
            { icon: Package, title: 'Planned quantities', text: 'We size the menu and product quantities around the event, timing, and expected attendance.' },
            { icon: Users, title: 'Guest interaction', text: 'Sampling, product education, and the same personal experience that works at farmers markets.' },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-[1.5rem] border border-emerald-900/10 bg-white p-6 shadow-sm">
              <Icon className="h-7 w-7 text-emerald-700" />
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-stone-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="event-inquiry" className="border-y border-emerald-900/10 bg-white py-12 sm:py-16">
        <div className="container grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Event inquiry</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Tell us what you are planning.</h2>
            <p className="mt-4 max-w-xl leading-8 text-stone-700">
              Share the date, location, event type, estimated attendance, and what you want the guest experience to feel like. We will respond personally about fit, menu, setup, and next steps.
            </p>
            <div className="mt-6 grid gap-4 text-sm text-stone-700">
              <p className="flex gap-3"><Calendar className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />Event date and timing</p>
              <p className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />Location and setup needs</p>
              <p className="flex gap-3"><Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />Expected attendance and audience</p>
            </div>
          </div>
          <RetentionForm
            intent="event_booking_inquiry"
            source="events_page"
            title="Book Taste of Gratitude"
            description="Send the event basics and we’ll follow up personally."
            cta="Send event inquiry"
            collectPhone
            requireEmail
            collectMessage
            messagePlaceholder="Event type, date, location, estimated attendance, setup/vendor details, and anything else we should know."
            successTitle="Event inquiry received."
            successDescription="We’ll review the details and follow up personally about availability, fit, and next steps."
          />
        </div>
      </section>
    </main>
  );
}
