'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Google Analytics 4 Component
 * Loads GA4 tracking script conditionally based on NEXT_PUBLIC_GA_ID
 * 
 * Usage: Add to app/layout.js inside the <head> or at the top of <body>
 * 
 * Required Environment Variable: NEXT_PUBLIC_GA_ID
 * 
 * SECURITY: GA ID is validated to match GA4 format (G-XXXXXXXXXX)
 * to prevent XSS via malicious environment variable injection.
 */

const GA_ID_PATTERN = /^G-[A-Z0-9]{10,}$/;

export default function GoogleAnalytics() {
  const [isValid, setIsValid] = useState(false);
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    if (gaId && GA_ID_PATTERN.test(gaId)) {
      setIsValid(true);
      window.dataLayer = window.dataLayer || [];
      function gtag(...args) {
        window.dataLayer.push(args);
      }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', gaId, {
        page_path: window.location.pathname,
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure',
      });
    } else if (process.env.NODE_ENV === 'development' && gaId) {
      console.warn('📊 GA4: Invalid GA ID format. Expected G-XXXXXXXXXX');
    }
  }, [gaId]);

  if (!gaId) {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 GA4: No NEXT_PUBLIC_GA_ID configured, analytics disabled');
    }
    return null;
  }

  if (!isValid && !GA_ID_PATTERN.test(gaId)) {
    return null;
  }

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
      strategy="afterInteractive"
    />
  );
}
