import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

/**
 * GET /api/cron/nurture-emails
 * Cron job to send scheduled nurture sequence emails
 * Should run every hour
 */
export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    
    // Find emails that are due to be sent
    const dueEmails = await db.collection('scheduled_emails').find({
      sent: false,
      scheduledFor: { $lte: now }
    }).toArray();

    if (dueEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No emails to send',
        sent: 0
      });
    }

    const results = [];
    
    for (const email of dueEmails) {
      try {
        // Generate email content based on template
        const html = generateEmailContent(email.template, email);
        
        // Send email
        await sendEmail({
          to: email.email,
          subject: email.subject,
          html
        });
        
        // Mark as sent
        await db.collection('scheduled_emails').updateOne(
          { _id: email._id },
          { 
            $set: { 
              sent: true, 
              sentAt: now,
              status: 'delivered'
            } 
          }
        );
        
        // Update subscriber record
        await db.collection('email_subscribers').updateOne(
          { email: email.email },
          {
            $push: {
              emailsSent: {
                template: email.template,
                subject: email.subject,
                sentAt: now
              }
            }
          }
        );
        
        results.push({ email: email.email, template: email.template, status: 'sent' });
        
      } catch (error) {
        logger.error('NurtureCron', 'Failed to send email', { 
          email: email.email, 
          template: email.template,
          error: error.message 
        });
        
        // Mark as failed
        await db.collection('scheduled_emails').updateOne(
          { _id: email._id },
          { 
            $set: { 
              status: 'failed',
              error: error.message,
              failedAt: now
            } 
          }
        );
        
        results.push({ email: email.email, template: email.template, status: 'failed', error: error.message });
      }
    }

    logger.info('NurtureCron', `Processed ${results.length} scheduled emails`, {
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });

  } catch (error) {
    logger.error('NurtureCron', 'Cron job failed', { error: error.message });
    return NextResponse.json(
      { error: 'Cron job failed', message: error.message },
      { status: 500 }
    );
  }
}

function generateEmailContent(template, emailData) {
  const templates = {
    welcome: () => generateWelcomeEmail(emailData),
    education_1: () => generateEducationEmail(),
    recipe: () => generateRecipeEmail(),
    social_proof: () => generateSocialProofEmail(),
    subscription_offer: () => generateSubscriptionOfferEmail()
  };
  
  return templates[template]?.() || templates.welcome();
}

function generateWelcomeEmail(data) {
  return `
    <h1>Welcome to Taste of Gratitude! 🌊</h1>
    <p>Your wellness journey begins now. Over the next two weeks, we'll share everything about sea moss.</p>
  `;
}

function generateEducationEmail() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>The Science Behind Sea Moss</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">The Science Behind Sea Moss 🧬</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Why this ocean superfood works</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="font-size: 16px; line-height: 1.6; color: #374151;">
                    Sea moss contains <strong>92 of the 102 minerals</strong> your body needs to thrive. Here's what that means for you:
                  </p>
                  
                  <div style="margin: 30px 0;">
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                      <h3 style="color: #059669; margin: 0 0 10px 0;">🔬 Iodine & Thyroid Support</h3>
                      <p style="margin: 0; color: #374151;">Natural iodine supports healthy thyroid function, regulating metabolism and energy.</p>
                    </div>
                    
                    <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                      <h3 style="color: #a16207; margin: 0 0 10px 0;">💪 Collagen & Skin Health</h3>
                      <p style="margin: 0; color: #374151;">Rich in compounds that support your body's natural collagen production.</p>
                    </div>
                    
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px;">
                      <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">🛡️ Prebiotic Gut Support</h3>
                      <p style="margin: 0; color: #374151;">Feeds good bacteria in your gut, supporting digestion and immune function.</p>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://tasteofgratitude.shop/catalog" 
                       style="display: inline-block; background: #059669; color: #ffffff; padding: 16px 40px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600;">
                      Shop Sea Moss Products
                    </a>
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

