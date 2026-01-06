#!/usr/bin/env node
/**
 * Test all real email templates with proper sender addresses
 */

const TEST_EMAIL = process.argv[2] || 'silverwatkins@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not set');
  process.exit(1);
}

// Email senders
const SENDERS = {
  orders: 'Taste of Gratitude Orders <orders@tasteofgratitude.net>',
  info: 'Taste of Gratitude <info@tasteofgratitude.net>',
  community: 'Taste of Gratitude Community <community@tasteofgratitude.net>',
  rewards: 'Taste of Gratitude Rewards <rewards@tasteofgratitude.net>'
};

// Test data
const testOrder = {
  orderNumber: 'TOG-2026-0106',
  customer: { name: 'Silver Watkins', email: TEST_EMAIL, phone: '(404) 555-1234' },
  items: [
    { name: 'Sea Moss Gel (16oz)', quantity: 2, price: 35.00 },
    { name: 'Elderberry Sea Moss Gel', quantity: 1, price: 40.00 },
    { name: 'Sea Moss Capsules (60ct)', quantity: 1, price: 45.00 }
  ],
  total: 155.00,
  fulfillment: { type: 'pickup' },
  payment: { receiptUrl: 'https://squareup.com/receipt/preview/test' }
};

// ============== EMAIL TEMPLATES ==============

function orderConfirmationHTML(order) {
  const itemsHtml = order.items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 0; color: #333;">${item.name}</td>
      <td style="padding: 12px 0; color: #666; text-align: center;">×${item.quantity}</td>
      <td style="padding: 12px 0; color: #D4AF37; text-align: right; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 600px;">
        
        <!-- Header -->
        <tr>
          <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Taste of Gratitude</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Nourish Your Wellness Journey</p>
          </td>
        </tr>
        
        <!-- Success Icon -->
        <tr>
          <td style="padding: 40px 40px 20px; text-align: center;">
            <div style="width: 80px; height: 80px; background: #10b981; border-radius: 50%; margin: 0 auto 20px; line-height: 80px; font-size: 40px;">✓</div>
            <h2 style="margin: 0 0 10px; color: #1a1a1a; font-size: 24px;">Thank You for Your Order!</h2>
            <p style="margin: 0; color: #666; font-size: 16px;">We've received your order and are preparing it with care.</p>
          </td>
        </tr>
        
        <!-- Order Details -->
        <tr>
          <td style="padding: 0 40px 30px;">
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #D4AF37;">
              <p style="margin: 0 0 8px; color: #333;"><strong>Order #:</strong> ${order.orderNumber}</p>
              <p style="margin: 0 0 8px; color: #333;"><strong>Customer:</strong> ${order.customer.name}</p>
              <p style="margin: 0; color: #333;"><strong>Phone:</strong> ${order.customer.phone}</p>
            </div>
          </td>
        </tr>
        
        <!-- Items -->
        <tr>
          <td style="padding: 0 40px 30px;">
            <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 18px;">Order Items</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemsHtml}
              <tr style="background: #f8f9fa;">
                <td colspan="2" style="padding: 15px 0; font-weight: bold; color: #1a1a1a;">Total</td>
                <td style="padding: 15px 0; text-align: right; font-weight: bold; color: #D4AF37; font-size: 20px;">$${order.total.toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Pickup Info -->
        <tr>
          <td style="padding: 0 40px 30px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 8px;">
              <h3 style="margin: 0 0 15px; color: white; font-size: 18px;">📍 Pickup Details</h3>
              <p style="margin: 0 0 8px; color: white; font-size: 16px;"><strong>Browns Mill Recreation Center</strong></p>
              <p style="margin: 0 0 8px; color: rgba(255,255,255,0.9); font-size: 14px;">5101 Buffington Rd, Atlanta, GA 30349</p>
              <p style="margin: 15px 0 0; color: white; font-size: 14px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px;">
                Show order <strong>#${order.orderNumber}</strong> at pickup
              </p>
            </div>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="padding: 30px 40px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0 0 10px; color: #666; font-size: 14px;">Questions? Contact us at</p>
            <p style="margin: 0; color: #D4AF37; font-size: 14px;">support@tasteofgratitude.net</p>
            <p style="margin: 20px 0 0; color: #999; font-size: 12px;">© 2026 Taste of Gratitude | tasteofgratitude.shop</p>
          </td>
        </tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function readyForPickupHTML(order) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; max-width: 600px;">
        <tr>
          <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Taste of Gratitude</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
            <h2 style="margin: 0 0 15px; color: #1a1a1a; font-size: 28px;">Your Order is Ready!</h2>
            <p style="margin: 0 0 30px; color: #666; font-size: 16px;">Order <strong>#${order.orderNumber}</strong> is waiting for you.</p>
            
            <div style="background: #10b981; color: white; padding: 25px; border-radius: 8px; text-align: left;">
              <p style="margin: 0 0 10px; font-size: 18px; font-weight: bold;">📍 Browns Mill Recreation Center</p>
              <p style="margin: 0 0 15px; font-size: 14px; opacity: 0.9;">5101 Buffington Rd, Atlanta, GA 30349</p>
              <a href="https://maps.google.com/?q=Browns+Mill+Recreation+Center+Atlanta+GA" style="display: inline-block; background: white; color: #10b981; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Directions →</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; color: #999; font-size: 12px;">© 2026 Taste of Gratitude</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; max-width: 600px;">
        <tr>
          <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Welcome to Taste of Gratitude!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px;">🌿</div>
            <h2 style="margin: 0 0 15px; color: #1a1a1a; font-size: 24px;">Hello, ${name}!</h2>
            <p style="margin: 0 0 30px; color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for joining our wellness community. We're excited to have you on this journey to better health with our premium sea moss products.
            </p>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
              <p style="margin: 0 0 15px; color: #333; font-size: 16px; font-weight: bold;">🎁 Welcome Gift!</p>
              <p style="margin: 0 0 10px; color: #666; font-size: 14px;">Use code <strong style="color: #D4AF37; font-size: 18px;">WELCOME10</strong> for 10% off your first order</p>
            </div>
            
            <a href="https://tasteofgratitude.shop/catalog" style="display: inline-block; background: #D4AF37; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Shop Now →</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; color: #999; font-size: 12px;">© 2026 Taste of Gratitude | info@tasteofgratitude.net</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function couponHTML(coupon) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; max-width: 600px;">
        <tr>
          <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Taste of Gratitude Rewards</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px;">🎁</div>
            <h2 style="margin: 0 0 15px; color: #1a1a1a; font-size: 24px;">You've Got a Special Offer!</h2>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border: 3px dashed #D4AF37; border-radius: 12px; margin: 30px 0;">
              <p style="margin: 0 0 10px; color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your Coupon Code</p>
              <p style="margin: 0 0 15px; color: #78350f; font-size: 36px; font-weight: bold; letter-spacing: 4px;">${coupon.code}</p>
              <p style="margin: 0; color: #D4AF37; font-size: 28px; font-weight: bold;">Save $${coupon.amount}!</p>
            </div>
            
            <p style="margin: 0 0 10px; color: #666; font-size: 14px;">⏰ Expires: ${coupon.expires}</p>
            <p style="margin: 0 0 30px; color: #999; font-size: 14px;">Minimum order: $${coupon.minOrder}</p>
            
            <a href="https://tasteofgratitude.shop/order" style="display: inline-block; background: #D4AF37; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Use Coupon Now →</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; color: #999; font-size: 12px;">© 2026 Taste of Gratitude | rewards@tasteofgratitude.net</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function newsletterHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; max-width: 600px;">
        <tr>
          <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Taste of Gratitude Community</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
            <h2 style="margin: 0 0 15px; color: #1a1a1a; font-size: 24px;">You're Subscribed!</h2>
            <p style="margin: 0 0 30px; color: #666; font-size: 16px;">Thank you, ${name}! You'll now receive:</p>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; text-align: left;">
              <p style="margin: 0 0 12px; color: #333; font-size: 15px;">📬 Weekly wellness insights & tips</p>
              <p style="margin: 0 0 12px; color: #333; font-size: 15px;">🎁 Subscriber-only discounts & early access</p>
              <p style="margin: 0 0 12px; color: #333; font-size: 15px;">🌿 New product announcements</p>
              <p style="margin: 0; color: #333; font-size: 15px;">✨ Sea moss recipes & health benefits</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="margin: 0; color: #999; font-size: 12px;">© 2026 Taste of Gratitude | community@tasteofgratitude.net</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ============== SEND FUNCTION ==============

async function sendEmail(from, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: TEST_EMAIL, subject, html })
  });
  const data = await response.json();
  return { ok: response.ok, id: data.id, error: data.message };
}

