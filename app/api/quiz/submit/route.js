import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, answers, recommendation, source } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Save quiz result to database
    const quizResult = {
      email: email.toLowerCase().trim(),
      answers,
      recommendation,
      source: source || 'quiz_funnel',
      createdAt: new Date(),
      converted: false,
      couponSent: true,
      couponCode: 'QUIZ15' // 15% off first order
    };

    await db.collection('quiz_results').insertOne(quizResult);

    // Also add to newsletter subscribers if not exists
    const existing = await db.collection('subscribers').findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (!existing) {
      await db.collection('subscribers').insertOne({
        email: email.toLowerCase().trim(),
        source: 'quiz_funnel',
        quizRecommendation: recommendation.product,
        subscribedAt: new Date(),
        status: 'active'
      });
    }

    // Send welcome email with coupon
    try {
      await sendEmail({
        to: email,
        subject: 'Your Perfect Sea Moss Match + 15% Off Inside! 🌊',
        html: generateQuizWelcomeEmail(recommendation)
      });
    } catch (emailError) {
      logger.warn('QuizAPI', 'Failed to send welcome email', { email, error: emailError.message });
    }

    return NextResponse.json({
      success: true,
      message: 'Quiz result saved',
      recommendation
    });

  } catch (error) {
    logger.error('QuizAPI', 'Quiz submission error', error);
    return NextResponse.json(
      { error: 'Failed to process quiz' },
      { status: 500 }
    );
  }
}

function generateQuizWelcomeEmail(recommendation) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Your Perfect Match Awaits! 🌊</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 18px; color: #374151;">
          Based on your wellness goals, we recommend:
        </p>
        
        <div style="background: white; border-radius: 12px; padding: 24px; margin: 20px 0; border: 2px solid #059669;">
          <h2 style="color: #059669; margin: 0 0 10px 0;">${recommendation.product}</h2>
          <p style="color: #6b7280; margin: 0;">${recommendation.reason}</p>
        </div>
        
        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-size: 16px; color: #92400e;">🎉 Special Offer Just For You</p>
          <h3 style="margin: 0; font-size: 32px; color: #d97706;">15% OFF</h3>
          <p style="margin: 10px 0; color: #92400e;">Use code: <strong>QUIZ15</strong> at checkout</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://tasteofgratitude.shop/product/${recommendation.slug}"
             style="display: inline-block; background: #059669; color: white; padding: 16px 32px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
            Shop ${recommendation.product}
          </a>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            💡 <strong>Pro Tip:</strong> ${recommendation.tip}
          </p>
        </div>
      </div>
      
      <div style="background: #f3f4f6; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Taste of Gratitude | Premium Wildcrafted Sea Moss<br/>
          <a href="https://tasteofgratitude.shop" style="color: #059669;">tasteofgratitude.shop</a>
        </p>
      </div>
    </div>
  `;
}
