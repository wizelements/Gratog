'use client';

import Script from 'next/script';

/**
 * Google Analytics 4 Component
 * Loads GA4 tracking script conditionally based on NEXT_PUBLIC_GA_ID
 * 
 * Usage: Add to app/layout.js inside the <head> or at the top of <body>
 * 
 * Required Environment Variable: NEXT_PUBLIC_GA_ID
 */
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // Don't render anything if GA ID is not configured
  if (!gaId) {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 GA4: No NEXT_PUBLIC_GA_ID configured, analytics disabled');
    }
    return null;
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              send_page_view: true,
              cookie_flags: 'SameSite=None;Secure',
            });
          `,
        }}
      />
    </>
  );
}
