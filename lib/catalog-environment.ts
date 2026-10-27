/**
 * Environment-scoped merchant catalog admission.
 *
 * Production MUST reject Sandbox-tagged records even if a shared MongoDB
 * accidentally contains them. A Preview can opt in to Sandbox records only
 * after the deploy operator has independently verified database separation.
 *
 * Neither setting provides database isolation by itself; the environment
 * guard is an explicit release prerequisite, never an automatic fallback.
 */
export function isolatedSandboxPreviewEnabled(): boolean {
  return process.env.VERCEL_ENV === 'preview' &&
    process.env.SQUARE_ENVIRONMENT === 'sandbox' &&
    process.env.PREVIEW_DB_ISOLATION_VERIFIED === 'true' &&
    process.env.PREVIEW_SANDBOX_CATALOG_ENABLED === 'true';
}

export function merchantCatalogScopeFilter(): Record<string, unknown> {
  if (isolatedSandboxPreviewEnabled()) {
    // The isolated Preview must never inherit live merchant merchandise.
    return { _squareSyncEnv: 'sandbox' };
  }
  return {
    $nor: [
      { source: 'sandbox_sync' },
      { id: { $regex: /^sandbox-/i } },
      { squareId: { $regex: /^sandbox-/i } },
      { _squareSyncEnv: 'sandbox' },
    ],
  };
}
