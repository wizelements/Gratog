import React from 'react';

interface JsonLdProps {
  id: string;
  data?: Record<string, unknown> | null;
}

export function JsonLd({ id, data }: JsonLdProps) {
  if (!data) {
    return null;
  }

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
