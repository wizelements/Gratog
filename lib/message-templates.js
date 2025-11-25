// Message templates for SMS and Email

export const SMS_TEMPLATES = {
  ORDER_CONFIRMATION_PICKUP: (data) => `
Hi ${data.customerName}! 🎉 Order #${data.orderNumber} confirmed!

📦 Pickup: ${data.location}
⏰ ${data.readyTime}
✨ Ready by: ${data.readyBy}
💰 Total: $${data.total.toFixed(2)}

We'll remind you Friday & Saturday morning!
- Taste of Gratitude 🌿`,

  ORDER_CONFIRMATION_DELIVERY: (data) => `
Hi ${data.customerName}! ✅ Order #${data.orderNumber} confirmed.
Delivering to ${data.address} ${data.timeSlot}.
Track: ${data.trackingUrl}
Total: $${data.total.toFixed(2)}
- Taste of Gratitude`,

  PICKUP_DAY_BEFORE_REMINDER: (data) => `
Hi ${data.customerName}! 👋

Your order #${data.orderNumber} is being prepared RIGHT NOW! 🧪

📦 Pickup TOMORROW (Saturday):
📍 ${data.location}
⏰ ${data.hours}
✨ Ready by: ${data.readyBy}

Look for our gold booth! Can't wait to see you! 🌿
- Taste of Gratitude`,

  PICKUP_MORNING_REMINDER: (data) => `
Good morning ${data.customerName}! ☀️

Your order #${data.orderNumber} is READY and waiting! 🎉

📦 TODAY's Pickup:
📍 ${data.location}  
⏰ ${data.hours}
🎫 Show code: ${data.orderNumber}

See you soon! 🌿✨
- Taste of Gratitude`,

  ORDER_READY: (data) => `
🎉 ${data.customerName}, your order #${data.orderNumber} is READY!

📦 Pick up at ${data.location}
⏰ ${data.hours}
🎫 Show: ${data.orderNumber}

Can't wait to see you! 🌿
- Taste of Gratitude`,

  OUT_FOR_DELIVERY: (data) => `
🚚 Your order is on the way!
Driver ${data.driverName} will arrive in ~${data.eta} mins.
Track: ${data.trackingUrl}
- Taste of Gratitude`,

  DELIVERED: (data) => `
✅ Delivered! Enjoy your fresh sea moss!
Questions? Reply here anytime.
Reorder: ${data.reorderUrl}
- Taste of Gratitude`,

  PRODUCT_BACK_IN_STOCK: (data) => `
🎉 Good news ${data.customerName}!
${data.productName} is back in stock!
Order now: ${data.orderUrl}
- Taste of Gratitude`,

  MARKET_REMINDER: (data) => `
📅 This Saturday at Serenbe!
Fresh sea moss, new flavors.
Pre-order: ${data.orderUrl}
- Taste of Gratitude`,

  REORDER_REMINDER: (data) => `
Hi ${data.customerName}! Ready for more?
Reorder your faves in 1 tap: ${data.reorderUrl}
Free delivery on $75+
- Taste of Gratitude`
};

export const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: (data) => ({
    subject: `Order Confirmed! 🌿 Order #${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #D4AF37;">Order Confirmed!</h1>
        <p>Hi ${data.customerName},</p>
        <p>Thanks for your order! Here's what to expect:</p>
        
        ${data.fulfillmentType === 'pickup' ? `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📍 Pickup Details</h3>
            <p><strong>Location:</strong> ${data.location}</p>
            <p><strong>Ready:</strong> ${data.readyTime}</p>
            <p><strong>Booth:</strong> ${data.boothNumber}</p>
          </div>
        ` : `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚚 Delivery Details</h3>
            <p><strong>Address:</strong> ${data.address}</p>
            <p><strong>Time:</strong> ${data.timeSlot}</p>
            <p><strong>Track:</strong> <a href="${data.trackingUrl}">View Status</a></p>
          </div>
        `}
        
        <h3>Your Order:</h3>
        ${data.items.map(item => `
          <p>• ${item.productName} (${item.quantity}) - $${(item.priceAtPurchase).toFixed(2)}</p>
        `).join('')}
        
        <div style="border-top: 2px solid #D4AF37; margin-top: 20px; padding-top: 20px;">
          <p><strong>Total: $${data.total.toFixed(2)}</strong></p>
        </div>
        
        <p style="margin-top: 30px;">Questions? Just reply to this email.</p>
        <p style="color: #D4AF37;"><strong>See you soon!</strong></p>
        <p>Taste of Gratitude Team</p>
      </div>
    `,
    text: `Order #${data.orderNumber} confirmed! Total: $${data.total.toFixed(2)}`
  }),

  WELCOME: (data) => ({
    subject: 'Welcome to Taste of Gratitude! 🌿',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #D4AF37;">Welcome! 🌿</h1>
        <p>Hi ${data.customerName},</p>
        <p>Thanks for your first order! We're excited to be part of your wellness journey.</p>
        
        <h3>What makes our sea moss special:</h3>
        <ul>
          <li>✨ Wildcrafted from pristine waters</li>
          <li>✨ Hand-made in small batches</li>
          <li>✨ 92+ essential minerals</li>
          <li>✨ Made with love & gratitude</li>
        </ul>
        
        <div style="background: #D4AF37; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0;">💰 Here's 10% off your next order: <strong>GRATEFUL10</strong></p>
        </div>
        
        <p>With gratitude,</p>
        <p><strong>The Taste of Gratitude Team</strong></p>
      </div>
    `,
    text: 'Welcome to Taste of Gratitude!'
  }),

  WAITLIST_BACK_IN_STOCK: (data) => ({
    subject: `🎉 ${data.productName} is Back in Stock!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #D4AF37;">Good News!</h1>
        <p>Hi ${data.customerName},</p>
        <p>You asked us to let you know when <strong>${data.productName}</strong> was back in stock.</p>
        <p><strong>It's back!</strong> 🎉</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.orderUrl}" style="background: #D4AF37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Order Now
          </a>
        </div>
        
        <p>Don't wait - our products sell out fast at the market!</p>
        <p>- Taste of Gratitude Team</p>
      </div>
    `,
    text: `${data.productName} is back in stock! Order now: ${data.orderUrl}`
  })
};