function generateRecipeEmail() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Golden Glow Smoothie Recipe</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Golden Glow Smoothie 🥤</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your new favorite morning ritual</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      💡 This recipe combines our Golden Glow Gel with ingredients that amplify its benefits. Customers say it's "liquid sunshine!"
                    </p>
                  </div>
                  
                  <h2 style="color: #059669; margin-bottom: 20px;">Ingredients:</h2>
                  <ul style="line-height: 2; color: #374151; margin-bottom: 30px;">
                    <li>2 tablespoons Golden Glow Gel</li>
                    <li>1 frozen banana</li>
                    <li>1/2 cup mango chunks</li>
                    <li>1 cup coconut water</li>
                    <li>1/2 teaspoon fresh ginger (optional)</li>
                    <li>Ice cubes</li>
                  </ul>
                  
                  <h2 style="color: #059669; margin-bottom: 20px;">Instructions:</h2>
                  <ol style="line-height: 2; color: #374151; margin-bottom: 30px;">
                    <li>Add all ingredients to blender</li>
                    <li>Blend on high for 60 seconds until smooth</li>
                    <li>Pour and enjoy immediately!</li>
                  </ol>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://tasteofgratitude.shop/product/golden-glow-gel" 
                       style="display: inline-block; background: #059669; color: #ffffff; padding: 16px 40px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600;">
                      Get Golden Glow Gel
                    </a>
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

function generateSocialProofEmail() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Customer Success Stories</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Real Results, Real People ⭐</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">See what our community is saying</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
                    <p style="font-style: italic; color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                      "I was skeptical at first, but after 3 weeks of daily use, my energy levels are through the roof. I no longer need my afternoon coffee!"
                    </p>
                    <p style="color: #059669; font-weight: 600; margin: 0;">— Marcus T., Verified Buyer ⭐⭐⭐⭐⭐</p>
                  </div>
                  
                  <div style="background: #eff6ff; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
                    <p style="font-style: italic; color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                      "My skin has never looked better. The 'Golden Glow' is real! My friends keep asking what I'm using."
                    </p>
                    <p style="color: #1d4ed8; font-weight: 600; margin: 0;">— Sarah L., Verified Buyer ⭐⭐⭐⭐⭐</p>
                  </div>
                  
                  <div style="background: #fefce8; padding: 25px; border-radius: 12px;">
                    <p style="font-style: italic; color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                      "As a yoga instructor, I recommend this to all my clients. The digestive benefits alone are worth it."
                    </p>
                    <p style="color: #a16207; font-weight: 600; margin: 0;">— Jennifer R., Verified Buyer ⭐⭐⭐⭐⭐</p>
                  </div>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://tasteofgratitude.shop/catalog" 
                       style="display: inline-block; background: #059669; color: #ffffff; padding: 16px 40px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600;">
                      Join Our Wellness Community
                    </a>
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

function generateSubscriptionOfferEmail() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Exclusive Subscriber Offer</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Your Wellness, On Autopilot 🌿</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Never run out again + save 20%</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px; text-align: center;">
                  <div style="background: #fef3c7; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                    <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0;">EXCLUSIVE OFFER FOR EMAIL SUBSCRIBERS</p>
                    <h2 style="color: #d97706; font-size: 48px; margin: 0;">20% OFF</h2>
                    <p style="color: #92400e; margin: 10px 0 0 0;">+ Priority Market Pickup</p>
                  </div>
                  
                  <ul style="text-align: left; line-height: 2; color: #374151; margin-bottom: 30px; display: inline-block;">
                    <li>✅ Automatic delivery every 30 days</li>
                    <li>✅ Pause, skip, or cancel anytime</li>
                    <li>✅ Save $7+ per jar</li>
                    <li>✅ Priority market pickup</li>
                    <li>✅ Early access to new products</li>
                  </ul>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="https://tasteofgratitude.shop/product/golden-glow-gel?subscribe=true" 
                       style="display: inline-block; background: #059669; color: #ffffff; padding: 18px 50px; 
                              text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px;">
                      Subscribe & Save 20%
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    No commitment. Cancel anytime. Questions? Reply to this email.
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
