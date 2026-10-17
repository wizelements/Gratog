/**
 * Prevent a Vercel Preview override from ever sending a payment request to
 * Square Production. This is enforced at the SDK initialization boundary.
 */
export function assertSquareEnvironmentIsolation(
  accessToken: string,
  squareEnvironment: string,
  vercelEnvironment: string | undefined,
): void {
  if (vercelEnvironment === 'preview' && squareEnvironment !== 'sandbox') {
    throw new Error('Square Preview payment blocked: SQUARE_ENVIRONMENT must be sandbox.');
  }
  if (squareEnvironment === 'sandbox' &&
      (accessToken.startsWith('EAAA') || accessToken.startsWith('sq0atp-'))) {
    throw new Error('Square sandbox payment blocked: production access token detected.');
  }
}
