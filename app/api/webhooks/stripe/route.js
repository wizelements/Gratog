import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { createOrUpdateCustomer, updateCustomerStats } from '@/lib/db-customers';
import { getOrders } from '@/lib/db-admin';
import { getDeliveryZoneByZip, calculateDeliveryFee } from '@/lib/delivery-zones';
import { sendSMS } from '@/lib/sms';
import { sendEmail } from '@/lib/email';
import { SMS_TEMPLATES, EMAIL_TEMPLATES } from '@/lib/message-templates';
import { v4 as uuidv4 } from 'uuid';
import { PRODUCTS } from '@/lib/products';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');
    
    let event;
    
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
    }
    
    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Extract customer and order data from metadata
      const metadata = session.metadata;
      const customerName = metadata.customerName;
      const customerEmail = session.customer_email;
      const customerPhone = metadata.customerPhone;
      const fulfillmentType = metadata.fulfillmentType;
      const deliveryAddress = metadata.deliveryAddress ? JSON.parse(metadata.deliveryAddress) : null;
      const deliveryTimeSlot = metadata.deliveryTimeSlot;
      const deliveryInstructions = metadata.deliveryInstructions;
      
      // Get line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      
      // Parse items (exclude delivery fee)
      const items = [];
      let deliveryFee = 0;
      
      for (const item of lineItems.data) {
        if (item.description?.includes('Delivery Fee')) {
          deliveryFee = item.amount_total;
        } else {
          // Find matching product
          const product = PRODUCTS.find(p => p.name === item.description);
          if (product) {
            items.push({
              productId: product.id,
              productName: product.name,
              quantity: item.quantity,
              priceAtPurchase: product.price
            });
          }
        }
      }
      
      // Create customer
      const customerId = await createOrUpdateCustomer({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: deliveryAddress
      });
      
      // Calculate zone info
      let deliveryInfo = null;
      let pickupInfo = null;
      
      if (fulfillmentType === 'delivery') {
        const zone = getDeliveryZoneByZip(deliveryAddress.zip);
        deliveryInfo = {
          address: `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zip}`,
          zone: zone?.id || 5,
          zoneName: zone?.name || 'Extended Metro',
          timeSlot: deliveryTimeSlot || 'TBD',
          instructions: deliveryInstructions || '',
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
      
      // Create order
      const orderNumber = `TOG${Date.now()}`;
      const order = {
        _id: uuidv4(),
        orderNumber,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        items,
        subtotal: session.amount_subtotal,
        deliveryFee,
        tax: 0,
        total: session.amount_total,
        fulfillmentType,
        deliveryInfo,
        pickupInfo,
        status: 'confirmed',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date(session.created * 1000),
            updatedBy: 'system',
            note: 'Order created'
          },
          {
            status: 'confirmed',
            timestamp: new Date(),
            updatedBy: 'stripe_webhook',
            note: 'Payment confirmed'
          }
        ],
        paymentInfo: {
          method: 'stripe',
          stripePaymentId: session.payment_intent,
          stripeSessionId: session.id,
          paidAt: new Date()
        },
        source: 'order_portal',
        communicationLog: [],
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const orders = await getOrders();
      await orders.insertOne(order);
      
      // Update customer stats
      await updateCustomerStats(customerId, session.amount_total);
      
      // Send confirmations
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      
      if (fulfillmentType === 'pickup') {
        const smsData = {
          customerName,
          orderNumber,
          location: 'Serenbe Farmers Market',
          readyTime: '2:00 PM',
          total: session.amount_total
        };
        await sendSMS(customerPhone, SMS_TEMPLATES.ORDER_CONFIRMATION_PICKUP(smsData));
        
        const emailData = {
          ...smsData,
          fulfillmentType: 'pickup',
          boothNumber: 'Booth 12',
          items
        };
        await sendEmail({
          to: customerEmail,
          ...EMAIL_TEMPLATES.ORDER_CONFIRMATION(emailData)
        });
      } else {
        const smsData = {
          customerName,
          orderNumber,
          address: deliveryInfo.address,
          timeSlot: deliveryInfo.timeSlot,
          trackingUrl: `${baseUrl}/track/${order._id}`,
          total: session.amount_total
        };
        await sendSMS(customerPhone, SMS_TEMPLATES.ORDER_CONFIRMATION_DELIVERY(smsData));
        
        const emailData = {
          ...smsData,
          fulfillmentType: 'delivery',
          items
        };
        await sendEmail({
          to: customerEmail,
          ...EMAIL_TEMPLATES.ORDER_CONFIRMATION(emailData)
        });
      }
      
      console.log('✅ Order created from Stripe webhook:', orderNumber);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
