'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

/**
 * Custom Vercel site contact entry point. This must never be branded as a
 * Square-hosted Text Us widget: Square installs that widget only on supported
 * Square-hosted transactional pages.
 */
export default function WebsiteMessageButton({ smsHref }: { smsHref?: string | null }) {
  const pathname = usePathname();
  if (!pathname || ['/admin','/api','/contact','/text-us',
    '/preorder','/order','/m/'].some(path => pathname.startsWith(path))) return null;
  return (
    <nav aria-label="Contact Taste of Gratitude"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {smsHref && (
        <a href={smsHref}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-emerald-800 px-4 py-3 text-sm font-semibold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Text us
        </a>
      )}
      <Link href="/contact?source=message-us#send-message"
        aria-label="Other ways to contact Taste of Gratitude"
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-emerald-900 bg-white px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        {smsHref ? 'Other ways to contact us' : 'Message us'}
      </Link>
    </nav>
  );
}
