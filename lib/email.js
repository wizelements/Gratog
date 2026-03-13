// Email service - supports both real SendGrid and mock mode
import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/logger';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  HAS_PUBLIC_PHONE,
  SITE_URL,
  SUPPORT_EMAIL,
} from '@/lib/site-config';

const USE_REAL_EMAIL = process.env.SENDGRID_API_KEY;

const EMAIL_LOG = [];

if (USE_REAL_EMAIL) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  logger.info('Using REAL SendGrid Email');
} else {
  logger.warn('Using MOCK Email (set SENDGRID_API_KEY for real email)');
}

export async function sendEmail({ to, from, subject, html, text, listUnsubscribeUrl }) {
  const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || CONTACT_EMAIL;
  
  if (USE_REAL_EMAIL) {
    const unsubscribeUrl = listUnsubscribeUrl || `${SITE_URL}/unsubscribe`;
    const msg = {
        to,
        from: fromEmail,
        subject,
        html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await sgMail.send(msg);

        logger.info('Email', 'Sent via SendGrid', { to, attempt: attempt + 1 });

        return {
          success: true,
          messageId: result[0].headers['x-message-id'],
          status: 'sent',
          to,
          message: 'Email sent successfully'
        };
      } catch (error) {
        if (attempt === 2) {
          console.error('📧 [EMAIL ERROR]:', error.message);
          return {
            success: false,
            error: error.message
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
  } else {
    // Mock mode
    console.log('📧 [MOCK EMAIL] To:', to);
    console.log('📧 [MOCK EMAIL] Subject:', subject);
    console.log('📧 [MOCK EMAIL] Content:', text || 'HTML email');
    
    const emailRecord = {
      to,
      from: fromEmail,
      subject,
      html,
      text,
      sentAt: new Date(),
      status: 'sent',
      messageId: `EMAIL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    EMAIL_LOG.push(emailRecord);
    
    return {
      success: true,
      messageId: emailRecord.messageId,
      status: 'sent',
      to,
      message: 'Email sent successfully (MOCK)'
    };
  }
}

export function getEmailLog() {
  return EMAIL_LOG;
}

export function isRealEmail() {
  return USE_REAL_EMAIL;
}

export async function sendOrderEmail(orderDetails) {
  const { email } = orderDetails.customer;
  const subject = `Order Confirmation - ${orderDetails.id}`;
  
  const emailContent = generateOrderEmailContent(orderDetails, 'confirmation');
  return sendEmail({
    to: email,
    subject: subject,
    html: emailContent
  });
}

// Alias for compatibility
export async function sendOrderConfirmationEmail(order) {
  if (!order || !order.customer || !order.customer.email) {
    console.warn('[email] sendOrderConfirmationEmail: invalid order data, skipping');
    return { skipped: true, reason: 'no-recipient' };
  }
  return sendOrderEmail(order);
}

export async function sendOrderUpdateEmail(orderDetails, updateType = 'status_update') {
  const { email } = orderDetails.customer;
  let subject = '';
  
  switch (updateType) {
    case 'payment_confirmed':
      subject = `Payment Confirmed - Order ${orderDetails.id}`;
      break;
    case 'ready_for_pickup':
      subject = `Order Ready for Pickup - ${orderDetails.id}`;
      break;
    case 'out_for_delivery':
      subject = `Order Out for Delivery - ${orderDetails.id}`;
      break;
    case 'delivered':
      subject = `Order Delivered - ${orderDetails.id}`;
      break;
    default:
      subject = `Order Update - ${orderDetails.id}`;
  }
  
  const emailContent = generateOrderEmailContent(orderDetails, updateType);
  return sendEmail({
    to: email,
    subject: subject,
    html: emailContent
  });
}

function generateOrderEmailContent(orderDetails, emailType = 'confirmation') {
  const statusMessages = {
    confirmation: {
      title: 'Thank you for your order!',
      message: 'We\'ve received your order and are preparing it with care.'
    },
    payment_confirmed: {
      title: 'Payment Confirmed!',
      message: 'Your payment has been processed successfully. We\'re now preparing your order.'
    },
    ready_for_pickup: {
      title: 'Order Ready!',
      message: 'Great news! Your order is ready for pickup at the market.'
    },
    out_for_delivery: {
      title: 'On the Way!',
      message: 'Your order is out for delivery and should arrive soon.'
    },
    delivered: {
      title: 'Order Delivered!',
      message: 'Your order has been successfully delivered. We hope you enjoy!'
    }
  };
  
  const { title, message } = statusMessages[emailType] || statusMessages.confirmation;
  
  // Safe access to order details with defaults
  const orderId = orderDetails.id || orderDetails.orderNumber || 'N/A';
  const total = orderDetails.total || orderDetails.pricing?.total || 0;
  const items = orderDetails.items || [];
  
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
  <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">Taste of Gratitude</h1>
      <p style="color: #666; margin: 5px 0 0 0;">Nourish Your Wellness Journey</p>
    </div>
    
    <!-- Main Content -->
    <h2 style="color: #333; margin-bottom: 15px;">${title}</h2>
    <p style="color: #666; font-size: 16px; line-height: 1.6;">Dear ${orderDetails.customer.name},</p>
    <p style="color: #666; font-size: 16px; line-height: 1.6;">${message}</p>
    
    <!-- Order Summary Card -->
    <div style="background: #f8f9fa; border-left: 4px solid #D4AF37; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="color: #333; margin: 0 0 15px 0;">Order Summary</h3>
      <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #D4AF37; font-weight: bold;">${orderDetails.status || 'Processing'}</span></p>
      <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(orderDetails.createdAt || Date.now()).toLocaleDateString()}</p>
      <p style="margin: 5px 0;"><strong>Total:</strong> <span style="color: #D4AF37; font-size: 18px; font-weight: bold;">$${total.toFixed(2)}</span></p>
    </div>
    
    <!-- Items -->
    <h3 style="color: #333; margin: 25px 0 15px 0;">Items Ordered</h3>
    <div style="border: 1px solid #e9ecef; border-radius: 4px;">
      ${items.map((item, index) => `
        <div style="padding: 15px; ${index < items.length - 1 ? 'border-bottom: 1px solid #e9ecef;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #333;">${item.name}</strong>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">Quantity: ${item.quantity}</p>
            </div>
            <div style="text-align: right;">
              <span style="color: #D4AF37; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <!-- Fulfillment Details -->
    <div style="background: #e8f5e8; border: 1px solid #d1edcc; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="color: #333; margin: 0 0 15px 0;">📦 Fulfillment Details</h3>
      ${orderDetails.fulfillmentType === 'pickup_market' ? `
        <p style="margin: 5px 0;"><strong>Type:</strong> Pickup at Serenbe Farmers Market</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> Booth #12</p>
        <p style="margin: 5px 0;"><strong>Hours:</strong> Saturdays 9:00 AM - 1:00 PM</p>
      ` : orderDetails.fulfillmentType === 'pickup_browns_mill' ? `
        <p style="margin: 5px 0;"><strong>Type:</strong> Pickup at Browns Mill Community Center</p>
        <p style="margin: 5px 0;"><strong>Hours:</strong> Saturdays 3:00 PM - 6:00 PM</p>
      ` : orderDetails.fulfillmentType === 'delivery' ? `
        <p style="margin: 5px 0;"><strong>Type:</strong> Delivery</p>
        <p style="margin: 5px 0;"><strong>Address:</strong> ${orderDetails.deliveryAddress?.street}, ${orderDetails.deliveryAddress?.city}, ${orderDetails.deliveryAddress?.state} ${orderDetails.deliveryAddress?.zip}</p>
        ${orderDetails.deliveryTimeSlot ? `<p style="margin: 5px 0;"><strong>Time Slot:</strong> ${orderDetails.deliveryTimeSlot}</p>` : ''}
        ${orderDetails.deliveryInstructions ? `<p style="margin: 5px 0;"><strong>Instructions:</strong> ${orderDetails.deliveryInstructions}</p>` : ''}
      ` : `
        <p style="margin: 5px 0;"><strong>Type:</strong> ${orderDetails.fulfillmentType}</p>
      `}
    </div>
    
    <!-- Payment Information -->
    ${orderDetails.paymentId ? `
      <div style="background: #f0f8ff; border: 1px solid #b3d9ff; padding: 15px; margin: 25px 0; border-radius: 4px;">
        <h4 style="color: #333; margin: 0 0 10px 0;">💳 Payment Information</h4>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Payment ID:</strong> ${orderDetails.paymentId}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Method:</strong> ${orderDetails.paymentMethod === 'square' ? 'Square Payment' : 'Credit Card'}</p>
        ${orderDetails.receiptUrl ? `<p style="margin: 5px 0; font-size: 14px;"><a href="${orderDetails.receiptUrl}" style="color: #D4AF37;">View Receipt</a></p>` : ''}
      </div>
    ` : ''}
    
    <!-- Contact Information -->
    <div style="background: #f8f9fa; padding: 20px; margin: 30px 0; border-radius: 4px; text-align: center;">
      <h4 style="color: #333; margin: 0 0 15px 0;">Questions about your order?</h4>
      <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${SUPPORT_EMAIL}" style="color: #D4AF37;">${SUPPORT_EMAIL}</a></p>
      ${HAS_PUBLIC_PHONE
        ? `<p style="margin: 5px 0;"><strong>Phone:</strong> <a href="${CONTACT_PHONE_HREF}" style="color: #D4AF37;">${CONTACT_PHONE_DISPLAY}</a></p>`
        : `<p style="margin: 5px 0;"><strong>Phone:</strong> Callback support is available by email request.</p>`}
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef;">
      <p style="color: #666; font-size: 14px; margin: 0;">Thank you for choosing Taste of Gratitude!</p>
      <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
</div>
  `;
}
