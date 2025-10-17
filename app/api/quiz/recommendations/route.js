import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/products';

export async function POST(request) {
  try {
    const { goal, texture, adventure } = await request.json();
    
    // Goal-based product mapping (using actual product IDs)
    const goalMapping = {
      immune: ['elderberry-moss', 'gratitude-defense', 'grateful-guardian'],
      gut: ['grateful-greens', 'kissed-by-gods', 'supplemint'],
      energy: ['blue-lotus', 'pineapple-mango-lemonade', 'spicy-bloom'],
      skin: ['floral-tide', 'golden-glow-gel', 'blue-lotus'],
      calm: ['blue-lotus', 'grateful-greens', 'kissed-by-gods']
    };
    
    // Get base recommendations
    let recommendedSkus = goalMapping[goal] || [];
    
    // Adventure level modifications
    if (adventure === 'bold') {
      // Always include spicy bloom for adventurous users
      if (!recommendedSkus.includes('spicy-bloom-shot')) {
        recommendedSkus.unshift('spicy-bloom-shot');
      }
    }
    
    // Texture preference modifications
    if (texture === 'lemonade') {
      recommendedSkus = recommendedSkus.filter(sku => 
        sku.includes('lemonade') || sku.includes('guardian') || sku.includes('apple-cranberry')
      );
      recommendedSkus.unshift('pineapple-mango-lemonade', 'kissed-by-gods');
    } else if (texture === 'shot') {
      recommendedSkus = recommendedSkus.filter(sku => 
        sku.includes('defense') || sku.includes('bloom') || sku.includes('supplemint')
      );
    }
    
    // Map SKUs to product data
    const recommendations = recommendedSkus
      .map(sku => PRODUCTS.find(p => p.id === sku))
      .filter(Boolean)
      .slice(0, 4); // Limit to top 4 recommendations
    
    // Add recommendation reasons and ensure frontend compatibility
    const enrichedRecommendations = recommendations.map((product, index) => ({
      ...product,
      priceCents: product.price, // Map price to priceCents for frontend compatibility
      recommendationReason: getRecommendationReason(product, goal, texture, adventure),
      confidence: Math.max(0.9 - (index * 0.1), 0.6) // Decreasing confidence
    }));
    
    return NextResponse.json({
      success: true,
      recommendations: enrichedRecommendations,
      quizAnswers: { goal, texture, adventure }
    });
    
  } catch (error) {
    console.error('Quiz recommendations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

function getRecommendationReason(product, goal, texture, adventure) {
  const reasons = [];
  
  if (goal === 'immune' && product.id.includes('elderberry')) {
    reasons.push('Perfect for immune support');
  }
  if (goal === 'gut' && product.id.includes('greens')) {
    reasons.push('Excellent for digestive wellness');
  }
  if (goal === 'energy' && product.id.includes('blue-lotus')) {
    reasons.push('Balanced energy without crashes');
  }
  if (goal === 'skin' && (product.id.includes('floral') || product.id.includes('glow'))) {
    reasons.push('Promotes radiant, healthy skin');
  }
  if (goal === 'calm' && product.id.includes('blue-lotus')) {
    reasons.push('Supports calm, focused energy');
  }
  
  if (texture === 'lemonade' && product.id.includes('lemonade')) {
    reasons.push('Refreshing lemonade format');
  }
  if (texture === 'shot' && (product.size && product.size.includes('2oz'))) {
    reasons.push('Quick 2oz power dose');
  }
  
  if (adventure === 'bold' && product.id.includes('spicy')) {
    reasons.push('Bold, adventurous flavor profile');
  }
  
  if (product.id.includes('guardian') || product.id.includes('defense')) {
    reasons.push('Complete immune protection');
  }
  
  return reasons.length > 0 ? reasons[0] : 'Crafted with premium sea moss';
}