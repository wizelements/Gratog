import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';

export const metadata = {
  title: 'Subscription Plans | Taste of Gratitude',
  description: 'Compare Taste of Gratitude monthly sea moss subscription plans and start your wellness routine.',
  alternates: { canonical: 'https://tasteofgratitude.shop/subscriptions' },
};

export default function SubscriptionsLandingPage() {
  const plans = Object.entries(SUBSCRIPTION_TIERS);

  return (
    <main className="container py-12">
      <h1 className="text-4xl font-bold mb-4">Subscription Plans</h1>
      <p className="text-gray-600 mb-10">Choose a monthly plan and save on your wellness essentials.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map(([id, plan]) => (
          <section key={id} className="rounded-xl border p-6 shadow-sm bg-white">
            <h2 className="text-2xl font-semibold">{plan.name}</h2>
            <p className="text-gray-600 mt-2">{plan.description}</p>
            <p className="text-3xl font-bold mt-4">${(plan.price / 100).toFixed(2)}<span className="text-base font-normal"> / month</span></p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {plan.benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}
            </ul>
            <a href={`/contact?subject=${encodeURIComponent('Subscription: ' + plan.name)}`} className="inline-block mt-6 px-5 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition-colors">Get Started</a>
            <p className="mt-2 text-xs text-gray-500">Contact us to get started with your subscription.</p>
          </section>
        ))}
      </div>
    </main>
  );
}
