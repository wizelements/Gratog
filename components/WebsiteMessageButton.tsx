'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

/**
 * Custom Vercel site contact entry point. This must never be branded as a
 * Square-hosted Text Us widget: Square installs that widget only on supported
 * Square-hosted transactional pages.
 */
export default function WebsiteMessageButton() {
  const pathname = usePathname();
  if (!pathname || ['/admin','/api','/checkout','/order-request','/contact',
    '/preorder','/order','/m/'].some(path => pathname.startsWith(path))) return null;
  return (
    <Link href="/contact?source=message-us"
      aria-label="Message Taste of Gratitude"
      className="fixed bottom-24 left-3 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-emerald-900 bg-white px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 sm:bottom-6 sm:left-6">
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      Message us
    </Link>
  );
}
