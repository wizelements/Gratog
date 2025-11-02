import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/products';

export async function POST(request) {
  try {
    const { goal, texture, adventure } = await request.json();
    
    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Goal is required' },
        { status: 400 }
      );
    }
    
    // ENHANCED: Better goal-based product mapping with fallbacks
    const goalMapping = {
      immune: {
        primary: ['elderberry-moss', 'gratitude-defense', 'grateful-guardian'],
        secondary: ['golden-glow-gel', 'supplemint'],
        description: 'Boost your immune system with elderberry and sea moss'
      },
      gut: {
        primary: ['grateful-greens', 'kissed-by-gods', 'supplemint'],
        secondary: ['elderberry-moss', 'golden-glow-gel'],
        description: 'Support digestive health and gut wellness'
      },
      energy: {
        primary: ['blue-lotus', 'pineapple-mango-lemonade', 'spicy-bloom'],
        secondary: ['grateful-greens', 'kissed-by-gods'],
        description: 'Natural energy without crashes'
      },
      skin: {
        primary: ['floral-tide', 'golden-glow-gel', 'blue-lotus'],
        secondary: ['grateful-greens', 'elderberry-moss'],
        description: 'Radiant, healthy skin from within'
      },
      calm: {
        primary: ['blue-lotus', 'grateful-greens', 'kissed-by-gods'],
        secondary: ['golden-glow-gel', 'floral-tide'],
        description: 'Calm, focused energy for mindful living'
      }
    };
    
    const goalData = goalMapping[goal] || goalMapping['immune'];
    let recommendedSkus = [...goalData.primary];
    
    // ENHANCED: Adventure level modifications
    if (adventure === 'bold') {
      // Prioritize adventurous flavors
      const adventurousProducts = ['spicy-bloom', 'blue-lotus', 'grateful-greens'];
      recommendedSkus = adventurousProducts.concat(
        recommendedSkus.filter(sku => !adventurousProducts.includes(sku))
      );
    } else if (adventure === 'mild') {
      // Prioritize mild, familiar flavors
      const mildProducts = ['pineapple-mango-lemonade', 'kissed-by-gods', 'golden-glow-gel'];
      recommendedSkus = mildProducts.concat(
        recommendedSkus.filter(sku => !mildProducts.includes(sku))
      );
    }
    
    // ENHANCED: Texture preference modifications with better filtering
    if (texture === 'lemonade') {
      const lemonadeProducts = PRODUCTS.filter(p => 
        p.name.toLowerCase().includes('lemonade') || 
        p.name.toLowerCase().includes('guardian') ||
        p.description.toLowerCase().includes('refreshing')
      ).map(p => p.id);
      recommendedSkus = [...lemonadeProducts, ...recommendedSkus.filter(sku => !lemonadeProducts.includes(sku))];
    } else if (texture === 'gel') {
      const gelProducts = PRODUCTS.filter(p => 
        p.name.toLowerCase().includes('gel') ||
        p.format === 'gel'
      ).map(p => p.id);
      recommendedSkus = [...gelProducts, ...recommendedSkus.filter(sku => !gelProducts.includes(sku))];
    } else if (texture === 'shot') {
      const shotProducts = PRODUCTS.filter(p => 
        p.size && (p.size.includes('2oz') || p.size.includes('shot')) ||
        p.name.toLowerCase().includes('defense') ||
        p.name.toLowerCase().includes('bloom') ||
        p.name.toLowerCase().includes('supplemint')
      ).map(p => p.id);
      recommendedSkus = [...shotProducts, ...recommendedSkus.filter(sku => !shotProducts.includes(sku))];
    }
    
    // Add secondary recommendations if primary list is short
    if (recommendedSkus.length < 3) {
      recommendedSkus = [...recommendedSkus, ...goalData.secondary];
    }
    
    // Map SKUs to product data with error handling
    const recommendations = recommendedSkus
      .map(sku => PRODUCTS.find(p => p.id === sku))
      .filter(Boolean) // Remove undefined products
      .slice(0, 4); // Limit to top 4 recommendations
    
    // ENHANCED: Better recommendation reasons with multiple factors
    const enrichedRecommendations = recommendations.map((product, index) => ({
      ...product,
      priceCents: product.price, // Map price to priceCents for frontend compatibility
      recommendationReason: getEnhancedRecommendationReason(product, goal, texture, adventure, goalData.description),
      confidence: Math.max(0.95 - (index * 0.1), 0.65), // Higher starting confidence
      matchScore: calculateMatchScore(product, goal, texture, adventure)
    }));
    
    // Sort by match score
    enrichedRecommendations.sort((a, b) => b.matchScore - a.matchScore);
    
    return NextResponse.json({
      success: true,
      recommendations: enrichedRecommendations,
      goalDescription: goalData.description,
      quizAnswers: { goal, texture, adventure },
      totalMatches: enrichedRecommendations.length
    });
    
  } catch (error) {
    console.error('Quiz recommendations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

function calculateMatchScore(product, goal, texture, adventure) {
  let score = 50; // Base score
  
  const productName = product.name.toLowerCase();
  const productDesc = (product.description || '').toLowerCase();
  
  // Goal matching (highest weight)
  if (goal === 'immune' && (productName.includes('elderberry') || productName.includes('defense'))) score += 30;
  if (goal === 'gut' && (productName.includes('greens') || productDesc.includes('digestive'))) score += 30;
  if (goal === 'energy' && (productName.includes('lotus') || productName.includes('energy'))) score += 30;
  if (goal === 'skin' && (productName.includes('glow') || productName.includes('floral'))) score += 30;
  if (goal === 'calm' && (productName.includes('lotus') || productName.includes('calm'))) score += 30;
  
  // Texture matching (medium weight)
  if (texture === 'lemonade' && productName.includes('lemonade')) score += 15;
  if (texture === 'gel' && productName.includes('gel')) score += 15;
  if (texture === 'shot' && product.size && product.size.includes('2oz')) score += 15;
  
  // Adventure matching (lower weight)
  if (adventure === 'bold' && (productName.includes('spicy') || productName.includes('bloom'))) score += 10;
  if (adventure === 'mild' && (productName.includes('pineapple') || productName.includes('mango'))) score += 10;
  
  return score;
}

function getEnhancedRecommendationReason(product, goal, texture, adventure, goalDescription) {
  const reasons = [];
  const productName = product.name.toLowerCase();
  
  // Goal-specific reasons
  if (goal === 'immune') {
    if (productName.includes('elderberry')) reasons.push('Elderberry is renowned for immune support');
    else if (productName.includes('defense')) reasons.push('Specially formulated for immune defense');
    else if (productName.includes('guardian')) reasons.push('Complete immune protection formula');
    else reasons.push('Rich in immune-supporting nutrients');
  }
  
  if (goal === 'gut') {
    if (productName.includes('greens')) reasons.push('Packed with gut-healthy greens and prebiotics');
    else if (productName.includes('supplemint')) reasons.push('Soothes and supports digestive wellness');
    else reasons.push('Promotes healthy gut flora and digestion');
  }
  
  if (goal === 'energy') {
    if (productName.includes('blue-lotus') || productName.includes('lotus')) reasons.push('Balanced, sustained energy without jitters');
    else if (productName.includes('lemonade')) reasons.push('Refreshing natural energy boost');
    else reasons.push('Natural energy from superfoods');
  }
  
  if (goal === 'skin') {
    if (productName.includes('glow')) reasons.push('Formulated for radiant, glowing skin');
    else if (productName.includes('floral')) reasons.push('Botanical blend for skin vitality');
    else reasons.push('Supports skin health from within');
  }
  
  if (goal === 'calm') {
    if (productName.includes('lotus')) reasons.push('Blue lotus promotes calm, focused energy');
    else if (productName.includes('greens')) reasons.push('Grounding nutrients for balanced mood');
    else reasons.push('Calming adaptogens for stress support');
  }
  
  // Texture-specific reasons
  if (texture === 'lemonade' && productName.includes('lemonade')) {
    reasons.push('Refreshing lemonade format you prefer');
  } else if (texture === 'gel' && productName.includes('gel')) {
    reasons.push('Convenient gel format for easy consumption');
  } else if (texture === 'shot' && product.size && product.size.includes('2oz')) {
    reasons.push('Quick, powerful 2oz shot format');
  }
  
  // Adventure-specific reasons
  if (adventure === 'bold' && productName.includes('spicy')) {
    reasons.push('Bold, adventurous flavor profile');
  } else if (adventure === 'mild' && (productName.includes('pineapple') || productName.includes('mango'))) {
    reasons.push('Smooth, approachable tropical flavors');
  }
  
  // Default reason
  if (reasons.length === 0) {
    reasons.push('Crafted with premium Irish sea moss and superfood ingredients');
  }
  
  return reasons[0]; // Return the most relevant reason
}
