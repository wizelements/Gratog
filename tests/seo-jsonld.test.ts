import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd } from '@/components/JsonLd';
import { buildHomepageFaqSchema, buildHomepageOrganizationSchema } from '@/seo/schemas';

describe('SEO Schema Module', () => {
  it('builds organization schema as pure data', () => {
    const schema = buildHomepageOrganizationSchema();

    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe('Taste of Gratitude');
    expect(Array.isArray(schema.sameAs)).toBe(true);
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
