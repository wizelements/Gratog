import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-admin';
import { RateLimiter } from '@/lib/monitoring';

// Rate limiter for analytics (500 requests per minute)
const analyticsRateLimiter = new RateLimiter(500, 60000);

export async function POST(request) {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  // Rate limiting
  if (!analyticsRateLimiter.isAllowed(clientIP)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  try {
    const analyticsData = await request.json();
    
    // Validate required fields
    if (!analyticsData.event || !analyticsData.category) {
      return NextResponse.json(
        { error: 'Missing required fields: event, category' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Enrich analytics data
    const enrichedData = {
      ...analyticsData,
      clientIP: clientIP,
      serverTimestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      hour: new Date().getHours()
    };
    
    // Store in analytics collection
    await db.collection('analytics').insertOne(enrichedData);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to log analytics' },
      { status: 500 }
    );
  }
}

// Get analytics data (admin only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const event = searchParams.get('event');
    const category = searchParams.get('category');
    
    // Basic auth check (in production, implement proper admin auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Build query
    const query = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (event) query.event = event;
    if (category) query.category = category;
    
    // Get analytics data
    const analytics = await db.collection('analytics')
      .find(query)
      .sort({ serverTimestamp: -1 })
      .limit(1000)
      .toArray();
    
    // Get summary statistics
    const stats = await db.collection('analytics').aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: '$date',
            event: '$event'
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]).toArray();
    
    // Get top events
    const topEvents = await db.collection('analytics').aggregate([
      { $match: query },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    // Get hourly distribution
    const hourlyStats = await db.collection('analytics').aggregate([
      { $match: query },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]).toArray();
    
    return NextResponse.json({
      success: true,
      data: {
        events: analytics.map(a => ({
          id: a._id,
          event: a.event,
          category: a.category,
          label: a.label,
          value: a.value,
          timestamp: a.serverTimestamp,
          url: a.url,
          userAgent: a.userAgent
        })),
        stats,
        topEvents,
        hourlyStats,
        summary: {
          totalEvents: analytics.length,
          dateRange: { startDate, endDate },
          uniqueSessions: [...new Set(analytics.map(a => a.sessionId))].length
        }
      }
    });
    
  } catch (error) {
    console.error('Analytics retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analytics' },
      { status: 500 }
    );
  }
}