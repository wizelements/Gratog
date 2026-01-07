import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { generateNewsletterContent } from '@/lib/ai-newsletter';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/campaigns/generate - AI-powered newsletter generation
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    
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
      const { db } = await connectToDatabase();
      productDetails = await db.collection('products').find({
        slug: { $in: products }
      }).toArray();
    }

    logger.info('API', `Newsletter generation started by ${admin.email}: type=${type}`);

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
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Newsletter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate newsletter' },
      { status: 500 }
    );
  }
}
