import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { verifySubscriptionAccessToken } from '@/lib/subscription-access';

export const dynamic = 'force-dynamic';

export default async function SubscriptionDetailPage({ params, searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token;
  const tokenData = verifySubscriptionAccessToken(token);
  const { id } = await params;

  if (!tokenData) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-bold mb-4">Invalid Access Link</h1>
        <p className="text-gray-600">This subscription link is invalid or has expired.</p>
      </main>
    );
  }

  if (!ObjectId.isValid(id)) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-bold mb-4">Subscription Not Found</h1>
      </main>
    );
  }

  const { db } = await connectToDatabase();
  const subscription = await db.collection('subscriptions').findOne({ _id: new ObjectId(id) });

  if (!subscription || String(subscription.email || '').toLowerCase() !== tokenData.email) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-bold mb-4">Unauthorized</h1>
        <p className="text-gray-600">This link does not match the subscription owner.</p>
      </main>
    );
  }

  const billingHistoryUrl = `/api/subscriptions/${id}/billing-history?token=${encodeURIComponent(token)}`;

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-2">{subscription.planName}</h1>
      <p className="text-gray-600 mb-6">Status: {subscription.status}</p>
      <div className="grid gap-3 max-w-xl">
        <div className="rounded-lg border p-4">Monthly price: ${subscription.monthlyPrice}</div>
        <div className="rounded-lg border p-4">Next charge: {subscription.nextChargeDate ? new Date(subscription.nextChargeDate).toLocaleDateString() : 'TBD'}</div>
        <a className="text-emerald-700 font-medium" href={billingHistoryUrl}>View Billing History (JSON)</a>
      </div>
    </main>
  );
}
