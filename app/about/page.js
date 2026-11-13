import Link from 'next/link';
import { Heart, Leaf, MapPin, MessageCircle } from 'lucide-react';

export const metadata = {
  title: 'Our Story | Taste of Gratitude',
  description: 'Meet Jenneisha Glover and discover the personal journey, Atlanta juice-bar experience, and Ted’s Gym request behind Taste of Gratitude.',
};

export default function AboutPage() {
  return (
    <main className="bg-[#fbfaf5] text-stone-950">
      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Our story</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Taste of Gratitude began with a fresh start.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50">
            A personal journey, a love for making fresh food, and a request from a gym
            grew into the Atlanta business we share with you today.
          </p>
          <p className="mt-5 text-base font-semibold text-emerald-100">Jenneisha Glover · Founder</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14 sm:py-20" aria-labelledby="jenneisha-story">
        <h2 id="jenneisha-story" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hi, I’m Jenneisha.
        </h2>
        <div className="mt-7 space-y-6 text-lg leading-8 text-stone-700">
          <p>
            Before Taste of Gratitude, I was trying to find my way back to feeling good
            in my own body. I had struggled with stomach issues, my weight, and habits
            I wanted to change. In my early twenties, a frightening experience with
            my breathing made me realize I needed to take better care of myself.
          </p>
          <p>
            I started moving more, learning about food, growing what I could, and
            making fresh juices. I made progress and had setbacks, too. Through all of
            it, I kept learning and sharing what I was discovering with the people around me.
          </p>
          <p>
            In 2019, I visited Atlanta from South Bend, Indiana. I connected with the
            community I found here and eventually made Atlanta my home. I drove Lyft
            while getting settled and worked at a local juice bar. That experience taught
            me about ingredients, flavor, and what people really enjoyed. But seeing
            how juices were processed to last longer also reminded me why I loved
            making fresh juice in the first place.
          </p>
          <p>
            I began making my own juices and sea moss products. Sea moss wasn’t
            something the companies I worked for offered, so I learned to prepare it
            myself and started sharing it alongside what I knew about fresh food.
            Then a customer asked if I could make products for <strong className="text-stone-900">Ted’s Gym</strong>.
            That invitation helped me see that something I’d started for myself
            could become something I made for my community.
          </p>
          <p>
            That’s where Taste of Gratitude came from. The name reflects how thankful
            I am for another chance to make choices that feel right for me—and for the
            people who have supported this journey. Our products aren’t miracle
            promises. They’re drinks and foods made with care, real ingredients,
            and plenty of gratitude.
          </p>
          <p>
            Today, you can meet us at Serenbe Farmers Market, explore our small-batch
            lemonades, juices, and sea moss, and ask me what goes into each one.
            I’m glad you’re here.
          </p>
        </div>
      </section>

      <section className="border-y border-emerald-900/10 bg-white px-5 py-14" aria-labelledby="our-approach">
        <div className="mx-auto max-w-5xl">
          <h2 id="our-approach" className="text-center text-3xl font-semibold">What matters to us</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 p-6">
              <Leaf className="h-7 w-7 text-emerald-800" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">Know what you’re enjoying</h3>
              <p className="mt-2 leading-7 text-stone-700">Real ingredients and clear descriptions, so you can choose what works for you.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 p-6">
              <Heart className="h-7 w-7 text-emerald-800" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">Made in small batches</h3>
              <p className="mt-2 leading-7 text-stone-700">We make our favorites with care and leave room for fresh, seasonal ideas.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 p-6">
              <MessageCircle className="h-7 w-7 text-emerald-800" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">A conversation, not a sales pitch</h3>
              <p className="mt-2 leading-7 text-stone-700">Curious about a flavor or ingredient? Ask us. We love sharing what we make.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-emerald-950 px-5 py-14 text-center text-white">
        <MapPin className="mx-auto h-8 w-8 text-emerald-200" aria-hidden="true" />
        <h2 className="mt-4 text-3xl font-semibold">Come meet us at Serenbe.</h2>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-emerald-50">
          Try a flavor, ask a question, or bring home something fresh. We’d love to see you.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/markets" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 font-semibold text-emerald-950 hover:bg-emerald-50">
            Visit us at the market
          </Link>
          <Link href="/weekly-menu" className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-200 px-7 py-3 font-semibold text-white hover:bg-white/10">
            Explore this week’s menu
          </Link>
        </div>
      </section>
    </main>
  );
}
