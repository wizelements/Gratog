// Full Email Service using Resend API
import { Resend } from 'resend';
import { logger } from '@/lib/logger';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.com';

let resend = null;
const EMAIL_LOG = [];

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  logger.info('Resend Email Service Initialized');
} else {
  logger.warn('Using MOCK Email Mode (set RESEND_API_KEY for real email)');
}

/**
 * Send email using Resend API
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  try {
    if (resend) {
      // Real email via Resend
      const data = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text,
        replyTo: replyTo || FROM_EMAIL
      });

      console.log('📧 [RESEND] Email sent to:', to);
      return {
        success: true,
        messageId: data.id,
        status: 'sent',
        to,
        provider: 'resend'
      };
    } else {
      // Mock mode
      const emailRecord = {
        to,
        from: FROM_EMAIL,
        subject,
        html,
        text,
        sentAt: new Date(),
        status: 'sent',
        messageId: `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: 'mock'
      };

      EMAIL_LOG.push(emailRecord);
      console.log('📧 [MOCK] Email logged:', { to, subject });

      return {
        success: true,
        messageId: emailRecord.messageId,
        status: 'sent',
        to,
        provider: 'mock'
      };
    }
  } catch (error) {
    console.error('📧 [EMAIL ERROR]:', error.message);
    return {
      success: false,
      error: error.message,
      provider: resend ? 'resend' : 'mock'
    };
  }
}

/**
 * Send Order Confirmation Email
 */
export async function sendOrderConfirmationEmail(order) {
  if (!order || !order.customer || !order.customer.email) {
    console.warn('[email] Invalid order data, skipping email');
    return { skipped: true, reason: 'no-recipient' };
  }

  const subject = `Order Confirmation - ${order.id}`;
  const html = generateOrderEmailHTML(order, 'confirmation');
  const text = generateOrderEmailText(order, 'confirmation');

  return sendEmail({
    to: order.customer.email,
    subject,
    html,
    text
  });
}

/**
 * Send Order Status Update Email
 */
export async function sendOrderStatusEmail(order, status) {
  if (!order || !order.customer || !order.customer.email) {
    return { skipped: true, reason: 'no-recipient' };
  }

  const statusMessages = {
    payment_confirmed: 'Payment Confirmed',
    processing: 'Order Processing',
    ready_for_pickup: 'Order Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Order Delivered',
    completed: 'Order Completed'
  };

  const subject = `${statusMessages[status] || 'Order Update'} - ${order.id}`;
  const html = generateOrderEmailHTML(order, status);
  const text = generateOrderEmailText(order, status);

  return sendEmail({
    to: order.customer.email,
    subject,
    html,
    text
  });
}

/**
 * Send Welcome Email
 */
