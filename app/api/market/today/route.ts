import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, getSquareLocationId } from '@/lib/square';
import { 
  MARKETS, 
  getMarketsByDay, 
  isMarketOpenNow, 
  getMinutesUntilOpen, 
  getMinutesUntilClose,
  getNextMarketDay 
} from '@/lib/markets';

export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/market/today
 * Returns all markets scheduled for today with their open/closed status
 */
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Get today's markets
    const todaysMarkets = getMarketsByDay(dayName);
    
    // Fetch products from Square
    const client = getSquareClient();
    let products: any[] = [];
    
    try {
      const catalogResponse = await client.catalog.list({
        types: 'ITEM',
      });
      
      const items = catalogResponse.objects?.filter((obj: any) => {
        if (obj.type !== 'ITEM') return false;
        const itemData = obj.itemData;
        if (!itemData?.variations?.length) return false;
        return !obj.isDeleted && itemData.isTaxable !== false;
      }) || [];

      products = items.map((item: any) => {
        const variations = item.itemData?.variations || [];
        const defaultVariation = variations[0];
        const price = defaultVariation?.itemVariationData?.priceMoney?.amount 
          ? Number(defaultVariation.itemVariationData.priceMoney.amount) / 100
          : 0;
        
        // Infer availability from category/name for checkout compatibility
        const category = (item.itemData?.categoryId || '').toString().toLowerCase();
        const name = (item.itemData?.name || '').toLowerCase();
        let availability: 'fresh' | 'preorder' | 'shippable' = 'preorder';
        
        if (category.includes('drink') || category.includes('juice') || category.includes('boba') || name.includes('juice') || name.includes('boba')) {
          availability = 'fresh';
        } else if (category.includes('dried') || category.includes('capsule') || category.includes('merch') || name.includes('dried') || name.includes('capsule')) {
          availability = 'shippable';
        }
        
        return {
          id: item.id,
          name: item.itemData?.name || 'Unnamed Item',
          description: item.itemData?.description || '',
          price,
          category: item.itemData?.categoryId || 'General',
          imageUrl: item.itemData?.imageIds?.[0] || null,
          availability,
          variations: variations.map((v: any) => ({
            id: v.id,
            name: v.itemVariationData?.name || 'Default',
            price: v.itemVariationData?.priceMoney?.amount 
              ? Number(v.itemVariationData.priceMoney.amount) / 100
              : price,
            sku: v.itemVariationData?.sku,
          })),
        };
      });
    } catch (squareError) {
      console.error('Square catalog fetch error:', squareError);
      products = [];
    }

    // Build response for each market
    const marketData = todaysMarkets.map(market => {
      const isOpen = isMarketOpenNow(market);
      const isUpcoming = !isOpen && getMinutesUntilOpen(market) > 0;
      const minutesUntilOpen = getMinutesUntilOpen(market);
      const minutesUntilClose = isOpen ? getMinutesUntilClose(market) : 0;
      
      return {
        ...market,
        isOpen,
        isUpcoming,
        minutesUntilOpen: minutesUntilOpen > 0 ? minutesUntilOpen : 0,
        minutesUntilClose,
        nextDay: getNextMarketDay(market)?.toISOString().split('T')[0],
      };
    });

    // Primary market (first open one, or first upcoming, or first scheduled)
    const primaryMarket = marketData.find(m => m.isOpen) 
      || marketData.find(m => m.isUpcoming)
      || marketData[0]
      || null;

    return NextResponse.json({
      date: today.toISOString().split('T')[0],
      dayName,
      markets: marketData,
      primaryMarket,
      products,
      hasMarketsToday: marketData.length > 0,
      hasOpenMarket: marketData.some(m => m.isOpen),
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Market today API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/markets
 * Returns all configured markets
 */
export async function getMarketsList() {
  return NextResponse.json({
    markets: MARKETS.filter(m => m.isActive),
  });
}
