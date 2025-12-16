/**
 * 🌍 Local Business SEO & Google My Business Optimization
 * Critical for local search rankings
 */

export interface MarketLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  hours: string;
  description: string;
}

/**
 * Local Business Schema for each market location
 */
export function getLocalBusinessSchema(location: MarketLocation, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    '@id': `${baseUrl}/markets#${location.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: `Taste of Gratitude - ${location.name}`,
    description: location.description,
    url: baseUrl,
    telephone: '+1-470-555-0123',
    email: 'info@tasteofgratitude.shop',
    image: `${baseUrl}/images/market-${location.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
    
    address: {
      '@type': 'PostalAddress',
      streetAddress: location.address,
      addressLocality: location.city,
      addressRegion: location.state,
      postalCode: location.zip,
      addressCountry: 'US',
    },
    
    geo: {
      '@type': 'GeoCoordinates',
      latitude: location.lat,
      longitude: location.lng,
    },
    
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: location.hours.split('-')[0].trim(),
      closes: location.hours.split('-')[1].trim(),
    },
    
    priceRange: '$$',
    acceptsReservations: false,
    paymentAccepted: 'Cash, Credit Card, Debit Card, Apple Pay, Google Pay, Venmo, Cash App',
    currenciesAccepted: 'USD',
    
    hasMap: `https://www.google.com/maps?q=${location.lat},${location.lng}`,
    
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '847',
      bestRating: '5',
      worstRating: '1',
    },
    
    sameAs: [
      'https://www.instagram.com/tasteofgratitude',
      'https://www.facebook.com/tasteofgratitude',
    ],
  };
}

/**
 * Event Schema for market appearances
 */
export function getMarketEventSchema(location: MarketLocation, date: string, baseUrl: string) {
  const startDate = new Date(date);
  const [openTime, closeTime] = location.hours.split('-').map(t => t.trim());
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `Taste of Gratitude at ${location.name}`,
    description: `Visit our booth for wildcrafted sea moss gel and wellness products at ${location.name}. ${location.description}`,
    image: `${baseUrl}/images/market-event.jpg`,
    
    startDate: `${date}T${openTime.replace(':', '')}:00`,
    endDate: `${date}T${closeTime.replace(':', '')}:00`,
    
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    
    location: {
      '@type': 'Place',
      name: location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: location.address,
        addressLocality: location.city,
        addressRegion: location.state,
        postalCode: location.zip,
        addressCountry: 'US',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: location.lat,
        longitude: location.lng,
      },
    },
    
    organizer: {
      '@type': 'Organization',
      name: 'Taste of Gratitude',
      url: baseUrl,
    },
    
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      price: '0',
      priceCurrency: 'USD',
      validFrom: date,
    },
  };
}

/**
 * Service Schema for delivery/pickup services
 */
export function getServiceSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Sea Moss Delivery Service',
    provider: {
      '@type': 'Organization',
      name: 'Taste of Gratitude',
      url: baseUrl,
    },
    areaServed: {
      '@type': 'City',
      name: 'Atlanta',
      '@id': 'https://en.wikipedia.org/wiki/Atlanta',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Sea Moss Products',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Wildcrafted Sea Moss Gel',
          },
        },
      ],
    },
  };
}

/**
 * Generate location keywords for SEO
 */
export function getLocationKeywords(city: string, state: string): string[] {
  return [
    `sea moss ${city}`,
    `sea moss gel ${city}`,
    `wildcrafted sea moss ${city} ${state}`,
    `buy sea moss ${city}`,
    `sea moss near me ${city}`,
    `Irish moss ${city}`,
    `sea moss delivery ${city}`,
    `farmers market ${city}`,
    `natural supplements ${city}`,
    `holistic wellness ${city}`,
    `${city} sea moss vendor`,
    `${city} farmers market sea moss`,
  ];
}

/**
 * Generate rich snippets for local search
 */
export function getLocalSEOMetadata(location: MarketLocation) {
  return {
    title: `Wildcrafted Sea Moss at ${location.name} | Taste of Gratitude`,
    description: `Find us at ${location.name} in ${location.city}, ${location.state}. Premium wildcrafted sea moss gel with 92 essential minerals. ${location.hours}. ${location.description}`,
    keywords: getLocationKeywords(location.city, location.state),
  };
}

/**
 * Atlanta market locations
 */
export const atlantaMarkets: MarketLocation[] = [
  {
    name: 'Serenbe Farmers Market',
    address: '10950 Hutcheson Ferry Rd',
    city: 'Palmetto',
    state: 'GA',
    zip: '30268',
    lat: 33.4848,
    lng: -84.6860,
    hours: '09:00-13:00',
    description: 'Our flagship location featuring the full product line. Look for the gold Taste of Gratitude banners at Booth #12.',
  },
  {
    name: 'Browns Mill Community Market',
    address: 'Browns Mill Recreation Center',
    city: 'Atlanta',
    state: 'GA',
    zip: '30354',
    lat: 33.6500,
    lng: -84.4100,
    hours: '15:00-18:00',
    description: 'Community-focused market bringing wellness to South Atlanta. Featured products and special promotions available.',
  },
];

/**
 * Generate NAP (Name, Address, Phone) citation data
 * Critical for local SEO consistency
 */
export function getNAPCitation() {
  return {
    name: 'Taste of Gratitude',
    phone: '+1-470-555-0123',
    email: 'info@tasteofgratitude.shop',
    website: 'https://tasteofgratitude.shop',
    address: 'Atlanta, GA',
    hours: 'Saturday: 9:00 AM - 6:00 PM',
  };
}
