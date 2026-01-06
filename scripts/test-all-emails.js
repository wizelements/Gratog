#!/usr/bin/env node
/**
 * Test All Email Types - Sends test emails using Resend API
 * 
 * Usage: 
 *   RESEND_API_KEY=re_xxx node scripts/test-all-emails.js silverwatkins@gmail.com
 *   
 * Without API key, runs in mock mode (logs to console)
 */

import { Resend } from 'resend';

const TEST_EMAIL = process.argv[2] || 'test@example.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.net';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  console.log('✅ Resend API initialized - REAL EMAIL MODE');
} else {
  console.log('⚠️  No RESEND_API_KEY set - MOCK MODE (will only log)');
  console.log('   Set RESEND_API_KEY=re_xxx to send real emails\n');
}

async function sendEmail({ to, subject, html, text }) {
  console.log(`\n📧 Sending: ${subject}`);
  console.log(`   To: ${to}`);
  
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        text
      });
      console.log(`   ✅ SENT! ID: ${result.data?.id || result.id}`);
      return { success: true, id: result.data?.id || result.id };
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      return { success: false, error: error.message };
    }
  } else {
    console.log(`   📋 [MOCK] Would send email with subject: ${subject}`);
    return { success: true, mock: true };
  }
}

// ============== EMAIL TEMPLATES ==============

