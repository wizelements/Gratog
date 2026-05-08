/**
 * 🚀 Gratog Pay Flow — Mobile Switch Banner
 * Allows mobile users to switch between /pay and full site
 * Add this to app/pay/page.tsx
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSwitchBannerProps {
  className?: string;
}

export function MobileSwitchBanner({ className }: MobileSwitchBannerProps) {
  return (
    <div className={cn(
      "bg-amber-50 border-b border-amber-200 px-4 py-2",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="text-amber-800 text-sm font-medium">
            🚀 Quick Checkout Mode
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <Link
            href="/?fullSite=true"
            className="text-amber-700 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Full Site
          </Link>
          <span className="text-amber-400">|</span>
          <Link href="/about" className="text-amber-600 hover:text-amber-800 hover:underline">
            About
          </Link>
          <Link href="/faq" className="text-amber-600 hover:text-amber-800 hover:underline">
            FAQ
          </Link>
          <Link href="/contact" className="text-amber-600 hover:text-amber-800 hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop-only banner for /pay page
 * Shows when desktop users visit /pay directly
 */
export function DesktopNoticeBanner({ className }: MobileSwitchBannerProps) {
  return (
    <div className={cn(
      "bg-blue-50 border-b border-blue-200 px-4 py-2",
      className
    )}
    >
      <div className="flex items-center justify-between">
        <span className="text-blue-800 text-sm">
          💡 You're viewing the mobile checkout. <Link href="/" className="underline">Browse full catalog →</Link>
        </span>
      </div>
    </div>
  );
}
