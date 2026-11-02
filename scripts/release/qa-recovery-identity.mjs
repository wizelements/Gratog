/** Guard recovery provenance: only our explicit synthetic Sandbox buyer may be replayed.
 * Never infer an identity from a missing or malformed order snapshot.
 * No raw customer information is included in errors.
 */
export function requireQaRecoveryIdentity(row) {
  if (!row) throw Error('QA_ORDER_NOT_FOUND');
  if (typeof row.customer_snapshot_json !== 'string') {
    throw Error('QA_ORDER_SNAPSHOT_INVALID');
  }
  let customer;
  try { customer = JSON.parse(row.customer_snapshot_json); }
  catch { throw Error('QA_ORDER_SNAPSHOT_INVALID'); }
  if (!customer || typeof customer !== 'object' ||
      customer.email !== 'delivered@resend.dev' ||
      customer.name !== 'Preview Certification Buyer') {
    throw Error('QA_ORDER_IDENTITY_REQUIRED');
  }
  return true;
}
