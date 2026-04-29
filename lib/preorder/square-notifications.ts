/**
 * Preorder notification service for Square
 * Sends preorder notifications to Square team chat
 */

import { logger } from '@/lib/logger';

const SQUARE_CHAT_WEBHOOK_URL = process.env.SQUARE_CHAT_WEBHOOK_URL;
const SQUARE_TEAM_EMAIL = process.env.SQUARE_TEAM_EMAIL || 'team@tasteofgratitude.shop';

/**
 * Send preorder notification to Square chat
 * This appears in Square's team messaging/chat system
 */
export async function sendSquareChatNotification(preorder) {
  try {
    const webhookUrl = SQUARE_CHAT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      logger.warn('SQUARE_CHAT_WEBHOOK_URL not configured, skipping chat notification');
      return { sent: false, reason: 'webhook_not_configured' };
    }

    // Build the message for Square chat
    const message = buildPreorderMessage(preorder);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message.text,
        attachments: message.attachments || [],
        // Square-specific format
        order_number: preorder.orderNumber,
        customer_name: preorder.customer?.name,
        customer_phone: preorder.customer?.phone,
        pickup_location: preorder.pickupLocation,
        pickup_date: preorder.pickupDate,
        items: preorder.items,
        waitlist_number: preorder.waitlistNumber,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to send Square chat notification', {
        status: response.status,
        error: errorText,
        orderNumber: preorder.orderNumber,
      });
      return { sent: false, error: errorText };
    }

    logger.info('Square chat notification sent', {
      orderNumber: preorder.orderNumber,
      waitlistNumber: preorder.waitlistNumber,
    });

    return { sent: true };
  } catch (error) {
    logger.error('Error sending Square chat notification', {
      error: error.message,
      orderNumber: preorder.orderNumber,
    });
    return { sent: false, error: error.message };
  }
}

/**
 * Build preorder message for Square chat
 */
function buildPreorderMessage(preorder) {
  const { orderNumber, customer, items, pickupLocation, pickupDate, waitlistNumber, notes } = preorder;
  
  // Format items list
  const itemsList = items
    .map(item => `• ${item.quantity}x ${item.name}${item.size ? ` (${item.size})` : ''}`)
    .join('\n');
  
  // Calculate total items
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Build the chat message
  const text = `🛒 **NEW PREORDER #${orderNumber}**

👤 **${customer.name}** | 📞 ${customer.phone}
🎫 **Waitlist #${waitlistNumber}**

📍 **Pickup:** ${pickupLocation}
📅 **Date:** ${pickupDate}

**Items (${totalItems}):**
${itemsList}

💰 **Total:** $${subtotal.toFixed(2)}
${notes ? `\n📝 **Notes:** ${notes}` : ''}

---
Reply "CONFIRM ${orderNumber}" to confirm | "READY ${orderNumber}" when ready for pickup`;

  return {
    text,
    attachments: items
      .filter(item => item.imageUrl)
      .map(item => ({
        type: 'image',
        url: item.imageUrl,
        alt: item.name,
      })),
  };
}

/**
 * Send email notification to Square team email
 * Fallback when chat webhook is not available
 */
export async function sendSquareTeamEmail(preorder) {
  try {
    const { sendEmail } = await import('@/lib/resend-email');
    
    const { orderNumber, customer, items, pickupLocation, pickupDate, waitlistNumber } = preorder;
    
    const itemsHtml = items
      .map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.quantity}x</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}${item.size ? ` <span style="color: #6b7280;">(${item.size})</span>` : ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `)
      .join('');
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Preorder #${orderNumber}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">🛒 New Preorder</h1>
      <p style="margin: 10px 0 0; font-size: 32px; font-weight: bold;">#${orderNumber}</p>
      <p style="margin: 10px 0 0; font-size: 18px;">🎫 Waitlist #${waitlistNumber}</p>
    </div>
    
    <div style="padding: 30px;">
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">Customer: ${customer.name}</p>
        <p style="margin: 5px 0 0; color: #92400e;">📞 ${customer.phone}</p>
      </div>
      
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <p style="margin: 0; color: #065f46; font-weight: 600;">📍 ${pickupLocation}</p>
        <p style="margin: 5px 0 0; color: #065f46;">📅 ${pickupDate}</p>
      </div>
      
      <h3 style="margin: 0 0 15px; color: #1f2937;">Order Items</h3>
      <table width="100%" style="border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: 600;">Total:</td>
            <td style="padding: 15px 10px; text-align: right; font-weight: 600; color: #059669;">$${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      
      <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">This preorder was submitted via the customer portal</p>
        <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">Order Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    await sendEmail({
      to: SQUARE_TEAM_EMAIL,
      subject: `🛒 Preorder #${orderNumber} - Waitlist #${waitlistNumber} | ${customer.name}`,
      html,
    });
    
    logger.info('Square team email sent', { orderNumber, waitlistNumber });
    return { sent: true };
  } catch (error) {
    logger.error('Failed to send Square team email', {
      error: error.message,
      orderNumber: preorder.orderNumber,
    });
    return { sent: false, error: error.message };
  }
}

/**
 * Send SMS notification for preorder
 */
export async function sendPreorderSMS(preorder) {
  try {
    const { sendSMS } = await import('@/lib/sms');
    
    const { customer, orderNumber, waitlistNumber, pickupLocation, pickupDate, items } = preorder;
    
    // Build condensed item list for SMS
    const itemSummary = items
      .slice(0, 3)
      .map(item => `${item.quantity}x ${item.name}`)
      .join(', ');
    
    const moreItems = items.length > 3 ? ` +${items.length - 3} more` : '';
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const message = `🛒 Taste of Gratitude Preorder #${orderNumber}
🎫 Waitlist #${waitlistNumber}

📋 ${itemSummary}${moreItems}
💰 Total: $${total.toFixed(2)}
📍 ${pickupLocation}
📅 ${pickupDate}

Reply CONFIRM to accept this preorder.`;

    await sendSMS(
      process.env.STAFF_PHONE || '',
      message,
      'TasteOfGratitude'
    );
    
    logger.info('Preorder SMS sent', { orderNumber, waitlistNumber });
    return { sent: true };
  } catch (error) {
    logger.error('Failed to send preorder SMS', {
      error: error.message,
      orderNumber: preorder.orderNumber,
    });
    return { sent: false, error: error.message };
  }
}

/**
 * Main notification function - sends to all configured channels
 */
export async function notifySquareTeam(preorder) {
  const results = {
    chat: { sent: false },
    email: { sent: false },
    sms: { sent: false },
  };
  
  // Try Square chat webhook first
  if (SQUARE_CHAT_WEBHOOK_URL) {
    results.chat = await sendSquareChatNotification(preorder);
  }
  
  // Always send email as fallback/backup
  results.email = await sendSquareTeamEmail(preorder);
  
  // Send SMS if staff phone is configured
  if (process.env.STAFF_PHONE) {
    results.sms = await sendPreorderSMS(preorder);
  }
  
  const anySent = results.chat.sent || results.email.sent || results.sms.sent;
  
  logger.info('Square team notifications complete', {
    orderNumber: preorder.orderNumber,
    waitlistNumber: preorder.waitlistNumber,
    chat: results.chat.sent,
    email: results.email.sent,
    sms: results.sms.sent,
  });
  
  return { success: anySent, results };
}
