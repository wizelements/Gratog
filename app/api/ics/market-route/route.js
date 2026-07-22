export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime') || '09:00';
    const endTime = searchParams.get('endTime') || '13:00';
    
    if (!market || !date) {
      return NextResponse.json(
        { error: 'Market and date parameters are required' },
        { status: 400 }
      );
    }
    
    // Market locations mapping
    const marketLocations = {
      'Serenbe': {
        address: 'Serenbe Farmers Market, 10950 Hutcheson Ferry Rd, Palmetto, GA 30268',
        description: 'Visit us at Serenbe Farmers Market for fresh sea moss products'
      },
      serenbe: {
        address: 'Serenbe Farmers Market, 10950 Hutcheson Ferry Rd, Palmetto, GA 30268',
        description: 'Visit us at Serenbe Farmers Market for fresh sea moss products'
      },
      dunwoody: {
        address: 'DHA Dunwoody Farmers Market, Brook Run Park, 4770 N Peachtree Rd, Dunwoody, GA 30338',
        description: 'Visit us at DHA Dunwoody Farmers Market for fresh sea moss products'
      },
      browns_mill: {
        address: 'DHA Dunwoody Farmers Market, Brook Run Park, 4770 N Peachtree Rd, Dunwoody, GA 30338',
        description: 'Visit us at DHA Dunwoody Farmers Market for fresh sea moss products'
      },
      'DHA Dunwoody Farmers Market': {
        address: 'DHA Dunwoody Farmers Market, Brook Run Park, 4770 N Peachtree Rd, Dunwoody, GA 30338',
        description: 'Visit us at DHA Dunwoody Farmers Market for fresh sea moss products'
      }
    };
    
    const location = marketLocations[market] || {
      address: `${market} Market`,
      description: `Visit Taste of Gratitude at ${market}`
    };
    
    // Create ICS format
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);
    
    // Format for ICS (YYYYMMDDTHHMMSS)
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Taste of Gratitude//Market Calendar//EN
BEGIN:VEVENT
UID:${Date.now()}@tasteofgratitude.shop
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:Taste of Gratitude at ${market}
DESCRIPTION:${location.description}. Come discover our small-batch sea moss drinks and gels!
LOCATION:${location.address}
CATEGORIES:Market,Food,Local
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
    
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="taste-of-gratitude-${market.toLowerCase().replace(/\s+/g, '-')}-${date}.ics"`
      }
    });
    
  } catch (error) {
    console.error('ICS generation error:', error.message, { stack: error.stack });
    return NextResponse.json(
      { error: 'Failed to generate calendar event' },
      { status: 500 }
    );
  }
}