// ============== RUN TESTS ==============

async function runTests() {
  console.log('═'.repeat(60));
  console.log('REAL EMAIL TEMPLATE TESTS');
  console.log('═'.repeat(60));
  console.log(`To: ${TEST_EMAIL}`);
  console.log('═'.repeat(60));
  
  const tests = [
    {
      name: 'Order Confirmation',
      from: SENDERS.orders,
      subject: `✅ Order Confirmation #${testOrder.orderNumber} - Taste of Gratitude`,
      html: orderConfirmationHTML(testOrder)
    },
    {
      name: 'Ready for Pickup',
      from: SENDERS.orders,
      subject: `🎉 Your Order is Ready! #${testOrder.orderNumber}`,
      html: readyForPickupHTML(testOrder)
    },
    {
      name: 'Welcome Email',
      from: SENDERS.info,
      subject: '🌿 Welcome to Taste of Gratitude!',
      html: welcomeHTML('Silver')
    },
    {
      name: 'Coupon/Reward',
      from: SENDERS.rewards,
      subject: '🎁 Your Exclusive Coupon: SEAWELLNESS25',
      html: couponHTML({ code: 'SEAWELLNESS25', amount: 25, expires: 'January 31, 2026', minOrder: 50 })
    },
    {
      name: 'Newsletter',
      from: SENDERS.community,
      subject: '📧 Newsletter Subscription Confirmed',
      html: newsletterHTML('Silver')
    }
  ];

  let passed = 0;
  for (const test of tests) {
    const result = await sendEmail(test.from, test.subject, test.html);
    if (result.ok) {
      console.log(`✅ ${test.name.padEnd(20)} | ${test.from.split('<')[1]?.replace('>', '')}`);
      passed++;
    } else {
      console.log(`❌ ${test.name.padEnd(20)} | ${result.error}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('═'.repeat(60));
  console.log(`Results: ${passed}/${tests.length} sent`);
  console.log(`📬 Check ${TEST_EMAIL} for ${passed} template emails`);
}

runTests().catch(console.error);
