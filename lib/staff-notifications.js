// Staff Notification System for Pickup Orders
// Sends alerts to staff when pickup orders are placed

import { sendEmail } from './resend-email';
import { logger } from '@/lib/logger';

const STAFF_EMAIL = process.env.STAFF_EMAIL || 'staff@tasteofgratitude.com';
const STAFF_PHONE = process.env.STAFF_PHONE;

/**
 * Send staff notification when pickup order is placed
 */
export async function notifyStaffPickupOrder(order) {
  try {
    const isPickup = order.fulfillmentType === 'pickup_market' || order.fulfillmentType === 'pickup_browns_mill';
    const isDelivery = order.fulfillmentType === 'delivery';
    const isMeetUp = order.fulfillmentType === 'meetup_serenbe';
    
    let fulfillmentDetails = {};
    let subject = '';
    
    if (isPickup) {
      const isSerenbe = order.fulfillmentType === 'pickup_market';
      const isBrownsMill = order.fulfillmentType === 'pickup_browns_mill';
      
      if (isBrownsMill) {
        fulfillmentDetails = {
          type: 'PICKUP',
          location: 'Browns Mill Community',
          time: 'Wed-Fri: Before 12pm or 12pm-6pm | Sun-Mon: After 10:30am',
          readyBy: 'Confirm with customer via Square',
          emoji: '🏪',
          color: '#3b82f6',
          requiresTimeConfirmation: true,
          customerPhone: order.customer?.phone || order.phone || 'Not provided'
        };
        subject = `🎯 NEW PICKUP ORDER [TIME COORDINATION NEEDED]: ${order.orderNumber} - Browns Mill`;
      } else {
        fulfillmentDetails = {
          type: 'PICKUP',
          location: 'Serenbe Farmers Market',
          time: 'Saturday 9:00 AM - 1:00 PM',
          readyBy: 'Saturday 9:30 AM',
          emoji: '🏪',
          color: '#059669'
        };
        subject = `🎯 NEW PICKUP ORDER: ${order.orderNumber} - Serenbe Farmers Market`;
      }
    } else if (isMeetUp) {
      fulfillmentDetails = {
        type: 'MEET-UP',
        location: 'Serenbe Area (After Market)',
        time: 'After 1:00 PM Saturday',
        readyBy: 'Coordinate with customer',
        emoji: '🤝',
        color: '#9333ea',
        notes: order.meetUpDetails?.notes || 'No special instructions',
        customerPhone: order.customer?.phone || order.phone || 'Not provided'
      };
      subject = `🤝 NEW MEET-UP ORDER: ${order.orderNumber} - Serenbe Area`;
    } else if (isDelivery) {
      const address = order.deliveryAddress || order.fulfillment?.deliveryAddress || {};
      const deliveryFee = order.pricing?.deliveryFee || order.deliveryFee || 4.99;
      const distance = order.deliveryDistance || 'Unknown';
      fulfillmentDetails = {
        type: 'DELIVERY',
        address: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
        deliveryWindow: '2-3 Business Days',
        deliveryFee: `$${deliveryFee.toFixed(2)}`,
        distance: typeof distance === 'number' ? `${distance.toFixed(1)} miles` : distance,
        readyBy: 'Within 24 hours',
        emoji: '🚚',
        color: '#f97316'
      };
      subject = `🚚 NEW DELIVERY ORDER: ${order.orderNumber} - ${address.city}, ${address.state} (${fulfillmentDetails.distance})`;
    }
    
    const orderTypeHeader = isPickup ? 'PICKUP' : isMeetUp ? 'MEET-UP' : 'DELIVERY';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Pickup Order Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px;">
          
          <!-- Alert Header -->
          <tr>
            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 8px 8px 0 0;">
              <div style="font-size: 48px; margin-bottom: 10px;">${fulfillmentDetails.emoji}</div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">NEW ${orderTypeHeader} ORDER</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Action Required</p>
            </td>
          </tr>
          
          <!-- Order Details -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Order Number -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                <p style="margin: 0 0 5px; color: #92400e; font-size: 14px; font-weight: 600;">ORDER NUMBER</p>
                <p style="margin: 0; color: #92400e; font-size: 32px; font-weight: bold; letter-spacing: 1px;">${order.orderNumber}</p>
              </div>
              
              <!-- Fulfillment Details -->
              <div style="background: ${fulfillmentDetails.color}20; border-left: 4px solid ${fulfillmentDetails.color}; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
                <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">${fulfillmentDetails.emoji} ${orderTypeHeader} Details</h3>
                ${isPickup ? `
                  <p style="margin: 0 0 8px; color: #374151; font-size: 16px; font-weight: bold;">${fulfillmentDetails.location}</p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">⏰ ${fulfillmentDetails.time}</p>
                  ${fulfillmentDetails.requiresTimeConfirmation ? `
                    <p style="margin: 0 0 5px; color: #991b1b; font-size: 14px; font-weight: bold;">⚠️ CONFIRM PICKUP TIME WITH CUSTOMER</p>
                    <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">📞 Customer Phone: <strong>${fulfillmentDetails.customerPhone}</strong></p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">✨ Update Square dashboard with confirmed time</p>
                  ` : `
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">✨ Must be ready by: <strong>${fulfillmentDetails.readyBy}</strong></p>
                  `}
                ` : isMeetUp ? `
                  <p style="margin: 0 0 8px; color: #374151; font-size: 16px; font-weight: bold;">${fulfillmentDetails.location}</p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">⏰ ${fulfillmentDetails.time}</p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">📞 Customer Phone: <strong>${fulfillmentDetails.customerPhone}</strong></p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">📝 Notes: ${fulfillmentDetails.notes}</p>
                  <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold;">⚠️ CALL CUSTOMER TO ARRANGE EXACT LOCATION & TIME</p>
                ` : `
                  <p style="margin: 0 0 8px; color: #374151; font-size: 16px; font-weight: bold;">Delivery Address:</p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">📍 ${fulfillmentDetails.address}</p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">📏 Distance: ${fulfillmentDetails.distance}</p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">💵 Delivery Fee: ${fulfillmentDetails.deliveryFee}</p>
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">⏰ Delivery Window: ${fulfillmentDetails.deliveryWindow}</p>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">✨ Must be prepared and shipped within: <strong>${fulfillmentDetails.readyBy}</strong></p>
                `}
              </div>
              
              <!-- Customer Info -->
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">👤 Customer Information</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Name:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${order.customer.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                      <a href="tel:${order.customer.phone}" style="color: #059669; text-decoration: none;">${order.customer.phone}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                      <a href="mailto:${order.customer.email}" style="color: #059669; text-decoration: none;">${order.customer.email}</a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Order Items -->
              <div style="margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">📦 Order Items (${order.items?.length || 0})</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                  ${order.items?.map((item, index) => `
                    <tr style="border-bottom: ${index < order.items.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                      <td style="padding: 15px;">
                        <div style="color: #1f2937; font-weight: 600; margin-bottom: 4px;">${item.name}</div>
                        <div style="color: #6b7280; font-size: 14px;">${item.size || ''} • Qty: ${item.quantity}</div>
                      </td>
                      <td align="right" style="padding: 15px; color: #059669; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td style="padding: 15px; font-weight: bold; font-size: 16px; color: #1f2937;">TOTAL</td>
                    <td align="right" style="padding: 15px; font-weight: bold; font-size: 18px; color: #059669;">$${order.pricing?.total?.toFixed(2) || order.total?.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Action Required -->
              <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 4px;">
                <h3 style="margin: 0 0 10px; color: #991b1b; font-size: 16px;">⚠️ Action Required</h3>
                <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 14px;">
                  ${isPickup ? `
                    ${fulfillmentDetails.requiresTimeConfirmation ? `
                      <li style="margin-bottom: 8px;"><strong>CALL customer at ${fulfillmentDetails.customerPhone} to confirm pickup time</strong></li>
                      <li style="margin-bottom: 8px;">Available windows: ${fulfillmentDetails.time}</li>
                      <li style="margin-bottom: 8px;">Update Square dashboard with confirmed time and notify customer</li>
                      <li style="margin-bottom: 8px;">Ensure order is prepared for confirmed time</li>
                      <li>Mark order as ready in dashboard</li>
                    ` : `
                      <li style="margin-bottom: 8px;">Confirm pickup location is correct</li>
                      <li style="margin-bottom: 8px;">Ensure order is prepared by <strong>${fulfillmentDetails.readyBy}</strong></li>
                      <li style="margin-bottom: 8px;">Update order status in dashboard when ready</li>
                      <li>Customer will receive reminders Friday & Saturday morning</li>
                    `}
                  ` : isMeetUp ? `
                    <li style="margin-bottom: 8px;"><strong>CALL customer at ${fulfillmentDetails.customerPhone} to arrange meet-up</strong></li>
                    <li style="margin-bottom: 8px;">Coordinate exact location and time within ${fulfillmentDetails.location}</li>
                    <li style="margin-bottom: 8px;">Confirm meet-up details via text/call</li>
                    <li style="margin-bottom: 8px;">Prepare order and bring to agreed location</li>
                    <li>Update order status when completed</li>
                  ` : `
                    <li style="margin-bottom: 8px;">Verify delivery address is correct</li>
                    <li style="margin-bottom: 8px;">Prepare and package order within <strong>${fulfillmentDetails.readyBy}</strong></li>
                    <li style="margin-bottom: 8px;">Ship with tracking and update order status</li>
                    <li>Customer will receive shipping confirmation and delivery notifications</li>
                  `}
                </ul>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated staff notification</p>
              <p style="margin: 5px 0 0; color: #6b7280; font-size: 12px;">Order placed: ${new Date(order.createdAt).toLocaleString()}</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    
    const text = `
NEW PICKUP ORDER: ${order.orderNumber}

Location: ${location}
Time: ${pickupTime}
Ready By: ${readyBy}

Customer: ${order.customer.name}
Phone: ${order.customer.phone}
Email: ${order.customer.email}

Items: ${order.items?.length || 0}
Total: $${order.pricing?.total?.toFixed(2) || order.total?.toFixed(2)}

ACTION REQUIRED:
- Confirm pickup location
- Prepare order by ${readyBy}
- Update order status when ready

Order placed: ${new Date(order.createdAt).toLocaleString()}
    `;
    
    const result = await sendEmail({
      to: STAFF_EMAIL,
      subject,
      html,
      text
    });
    
    logger.info('Staff notification sent', { orderNumber: order.orderNumber, result });
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send staff notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send staff notification when order status changes
 */
export async function notifyStaffStatusChange(order, oldStatus, newStatus) {
  try {
    const subject = `📊 Order ${order.orderNumber} Status: ${oldStatus} → ${newStatus}`;
    
    const statusEmojis = {
      pending: '⏳',
      confirmed: '✅',
      preparing: '🧪',
      ready: '🎉',
      picked_up: '✅',
      delivered: '🚚',
      cancelled: '❌'
    };
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
    <h2 style="color: #1f2937; margin-bottom: 20px;">
      ${statusEmojis[newStatus] || '📊'} Order Status Update
    </h2>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">Order Number:</p>
      <p style="margin: 0 0 20px; font-size: 24px; font-weight: bold; color: #1f2937;">${order.orderNumber}</p>
      
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="padding: 10px 20px; background: #fee2e2; border-radius: 6px; color: #991b1b;">${oldStatus}</div>
        <div style="font-size: 20px;">→</div>
        <div style="padding: 10px 20px; background: #d1fae5; border-radius: 6px; color: #065f46; font-weight: bold;">${newStatus}</div>
      </div>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">Customer: ${order.customer.name}</p>
    <p style="color: #6b7280; font-size: 14px;">Updated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;
    
    const result = await sendEmail({
      to: STAFF_EMAIL,
      subject,
      html,
      text: `Order ${order.orderNumber} status changed: ${oldStatus} → ${newStatus}`
    });
    
    logger.info('Staff', 'Status change notification sent', { orderNumber: order.orderNumber, success: result.success });
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send status change notification:', error);
    return { success: false, error: error.message };
  }
}
