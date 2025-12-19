'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowUp, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StickySecondaryNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      // Show after scrolling past header (64px) + breadcrumb (48px)
      setIsVisible(y > 112);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Don't show on home page or admin
  if (pathname === '/' || pathname.startsWith('/admin')) {
    return null;
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex flex-col gap-3"
      role="region"
      aria-label="Secondary Navigation"
    >
      {/* Scroll to Top Button */}
      <Button
        onClick={scrollToTop}
        size="lg"
        className="h-12 w-12 rounded-full bg-[#D4AF37] text-white hover:bg-[#C49F27] shadow-lg hover:shadow-xl transition-all hover:scale-110 p-0"
        aria-label={`Scroll to top (${scrollY}px)`}
        title="Back to top"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>

      {/* Quick Help Menu */}
      <div className="relative">
        <Button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          size="lg"
          className="h-12 w-12 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all hover:scale-110 p-0"
          aria-label="Quick help menu"
          title="Help & Support"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <span className="text-xl">?</span>
          )}
        </Button>

        {mobileMenuOpen && (
          <div className="absolute bottom-16 right-0 bg-white border rounded-lg shadow-xl p-2 min-w-max">
            <nav className="flex flex-col gap-1" role="menu">
              {[
                { label: 'FAQ', href: '/#faq', icon: '?' },
                { label: 'Contact', href: '/contact', icon: '📧' },
                { label: 'Chat', onClick: () => window.Tawk_API?.toggle?.(), icon: '💬' },
                { label: 'Shipping', href: '/contact', icon: '🚚' },
              ].map((item) => (
                <div key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block px-4 py-2 text-sm hover:bg-gray-100 rounded transition-colors text-left w-full"
                      onClick={() => setMobileMenuOpen(false)}
                      role="menuitem"
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        item.onClick?.();
                        setMobileMenuOpen(false);
                      }}
                      className="block px-4 py-2 text-sm hover:bg-gray-100 rounded transition-colors text-left w-full"
                      role="menuitem"
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
