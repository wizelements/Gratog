// SMS service - supports both real Twilio and mock mode
import { logger } from '@/lib/logger';
import { appendOrderAccessToken, generateOrderAccessToken } from '@/lib/order-access-token';

let twilioClient = null;
const SMS_LOG = [];
const ORDER_LINK_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getOrderTrackingUrl(orderDetails) {
  const orderId = orderDetails.id || orderDetails.orderRef || orderDetails.orderNumber;
  const baseUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/order/success?orderRef=${encodeURIComponent(orderId || '')}`;

  if (!orderId) {
    return baseUrl;
  }

  const token = generateOrderAccessToken({
    orderId,
    customerEmail: orderDetails.customer?.email || orderDetails.customerEmail || null,
    ttlMs: ORDER_LINK_TOKEN_TTL_MS,
  });

  return appendOrderAccessToken(baseUrl, token);
}

// Lazy load Twilio only when needed
const USE_REAL_SMS = process.env.TWILIO_ACCOUNT_SID && 
  process.env.TWILIO_AUTH_TOKEN && 
  process.env.TWILIO_ACCOUNT_SID.startsWith('AC');

async function getTwilioClient() {
  if (!USE_REAL_SMS) return null;
  
  if (!twilioClient) {
    const twilio = (await import('twilio')).default;
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    logger.info('Using REAL Twilio SMS');
  }
  return twilioClient;
}

export async function sendSMS(to, message, from) {
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || 'TasteOfGratitude';
  
  const client = await getTwilioClient();
  
  if (USE_REAL_SMS && client) {
    try {
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: to
      });
      
      logger.info('SMS', 'Sent via Twilio', { sid: result.sid });
      
      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      console.error('📱 [SMS ERROR]:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  } else {
    // Mock mode
    console.log('📱 [MOCK SMS] To:', to);
    console.log('📱 [MOCK SMS] Message:', message);
    
    const smsRecord = {
      to,
      from: fromNumber,
      message,
      sentAt: new Date(),
      status: 'sent',
      sid: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    SMS_LOG.push(smsRecord);
    
    return {
      success: true,
      sid: smsRecord.sid,
      status: 'sent',
      to,
      message: 'SMS sent successfully (MOCK)'
    };
  }
}

export function getSMSLog() {
  return SMS_LOG;
}

export function isRealSMS() {
  return USE_REAL_SMS;
}

export async function sendOrderSMS(orderDetails) {
  return sendOrderUpdateSMS(orderDetails, 'created');
}

// Alias for compatibility
export async function sendOrderConfirmationSMS(order) {
  if (!order || !order.customer || !order.customer.phone) {
    console.warn('[sms] sendOrderConfirmationSMS: invalid order data or no phone, skipping');
    return { skipped: true, reason: 'no-recipient' };
  }
  return sendOrderSMS(order);
}

export async function sendOrderUpdateSMS(orderDetails, updateType = 'status_update') {
  const { SMS_TEMPLATES } = await import('./message-templates.js');
  
  const template = orderDetails.fulfillmentType === 'delivery' 
    ? SMS_TEMPLATES.ORDER_CONFIRMATION_DELIVERY 
    : SMS_TEMPLATES.ORDER_CONFIRMATION_PICKUP;
  
  const pickupConfig = orderDetails.fulfillmentType === 'pickup_dunwoody' 
    ? { 
        location: 'DHA Dunwoody Farmers Market',
        readyTime: 'Saturday 9AM-12PM',
        readyBy: '9:30 AM Saturday'
      }
    : { 
        location: 'Serenbe Farmers Market', 
        readyTime: 'Saturday 9AM-1PM',
        readyBy: '9:30 AM Saturday'
      };
  
  const formattedAddress = orderDetails.deliveryAddress 
    ? `${orderDetails.deliveryAddress.street}, ${orderDetails.deliveryAddress.city}, ${orderDetails.deliveryAddress.state} ${orderDetails.deliveryAddress.zip}`
    : 'N/A';
  
  const message = template({
    customerName: orderDetails.customer.name.split(' ')[0], // First name only for SMS
    orderNumber: orderDetails.id || orderDetails.orderNumber,
    total: orderDetails.total || orderDetails.pricing?.total || 0,
    location: pickupConfig.location,
    readyTime: pickupConfig.readyTime,
    readyBy: pickupConfig.readyBy,
    address: formattedAddress,
    timeSlot: orderDetails.deliveryTimeSlot || 'N/A',
    trackingUrl: getOrderTrackingUrl(orderDetails)
  });
  
  return await sendSMS(orderDetails.customer.phone, message);
}