export async function sendWelcomeEmail(email, name) {
  const subject = 'Welcome to Taste of Gratitude!';
  const html = generateWelcomeEmailHTML(name);
  const text = `Welcome to Taste of Gratitude, ${name}! We're excited to have you join our wellness community.`;

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Send Coupon Email
 */
export async function sendCouponEmail(email, coupon) {
  const subject = `Your Exclusive Coupon: ${coupon.code}`;
  const html = generateCouponEmailHTML(coupon);
  const text = `You've received a coupon! Code: ${coupon.code}, Discount: $${coupon.discountAmount}`;

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Send Newsletter Subscription Confirmation
 */
export async function sendNewsletterConfirmation(email, name) {
  const subject = 'Newsletter Subscription Confirmed';
  const html = generateNewsletterConfirmationHTML(name);
  const text = `Thank you for subscribing to our newsletter, ${name}!`;

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Generate Order Email HTML
 */
function generateOrderEmailHTML(order, type) {
  const statusConfig = {
    confirmation: {
      title: 'Thank you for your order!',
      message: "We've received your order and are preparing it with care.",
      emoji: '✅'
    },
    payment_confirmed: {
      title: 'Payment Confirmed!',
      message: 'Your payment has been processed successfully.',
      emoji: '💳'
    },
    processing: {
      title: 'Order Processing',
      message: 'We are carefully preparing your order.',
      emoji: '📦'
    },
    ready_for_pickup: {
      title: 'Order Ready for Pickup!',
      message: 'Your order is ready and waiting for you.',
      emoji: '🎉'
    },
    out_for_delivery: {
      title: 'Out for Delivery!',
      message: 'Your order is on its way to you.',
      emoji: '🚚'
    },
    delivered: {
      title: 'Order Delivered!',
      message: 'Your order has been successfully delivered.',
      emoji: '✅'
    },
    completed: {
      title: 'Order Completed',
      message: 'We hope you enjoyed your order!',
      emoji: '💚'
    }
  };

  const config = statusConfig[type] || statusConfig.confirmation;
  const orderId = order.id || order.orderNumber || 'N/A';
  const total = order.total || order.pricing?.total || 0;
  const items = order.items || order.cart || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 32px; font-weight: bold;">Taste of Gratitude</h1>
              <p style="margin: 8px 0 0; color: #6c757d; font-size: 14px;">Nourish Your Wellness Journey</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">${config.emoji}</div>
                <h2 style="margin: 0; color: #212529; font-size: 28px; font-weight: bold;">${config.title}</h2>
              </div>
              
              <p style="margin: 0 0 20px; color: #495057; font-size: 16px; line-height: 1.6;">Dear ${order.customer?.name || 'Valued Customer'},</p>
              <p style="margin: 0 0 30px; color: #495057; font-size: 16px; line-height: 1.6;">${config.message}</p>
              
              <!-- Order Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-left: 4px solid #D4AF37; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 15px; color: #212529; font-size: 18px; font-weight: bold;">Order Summary</h3>
                    <p style="margin: 8px 0; color: #495057; font-size: 14px;"><strong>Order ID:</strong> ${orderId}</p>
                    <p style="margin: 8px 0; color: #495057; font-size: 14px;"><strong>Status:</strong> <span style="color: #D4AF37; font-weight: bold;">${order.status || 'Processing'}</span></p>
                    <p style="margin: 8px 0; color: #495057; font-size: 14px;"><strong>Order Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p style="margin: 8px 0 0; color: #495057; font-size: 14px;"><strong>Total:</strong> <span style="color: #D4AF37; font-size: 24px; font-weight: bold;">$${total.toFixed(2)}</span></p>
                  </td>
                </tr>
              </table>
              
              <!-- Items -->
              <h3 style="margin: 0 0 15px; color: #212529; font-size: 18px; font-weight: bold;">Order Items</h3>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 30px;">
                ${items.map((item, index) => `
                  <tr>
                    <td style="padding: 15px; ${index < items.length - 1 ? 'border-bottom: 1px solid #dee2e6;' : ''}">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <strong style="color: #212529; font-size: 16px;">${item.name}</strong>
                            <p style="margin: 5px 0 0; color: #6c757d; font-size: 14px;">Quantity: ${item.quantity}</p>
                          </td>
                          <td align="right">
                            <span style="color: #D4AF37; font-size: 16px; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                `).join('')}
              </table>
              
              <!-- Fulfillment Details -->
              ${generateFulfillmentSection(order)}
              
              <!-- Payment Info -->
              ${order.paymentId ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h4 style="margin: 0 0 10px; color: #212529; font-size: 16px; font-weight: bold;">💳 Payment Information</h4>
                    <p style="margin: 5px 0; color: #495057; font-size: 14px;"><strong>Payment ID:</strong> ${order.paymentId}</p>
                    <p style="margin: 5px 0; color: #495057; font-size: 14px;"><strong>Payment Method:</strong> ${order.paymentMethod || 'Square'}</p>
                    ${order.receiptUrl ? `<p style="margin: 5px 0; color: #495057; font-size: 14px;"><a href="${order.receiptUrl}" style="color: #D4AF37; text-decoration: none;">View Receipt →</a></p>` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Contact Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 4px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <h4 style="margin: 0 0 15px; color: #212529; font-size: 16px; font-weight: bold;">Questions about your order?</h4>
                    <p style="margin: 8px 0; color: #495057; font-size: 14px;">
                      <strong>Email:</strong> <a href="mailto:hello@tasteofgratitude.com" style="color: #D4AF37; text-decoration: none;">hello@tasteofgratitude.com</a>
                    </p>
                    <p style="margin: 8px 0; color: #495057; font-size: 14px;">
                      <strong>Phone:</strong> <a href="tel:+14045551234" style="color: #D4AF37; text-decoration: none;">(404) 555-1234</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #dee2e6; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #495057; font-size: 14px; font-weight: bold;">Thank you for choosing Taste of Gratitude!</p>
              <p style="margin: 0; color: #6c757d; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateFulfillmentSection(order) {
  const fulfillmentType = order.fulfillmentType || order.fulfillment?.type;
  
  let content = '';
  
  if (fulfillmentType === 'pickup_market' || fulfillmentType === 'pickup') {
    content = `
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px; color: white; font-size: 20px;">🏪 Your Pickup Details</h3>
        <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
          <p style="margin: 0 0 8px; color: white; font-size: 18px; font-weight: bold;">Serenbe Farmers Market</p>
          <p style="margin: 0 0 5px; color: rgba(255,255,255,0.95); font-size: 14px;">📍 10950 Hutcheson Ferry Rd, Palmetto, GA 30268</p>
          <p style="margin: 0; color: rgba(255,255,255,0.95); font-size: 14px;">📸 Look for our gold "Taste of Gratitude" booth (#12)</p>
        </div>
        <div style="background: #D4AF37; padding: 15px; border-radius: 6px; text-align: center;">
          <p style="margin: 0 0 5px; color: white; font-size: 14px; font-weight: 600;">⏰ PICKUP TIME</p>
          <p style="margin: 0 0 3px; color: white; font-size: 22px; font-weight: bold;">This Saturday</p>
          <p style="margin: 0 0 10px; color: white; font-size: 16px;">9:00 AM - 1:00 PM</p>
          <p style="margin: 0; color: white; font-size: 13px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">✨ Your order will be ready by <strong>9:30 AM</strong></p>
        </div>
      </div>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px;">
            <h4 style="margin: 0 0 15px; color: #212529; font-size: 16px; font-weight: bold;">📅 What to Expect:</h4>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px; vertical-align: top; width: 60px;">
                  <div style="background: #059669; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; text-align: center; line-height: 40px;">✅</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Thursday - Order Received</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">We got it! Your order is confirmed and in our system.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; vertical-align: top;">
                  <div style="background: #D4AF37; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; text-align: center; line-height: 40px;">🧪</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Friday Evening - Preparation</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Our team will hand-craft your order with care. We'll send you a reminder!</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; vertical-align: top;">
                  <div style="background: #10b981; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; text-align: center; line-height: 40px;">🎉</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Saturday Morning - Ready for YOU!</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Your order is ready! Show up anytime 9AM-1PM with your order number.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px; color: #856404; font-size: 18px; font-weight: bold;">💡 Pickup Instructions</p>
            <p style="margin: 0 0 10px; color: #856404; font-size: 14px;">1. Drive to Serenbe Farmers Market (maps link below)</p>
            <p style="margin: 0 0 10px; color: #856404; font-size: 14px;">2. Look for the <strong>gold "Taste of Gratitude" banners</strong> at Booth #12</p>
            <p style="margin: 0 0 10px; color: #856404; font-size: 14px;">3. Show your order number: <strong>${order.orderNumber}</strong></p>
            <p style="margin: 0; color: #856404; font-size: 14px;">4. Grab your order and enjoy! 🌿</p>
            <div style="margin-top: 15px;">
              <a href="https://maps.google.com/?q=10950+Hutcheson+Ferry+Rd+Palmetto+GA+30268" style="display: inline-block; background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px;">📍 Get Directions</a>
            </div>
          </td>
        </tr>
      </table>
    `;
  } else if (fulfillmentType === 'pickup_browns_mill') {
    content = `
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px; color: white; font-size: 20px;">🏘️ Your Pickup Details</h3>
        <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
          <p style="margin: 0 0 8px; color: white; font-size: 18px; font-weight: bold;">Browns Mill Community</p>
          <p style="margin: 0 0 5px; color: rgba(255,255,255,0.95); font-size: 14px;">📍 Browns Mill Recreation Center, Atlanta, GA</p>
          <p style="margin: 0; color: rgba(255,255,255,0.95); font-size: 14px;">📸 Find us at the community event area</p>
        </div>
        <div style="background: #D4AF37; padding: 15px; border-radius: 6px; text-align: center;">
          <p style="margin: 0 0 5px; color: white; font-size: 14px; font-weight: 600;">⏰ PICKUP TIME</p>
          <p style="margin: 0 0 3px; color: white; font-size: 22px; font-weight: bold;">This Saturday</p>
          <p style="margin: 0 0 10px; color: white; font-size: 16px;">3:00 PM - 6:00 PM</p>
          <p style="margin: 0; color: white; font-size: 13px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">✨ Your order will be ready by <strong>3:30 PM</strong></p>
        </div>
      </div>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px;">
            <h4 style="margin: 0 0 15px; color: #212529; font-size: 16px; font-weight: bold;">📅 What to Expect:</h4>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px; vertical-align: top; width: 60px;">
                  <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">✅</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Thursday - Order Received</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">We got it! Your order is confirmed and in our system.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; vertical-align: top;">
                  <div style="background: #D4AF37; color: white; width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">🧪</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Friday Evening - Preparation</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Our team will hand-craft your order with care. We'll send you a reminder!</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; vertical-align: top;">
                  <div style="background: #10b981; color: white; width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">🎉</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Saturday Afternoon - Ready for YOU!</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Your order is ready! Show up anytime 3PM-6PM with your order number.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px; color: #1e40af; font-size: 18px; font-weight: bold;">💡 Pickup Instructions</p>
            <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px;">1. Drive to Browns Mill Recreation Center</p>
            <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px;">2. Find us at the <strong>community event area</strong></p>
            <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px;">3. Show your order number: <strong>${order.orderNumber}</strong></p>
            <p style="margin: 0; color: #1e40af; font-size: 14px;">4. Grab your order and enjoy! 🌿</p>
            <div style="margin-top: 15px;">
              <a href="https://maps.google.com/?q=Browns+Mill+Recreation+Center+Atlanta+GA" style="display: inline-block; background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px;">📍 Get Directions</a>
            </div>
          </td>
        </tr>
      </table>
    `;
  } else if (fulfillmentType === 'delivery') {
    const address = order.deliveryAddress || order.shippingAddress || {};
    const fullAddress = `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`;
    
    content = `
      <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px; color: white; font-size: 20px;">🚚 Your Delivery Details</h3>
        <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
          <p style="margin: 0 0 8px; color: white; font-size: 18px; font-weight: bold;">Home Delivery</p>
          <p style="margin: 0 0 5px; color: rgba(255,255,255,0.95); font-size: 14px;">📍 ${fullAddress}</p>
          ${order.deliveryInstructions ? `<p style="margin: 0; color: rgba(255,255,255,0.95); font-size: 14px;">📝 ${order.deliveryInstructions}</p>` : ''}
        </div>
        <div style="background: #D4AF37; padding: 15px; border-radius: 6px; text-align: center;">
          <p style="margin: 0 0 5px; color: white; font-size: 14px; font-weight: 600;">⏰ DELIVERY WINDOW</p>
          <p style="margin: 0 0 3px; color: white; font-size: 22px; font-weight: bold;">2-3 Business Days</p>
          ${order.deliveryTimeSlot ? `<p style="margin: 0 0 10px; color: white; font-size: 16px;">${order.deliveryTimeSlot}</p>` : ''}
          <p style="margin: 0; color: white; font-size: 13px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">✨ We'll notify you when your order ships and when it's out for delivery</p>
        </div>
      </div>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px;">
            <h4 style="margin: 0 0 15px; color: #212529; font-size: 16px; font-weight: bold;">📅 What to Expect:</h4>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px; vertical-align: top; width: 60px;">
                  <div style="background: #f97316; color: white; width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">✅</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Today - Order Received</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">We got it! Your order is confirmed and being prepared.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; vertical-align: top;">
                  <div style="background: #D4AF37; color: white; width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">🧪</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Within 24 Hours - Preparation</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Our team hand-crafts your order with care. We'll send you a shipping notification!</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; vertical-align: top;">
                  <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">📦</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Day 1-2 - Shipped</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Your order is on its way! You'll receive tracking information.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; vertical-align: top;">
                  <div style="background: #10b981; color: white; width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; font-size: 20px;">🎉</div>
                </td>
                <td style="padding: 10px; vertical-align: top;">
                  <p style="margin: 0 0 5px; color: #212529; font-weight: bold;">Day 2-3 - Delivered to YOU!</p>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Your wellness boost arrives! Enjoy your fresh sea moss products.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fff7ed; border: 2px solid #f97316; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="margin: 0 0 10px; color: #9a3412; font-size: 18px; font-weight: bold;">💡 Delivery Instructions</p>
            <p style="margin: 0 0 10px; color: #9a3412; font-size: 14px;">1. Watch for shipping confirmation email (with tracking)</p>
            <p style="margin: 0 0 10px; color: #9a3412; font-size: 14px;">2. Track your package in real-time</p>
            <p style="margin: 0 0 10px; color: #9a3412; font-size: 14px;">3. We'll text you when delivery is imminent</p>
            <p style="margin: 0; color: #9a3412; font-size: 14px;">4. Enjoy your fresh, hand-crafted order! 🌿</p>
          </td>
        </tr>
      </table>
    `;
  } else if (fulfillmentType === 'shipping') {
    const address = order.shippingAddress || {};
    content = `
      <p style="margin: 5px 0; color: #495057;"><strong>Type:</strong> Shipping</p>
      <p style="margin: 5px 0; color: #495057;"><strong>Address:</strong> ${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}</p>
      <p style="margin: 5px 0; color: #495057;"><strong>Estimated Delivery:</strong> 2-3 business days</p>
    `;
  }
  
  if (content) {
    return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
        <tr>
          <td>
            ${content}
          </td>
        </tr>
      </table>
    `;
  }
  
  return '';
}

function generateOrderEmailText(order, type) {
  const orderId = order.id || 'N/A';
  const total = order.total || 0;
  const items = order.items || [];
  
  let text = `TASTE OF GRATITUDE - ORDER CONFIRMATION\n\n`;
  text += `Order ID: ${orderId}\n`;
  text += `Total: $${total.toFixed(2)}\n\n`;
  text += `ITEMS:\n`;
  items.forEach(item => {
    text += `- ${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}\n`;
  });
  text += `\nThank you for your order!\n`;
  text += `Contact: hello@tasteofgratitude.com`;
  
  return text;
}

function generateWelcomeEmailHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Taste of Gratitude</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 32px;">Welcome to Taste of Gratitude!</h1>
              <p style="margin: 20px 0; color: #495057; font-size: 16px;">Dear ${name || 'Friend'},</p>
              <p style="margin: 0 0 20px; color: #495057; font-size: 16px;">Thank you for joining our wellness community. We're excited to have you on this journey to better health.</p>
              <a href="https://tasteofgratitude.com/catalog" style="display: inline-block; padding: 15px 30px; background-color: #D4AF37; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;">Shop Now</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateCouponEmailHTML(coupon) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Exclusive Coupon</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 20px;">🎁</div>
              <h1 style="margin: 0; color: #D4AF37; font-size: 28px;">You've Got a Special Offer!</h1>
              <div style="margin: 30px 0; padding: 30px; background-color: #f8f9fa; border: 2px dashed #D4AF37; border-radius: 8px;">
                <p style="margin: 0 0 10px; color: #6c757d; font-size: 14px;">YOUR COUPON CODE</p>
                <p style="margin: 0; color: #212529; font-size: 32px; font-weight: bold; letter-spacing: 2px;">${coupon.code}</p>
                <p style="margin: 15px 0 0; color: #D4AF37; font-size: 20px; font-weight: bold;">Save $${coupon.discountAmount}</p>
              </div>
              <p style="margin: 0 0 10px; color: #495057; font-size: 14px;">Expires: ${new Date(coupon.expiresAt).toLocaleDateString()}</p>
              <a href="https://tasteofgratitude.com/order" style="display: inline-block; padding: 15px 30px; background-color: #D4AF37; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;">Use Coupon Now</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateNewsletterConfirmationHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Newsletter Subscription Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 20px;">📧</div>
              <h1 style="margin: 0; color: #D4AF37; font-size: 28px;">You're Subscribed!</h1>
              <p style="margin: 20px 0; color: #495057; font-size: 16px;">Thank you for subscribing to our newsletter, ${name || 'Friend'}!</p>
              <p style="margin: 0; color: #6c757d; font-size: 14px;">You'll receive wellness tips, exclusive offers, and updates about our latest products.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Utility functions
export function getEmailLog() {
  return EMAIL_LOG;
}

export function isRealEmail() {
  return !!resend;
}

export { resend };
