/**
 * ENHANCED EMAIL TEMPLATES - PRODUCTION READY
 * Beautiful, on-brand, mobile-responsive HTML emails
 * Uses table-based layout for maximum email client compatibility
 */

const BRAND = {
  name: 'Taste of Gratitude',
  tagline: 'Premium Wildcrafted Sea Moss',
  colors: {
    primary: '#059669',      // Emerald-600
    secondary: '#14b8a6',    // Teal-500
    accent: '#D4AF37',       // Honey Gold
    gradient: 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)',
    text: '#064e3b',         // Emerald-900
    textLight: '#6b7280',    // Gray-500
    background: '#f0fdf4',   // Emerald-50
    white: '#ffffff',
    warning: '#f59e0b',      // Amber-500
    success: '#059669',      // Emerald-600
    fire: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)'
  }
};

/**
 * Base email wrapper with responsive table layout
 */
function createEmailBase(content, unsubscribeToken = null) {
  const unsubscribeUrl = unsubscribeToken 
    ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/unsubscribe?token=${unsubscribeToken}`
    : '';

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>${BRAND.name}</title>
  <style>
    /* Client-specific Styles */
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    
    /* Reset Styles */
    body, #bodyTable { width: 100% !important; height: 100% !important; margin: 0; padding: 0; }
    img { max-width: 100%; height: auto; }
    
    /* Button Styles */
    .button { 
      background: ${BRAND.colors.gradient}; 
      color: #ffffff !important; 
      text-decoration: none !important; 
      display: inline-block;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    }
    
    /* Mobile Responsive */
    @media only screen and (max-width: 600px) {
      .mobile-full-width { width: 100% !important; }
      .mobile-padding { padding: 20px !important; }
      .mobile-text-center { text-align: center !important; }
      .mobile-hide { display: none !important; }
      h1 { font-size: 24px !important; }
      h2 { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.colors.background};">
  <table id="bodyTable" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0; padding: 0; background-color: ${BRAND.colors.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" class="mobile-full-width" style="max-width: 600px; background-color: ${BRAND.colors.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          
          ${content}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.colors.background}; padding: 40px 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${BRAND.colors.primary};">🌿 ${BRAND.name}</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: ${BRAND.colors.textLight};">${BRAND.tagline}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 14px; color: ${BRAND.colors.textLight};">
                      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}" style="color: ${BRAND.colors.primary}; text-decoration: none; margin: 0 10px;">Website</a> · 
                      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/markets" style="color: ${BRAND.colors.primary}; text-decoration: none; margin: 0 10px;">Markets</a> · 
                      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/catalog" style="color: ${BRAND.colors.primary}; text-decoration: none; margin: 0 10px;">Shop</a>
                    </p>
                  </td>
                </tr>
                ${unsubscribeToken ? `
                <tr>
                  <td style="padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      Don't want to receive these emails? 
                      <a href="${unsubscribeUrl}" style="color: ${BRAND.colors.primary}; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          
        </table>
        <!-- End Main Container -->
        
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * ==========================================
 * WELCOME EMAIL - Beautiful onboarding
 * ==========================================
 */
export function welcomeEmail({ name, rewardPoints = 0 }, unsubscribeToken) {
  const content = `
    <!-- Header -->
    <tr>
      <td style="background: ${BRAND.colors.gradient}; padding: 50px 40px; text-align: center;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <h1 style="margin: 0; color: ${BRAND.colors.white}; font-size: 32px; font-weight: bold; line-height: 1.2;">
                🌿 Welcome to ${BRAND.name}!
              </h1>
              <p style="margin: 15px 0 0 0; color: ${BRAND.colors.white}; font-size: 18px; opacity: 0.95;">
                Your Wellness Journey Begins Here
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Body Content -->
    <tr>
      <td style="padding: 50px 40px;" class="mobile-padding">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          
          <!-- Greeting -->
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; font-size: 18px; color: ${BRAND.colors.text}; line-height: 1.6;">
                Hi <strong>${name}</strong>,
              </p>
              <p style="margin: 15px 0 0 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.6;">
                Thank you for joining our wellness community! We're thrilled to have you discover the power of premium wildcrafted sea moss.
              </p>
            </td>
          </tr>
          
          <!-- Welcome Gift Box -->
          ${rewardPoints > 0 ? `
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.colors.background}; border-left: 4px solid ${BRAND.colors.primary}; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: ${BRAND.colors.primary};">
                      ✨ Your Welcome Gift
                    </p>
                    <p style="margin: 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.6;">
                      You've earned <strong style="color: ${BRAND.colors.primary}; font-size: 20px;">${rewardPoints} reward points</strong> just for joining!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Benefits Section -->
          <tr>
            <td style="padding: 30px 0 20px 0;">
              <p style="margin: 0 0 20px 0; font-size: 22px; font-weight: bold; color: ${BRAND.colors.primary};">
                🎁 As a Member, You'll Receive:
              </p>
            </td>
          </tr>
          
          <!-- Benefit 1 -->
          <tr>
            <td style="padding: 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 2px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <p style="margin: 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.5;">
                      🌊 <strong>Exclusive sea moss recipes & wellness tips</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Benefit 2 -->
          <tr>
            <td style="padding: 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 2px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <p style="margin: 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.5;">
                      ⚡ <strong>Early access to new products & flavors</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Benefit 3 -->
          <tr>
            <td style="padding: 8px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 2px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <p style="margin: 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.5;">
                      💚 <strong>Member-only discounts & rewards</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 40px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/catalog" class="button" style="background: ${BRAND.colors.gradient}; color: #ffffff; text-decoration: none; display: inline-block; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                Explore Our Catalog 🛍️
              </a>
            </td>
          </tr>
          
          <!-- Closing -->
          <tr>
            <td style="padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.6;">
                With gratitude,<br>
                <strong style="color: ${BRAND.colors.primary};">The Taste of Gratitude Team</strong>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  `;
  
  return createEmailBase(content, unsubscribeToken);
}

/**
 * ==========================================
 * ORDER CONFIRMATION - Beautiful receipt
 * ==========================================
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
    <tr>
      <td style="padding: 8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
          <tr>
            <td style="padding: 15px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 70%;">
                    <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600; color: ${BRAND.colors.text};">
                      ${item.name}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: ${BRAND.colors.textLight};">
                      Quantity: ${item.quantity}
                    </p>
                  </td>
                  <td align="right" style="width: 30%;">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${BRAND.colors.primary};">
                      $${item.price}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');
  
  const content = `
    <!-- Header -->
    <tr>
      <td style="background: ${BRAND.colors.gradient}; padding: 50px 40px; text-align: center;">
        <h1 style="margin: 0; color: ${BRAND.colors.white}; font-size: 32px; font-weight: bold;">
          📦 Order Confirmed!
        </h1>
      </td>
    </tr>
    
    <!-- Body -->
    <tr>
      <td style="padding: 50px 40px;" class="mobile-padding">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; font-size: 20px; color: ${BRAND.colors.text}; font-weight: bold;">
                Thank you, ${name}! 🎉
              </p>
              <p style="margin: 15px 0 0 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.6;">
                Your order has been confirmed and is being prepared with care.
              </p>
            </td>
          </tr>
          
          <!-- Order Info Box -->
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.colors.background}; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: ${BRAND.colors.textLight};">Order Number</p>
                    <p style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold; color: ${BRAND.colors.primary};">${orderNumber}</p>
                    <p style="margin: 0; font-size: 14px; color: ${BRAND.colors.text};">
                      <strong>Fulfillment:</strong> ${fulfillmentType}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Items Header -->
          <tr>
            <td style="padding: 30px 0 15px 0;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${BRAND.colors.text};">
                Your Items:
              </p>
            </td>
          </tr>
          
          <!-- Order Items -->
          ${itemsHtml}
          
          <!-- Total -->
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.colors.background}; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="left">
                          <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${BRAND.colors.text};">Total:</p>
                        </td>
                        <td align="right">
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${BRAND.colors.primary};">$${total}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Points Earned -->
          ${pointsEarned > 0 ? `
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND.colors.fire}; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0; font-size: 20px; font-weight: bold; color: #ffffff;">
                      🌟 You earned ${pointsEarned} Reward Points! 🌟
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/profile/orders" class="button" style="background: ${BRAND.colors.gradient}; color: #ffffff; text-decoration: none; display: inline-block; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Order Details
              </a>
            </td>
          </tr>
          
          <!-- Support -->
          <tr>
            <td style="padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: ${BRAND.colors.textLight};">
                Questions about your order? Reply to this email or visit our 
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/contact" style="color: ${BRAND.colors.primary}; text-decoration: none;">support page</a>.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  `;
  
  return createEmailBase(content, unsubscribeToken);
}

