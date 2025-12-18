'use client';

/**
 * Enhanced Skip Links for WCAG 2.1 AA Compliance
 * Provides keyboard users with quick navigation to main page sections
 */
export default function SkipLinks() {
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#footer', label: 'Skip to footer' },
  ];

  return (
    <div className="skip-links">
      {skipLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:font-medium focus:text-sm"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
