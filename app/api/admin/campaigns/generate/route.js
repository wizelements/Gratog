import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { generateNewsletterContent } from '@/lib/ai-newsletter';
import clientPromise from '@/lib/db-optimized';

/**
 * POST /api/admin/campaigns/generate - AI-powered newsletter generation
 */
export async function POST(request) {
  try {
    await requireAdmin(request);
    
    const body = await request.json();
    const { type, products, customPrompt, tone, length } = body;

    // Validation
    if (!type) {
      return NextResponse.json(
        { error: 'Newsletter type is required' },
        { status: 400 }
      );
    }

    // Get product details if product IDs provided
    let productDetails = [];
    if (products && products.length > 0) {
      const client = await clientPromise;
      const db = client.db(process.env.DB_NAME || 'taste_of_gratitude');
      
      productDetails = await db.collection('products').find({
        slug: { $in: products }
      }).toArray();
    }

    // Generate newsletter content using AI
    const result = await generateNewsletterContent({
      type,
      products: productDetails,
      customPrompt: customPrompt || '',
      tone: tone || 'warm',
      length: length || 'medium'
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'AI generation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: result.content
    });

  } catch (error) {
    console.error('Newsletter generation error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate newsletter' },
      { status: 500 }
    );
  }
}
