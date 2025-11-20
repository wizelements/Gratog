/**
 * Email template utilities
 * All templates use Taste of Gratitude branding with emerald/teal colors
 */

const COLORS = {
  primary: '#059669', // emerald-600
  secondary: '#14b8a6', // teal-500
  accent: '#D4AF37', // honey gold
  text: '#064e3b', // emerald-900
  background: '#f0fdf4', // emerald-50
  white: '#ffffff'
};

const baseStyle = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
    line-height: 1.6;
    color: ${COLORS.text};
    background-color: ${COLORS.background};
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: ${COLORS.white};
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
    padding: 40px 20px;
    text-align: center;
    color: ${COLORS.white};
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: bold;
  }
  .content {
    padding: 40px 30px;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
    color: ${COLORS.white} !important;
    padding: 14px 32px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    margin: 20px 0;
  }
  .footer {
    background-color: ${COLORS.background};
    padding: 30px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;
  }
  .divider {
    height: 1px;
    background-color: #e5e7eb;
    margin: 30px 0;
  }
  .badge {
    display: inline-block;
    background-color: ${COLORS.primary};
    color: ${COLORS.white};
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    margin: 10px 0;
  }
  .order-item {
    display: flex;
    align-items: center;
    padding: 15px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin: 10px 0;
  }
  .unsubscribe {
    color: #9ca3af;
    font-size: 12px;
    margin-top: 20px;
  }
  .unsubscribe a {
    color: ${COLORS.primary};
    text-decoration: underline;
  }
`;

function wrapEmail(content, unsubscribeToken) {
  const unsubscribeLink = unsubscribeToken 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?token=${unsubscribeToken}`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${baseStyle}</style>
    </head>
    <body>
      <div style="padding: 40px 20px;">
        <div class="container">
          ${content}
          <div class="footer">
            <p><strong>Taste of Gratitude</strong></p>
            <p>Hand-crafted wellness products with 92 essential minerals</p>
            ${unsubscribeToken ? `
              <div class="unsubscribe">
                <p>Don't want to receive these emails? <a href="${unsubscribeLink}">Unsubscribe</a></p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Welcome Email Template
 */
export function welcomeEmail({ name, rewardPoints = 0 }, unsubscribeToken) {
  const content = `
    <div class="header">
      <h1>🌿 Welcome to Your Wellness Journey!</h1>
    </div>
    <div class="content">
      <h2>Hello ${name}! 👋</h2>
      <p style="font-size: 16px; color: ${COLORS.text};">
        We're absolutely <strong>thrilled</strong> to have you join the Taste of Gratitude family! 
        Your journey to optimal wellness starts today.
      </p>
      
      <div style="background-color: ${COLORS.background}; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: ${COLORS.primary};">✨ Your Wellness Rewards</h3>
        <p>You've earned <span class="badge">${rewardPoints} Points</span> just for joining!</p>
        <p><strong>Earn points with every purchase and unlock exclusive rewards:</strong></p>
        <ul>
          <li>🎁 Free products</li>
          <li>💰 Exclusive discounts</li>
          <li>🔥 Daily challenge bonuses</li>
          <li>⭐ VIP member perks</li>
        </ul>
      </div>

      <p style="font-size: 16px;">Ready to explore our premium sea moss products?</p>
      
      <center>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/catalog" class="button">
          🛍️ Start Shopping
        </a>
      </center>

      <div class="divider"></div>
      
      <p style="font-size: 14px; color: #6b7280;">
        <strong>Pro Tip:</strong> Complete the daily gratitude challenge to boost your streak and earn bonus points! 🔥
      </p>
    </div>
  `;

  return wrapEmail(content, unsubscribeToken);
}

/**
 * Order Confirmation Email Template
 */
export function orderConfirmationEmail({ 
  name, 
  orderNumber, 
  items = [], 
  total, 
  fulfillmentType,
  pointsEarned = 0 
}, unsubscribeToken) {
  const itemsHtml = items.map(item => `
    <div class="order-item">
      <div style="flex: 1;">
        <strong>${item.name}</strong><br>
        <span style="color: #6b7280;">Qty: ${item.quantity}</span>
      </div>
      <div style="font-weight: 600; color: ${COLORS.primary};">$${item.price}</div>
    </div>
  `).join('');

  const content = `
    <div class="header">
      <h1>📦 Order Confirmed!</h1>
    </div>
    <div class="content">
      <h2>Thank you, ${name}! 🎉</h2>
      <p style="font-size: 16px;">
        Your order has been confirmed and is being prepared with care.
      </p>
      
      <div style="background-color: ${COLORS.background}; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order #${orderNumber}</h3>
        <p><strong>Fulfillment:</strong> ${fulfillmentType}</p>
      </div>

      <h3>Your Items:</h3>
      ${itemsHtml}

      <div style="text-align: right; margin-top: 20px; padding: 20px; background-color: ${COLORS.background}; border-radius: 8px;">
        <p style="font-size: 18px; margin: 0;"><strong>Total:</strong> <span style="color: ${COLORS.primary}; font-size: 24px; font-weight: bold;">$${total}</span></p>
      </div>

      ${pointsEarned > 0 ? `
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: white; text-align: center;">
          <h3 style="margin: 0;">🌟 You earned ${pointsEarned} Reward Points! 🌟</h3>
        </div>
      ` : ''}

      <center>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/profile/orders" class="button">
          View Order Details
        </a>
      </center>

      <div class="divider"></div>
      
      <p style="text-align: center; color: #6b7280;">
        Questions about your order? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_BASE_URL}/about" style="color: ${COLORS.primary};">support page</a>.
      </p>
    </div>
  `;

  return wrapEmail(content, unsubscribeToken);
}

/**
 * Password Reset Email Template
 */
export function passwordResetEmail({ name, resetToken }, unsubscribeToken) {
  const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`;

  const content = `
    <div class="header">
      <h1>🔐 Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p style="font-size: 16px;">
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      
      <center>
        <a href="${resetLink}" class="button">
          Reset Password
        </a>
      </center>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Security Note:</strong> This link expires in 1 hour. If you didn't request this reset, please ignore this email.
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        Or copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="color: ${COLORS.primary}; word-break: break-all;">${resetLink}</a>
      </p>
    </div>
  `;

  return wrapEmail(content, unsubscribeToken);
}

