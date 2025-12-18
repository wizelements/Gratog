'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import Script from 'next/script';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tasteofgratitude.shop';

/**
 * Breadcrumbs component with JSON-LD structured data
 * Provides visual navigation and SEO-friendly BreadcrumbList schema
 */
export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = [
    { name: 'Home', path: '/' },
    ...items,
  ];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${BASE_URL}${item.path}`,
    })),
  };

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      <nav 
        aria-label="Breadcrumb" 
        className={`bg-gray-50 py-3 ${className}`}
        itemScope 
        itemType="https://schema.org/BreadcrumbList"
      >
        <div className="container">
          <ol className="flex items-center flex-wrap gap-1 text-sm">
            {allItems.map((item, index) => {
              const isLast = index === allItems.length - 1;
              const isFirst = index === 0;

              return (
                <li 
                  key={item.path}
                  className="flex items-center"
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                >
                  {index > 0 && (
                    <ChevronRight 
                      className="h-4 w-4 mx-1 text-gray-400 flex-shrink-0" 
                      aria-hidden="true"
                    />
                  )}
                  
                  {isLast ? (
                    <span 
                      className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-none"
                      itemProp="name"
                      aria-current="page"
                    >
                      {item.name}
                    </span>
                  ) : (
                    <Link
                      href={item.path}
                      className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1"
                      itemProp="item"
                    >
                      {isFirst && (
                        <Home className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span itemProp="name" className={isFirst ? 'sr-only sm:not-sr-only' : ''}>
                        {item.name}
                      </span>
                    </Link>
                  )}
                  
                  <meta itemProp="position" content={String(index + 1)} />
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </>
  );
}

/**
 * Generate breadcrumb items for product pages
 */
export function getProductBreadcrumbs(product: { 
  name: string; 
  slug: string; 
  category?: string;
  intelligentCategory?: string;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { name: 'Catalog', path: '/catalog' },
  ];

  const category = product.intelligentCategory || product.category;
  if (category) {
    items.push({
      name: category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      path: `/catalog?category=${encodeURIComponent(category)}`,
    });
  }

  items.push({
    name: product.name,
    path: `/product/${product.slug}`,
  });

  return items;
}

/**
 * Generate breadcrumb items for category pages
 */
export function getCategoryBreadcrumbs(category: string): BreadcrumbItem[] {
  return [
    { name: 'Catalog', path: '/catalog' },
    { 
      name: category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      path: `/catalog?category=${encodeURIComponent(category)}` 
    },
  ];
}

/**
 * Generate breadcrumb items for static pages
 */
export function getStaticPageBreadcrumbs(pageName: string, pagePath: string): BreadcrumbItem[] {
  return [{ name: pageName, path: pagePath }];
}
