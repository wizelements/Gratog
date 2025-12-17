
import { NextResponse } from 'next/server';
import { initializeUnifiedProducts, syncAllSquareProducts, getSyncStats } from '@/lib/product-sync-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unified/sync
 * Initialize or sync unified products collection
 */
export async function POST(request) {
  try {
    const { action } = await request.json();
    
    let result;
    
    if (action === 'initialize') {
      debug('🚀 Initializing unified products collection...');
      result = await initializeUnifiedProducts();
      
      return NextResponse.json({
        success: true,
        message: 'Unified products collection initialized and synced',
        action: 'initialize'
      });
    }
    
    if (action === 'sync') {
      debug('🔄 Syncing products from Square catalog...');
      result = await syncAllSquareProducts();
      
      return NextResponse.json({
        success: true,
        message: `Synced ${result.success} products successfully`,
        result,
        action: 'sync'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "initialize" or "sync"'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Unified Sync API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Sync operation failed',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/unified/sync
 * Get sync statistics
 */
export async function GET() {
  try {
    const stats = await getSyncStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Sync Stats API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync stats',
      message: error.message
    }, { status: 500 });
  }
}
