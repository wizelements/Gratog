import { NextResponse } from 'next/server';
import { EnhancedRewardsSystem, validation } from '@/lib/rewards-enhanced';
import { connectToDatabase } from '@/lib/db-optimized';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map();

function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  
  const timestamps = rateLimitMap.get(key).filter(t => t > windowStart);
  
  if (timestamps.length >= maxRequests) {
    return false;
  }
  
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { passportId, email, marketName, activityType = 'visit', idempotencyKey } = body;
    
    // Require idempotency key
    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'Idempotency key is required' },
        { status: 400 }
      );
    }
    
    // Rate limiting
    const rateLimitKey = `stamp:${passportId || email}`;
    if (!checkRateLimit(rateLimitKey, 5, 60000)) {
      return NextResponse.json(
        { success: false, error: 'Too many stamp requests. Please wait a moment.' },
        { status: 429 }
      );
    }
    
    // Get or find passport
    let finalPassportId = passportId;
    if (!finalPassportId && email) {
      if (!validation.isValidEmail(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email address' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      const passport = await db.collection('passports').findOne({ email });
      
      if (!passport) {
        return NextResponse.json(
          { success: false, error: 'Passport not found. Please create a passport first.' },
          { status: 404 }
        );
      }
      
      finalPassportId = passport._id;
    }
    
    if (!finalPassportId) {
      return NextResponse.json(
        { success: false, error: 'Either passportId or email is required' },
        { status: 400 }
      );
    }
    
    if (!validation.isValidMarketName(marketName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid market name' },
        { status: 400 }
      );
    }
    
    // Add stamp with enhanced system
    const result = await EnhancedRewardsSystem.addStamp(
      finalPassportId,
      marketName,
      activityType,
      idempotencyKey
    );
    
    return NextResponse.json({
      success: true,
      stamp: {
        id: result.stamp.id,
        marketName: result.stamp.marketName,
        timestamp: result.stamp.timestamp,
        xpValue: result.stamp.xpValue
      },
      rewards: result.rewards.map(r => ({
        type: r.type,
        title: r.title,
        description: r.description,
        code: r.code,
        expiresAt: r.expiresAt
      })),
      passport: {
        totalStamps: result.passport.totalStamps,
        xpPoints: result.passport.xpPoints,
        level: result.passport.level,
        activeVouchers: result.passport.vouchers.filter(v => !v.used).length
      }
    }, {
      headers: {
        'Idempotency-Key': idempotencyKey,
        'Cache-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('Add stamp error:', error);
    
    if (error.message.includes('duplicate') || error.message.includes('Duplicate')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    
    if (error.message.includes('Invalid')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to add stamp' },
      { status: 500 }
    );
  }
}