function generateOrderConfirmationHTML(order) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 32px;">Taste of Gratitude</h1>
              <p style="margin: 8px 0 0; color: #6c757d; font-size: 14px;">Nourish Your Wellness Journey</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
                <h2 style="margin: 0; color: #212529; font-size: 28px;">Thank you for your order!</h2>
              </div>
              
              <p style="margin: 20px 0; color: #495057; font-size: 16px; text-align: center;">
                We've received your order and are preparing it with care.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #495057;"><strong>Order #:</strong> ${order.orderNumber}</p>
                <p style="margin: 0 0 10px; color: #495057;"><strong>Customer:</strong> ${order.customer.name}</p>
                <p style="margin: 0 0 10px; color: #495057;"><strong>Email:</strong> ${order.customer.email}</p>
                <p style="margin: 0; color: #495057;"><strong>Phone:</strong> ${order.customer.phone}</p>
              </div>
              
              <h3 style="margin: 30px 0 15px; color: #212529; font-size: 18px;">Order Items</h3>
              <table width="100%" cellpadding="10" style="border-collapse: collapse;">
                ${order.items.map(item => `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="color: #495057;">${item.name} x ${item.quantity}</td>
                  <td style="color: #495057; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
                `).join('')}
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 15px 10px; font-weight: bold; color: #212529;">Total</td>
                  <td style="padding: 15px 10px; font-weight: bold; color: #D4AF37; text-align: right;">$${order.pricing.total.toFixed(2)}</td>
                </tr>
              </table>
              
              <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 25px; border-radius: 8px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px; color: white; font-size: 20px;">📍 Pickup Details</h3>
                <p style="margin: 0 0 10px; color: white; font-size: 16px;"><strong>Browns Mill Recreation Center</strong></p>
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">Show order #${order.orderNumber} at pickup</p>
              </div>
              
              ${order.payment.receiptUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${order.payment.receiptUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6c757d; color: white; text-decoration: none; border-radius: 4px;">View Receipt</a>
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">© 2024 Taste of Gratitude | hello@tasteofgratitude.com</p>
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

function generateOrderStatusHTML(order, status, statusInfo) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${statusInfo.title}</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <h1 style="margin: 0; color: #D4AF37; font-size: 32px;">Taste of Gratitude</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">${statusInfo.emoji}</div>
              <h2 style="margin: 0 0 15px; color: #212529; font-size: 28px;">${statusInfo.title}</h2>
              <p style="margin: 0 0 20px; color: #495057; font-size: 16px;">${statusInfo.message}</p>
              <p style="margin: 0; color: #6c757d; font-size: 14px;">Order #${order.orderNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 30px;">
              <p style="margin: 0; color: #6c757d; font-size: 14px; text-align: center;">
                Questions? Reply to this email or contact hello@tasteofgratitude.com
              </p>
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

function generateWelcomeHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Taste of Gratitude</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">🌿</div>
              <h1 style="margin: 0 0 20px; color: #D4AF37; font-size: 32px;">Welcome to Taste of Gratitude!</h1>
              <p style="margin: 0 0 20px; color: #495057; font-size: 18px;">Dear ${name},</p>
              <p style="margin: 0 0 30px; color: #495057; font-size: 16px;">
                Thank you for joining our wellness community! We're excited to have you on this journey to better health with our premium sea moss products.
              </p>
              <a href="https://tasteofgratitude.com/catalog" style="display: inline-block; padding: 15px 40px; background-color: #D4AF37; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Shop Now</a>
              <p style="margin: 30px 0 0; color: #6c757d; font-size: 14px;">
                🎁 New members get 10% off first order with code: WELCOME10
              </p>
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

function generateCouponHTML(coupon) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Exclusive Coupon</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎁</div>
              <h1 style="margin: 0 0 30px; color: #D4AF37; font-size: 28px;">You've Got a Special Offer!</h1>
              
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border: 3px dashed #D4AF37; border-radius: 12px; margin: 0 0 30px;">
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Coupon Code</p>
                <p style="margin: 0 0 15px; color: #78350f; font-size: 36px; font-weight: bold; letter-spacing: 4px;">${coupon.code}</p>
                <p style="margin: 0; color: #D4AF37; font-size: 24px; font-weight: bold;">Save $${coupon.discountAmount}!</p>
              </div>
              
              <p style="margin: 0 0 10px; color: #495057; font-size: 14px;">⏰ Expires: ${coupon.expiresAt}</p>
              <p style="margin: 0 0 30px; color: #6c757d; font-size: 14px;">Min order: $${coupon.minOrder}</p>
              
              <a href="https://tasteofgratitude.com/order" style="display: inline-block; padding: 15px 40px; background-color: #D4AF37; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Use Coupon Now</a>
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

function generateNewsletterHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Newsletter Subscription Confirmed</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
              <h1 style="margin: 0 0 20px; color: #D4AF37; font-size: 28px;">You're Subscribed!</h1>
              <p style="margin: 0 0 20px; color: #495057; font-size: 18px;">Thank you, ${name}!</p>
              <p style="margin: 0 0 30px; color: #495057; font-size: 16px;">
                You'll now receive wellness tips, exclusive offers, and updates about our latest sea moss products.
              </p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                  📬 Expect weekly wellness insights<br>
                  🎁 Subscriber-only discounts<br>
                  🌿 New product announcements
                </p>
              </div>
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

// ============== TEST DATA ==============

const testOrder = {
  id: 'TEST-ORDER-001',
  orderNumber: 'TOG-2024-TEST',
  customer: {
    name: 'Silver Watkins',
    email: TEST_EMAIL,
    phone: '(555) 123-4567'
  },
  items: [
    { name: 'Sea Moss Gel (16oz)', quantity: 2, price: 35.00 },
    { name: 'Elderberry Sea Moss Gel', quantity: 1, price: 40.00 },
    { name: 'Sea Moss Capsules (60ct)', quantity: 1, price: 45.00 }
  ],
  pricing: {
    subtotal: 155.00,
    tax: 12.40,
    deliveryFee: 0,
    total: 167.40
  },
  fulfillment: { type: 'pickup' },
  payment: {
    receiptUrl: 'https://squareup.com/receipt/preview/test-receipt',
    cardBrand: 'VISA',
    cardLast4: '1234'
  }
};

const testCoupon = {
  code: 'SEAWELLNESS25',
  discountAmount: 25,
  expiresAt: 'January 31, 2026',
  minOrder: 50
};

const statusTypes = [
  { status: 'ready_for_pickup', emoji: '🎉', title: 'Order Ready for Pickup!', message: 'Your order is ready and waiting for you at Browns Mill Recreation Center.' },
  { status: 'out_for_delivery', emoji: '🚚', title: 'Out for Delivery!', message: 'Your order is on its way to you. Expect arrival within 30-60 minutes.' },
  { status: 'delivered', emoji: '✅', title: 'Order Delivered!', message: 'Your order has been delivered. Enjoy your wellness products!' },
];

// ============== MAIN TEST RUNNER ==============

async function runAllTests() {
  console.log('═'.repeat(60));
  console.log('TASTE OF GRATITUDE - EMAIL TEST SUITE');
  console.log('═'.repeat(60));
  console.log(`Target Email: ${TEST_EMAIL}`);
  console.log(`From Email: ${FROM_EMAIL}`);
  console.log(`Mode: ${resend ? '🔴 LIVE' : '⚪ MOCK'}`);
  console.log('═'.repeat(60));

  const results = [];

  // 1. Order Confirmation Email
  console.log('\n1️⃣ ORDER CONFIRMATION EMAIL');
  const r1 = await sendEmail({
    to: TEST_EMAIL,
    subject: `✅ Order Confirmation - ${testOrder.orderNumber}`,
    html: generateOrderConfirmationHTML(testOrder),
    text: `Order Confirmation for ${testOrder.orderNumber}. Total: $${testOrder.pricing.total}`
  });
  results.push({ type: 'Order Confirmation', ...r1 });

  // 2. Order Status Emails (3 types)
  console.log('\n2️⃣ ORDER STATUS EMAILS');
  for (const statusInfo of statusTypes) {
    const r = await sendEmail({
      to: TEST_EMAIL,
      subject: `${statusInfo.emoji} ${statusInfo.title} - ${testOrder.orderNumber}`,
      html: generateOrderStatusHTML(testOrder, statusInfo.status, statusInfo),
      text: `${statusInfo.title} - Order ${testOrder.orderNumber}`
    });
    results.push({ type: `Status: ${statusInfo.status}`, ...r });
  }

  // 3. Welcome Email
  console.log('\n3️⃣ WELCOME EMAIL');
  const r3 = await sendEmail({
    to: TEST_EMAIL,
    subject: '🌿 Welcome to Taste of Gratitude!',
    html: generateWelcomeHTML('Silver'),
    text: 'Welcome to Taste of Gratitude, Silver! We\'re excited to have you.'
  });
  results.push({ type: 'Welcome', ...r3 });

  // 4. Coupon Email
  console.log('\n4️⃣ COUPON EMAIL');
  const r4 = await sendEmail({
    to: TEST_EMAIL,
    subject: `🎁 Your Exclusive Coupon: ${testCoupon.code}`,
    html: generateCouponHTML(testCoupon),
    text: `You have a coupon! Code: ${testCoupon.code}, Save $${testCoupon.discountAmount}`
  });
  results.push({ type: 'Coupon', ...r4 });

  // 5. Newsletter Confirmation
  console.log('\n5️⃣ NEWSLETTER CONFIRMATION EMAIL');
  const r5 = await sendEmail({
    to: TEST_EMAIL,
    subject: '📧 Newsletter Subscription Confirmed',
    html: generateNewsletterHTML('Silver'),
    text: 'Thank you for subscribing to our newsletter, Silver!'
  });
  results.push({ type: 'Newsletter', ...r5 });

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    const mode = r.mock ? '[MOCK]' : r.id ? `[${r.id}]` : '[FAILED]';
    console.log(`${icon} ${r.type.padEnd(25)} ${mode}`);
  });
  
  console.log('─'.repeat(60));
  console.log(`Total: ${results.length} | ✅ Success: ${successful} | ❌ Failed: ${failed}`);
  console.log('═'.repeat(60));
  
  if (!resend) {
    console.log('\n💡 To send REAL emails, run:');
    console.log(`   RESEND_API_KEY=re_xxx node scripts/test-all-emails.js ${TEST_EMAIL}\n`);
  }
}

runAllTests().catch(console.error);