/**
 * ==========================================
 * PASSWORD RESET - Secure & clear
 * ==========================================
 */
export function passwordResetEmail({ name, resetToken }, unsubscribeToken) {
  const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/reset-password?token=${resetToken}`;
  
  const content = `
    <tr>
      <td style="background: ${BRAND.colors.gradient}; padding: 50px 40px; text-align: center;">
        <h1 style="margin: 0; color: ${BRAND.colors.white}; font-size: 32px; font-weight: bold;">
          🔐 Password Reset
        </h1>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 50px 40px;" class="mobile-padding">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; font-size: 18px; color: ${BRAND.colors.text};">Hello ${name},</p>
              <p style="margin: 15px 0 0 0; font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 30px 0;">
              <a href="${resetLink}" class="button" style="background: ${BRAND.colors.gradient}; color: #ffffff; text-decoration: none; display: inline-block; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                      <strong>⚠️ Security Note:</strong> This link expires in 1 hour. If you didn't request this reset, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding-top: 20px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND.colors.textLight};">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${resetLink}" style="color: ${BRAND.colors.primary};">${resetLink}</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  `;
  
  return createEmailBase(content, unsubscribeToken);
}

/**
 * ==========================================
 * REWARD MILESTONE - Exciting & celebratory
 * ==========================================
 */
