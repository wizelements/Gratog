import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd } from '@/components/JsonLd';
import { buildHomepageFaqSchema, buildHomepageOrganizationSchema } from '@/seo/schemas';

describe('SEO Schema Module', () => {
  it('builds homepage organization/local business graph as pure data', () => {
    const schema = buildHomepageOrganizationSchema();
    const graph = schema['@graph'];
    const organization = graph.find((item) => item['@type'] === 'Organization');
    const localBusiness = graph.find((item) => item['@type'] === 'LocalBusiness');

    expect(Array.isArray(graph)).toBe(true);
    expect(organization?.name).toBe('Taste of Gratitude');
    expect(Array.isArray(organization?.sameAs)).toBe(true);
    expect(localBusiness?.address?.addressLocality).toBe('Atlanta');
  });

  it('builds faq schema as pure data', () => {
    const schema = buildHomepageFaqSchema();

    expect(schema['@type']).toBe('FAQPage');
    expect(Array.isArray(schema.mainEntity)).toBe(true);
    expect(schema.mainEntity.length).toBeGreaterThan(0);
  });
});

describe('JsonLd Renderer', () => {
  it('renders script tag with serialized schema', () => {
    const html = renderToStaticMarkup(
      React.createElement(JsonLd, {
        id: 'test-schema',
        data: buildHomepageOrganizationSchema()
      })
    );

    expect(html).toContain('application/ld+json');
    expect(html).toContain('test-schema');
    expect(html).toContain('Taste of Gratitude');
  });

  it('returns empty markup when data is not provided', () => {
    const html = renderToStaticMarkup(React.createElement(JsonLd, { id: 'empty', data: null }));
    expect(html).toBe('');
  });
});
