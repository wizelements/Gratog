import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/db-admin';
import { createOrUpdateCustomer, updateCustomerStats } from '@/lib/db-customers';
import { getDeliveryZoneByZip, calculateDeliveryFee } from '@/lib/delivery-zones';
import { sendSMS } from '@/lib/sms-mock';
import { sendEmail } from '@/lib/email-mock';
import { SMS_TEMPLATES, EMAIL_TEMPLATES } from '@/lib/message-templates';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const orderData = await request.json();
    
    // Validate
    if (!orderData.customer || !orderData.items || orderData.items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and items are required' },
        { status: 400 }
      );
    }
    
    // Create/update customer
    const customerId = await createOrUpdateCustomer(orderData.customer);
    
    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.priceAtPurchase * item.quantity), 0);
    let deliveryFee = 0;
    let deliveryInfo = null;
    let pickupInfo = null;
    
    if (orderData.fulfillmentType === 'delivery') {
      const zone = getDeliveryZoneByZip(orderData.customer.address?.zip);
      deliveryFee = calculateDeliveryFee(orderData.customer.address?.zip, subtotal);
      
      deliveryInfo = {
        address: `${orderData.customer.address.street}, ${orderData.customer.address.city}, ${orderData.customer.address.state} ${orderData.customer.address.zip}`,
        zone: zone?.id || 5,
        zoneName: zone?.name || 'Extended Metro',
        timeSlot: orderData.deliveryTimeSlot || 'TBD',
        instructions: orderData.deliveryInstructions || '',
        driverId: null,
        driverName: null,
        estimatedDelivery: null,
        actualDelivery: null
      };
    } else {
      pickupInfo = {
        boothNumber: 'Booth 12',
        readyTime: 'After 2:00 PM',
        pickedUpAt: null
      };
    }
    
    const tax = 0; // Add tax calculation if needed
    const total = subtotal + deliveryFee + tax;
    
    // Create order
    const orderNumber = `TOG${Date.now()}`;
    const order = {
      _id: uuidv4(),
      orderNumber,
      customerId,
      customerName: orderData.customer.name,
      customerEmail: orderData.customer.email,
      customerPhone: orderData.customer.phone,
      items: orderData.items,
      subtotal,
      deliveryFee,
      tax,
      total,
      fulfillmentType: orderData.fulfillmentType,
      deliveryInfo,
      pickupInfo,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        updatedBy: 'system',
        note: 'Order created'
      }],
      paymentInfo: {
        method: orderData.paymentMethod || 'stripe',
        stripePaymentId: orderData.stripePaymentId || null,
        stripeSessionId: orderData.stripeSessionId || null,
        paidAt: null
      },
      source: orderData.source || 'website',
      communicationLog: [],
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const orders = await getOrders();
    await orders.insertOne(order);
    
    // Update customer stats
    await updateCustomerStats(customerId, total);
    
    // Send confirmations (mock)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    if (orderData.fulfillmentType === 'pickup') {
      const smsData = {
        customerName: orderData.customer.name,
        orderNumber,
        location: 'Serenbe Farmers Market',
        readyTime: '2:00 PM',
        total
      };
      await sendSMS(orderData.customer.phone, SMS_TEMPLATES.ORDER_CONFIRMATION_PICKUP(smsData));
      
      const emailData = {
        ...smsData,
        fulfillmentType: 'pickup',
        boothNumber: 'Booth 12',
        items: orderData.items
      };
      await sendEmail({
        to: orderData.customer.email,
        ...EMAIL_TEMPLATES.ORDER_CONFIRMATION(emailData)
      });
    } else {
      const smsData = {
        customerName: orderData.customer.name,
        orderNumber,
        address: deliveryInfo.address,
        timeSlot: deliveryInfo.timeSlot,
        trackingUrl: `${baseUrl}/track/${order._id}`,
        total
      };
      await sendSMS(orderData.customer.phone, SMS_TEMPLATES.ORDER_CONFIRMATION_DELIVERY(smsData));
      
      const emailData = {
        ...smsData,
        fulfillmentType: 'delivery',
        items: orderData.items
      };
      await sendEmail({
        to: orderData.customer.email,
        ...EMAIL_TEMPLATES.ORDER_CONFIRMATION(emailData)
      });
    }
    
    return NextResponse.json({
      success: true,
      orderId: order._id,
      orderNumber,
      total
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
