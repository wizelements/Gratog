import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

const TRANSACTIONS_COLLECTION = 'payment_transactions';

/**
 * POST /api/transactions/log
 * Log payment transaction
 */
export async function POST(request) {
  try {
    const transactionData = await request.json();
    
    const { db } = await connectToDatabase();
    
    const transaction = {
      ...transactionData,
      loggedAt: new Date(),
      status: transactionData.result?.success ? 'success' : 'failed'
    };
    
    await db.collection(TRANSACTIONS_COLLECTION).insertOne(transaction);
    
    return NextResponse.json({
      success: true,
      message: 'Transaction logged'
    });
  } catch (error) {
    console.error('❌ Transaction Log Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to log transaction',
      message: error.message
    }, { status: 500 });
  }
}
