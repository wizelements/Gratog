import { NextResponse } from 'next/server';
import { createOrUpdateCustomer, getCustomers } from '@/lib/db-customers';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const customerData = await request.json();
    
    // Validate required fields
    if (!customerData.name || !customerData.email || !customerData.phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }
    
    const customerId = await createOrUpdateCustomer(customerData);
    
    return NextResponse.json({
      success: true,
      customerId
    });
  } catch (error) {
    console.error('Create customer error:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Admin only
    const token = request.cookies.get('admin_token')?.value;
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const segment = searchParams.get('segment');
    const search = searchParams.get('search');
    
    const customers = await getCustomers();
    let query = {};
    
    if (segment && segment !== 'all') {
      query.segment = segment;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const customerList = await customers.find(query)
      .sort({ 'stats.lastOrderDate': -1 })
      .limit(100)
      .toArray();
    
    return NextResponse.json({ customers: customerList });
  } catch (error) {
    console.error('Get customers error:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Failed to get customers' },
      { status: 500 }
    );
  }
}
