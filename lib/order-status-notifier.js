// Order Status Notification System
// Automatically sends SMS/email when order status changes

import { sendSMS } from './sms';
import { sendOrderStatusEmail } from './resend-email';
import { SMS_TEMPLATES } from './message-templates';

/**
 * Notify customer when order status changes
 */
export async function notifyOrderStatusChange(order, oldStatus, newStatus) {
  try {
    console.log(`📊 Order status changed: ${order.orderNumber} (${oldStatus} → ${newStatus})`);
    
    // Determine if we should send notification for this status change
    const shouldNotify = shouldSendNotification(oldStatus, newStatus);
    
    if (!shouldNotify) {
      console.log(`ℹ️ No notification needed for ${oldStatus} → ${newStatus}`);
      return { skipped: true, reason: 'no-notification-required' };
    }
    
    const results = {
      sms: null,
      email: null
    };
    
    // Send SMS notification
    if (order.customer.phone) {
      try {
        const smsMessage = getSMSMessageForStatus(order, newStatus);
        if (smsMessage) {
          results.sms = await sendSMS(order.customer.phone, smsMessage);
          console.log(`📱 SMS sent for status: ${newStatus}`);
        }
      } catch (smsError) {
        console.error('❌ SMS notification failed:', smsError);
        results.sms = { success: false, error: smsError.message };
      }
    }
    
    // Send email notification
    if (order.customer.email) {
      try {
        results.email = await sendOrderStatusEmail(order, newStatus);
        console.log(`📧 Email sent for status: ${newStatus}`);
      } catch (emailError) {
        console.error('❌ Email notification failed:', emailError);
        results.email = { success: false, error: emailError.message };
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to notify order status change:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Determine if notification should be sent for status change
 */
function shouldSendNotification(oldStatus, newStatus) {
  // Always notify for these status changes
  const notifiableStatuses = [
    'confirmed',
    'preparing',
    'ready',
    'in_transit',
    'delivered',
    'picked_up'
  ];
  
  return notifiableStatuses.includes(newStatus);
}

/**
 * Get SMS message template for order status
 */
function getSMSMessageForStatus(order, status) {
  const firstName = order.customer.name.split(' ')[0];
  const isPickup = order.fulfillmentType === 'pickup_market' || order.fulfillmentType === 'pickup_browns_mill';
  const isSerenbe = order.fulfillmentType === 'pickup_market';
  
  const location = isSerenbe 
    ? 'Serenbe Farmers Market (Booth #12)' 
    : 'Browns Mill Community';
  const hours = isSerenbe 
    ? '9:00 AM - 1:00 PM' 
    : '3:00 PM - 6:00 PM';
  
  switch (status) {
    case 'confirmed':
      return `Hi ${firstName}! ✅ Your order #${order.orderNumber} is confirmed. ${isPickup ? `Pickup ${location} this Saturday. We'll remind you Friday!` : 'We\'ll update you as we prepare it.'} - Taste of Gratitude 🌿`;
    
    case 'preparing':
      return `Hi ${firstName}! 🧪 Great news! We're preparing your order #${order.orderNumber} right now. ${isPickup ? `It'll be ready Saturday at ${location}.` : 'We\'ll notify you when it ships.'} - Taste of Gratitude 🌿`;
    
    case 'ready':
      if (isPickup) {
        return SMS_TEMPLATES.ORDER_READY({
          customerName: firstName,
          orderNumber: order.orderNumber,
          location,
          hours
        });
      } else {
        return `Hi ${firstName}! 🎉 Your order #${order.orderNumber} is ready and will be shipped soon! - Taste of Gratitude 🌿`;
      }
    
    case 'picked_up':
      return `Thank you ${firstName}! 🎉 We hope you enjoy your Taste of Gratitude order! Questions? Text us anytime. - Taste of Gratitude 🌿`;
    
    case 'in_transit':
      return `Hi ${firstName}! 🚚 Your order #${order.orderNumber} is on the way! You'll receive it soon. - Taste of Gratitude 🌿`;
    
    case 'delivered':
      return `✅ Delivered! ${firstName}, your order #${order.orderNumber} has arrived. Enjoy your wellness boost! Questions? Text us anytime. - Taste of Gratitude 🌿`;
    
    default:
      return null;
  }
}

/**
 * Send "order ready" notification to customer
 */
export async function sendOrderReadyNotification(order) {
  try {
    const isPickup = order.fulfillmentType === 'pickup_market' || order.fulfillmentType === 'pickup_browns_mill';
    
    if (!isPickup) {
      console.log('ℹ️ Order ready notification only for pickup orders');
      return { skipped: true, reason: 'not-pickup-order' };
    }
    
    const firstName = order.customer.name.split(' ')[0];
    const isSerenbe = order.fulfillmentType === 'pickup_market';
    const location = isSerenbe 
      ? 'Serenbe Farmers Market (Booth #12)' 
      : 'Browns Mill Community';
    const hours = isSerenbe 
      ? '9:00 AM - 1:00 PM' 
      : '3:00 PM - 6:00 PM';
    
    const message = SMS_TEMPLATES.ORDER_READY({
      customerName: firstName,
      orderNumber: order.orderNumber,
      location,
      hours
    });
    
    const result = await sendSMS(order.customer.phone, message);
    
    console.log(`📱 Order ready SMS sent: ${order.orderNumber}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send order ready notification:', error);
    return { success: false, error: error.message };
  }
}
