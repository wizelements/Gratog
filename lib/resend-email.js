// Full Email Service using Resend API
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.com';

let resend = null;
const EMAIL_LOG = [];

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  console.log('✅ Resend Email Service Initialized');
} else {
  console.log('⚠️ Using MOCK Email Mode (set RESEND_API_KEY for real email)');
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
                    <p style="margin: 8px 0 0; color: #495057; font-size: 14px;"><strong>Total:</strong> <span style="color: #D4AF37; font-size: 24px; font-weight: bold;">$${(total / 100).toFixed(2)}</span></p>
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
                            <span style="color: #D4AF37; font-size: 16px; font-weight: bold;">$${((item.price * item.quantity) / 100).toFixed(2)}</span>
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
      <p style="margin: 5px 0; color: #495057;"><strong>Type:</strong> Pickup at Market</p>
      <p style="margin: 5px 0; color: #495057;"><strong>Location:</strong> Serenbe Farmers Market</p>
      <p style="margin: 5px 0; color: #495057;"><strong>Address:</strong> 10950 Hutcheson Ferry Rd, Palmetto, GA 30268</p>
      <p style="margin: 5px 0; color: #495057;"><strong>Hours:</strong> Saturdays 9:00 AM - 1:00 PM</p>
    `;
  } else if (fulfillmentType === 'delivery') {
    const address = order.deliveryAddress || order.shippingAddress || {};
    content = `
      <p style="margin: 5px 0; color: #495057;"><strong>Type:</strong> Home Delivery</p>
      <p style="margin: 5px 0; color: #495057;"><strong>Address:</strong> ${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}</p>
      ${order.deliveryTimeSlot ? `<p style="margin: 5px 0; color: #495057;"><strong>Time Slot:</strong> ${order.deliveryTimeSlot}</p>` : ''}
      ${order.deliveryInstructions ? `<p style="margin: 5px 0; color: #495057;"><strong>Instructions:</strong> ${order.deliveryInstructions}</p>` : ''}
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
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 4px; margin-bottom: 30px;">
        <tr>
          <td style="padding: 20px;">
            <h4 style="margin: 0 0 10px; color: #212529; font-size: 16px; font-weight: bold;">📦 Fulfillment Details</h4>
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
  text += `Total: $${(total / 100).toFixed(2)}\n\n`;
  text += `ITEMS:\n`;
  items.forEach(item => {
    text += `- ${item.name} x ${item.quantity} - $${((item.price * item.quantity) / 100).toFixed(2)}\n`;
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