/**
 * Reward Milestone Email Template
 */
export function rewardMilestoneEmail({ name, milestone, points, rewardName }, unsubscribeToken) {
  const content = `
    <div class="header">
      <h1>🎁 Reward Milestone Unlocked!</h1>
    </div>
    <div class="content">
      <h2>Amazing work, ${name}! 🎉</h2>
      <p style="font-size: 18px; text-align: center;">
        You've reached a <strong>${milestone}</strong> milestone!
      </p>
      
      <div style="background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%); padding: 40px; border-radius: 8px; margin: 30px 0; color: white; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">⭐</div>
        <h2 style="margin: 10px 0; font-size: 32px;">${points} Points</h2>
        <p style="margin: 0; opacity: 0.9;">Total Rewards Balance</p>
      </div>

      ${rewardName ? `
        <div style="background-color: ${COLORS.background}; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: ${COLORS.primary}; margin-top: 0;">🎁 Reward Unlocked!</h3>
          <p style="font-size: 18px; font-weight: 600;">${rewardName}</p>
          <p style="color: #6b7280;">Redeem it now in your rewards center</p>
        </div>
      ` : ''}

      <center>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/profile/rewards" class="button">
          View Your Rewards
        </a>
      </center>

      <div class="divider"></div>
      
      <p style="text-align: center; font-size: 14px; color: #6b7280;">
        Keep shopping and earning to unlock even more exclusive rewards! 💚
      </p>
    </div>
  `;

  return wrapEmail(content, unsubscribeToken);
}

/**
 * Challenge Streak Email Template
 */
export function challengeStreakEmail({ name, streakDays, milestone }, unsubscribeToken) {
  const content = `
    <div class="header">
      <h1>🔥 Streak Milestone!</h1>
    </div>
    <div class="content">
      <h2>Incredible, ${name}! 🎊</h2>
      <p style="font-size: 18px; text-align: center;">
        You've maintained your wellness check-in streak for
      </p>
      
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 40px; border-radius: 8px; margin: 30px 0; color: white; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 10px;">🔥</div>
        <h2 style="margin: 10px 0; font-size: 48px;">${streakDays} Days</h2>
        <p style="margin: 0; opacity: 0.9; font-size: 18px;">Wellness Streak</p>
      </div>

      <div style="background-color: ${COLORS.background}; padding: 20px; border-radius: 8px;">
        <h3 style="margin-top: 0; color: ${COLORS.primary};">💪 Your Dedication is Inspiring!</h3>
        <p><strong>What you've earned:</strong></p>
        <ul>
          <li>✨ Consistency bonus points</li>
          <li>🎯 Milestone achievement badge</li>
          <li>💚 Positive wellness habit</li>
          ${milestone ? `<li>🎁 ${milestone}</li>` : ''}
        </ul>
      </div>

      <center>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/profile/challenge" class="button">
          Continue Your Streak
        </a>
      </center>

      <div class="divider"></div>
      
      <p style="text-align: center; font-style: italic; color: ${COLORS.primary};">
        "Gratitude turns what we have into enough." ✨
      </p>
    </div>
  `;

  return wrapEmail(content, unsubscribeToken);
}
