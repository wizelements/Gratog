import Link from 'next/link';
import { verifySubscriptionAccessToken } from '@/lib/subscription-access';
import { listSubscriptionsByEmail } from '@/lib/subscriptions/repository';

export const dynamic = 'force-dynamic';

export default async function AccountSubscriptionsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token;
  const tokenData = verifySubscriptionAccessToken(token);

  if (!tokenData) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-bold mb-4">Subscription Access Required</h1>
        <p className="text-gray-600">Please open this page from a valid subscription email link.</p>
      </main>
    );
  }

  const subscriptions = await listSubscriptionsByEmail(tokenData.email, 20);

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Your Subscriptions</h1>
      <p className="text-gray-600 mb-8">Manage your active plan, billing history, and delivery preferences.</p>
      <div className="grid gap-4">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="font-semibold text-lg">{sub.planName}</h2>
            <p className="text-sm text-gray-600">Status: {sub.status} · ${sub.monthlyPrice}/month</p>
            <Link
              href={`/account/subscriptions/${sub.id}?token=${encodeURIComponent(token)}`}
              className="inline-block mt-3 text-emerald-700 font-medium"
            >
              Manage Subscription
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
