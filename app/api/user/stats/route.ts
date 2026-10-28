import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { findUserById } from '@/lib/db/users';
import { connectToDatabase } from '@/lib/db-optimized';
import {openTursoPreview,tursoPreviewSelected} from '@/lib/checkout/turso-preview-runtime.mjs';
import {getTursoCustomerStats} from '@/lib/auth/turso-customer-accounts.mjs';

export const dynamic = 'force-dynamic';

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (!decoded?.userId) return null;
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await getAuthUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if(tursoPreviewSelected())return NextResponse.json({success:true,stats:await getTursoCustomerStats(await openTursoPreview(),decoded.userId)});

    const { db } = await connectToDatabase();
    const userId = decoded.userId;

    const [totalOrders, rewards, challenge] = await Promise.all([
      db.collection('marketorders').countDocuments({
        userId,
      }),
      db.collection('rewards').findOne({ userId }),
      db.collection('challenges').findOne({ userId }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        rewardPoints: rewards?.points || 0,
        streakDays: challenge?.streakDays || 0,
      },
    });
  } catch (error: any) {
    if(error?.name==='TursoCustomerRefusal')return NextResponse.json({success:false,error:error.message},{status:error.status});
    console.error('Stats fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
