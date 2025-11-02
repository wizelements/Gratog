'use client';

import type { Ingredient } from '@/data/ingredients/shared-ingredients';

interface IngredientsSchemaProps {
  productName: string;
  productDescription: string;
  productPrice: number;
  productImage: string;
  ingredients: Ingredient[];
  productUrl: string;
}

export function IngredientsSchema({
  productName,
  productDescription,
  productPrice,
  productImage,
  ingredients,
  productUrl
}: IngredientsSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: productDescription,
    image: productImage,
    url: productUrl,
    offers: {
      '@type': 'Offer',
      price: productPrice,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    // Nutrition information with active ingredients
    nutrition: {
      '@type': 'NutritionInformation',
      servingSize: '1 serving',
      // Active ingredients as supplemental information
      additionalProperty: ingredients
        .filter(i => i.category === 'active')
        .map(ingredient => ({
          '@type': 'PropertyValue',
          name: ingredient.name,
          value: ingredient.shortDescription,
          description: ingredient.benefits.map(b => b.title).join(', ')
        }))
    },
    // Medical/Health page type for E-E-A-T
    additionalType: 'https://schema.org/MedicalWebPage',
    // Citations for trustworthiness
    citation: ingredients.flatMap(ingredient =>
      ingredient.benefits.map(benefit => ({
        '@type': 'CreativeWork',
        name: benefit.citation.title,
        url: benefit.citation.pubmedUrl,
        ...(benefit.citation.journal && { publisher: benefit.citation.journal }),
        ...(benefit.citation.year && { datePublished: benefit.citation.year })
      }))
    ),
    // Active ingredients list
    activeIngredient: ingredients
      .filter(i => i.category === 'active')
      .map(i => ({
        '@type': 'Thing',
        name: i.name,
        ...(i.scientificName && { alternateName: i.scientificName })
      })),
    // Inactive/supporting ingredients
    inactiveIngredient: ingredients
      .filter(i => i.category !== 'active')
      .map(i => i.name)
      .join(', ')
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
