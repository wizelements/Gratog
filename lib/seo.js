// SEO and metadata configuration for production
export const siteConfig = {
  name: "Taste of Gratitude",
  title: "Taste of Gratitude | Premium Sea Moss Gel & Natural Wellness Products",
  description: "Discover nature's finest sea moss creations at Taste of Gratitude. Premium elderberry sea moss, healing soursop blends, and organic wellness products. Order online for pickup at Serenbe Farmers Market or delivery in Atlanta.",
  keywords: [
    "sea moss gel",
    "elderberry sea moss", 
    "natural wellness products",
    "organic supplements",
    "immune support",
    "serenbe farmers market",
    "atlanta delivery",
    "healing soursop",
    "grateful guardian",
    "golden glow gel",
    "natural health",
    "premium sea moss",
    "taste of gratitude"
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://tasteofgratitude.shop",
  ogImage: "/images/og-image.jpg",
  creator: "@tasteofgratitude",
  language: "en-US",
  locale: "en_US",
  type: "website",
  contact: {
    email: "hello@tasteofgratitude.shop",
    phone: "(404) 555-1234"
  },
  business: {
    name: "Taste of Gratitude",
    address: {
      streetAddress: "Serenbe Farmers Market",
      addressLocality: "Chattahoochee Hills", 
      addressRegion: "GA",
      postalCode: "30268",
      addressCountry: "US"
    },
    openingHours: [
      "Sa 09:00-13:00" // Saturday 9 AM - 1 PM
    ],
    priceRange: "$11-$36",
    servesCuisine: "Health Food",
    paymentAccepted: ["Cash", "Credit Card", "Square"]
  }
};

export const generateMetadata = (page = {}) => {
  const {
    title = siteConfig.title,
    description = siteConfig.description,
    image = siteConfig.ogImage,
    url = siteConfig.url,
    type = "website",
    noIndex = false
  } = page;

  return {
    title,
    description,
    keywords: siteConfig.keywords.join(", "),
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.creator,
    
    // Viewport and device optimization
    viewport: "width=device-width, initial-scale=1, maximum-scale=5",
    
    // Robots
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    
    // OpenGraph
    openGraph: {
      type,
      locale: siteConfig.locale,
      url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
    },
    
    // Twitter
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: siteConfig.creator,
    },
    
    // Additional meta tags
    other: {
      "application-name": siteConfig.name,
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": siteConfig.name,
      "format-detection": "telephone=no",
      "mobile-web-app-capable": "yes",
      "msapplication-config": "/icons/browserconfig.xml",
      "msapplication-TileColor": "#D4AF37",
      "msapplication-tap-highlight": "no",
      "theme-color": "#D4AF37",
    },
  };
};

// Structured data for SEO
export const generateStructuredData = (page = {}) => {
  const baseData = {
    "@context": "https://schema.org",
    "@graph": [
      // Organization
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.business.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/images/logo.png`,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: siteConfig.contact.phone,
          contactType: "customer service",
          email: siteConfig.contact.email
        },
        address: {
          "@type": "PostalAddress",
          ...siteConfig.business.address
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Saturday",
          opens: "09:00",
          closes: "13:00"
        }
      },
      
      // Website
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: {
          "@id": `${siteConfig.url}/#organization`
        },
        potentialAction: [
          {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteConfig.url}/catalog?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        ]
      },
      
      // Local Business
      {
        "@type": "Store",
        "@id": `${siteConfig.url}/#store`,
        name: siteConfig.business.name,
        url: siteConfig.url,
        telephone: siteConfig.contact.phone,
        email: siteConfig.contact.email,
        address: {
          "@type": "PostalAddress",
          ...siteConfig.business.address
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification", 
          dayOfWeek: "Saturday",
          opens: "09:00",
          closes: "13:00"
        },
        priceRange: siteConfig.business.priceRange,
        servesCuisine: siteConfig.business.servesCuisine,
        paymentAccepted: siteConfig.business.paymentAccepted,
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Sea Moss Products",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Elderberry Sea Moss Gel",
                description: "Premium elderberry-infused sea moss gel for immune support"
              }
            }
          ]
        }
      }
    ]
  };
  
  // Add page-specific structured data
  if (page.type === 'product' && page.product) {
    baseData["@graph"].push({
      "@type": "Product",
      name: page.product.name,
      description: page.product.description,
      image: page.product.image,
      sku: page.product.id,
      brand: {
        "@type": "Brand",
        name: siteConfig.business.name
      },
      offers: {
        "@type": "Offer",
        price: (page.product.price / 100).toFixed(2),
        priceCurrency: "USD",
        availability: page.product.stock > 0 ? 
          "https://schema.org/InStock" : 
          "https://schema.org/OutOfStock",
        seller: {
          "@id": `${siteConfig.url}/#organization`
        }
      }
    });
  }
  
  return baseData;
};

// PWA manifest
export const generateManifest = () => ({
  name: siteConfig.name,
  short_name: "ToG",
  description: siteConfig.description,
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#D4AF37",
  orientation: "portrait-primary",
  categories: ["food", "health", "shopping"],
  icons: [
    {
      src: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable"
    },
    {
      src: "/icons/icon-512x512.png", 
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable"
    }
  ]
});