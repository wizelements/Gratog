/**
 * Provider webhook signatures prove who sent an event, not that a payment
 * settles this exact local order. Do not mark ANY commerce order confirmed
 * until the captured USD amount matches its server-stored checkout total.
 */
export function assertExactCapturedPayment(
  order: Record<string, any>, providerPayment: Record<string, any>,
): void {
  const amount = Number(providerPayment.amount_money?.amount ?? providerPayment.amountMoney?.amount);
  const currency = String(
    providerPayment.amount_money?.currency ?? providerPayment.amountMoney?.currency ?? '',
  ).toUpperCase();
  const rawCents = order.totalCents ?? order.pricing?.totalCents ?? order.amountCents;
  const dollars = order.total ?? order.pricing?.total ?? order.amountDue;
  const expected = rawCents !== undefined && rawCents !== null
    ? Number(rawCents)
    : typeof dollars === 'number' && Number.isFinite(dollars)
      ? Math.round(dollars * 100)
      : NaN;

  if (!Number.isSafeInteger(amount) || amount <= 0
      || !Number.isSafeInteger(expected) || expected <= 0
      || amount !== expected || currency !== 'USD') {
    throw new Error('Captured Square amount or currency does not match the authoritative order total; reconcile before confirmation');
  }
}
