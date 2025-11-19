// Resend email service for newsletter and notifications
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const USE_REAL_EMAIL = !!process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.com';

export async function sendNewsletterWelcome(email, firstName = '') {
  const subject = '🌿 Welcome to Taste of Gratitude Wellness Community!';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌿 Welcome to Our Wellness Family!</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName || 'there'},</p>
            <p>Thank you for joining the Taste of Gratitude community! We're thrilled to have you on this wellness journey.</p>
            <p><strong>As a subscriber, you'll receive:</strong></p>
            <ul>
              <li>Exclusive wellness tips and sea moss recipes</li>
              <li>Early access to new products and flavors</li>
              <li>Special subscriber-only discounts</li>
              <li>Market event updates and community news</li>
            </ul>
            <p>Ready to explore our premium sea moss collection?</p>
            <a href="https://gratog-payments.preview.emergentagent.com/catalog" class="button">Shop Our Catalog</a>
            <p>Visit us at local farmers markets or order online for convenient delivery.</p>
            <p>With gratitude,<br><strong>The Taste of Gratitude Team</strong></p>
          </div>
          <div class="footer">
            <p>Taste of Gratitude | Premium Wildcrafted Sea Moss</p>
            <p><a href="https://gratog-payments.preview.emergentagent.com">Visit Our Website</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendResendEmail(email, subject, html);
}

export async function sendReviewConfirmation(email, productName, pointsEarned) {
  const subject = '⭐ Thank you for your review!';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .points-badge { display: inline-block; background: #fbbf24; color: #78350f; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ Review Received!</h1>
          </div>
          <div class="content">
            <p>Thank you for sharing your experience with <strong>${productName}</strong>!</p>
            <p>Your review helps our community make informed choices and supports our small business.</p>
            <div class="points-badge">🎉 You earned ${pointsEarned} reward points!</div>
            <p>Keep collecting points to unlock exclusive rewards:</p>
            <ul>
              <li>2 stamps = Free 2oz wellness shot</li>
              <li>5 stamps = 15% off your next order</li>
              <li>10 stamps = VIP wellness club status</li>
            </ul>
            <a href="https://gratog-payments.preview.emergentagent.com/rewards" class="button">View My Rewards</a>
            <p>With gratitude,<br><strong>The Taste of Gratitude Team</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendResendEmail(email, subject, html);
}

async function sendResendEmail(to, subject, html) {
  if (USE_REAL_EMAIL) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });

      console.log('📧 [RESEND] Email sent to:', to);
      return {
        success: true,
        messageId: result.id,
        status: 'sent',
        to,
      };
    } catch (error) {
      console.error('📧 [RESEND ERROR]:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  } else {
    // Mock mode
    console.log('📧 [MOCK EMAIL via Resend] To:', to);
    console.log('📧 [MOCK EMAIL] Subject:', subject);
    
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      status: 'mock',
      to,
      message: 'Mock email sent (set RESEND_API_KEY for real email)',
    };
  }
}

export { resend };
