/**
 * Rich HTML Email Templates
 * Professional, branded templates for transactional emails
 */

const BRAND_COLORS = {
  primary: '#059669',
  primaryLight: '#10b981',
  accent: '#14b8a6',
  dark: '#064e3b',
  light: '#ecfdf5',
  text: '#1f2937',
  textLight: '#6b7280',
  white: '#ffffff'
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.net';
const LOGO_URL = `${BASE_URL}/logo.png`;

/**
 * Base email wrapper with consistent styling
 */
function emailWrapper(content, previewText = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Taste of Gratitude</title>
  ${previewText ? `<!--[if !mso]><!--><meta name="description" content="${previewText}"><!--<![endif]-->` : ''}
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.accent} 100%); padding: 32px 24px; text-align: center; }
    .header img { max-width: 150px; height: auto; }
    .header h1 { color: #ffffff; margin: 16px 0 0 0; font-size: 24px; font-weight: 600; }
    .content { padding: 32px 24px; color: ${BRAND_COLORS.text}; line-height: 1.6; }
    .content h2 { color: ${BRAND_COLORS.dark}; font-size: 20px; margin-top: 0; }
    .content p { margin: 16px 0; }
    .button { display: inline-block; background: ${BRAND_COLORS.primary}; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .button:hover { background: ${BRAND_COLORS.primaryLight}; }
    .order-box { background: ${BRAND_COLORS.light}; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .order-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #d1d5db; }
    .order-item:last-child { border-bottom: none; }
    .order-total { font-size: 18px; font-weight: 700; color: ${BRAND_COLORS.dark}; margin-top: 16px; text-align: right; }
    .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .tracking-box { background: ${BRAND_COLORS.light}; border: 2px solid ${BRAND_COLORS.primary}; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .tracking-number { font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.primary}; letter-spacing: 2px; margin: 12px 0; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: ${BRAND_COLORS.textLight}; font-size: 14px; }
    .footer a { color: ${BRAND_COLORS.primary}; text-decoration: none; }
    .social-links { margin: 16px 0; }
    .social-links a { display: inline-block; margin: 0 8px; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 24px 16px !important; }
    }
  </style>
</head>
<body>
  <div style="padding: 20px 0; background-color: #f3f4f6;">
    <div class="container">
      ${content}
      <div class="footer">
        <p><strong>Taste of Gratitude</strong></p>
        <p>Premium Wildcrafted Sea Moss & Wellness Products</p>
        <div class="social-links">
          <a href="https://instagram.com/tasteofgratitude">Instagram</a> |
          <a href="${BASE_URL}">Website</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px;">
          <a href="${BASE_URL}/unsubscribe?email={{email}}">Unsubscribe</a> |
          <a href="${BASE_URL}/privacy">Privacy Policy</a>
        </p>
        <p style="font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} Taste of Gratitude. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Order Confirmation Email
 */
export function orderConfirmationTemplate(order) {
  const items = order.items || [];
  const itemsHtml = items.map(item => `
    <div class="order-item">
      <div>
        <strong>${item.name}</strong>
        <br><span style="color: ${BRAND_COLORS.textLight};">Qty: ${item.quantity}</span>
      </div>
      <div style="text-align: right;">$${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');

  const fulfillmentInfo = getFulfillmentInfo(order);

  const content = `
    <div class="header">
      <h1>🎉 Order Confirmed!</h1>
    </div>
    <div class="content">
      <h2>Thank you for your order, ${order.customer?.name || 'Valued Customer'}!</h2>
      <p>We're excited to prepare your wellness products. Here's your order summary:</p>
      
      <div class="order-box">
        <p style="margin-top: 0;"><strong>Order #${order.orderNumber}</strong></p>
        <p style="color: ${BRAND_COLORS.textLight}; margin-bottom: 16px;">
          ${new Date(order.createdAt).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        ${itemsHtml}
        <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid ${BRAND_COLORS.primary};">
          ${order.subtotal ? `<div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>$${order.subtotal.toFixed(2)}</span></div>` : ''}
          ${order.deliveryFee ? `<div style="display: flex; justify-content: space-between;"><span>Delivery:</span><span>$${order.deliveryFee.toFixed(2)}</span></div>` : ''}
          ${order.tip ? `<div style="display: flex; justify-content: space-between;"><span>Tip:</span><span>$${order.tip.toFixed(2)}</span></div>` : ''}
          <div class="order-total">Total: $${(order.total || 0).toFixed(2)}</div>
        </div>
      </div>

      ${fulfillmentInfo}

      <div style="text-align: center; margin: 32px 0;">
        <a href="${BASE_URL}/order/${order.orderNumber}" class="button">View Order Details</a>
      </div>

      <p>Questions about your order? Reply to this email or contact us at <a href="mailto:hello@tasteofgratitude.net">hello@tasteofgratitude.net</a></p>
      
      <p>With gratitude,<br><strong>The Taste of Gratitude Team</strong></p>
    </div>
  `;

  return emailWrapper(content, `Order #${order.orderNumber} confirmed!`);
}

/**
 * Shipping Notification Email
 */
export function shippingNotificationTemplate(order, tracking) {
  const content = `
    <div class="header">
      <h1>📦 Your Order Has Shipped!</h1>
    </div>
    <div class="content">
      <h2>Great news, ${order.customer?.name || 'there'}!</h2>
      <p>Your order is on its way! Here are your tracking details:</p>
      
      <div class="tracking-box">
        <p style="margin: 0; color: ${BRAND_COLORS.textLight};">Tracking Number</p>
        <p class="tracking-number">${tracking.trackingNumber}</p>
        <p style="margin: 0;"><strong>${tracking.carrier}</strong> - ${tracking.service || 'Standard Shipping'}</p>
        ${tracking.estimatedDelivery ? `
          <p style="margin-top: 16px; font-size: 16px;">
            Estimated Delivery: <strong>${new Date(tracking.estimatedDelivery).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}</strong>
          </p>
        ` : ''}
        <a href="${tracking.trackingUrl || `https://track.aftership.com/${tracking.trackingNumber}`}" class="button" style="margin-top: 16px;">Track Your Package</a>
      </div>

      <div class="order-box">
        <p style="margin: 0;"><strong>Order #${order.orderNumber}</strong></p>
        <p style="color: ${BRAND_COLORS.textLight};">
          ${(order.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}
        </p>
      </div>

      <p>We hope you love your products! Don't forget to share your wellness journey with us on Instagram <a href="https://instagram.com/tasteofgratitude">@tasteofgratitude</a></p>

      <p>With gratitude,<br><strong>The Taste of Gratitude Team</strong></p>
    </div>
  `;

  return emailWrapper(content, `Your order #${order.orderNumber} has shipped!`);
}

/**
 * Pickup Reminder Email
 */
export function pickupReminderTemplate(order, location, date) {
  const locationInfo = getLocationInfo(location);
  
  const content = `
    <div class="header">
      <h1>🏪 Pickup Reminder</h1>
    </div>
    <div class="content">
      <h2>Hi ${order.customer?.name || 'there'}!</h2>
      <p>Just a friendly reminder that your order is ready for pickup!</p>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>📅 Pickup Date:</strong> ${new Date(date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </div>

      <div class="order-box">
        <h3 style="margin-top: 0; color: ${BRAND_COLORS.dark};">📍 Pickup Location</h3>
        <p style="margin: 0;"><strong>${locationInfo.name}</strong></p>
        <p style="margin: 8px 0;">${locationInfo.address}</p>
        <p style="color: ${BRAND_COLORS.textLight}; margin: 0;">
          Hours: ${locationInfo.hours}
        </p>
        ${locationInfo.mapUrl ? `<a href="${locationInfo.mapUrl}" class="button" style="margin-top: 16px;">Get Directions</a>` : ''}
      </div>

      <div class="order-box">
        <p style="margin: 0;"><strong>Order #${order.orderNumber}</strong></p>
        <p style="color: ${BRAND_COLORS.textLight}; margin-bottom: 0;">
          ${(order.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}
        </p>
      </div>

      <p><strong>Tip:</strong> Look for our booth with the green "Taste of Gratitude" banner!</p>

      <p>See you at the market!<br><strong>The Taste of Gratitude Team</strong></p>
    </div>
  `;

  return emailWrapper(content, `Don't forget to pick up your order at ${locationInfo.name}!`);
}

/**
 * Delivery Notification Email
 */
export function deliveryNotificationTemplate(order, eta) {
  const content = `
    <div class="header">
      <h1>🚗 Out for Delivery!</h1>
    </div>
    <div class="content">
      <h2>Exciting news, ${order.customer?.name || 'there'}!</h2>
      <p>Your wellness products are out for delivery and will arrive soon!</p>
      
      <div class="tracking-box">
        <p style="font-size: 18px; margin: 0;">Estimated Arrival</p>
        <p style="font-size: 32px; font-weight: 700; color: ${BRAND_COLORS.primary}; margin: 12px 0;">${eta}</p>
      </div>

      <div class="order-box">
        <p style="margin: 0;"><strong>Order #${order.orderNumber}</strong></p>
        <p style="color: ${BRAND_COLORS.textLight}; margin: 8px 0 0 0;">
          Delivery Address: ${order.address?.street}, ${order.address?.city}
        </p>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>Tip:</strong> Make sure someone is available to receive your order, or specify any delivery instructions in your account.</p>
      </div>

      <p>Enjoy your wellness journey!<br><strong>The Taste of Gratitude Team</strong></p>
    </div>
  `;

  return emailWrapper(content, `Your order is out for delivery!`);
}

/**
 * Password Reset Email
 */
export function passwordResetTemplate(name, resetLink) {
  const content = `
    <div class="header">
      <h1>🔐 Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hi ${name || 'there'},</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>

      <div class="info-box">
        <p style="margin: 0;">This link will expire in 1 hour for security reasons. If you didn't request this reset, you can safely ignore this email.</p>
      </div>

      <p style="color: ${BRAND_COLORS.textLight}; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="word-break: break-all;">${resetLink}</a>
      </p>

      <p>Stay well,<br><strong>The Taste of Gratitude Team</strong></p>
    </div>
  `;

  return emailWrapper(content, 'Reset your password');
}

/**
 * Welcome Email
 */
export function welcomeTemplate(name) {
  const content = `
    <div class="header">
      <h1>🌿 Welcome to the Family!</h1>
    </div>
    <div class="content">
      <h2>Hi ${name || 'there'},</h2>
      <p>Welcome to Taste of Gratitude! We're thrilled to have you join our wellness community.</p>
      
      <p><strong>Here's what you can look forward to:</strong></p>
      <ul style="padding-left: 20px;">
        <li>Premium wildcrafted sea moss products</li>
        <li>Exclusive member discounts and early access</li>
        <li>Wellness tips and recipes</li>
        <li>Rewards points on every purchase</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${BASE_URL}/catalog" class="button">Explore Our Products</a>
      </div>

      <div class="order-box">
        <h3 style="margin-top: 0; color: ${BRAND_COLORS.dark};">🎁 New Member Bonus</h3>
        <p style="margin: 0;">Use code <strong>WELCOME10</strong> for 10% off your first order!</p>
      </div>

      <p>Questions? We're always here to help at <a href="mailto:hello@tasteofgratitude.net">hello@tasteofgratitude.net</a></p>

      <p>With gratitude,<br><strong>The Taste of Gratitude Team</strong></p>
    </div>
  `;

  return emailWrapper(content, 'Welcome to Taste of Gratitude! 🌿');
}

/**
 * Review Request Email
 */
export function reviewRequestTemplate(order, products) {
  const productCards = (products || order.items || []).slice(0, 3).map(product => `
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 12px 0; text-align: center;">
      <p style="font-weight: 600; margin: 0 0 8px 0;">${product.name}</p>
      <a href="${BASE_URL}/product/${product.slug || product.id}?review=true" 
         style="color: ${BRAND_COLORS.primary}; text-decoration: none; font-weight: 500;">
        ⭐ Write a Review
      </a>
    </div>
  `).join('');

  const content = `
    <div class="header">
      <h1>⭐ How Did We Do?</h1>
    </div>
    <div class="content">
      <h2>Hi ${order.customer?.name || 'there'}!</h2>
      <p>We hope you're enjoying your recent order! We'd love to hear your thoughts.</p>
      
      <p>Your review helps other customers make informed decisions and supports our small business. Plus, you'll earn <strong>10 reward points</strong> for each review!</p>

      <div class="order-box">
        <h3 style="margin-top: 0; color: ${BRAND_COLORS.dark};">Share Your Experience</h3>
        ${productCards}
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${BASE_URL}/order/${order.orderNumber}" class="button">View Order & Review</a>
      </div>

      <p style="color: ${BRAND_COLORS.textLight}; font-size: 14px;">
        Your honest feedback means the world to us. Whether you loved it or think we can improve, we want to hear from you!
      </p>

      <p>With gratitude,<br><strong>The Taste of Gratitude Team</strong></p>
    </div>
  `;

  return emailWrapper(content, `Review your recent order from Taste of Gratitude`);
}

// Helper functions
function getFulfillmentInfo(order) {
  const type = order.fulfillmentType || 'pickup';
  
  if (type === 'delivery') {
    return `
      <div class="order-box">
        <h3 style="margin-top: 0; color: ${BRAND_COLORS.dark};">🚗 Delivery Details</h3>
        <p style="margin: 0;">${order.address?.street}</p>
        <p style="margin: 0;">${order.address?.city}, ${order.address?.state} ${order.address?.zip}</p>
        ${order.deliveryWindow ? `<p style="margin-top: 12px;"><strong>Delivery Window:</strong> ${order.deliveryWindow}</p>` : ''}
      </div>
    `;
  } else if (type === 'shipping') {
    return `
      <div class="order-box">
        <h3 style="margin-top: 0; color: ${BRAND_COLORS.dark};">📦 Shipping To</h3>
        <p style="margin: 0;">${order.address?.street}</p>
        <p style="margin: 0;">${order.address?.city}, ${order.address?.state} ${order.address?.zip}</p>
        <p style="margin-top: 12px; color: ${BRAND_COLORS.textLight};">You'll receive tracking information once your order ships.</p>
      </div>
    `;
  } else {
    const locationInfo = getLocationInfo(order.pickupLocation);
    return `
      <div class="order-box">
        <h3 style="margin-top: 0; color: ${BRAND_COLORS.dark};">📍 Pickup Location</h3>
        <p style="margin: 0;"><strong>${locationInfo.name}</strong></p>
        <p style="margin: 8px 0;">${locationInfo.address}</p>
        ${order.pickupDate ? `<p style="margin: 0;"><strong>Date:</strong> ${order.pickupDate}</p>` : ''}
      </div>
    `;
  }
}

function getLocationInfo(location) {
  const locations = {
    serenbe: {
      name: 'Serenbe Farmers Market',
      address: '9110 Selborne Lane, Chattahoochee Hills, GA 30268',
      hours: 'Saturdays 9am - 1pm',
      mapUrl: 'https://maps.google.com/?q=Serenbe+Farmers+Market'
    },
    peachtree: {
      name: 'Peachtree City Farmers Market',
      address: '239 City Circle, Peachtree City, GA 30269',
      hours: 'Saturdays 8am - 12pm',
      mapUrl: 'https://maps.google.com/?q=Peachtree+City+Farmers+Market'
    },
    default: {
      name: 'Farmers Market',
      address: 'Check order details for location',
      hours: 'Check market schedule',
      mapUrl: null
    }
  };
  
  return locations[location] || locations.default;
}

const emailTemplates = {
  orderConfirmationTemplate,
  shippingNotificationTemplate,
  pickupReminderTemplate,
  deliveryNotificationTemplate,
  passwordResetTemplate,
  welcomeTemplate,
  reviewRequestTemplate
};

export default emailTemplates;
