/**
 * 🎯 SEO Head Component
 * Dynamically inject structured data and meta tags
 */

import Script from 'next/script';

interface SEOHeadProps {
  structuredData?: object | object[];
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

export default function SEOHead({ 
  structuredData, 
  title, 
  description, 
  canonical,
  noindex = false 
}: SEOHeadProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop';
  
  return (
    <>
      {/* Structured Data
          SECURITY NOTE: dangerouslySetInnerHTML is safe here because:
          1. JSON.stringify() escapes all special characters (<, >, &, ", etc.)
          2. Content is in a script tag with type="application/ld+json" (not executed as JS or rendered as HTML)
          3. structuredData comes from schema generators, not raw user input */}
      {structuredData && (
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              Array.isArray(structuredData) ? structuredData : [structuredData]
            ),
          }}
        />
      )}

      {/* Additional meta tags if needed */}
      {title && (
        <>
          <meta property="og:title" content={title} />
          <meta name="twitter:title" content={title} />
        </>
      )}

      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}

      {canonical && (
        <>
          <link rel="canonical" href={canonical.startsWith('http') ? canonical : `${baseUrl}${canonical}`} />
          <meta property="og:url" content={canonical.startsWith('http') ? canonical : `${baseUrl}${canonical}`} />
        </>
      )}

      {noindex && (
        <meta name="robots" content="noindex,nofollow" />
      )}

      {/* Preconnect to external domains for faster loading */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://web.squarecdn.com" />
      <link rel="preconnect" href="https://connect.squareup.com" />
      <link rel="dns-prefetch" href="https://images.unsplash.com" />

      {/* Favicon and app icons */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <meta name="theme-color" content="#059669" />
    </>
  );
}
