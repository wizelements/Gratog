'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const BREADCRUMB_LABELS = {
  '': 'Home',
  'catalog': 'Catalog',
  'product': 'Product',
  'about': 'About',
  'contact': 'Contact',
  'explore': 'Explore',
  'rewards': 'Rewards',
  'login': 'Login',
  'register': 'Register',
  'profile': 'Profile',
  'checkout': 'Checkout',
  'order': 'Order',
  'community': 'Community',
  'markets': 'Markets',
  'ingredients': 'Ingredients',
  'games': 'Games',
  'learn': 'Learn',
  'showcase': 'Showcase',
  'faq': 'FAQ',
  'privacy': 'Privacy',
  'terms': 'Terms',
  'policies': 'Policies',
};

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show breadcrumbs on home page or admin routes
  if (pathname === '/' || pathname.startsWith('/admin')) {
    return null;
  }

  // Build breadcrumb path
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .slice(0, 4); // Limit to 4 levels

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    ...segments.map((segment, idx) => {
      const href = '/' + segments.slice(0, idx + 1).join('/');
      const label =
        BREADCRUMB_LABELS[segment] ||
        segment.replace(/-/g, ' ').charAt(0).toUpperCase() +
          segment.replace(/-/g, ' ').slice(1);

      return { label, href, isLast: idx === segments.length - 1 };
    }),
  ];

  return (
    <nav
      aria-label="Breadcrumb"
      className="bg-gray-50 border-b px-4 py-3 sticky top-16 z-40 hidden sm:block"
    >
      <div className="container">
        <ol className="flex items-center space-x-1 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <li key={crumb.href} className="flex items-center">
              {idx === 0 ? (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1 text-gray-600 hover:text-[#D4AF37] transition-colors"
                  aria-current={crumb.isLast ? 'page' : undefined}
                >
                  <Home className="h-4 w-4" />
                  {crumb.label}
                </Link>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
                  {crumb.isLast ? (
                    <span
                      className="text-gray-900 font-medium"
                      aria-current="page"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-gray-600 hover:text-[#D4AF37] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
