import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

const TRANSACTIONS_COLLECTION = 'payment_transactions';

/**
 * GET /api/transactions/stats
 * Get payment transaction statistics
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const { db } = await connectToDatabase();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get transactions
    const transactions = await db.collection(TRANSACTIONS_COLLECTION)
      .find({ loggedAt: { $gte: startDate } })
      .toArray();
    
    // Calculate stats
    const stats = transactions.reduce((acc, tx) => {
      acc.total++;
      
      if (tx.status === 'success') {
        acc.successful++;
        acc.revenue += tx.amount || 0;
      } else {
        acc.failed++;
      }
      
      // By provider
      const provider = tx.provider || 'unknown';
      acc.byProvider[provider] = (acc.byProvider[provider] || 0) + 1;
      
      // By transaction type
      const type = tx.transactionType || 'unknown';
      acc.byType[type] = (acc.byType[type] || 0) + 1;
      
      return acc;
    }, {
      total: 0,
      successful: 0,
      failed: 0,
      revenue: 0,
      byProvider: {},
      byType: {}
    });
    
    stats.successRate = stats.total > 0 
      ? ((stats.successful / stats.total) * 100).toFixed(2)
      : 0;
    
    return NextResponse.json({
      success: true,
      dateRange: { days, startDate },
      stats,
      recentTransactions: transactions.slice(0, 10)
    });
  } catch (error) {
    console.error('❌ Transaction Stats Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get transaction stats',
      message: error.message
    }, { status: 500 });
  }
}
