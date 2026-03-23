import { NextResponse } from 'next/server';
import { getWaitlist } from '@/lib/db-customers';
import { v4 as uuidv4 } from 'uuid';
import { sendSMS } from '@/lib/sms-mock';
import { sendEmail } from '@/lib/email-mock';
import { SMS_TEMPLATES, EMAIL_TEMPLATES } from '@/lib/message-templates';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.customer || !data.productId) {
      return NextResponse.json(
        { error: 'Customer and product required' },
        { status: 400 }
      );
    }
    
    const waitlist = await getWaitlist();
    
    // Check if already on waitlist
    const existing = await waitlist.findOne({
      customerEmail: data.customer.email,
      productId: data.productId,
      converted: false
    });
    
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already on waitlist'
      });
    }
    
    const waitlistEntry = {
      _id: uuidv4(),
      customerId: data.customer.id || uuidv4(),
      customerName: data.customer.name,
      customerEmail: data.customer.email,
      customerPhone: data.customer.phone,
      productId: data.productId,
      productName: data.productName,
      joinedAt: new Date(),
      notified: false,
      notifiedAt: null,
      converted: false,
      orderId: null,
      convertedAt: null
    };
    
    await waitlist.insertOne(waitlistEntry);
    
    return NextResponse.json({
      success: true,
      message: 'Added to waitlist'
    });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    const waitlist = await getWaitlist();
    let query = { converted: false };
    
    if (productId) {
      query.productId = productId;
    }
    
    const entries = await waitlist.find(query)
      .sort({ joinedAt: -1 })
      .toArray();
    
    // Group by product
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.productId]) {
        acc[entry.productId] = {
          productId: entry.productId,
          productName: entry.productName,
          count: 0,
          customers: []
        };
      }
      acc[entry.productId].count++;
      acc[entry.productId].customers.push(entry);
      return acc;
    }, {});
    
    return NextResponse.json({
      waitlist: Object.values(grouped),
      total: entries.length
    });
  } catch (error) {
    console.error('Get waitlist error:', error);
    return NextResponse.json(
      { error: 'Failed to get waitlist' },
      { status: 500 }
    );
  }
}