export function rewardMilestoneEmail({ name, milestone, points, rewardName }, unsubscribeToken) {
  const content = `
    <tr>
      <td style="background: ${BRAND.colors.gradient}; padding: 50px 40px; text-align: center;">
        <h1 style="margin: 0; color: ${BRAND.colors.white}; font-size: 32px; font-weight: bold;">
          🎁 Reward Milestone Unlocked!
        </h1>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 50px 40px;" class="mobile-padding">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          
          <tr>
            <td style="padding-bottom: 20px; text-align: center;">
              <p style="margin: 0; font-size: 24px; color: ${BRAND.colors.text}; font-weight: bold;">
                Amazing work, ${name}! 🎉
              </p>
              <p style="margin: 15px 0 0 0; font-size: 18px; color: ${BRAND.colors.text};">
                You've reached a <strong>${milestone}</strong> milestone!
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND.colors.gradient}; border-radius: 12px;">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <p style="margin: 0 0 15px 0; font-size: 64px;">⭐</p>
                    <p style="margin: 0; font-size: 48px; font-weight: bold; color: #ffffff; line-height: 1;">${points}</p>
                    <p style="margin: 10px 0 0 0; font-size: 18px; color: #ffffff; opacity: 0.9;">Points</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #ffffff; opacity: 0.8;">Total Rewards Balance</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${rewardName ? `
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.colors.background}; border-radius: 8px;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: ${BRAND.colors.primary};">
                      🎁 Reward Unlocked!
                    </p>
                    <p style="margin: 0; font-size: 22px; font-weight: 600; color: ${BRAND.colors.text};">
                      ${rewardName}
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: ${BRAND.colors.textLight};">
                      Redeem it now in your rewards center
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <tr>
            <td align="center" style="padding: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/profile/rewards" class="button" style="background: ${BRAND.colors.gradient}; color: #ffffff; text-decoration: none; display: inline-block; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Your Rewards
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: ${BRAND.colors.textLight};">
                Keep shopping and earning to unlock even more exclusive rewards! 💚
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  `;
  
  return createEmailBase(content, unsubscribeToken);
}

/**
 * ==========================================
 * CHALLENGE STREAK - Motivational & energetic
 * ==========================================
 */
export function challengeStreakEmail({ name, streakDays, milestone }, unsubscribeToken) {
  const content = `
    <tr>
      <td style="background: ${BRAND.colors.gradient}; padding: 50px 40px; text-align: center;">
        <h1 style="margin: 0; color: ${BRAND.colors.white}; font-size: 32px; font-weight: bold;">
          🔥 Streak Milestone!
        </h1>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 50px 40px;" class="mobile-padding">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          
          <tr>
            <td style="padding-bottom: 20px; text-align: center;">
              <p style="margin: 0; font-size: 24px; color: ${BRAND.colors.text}; font-weight: bold;">
                Incredible, ${name}! 🎊
              </p>
              <p style="margin: 15px 0 0 0; font-size: 18px; color: ${BRAND.colors.text};">
                You've maintained your wellness check-in streak for
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND.colors.fire}; border-radius: 12px;">
                <tr>
                  <td style="padding: 60px 40px; text-align: center;">
                    <p style="margin: 0 0 20px 0; font-size: 80px; line-height: 1;">🔥</p>
                    <p style="margin: 0; font-size: 56px; font-weight: bold; color: #ffffff; line-height: 1;">${streakDays}</p>
                    <p style="margin: 10px 0 0 0; font-size: 24px; color: #ffffff; opacity: 0.95;">Days</p>
                    <p style="margin: 5px 0 0 0; font-size: 16px; color: #ffffff; opacity: 0.8;">Wellness Streak</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.colors.background}; border-radius: 8px;">
                <tr>
                  <td style="padding: 30px;">
                    <p style="margin: 0 0 15px 0; font-size: 20px; font-weight: bold; color: ${BRAND.colors.primary};">
                      💪 Your Dedication is Inspiring!
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: ${BRAND.colors.text};">
                      What you've earned:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 5px 0;">
                          <p style="margin: 0; font-size: 15px; color: ${BRAND.colors.text};">✨ Consistency bonus points</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">
                          <p style="margin: 0; font-size: 15px; color: ${BRAND.colors.text};">🎯 Milestone achievement badge</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">
                          <p style="margin: 0; font-size: 15px; color: ${BRAND.colors.text};">💚 Positive wellness habit</p>
                        </td>
                      </tr>
                      ${milestone ? `
                      <tr>
                        <td style="padding: 5px 0;">
                          <p style="margin: 0; font-size: 15px; color: ${BRAND.colors.text}; font-weight: 600;">🎁 ${milestone}</p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop'}/profile/challenge" class="button" style="background: ${BRAND.colors.gradient}; color: #ffffff; text-decoration: none; display: inline-block; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Continue Your Streak
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 16px; font-style: italic; color: ${BRAND.colors.primary};">
                "Gratitude turns what we have into enough." ✨
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  `;
  
  return createEmailBase(content, unsubscribeToken);
}
