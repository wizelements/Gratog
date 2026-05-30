/**
 * 🚀 Gratog Pay Flow — Mobile Redirect
 * Detects mobile and redirects to optimized /pay flow
 * Place in app/page.js or middleware
 */

import { headers } from 'next/headers';
// import { redirect } from 'next/navigation';

/**
 * Detect if request is from mobile device
 */
export function isMobileDevice(userAgent: string): boolean {
  if (!userAgent) return false;
  
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;
  return mobileRegex.test(userAgent);
}

/**
 * Middleware or page-level mobile detection
 * Usage in app/page.js:
 * 
 * export default async function HomePage() {
 *   if (await shouldRedirectToPayFlow()) {
 *     redirect('/pay');
 *   }
 *   // ... rest of homepage
 * }
 */
export async function shouldRedirectToPayFlow(): Promise<boolean> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // Check for mobile
  const isMobile = isMobileDevice(userAgent);
  
  // Additional checks (optional):
  // - Check for ?quick=true query param
  // - Check for specific market days/hours
  // - Check for ?source=market referrer
  
  return isMobile;
}

/**
 * Client-side hook for mobile detection
 * For use in client components
 */
export function useIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent;
  return isMobileDevice(userAgent);
}

/**
 * Query param check for forcing pay flow
 * ?mode=quick or ?pay=1
 */
export function shouldShowPayFlow(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get('mode') === 'quick' ||
    searchParams.get('pay') === '1' ||
    searchParams.get('flow') === 'market'
  );
}
