import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';
import { 
  getMarkets, 
  createMarket, 
  seedDefaultMarkets 
} from '@/lib/db/markets';

/**
 * GET /api/admin/markets
 * Fetch all markets for admin dashboard
 */
export async function GET(request) {
  try {
    await requireAdmin(request);
    
    const markets = await getMarkets();
    
    // Transform MongoDB _id to string id for frontend
    const formattedMarkets = markets.map(market => ({
      ...market,
      id: market._id.toString(),
      _id: undefined
    }));
    
    return NextResponse.json({
      success: true,
      markets: formattedMarkets,
      count: formattedMarkets.length
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Admin markets fetch error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/markets
 * Create a new market
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'address', 'city', 'state'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    const market = await createMarket({
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip || '',
      lat: parseFloat(body.lat) || 0,
      lng: parseFloat(body.lng) || 0,
      hours: body.hours || '09:00-17:00',
      dayOfWeek: parseInt(body.dayOfWeek) || 6,
      description: body.description || '',
      mapsUrl: body.mapsUrl || '',
      isActive: body.isActive !== false,
    });
    
    logger.info('API', `Market created by admin ${admin.email}`, { 
      marketId: market._id.toString(),
      name: market.name 
    });
    
    return NextResponse.json({
      success: true,
      market: {
        ...market,
        id: market._id.toString(),
        _id: undefined
      }
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Admin market create error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create market' },
      { status: 500 }
    );
  }
}
