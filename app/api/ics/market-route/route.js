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
      'East Atlanta Village': {
        address: 'East Atlanta Village Market, East Atlanta, GA',
        description: 'Find us at the EAV Market with our full product lineup'
      },
      'Ponce City Market': {
        address: 'Ponce City Market, 675 Ponce De Leon Ave NE, Atlanta, GA 30308',
        description: 'Taste of Gratitude at Ponce City Market'
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
DESCRIPTION:${location.description}. Come discover our wildcrafted sea moss products!
LOCATION:${location.address}
CATEGORIES:Market,Health,Wellness
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