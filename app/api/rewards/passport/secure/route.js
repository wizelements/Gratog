import { NextResponse } from 'next/server';
import { EnhancedRewardsSystem, validation } from '@/lib/rewards-enhanced';
import crypto from 'crypto';

// Helper to encrypt QR code data
function encryptQRData(data, secret) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(secret.padEnd(32, '0').slice(0, 32)),
    iv
  );
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function POST(request) {
  try {
    const { email, name, idempotencyKey } = await request.json();
    
    // Validate email
    if (!validation.isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // Idempotency check
    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'Idempotency key is required' },
        { status: 400 }
      );
    }
    
    const { passport, created } = await EnhancedRewardsSystem.createPassport(
      email,
      name,
      idempotencyKey
    );
    
    // Don't expose email in response if not created by requester
    const safePassport = {
      id: passport._id,
      name: passport.name,
      level: passport.level,
      totalStamps: passport.totalStamps,
      xpPoints: passport.xpPoints,
      vouchersCount: passport.vouchers.filter(v => !v.used).length
    };
    
    return NextResponse.json({
      success: true,
      passport: safePassport,
      created,
      message: created ? 'Passport created' : 'Passport retrieved'
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    console.error('Passport creation error:', error);
    
    if (error.message.includes('Invalid')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create passport' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    // Validate email
    if (!validation.isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // In production, verify authentication here
    // if (!request.headers.get('authorization')) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }
    
    const passport = await EnhancedRewardsSystem.getPassportByEmail(email);
    
    if (!passport) {
      return NextResponse.json(
        { success: false, error: 'Passport not found' },
        { status: 404 }
      );
    }
    
    // Return safe passport data
    const safePassport = {
      id: passport._id,
      name: passport.name,
      level: passport.level,
      totalStamps: passport.totalStamps,
      xpPoints: passport.xpPoints,
      activeVouchers: passport.vouchers.filter(v => !v.used && (!v.expiresAt || new Date() < v.expiresAt)).map(v => ({
        id: v.id,
        title: v.title,
        description: v.description,
        code: v.code,
        expiresAt: v.expiresAt
      }))
    };
    
    return NextResponse.json({
      success: true,
      passport: safePassport
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      }
    });
    
  } catch (error) {
    console.error('Get passport error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve passport' },
      { status: 500 }
    );
  }
}
