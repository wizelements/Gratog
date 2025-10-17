import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { randomUUID } from 'crypto';

export async function POST(request) {
  try {
    const { 
      challenge, 
      customerName, 
      customerEmail, 
      socialHandle, 
      platform, 
      contentUrl, 
      consent 
    } = await request.json();
    
    // Validation
    if (!challenge || !customerName || !customerEmail || !contentUrl || !consent) {
      return NextResponse.json(
        { success: false, error: 'All fields are required and consent must be given' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    const submission = {
      id: randomUUID(),
      challenge,
      customerName,
      customerEmail,
      socialHandle,
      platform: platform || 'unknown',
      contentUrl,
      consent,
      status: 'pending', // pending, approved, rejected
      submittedAt: new Date(),
      approvedAt: null,
      featured: false
    };
    
    await db.collection('ugc_submissions').insertOne(submission);
    
    // Award XP for UGC submission
    try {
      const passport = await db.collection('passports').findOne({ customerEmail });
      if (passport) {
        await db.collection('passports').updateOne(
          { customerEmail },
          { 
            $inc: { xpPoints: 50 }, // UGC submission XP
            $set: { lastActivity: new Date() }
          }
        );
      }
    } catch (passportError) {
      console.log('Passport XP update failed (non-critical):', passportError);
    }
    
    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt
      }
    });
    
  } catch (error) {
    console.error('UGC submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit UGC' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('challenge');
    const limit = parseInt(searchParams.get('limit') || '20');
    const approved = searchParams.get('approved') === 'true';
    
    const { db } = await connectToDatabase();
    
    const filter = {};
    if (challenge) filter.challenge = challenge;
    if (approved) filter.status = 'approved';
    
    const submissions = await db.collection('ugc_submissions')
      .find(filter)
      .sort({ submittedAt: -1 })
      .limit(limit)
      .project({
        id: 1,
        challenge: 1,
        customerName: 1,
        socialHandle: 1,
        platform: 1,
        contentUrl: 1,
        status: 1,
        submittedAt: 1,
        featured: 1
      })
      .toArray();
    
    return NextResponse.json({
      success: true,
      submissions
    });
    
  } catch (error) {
    console.error('Get UGC submissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve submissions' },
      { status: 500 }
    );
  }
}