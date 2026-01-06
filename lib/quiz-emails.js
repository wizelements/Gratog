// Quiz Email Templates and Functions
import { sendEmail } from './resend-email';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.net';

/**
 * Send Quiz Results Email (Immediate - Email #1)
 * Subject: "Your Perfect Blend Awaits 🌿"
 */
export async function sendQuizResultsEmail({ email, name, quizId, recommendations, goal }) {
  if (!email || !recommendations || recommendations.length === 0) {
    console.warn('[quiz-email] Invalid data, skipping email');
    return { success: false, reason: 'invalid-data' };
  }

  const resultsUrl = `${BASE_URL}/quiz/results/${quizId}`;
  const goalLabels = {
    immune: 'Boost Immunity',
    gut: 'Gut Health',
    energy: 'Natural Energy',
    skin: 'Radiant Glow',
    calm: 'Calm Focus'
  };
  const goalLabel = goalLabels[goal] || 'Wellness';

  const subject = `Your Perfect Blend Awaits 🌿 - ${goalLabel}`;
  const html = generateQuizResultsEmailHTML({
    name,
    goal: goalLabel,
    recommendations,
    resultsUrl
  });
  const text = generateQuizResultsEmailText({
    name,
    goal: goalLabel,
    recommendations,
    resultsUrl
  });

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Send Quiz Follow-Up #1 (3 Days - Educational)
 * Subject: "Did You Try Your Sea Moss Yet?"
 * NOTE: Only send if customer hasn't purchased
 */
export async function sendQuizFollowUp3Days({ email, name, quizId, topProduct }) {
  const subject = 'Did You Try Your Sea Moss Yet? 🌊';
  const resultsUrl = `${BASE_URL}/quiz/results/${quizId}`;
  
  const html = generateFollowUp3DaysHTML({ name, topProduct, resultsUrl });
  const text = `Hi ${name}, Have you had a chance to try your personalized sea moss blend? We'd love to hear about your wellness journey! View your recommendations: ${resultsUrl}`;

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Send Quiz Follow-Up #2 (7 Days - Rewards Engagement)
 * Subject: "Your Gratitude Passport Unlocks Rewards"
 * NOTE: Only send if customer hasn't purchased
 */
export async function sendQuizFollowUp7Days({ email, name, quizId }) {
  const subject = 'Your Gratitude Passport Unlocks Rewards 🎁';
  const passportUrl = `${BASE_URL}/passport`;
  const resultsUrl = `${BASE_URL}/quiz/results/${quizId}`;
  
  const html = generateFollowUp7DaysHTML({ name, passportUrl, resultsUrl });
  const text = `Hi ${name}, Join our Gratitude Passport rewards program! Earn points with every purchase and market visit. Get started: ${passportUrl}`;

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

/**
 * Generate Quiz Results Email HTML
 */
function generateQuizResultsEmailHTML({ name, goal, recommendations, resultsUrl }) {
  const topRecommendation = recommendations[0];
  const otherRecommendations = recommendations.slice(1, 4);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Perfect Blend Awaits</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #e0f2f1 0%, #f1f8e9 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #14b8a6 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 15px;">🌿</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Your Perfect Blend Awaits!</h1>
              <p style="margin: 12px 0 0; color: #e0f2f1; font-size: 16px; font-weight: 500;">Personalized for ${goal}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 30px 20px;">
              <p style="margin: 0; color: #1f2937; font-size: 18px; line-height: 1.6;">Hi ${name || 'Friend'},</p>
              <p style="margin: 16px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">Thank you for taking our wellness quiz! Based on your answers, we've curated the perfect sea moss products to support your <strong>${goal}</strong> goals.</p>
            </td>
          </tr>
          
          <!-- Top Recommendation (Featured) -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; border: 2px solid #fbbf24;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="background-color: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Top Pick</span>
                </div>
                <h2 style="margin: 15px 0 8px; color: #78350f; font-size: 24px; font-weight: bold;">${topRecommendation.name}</h2>
                <p style="margin: 0 0 12px; color: #92400e; font-size: 14px; line-height: 1.5;">${topRecommendation.recommendationReason || topRecommendation.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                  <span style="color: #059669; font-size: 28px; font-weight: bold;">$${((topRecommendation.price || topRecommendation.priceCents) / 100).toFixed(2)}</span>
                  <a href="${BASE_URL}/order?add=${topRecommendation.id}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 8px rgba(5,150,105,0.3);">Shop Now →</a>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Other Recommendations -->
          ${otherRecommendations.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 30px;">
              <h3 style="margin: 0 0 20px; color: #1f2937; font-size: 20px; font-weight: bold;">More Recommendations for You</h3>
              ${otherRecommendations.map(product => `
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                      <h4 style="margin: 0 0 8px; color: #1f2937; font-size: 18px; font-weight: bold;">${product.name}</h4>
                      <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; line-height: 1.5;">${product.recommendationReason || product.description?.substring(0, 100) + '...'}</p>
                      <span style="color: #059669; font-size: 20px; font-weight: bold;">$${((product.price || product.priceCents) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <a href="${BASE_URL}/order?add=${product.id}" style="display: inline-block; margin-top: 15px; background-color: #059669; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Add to Cart</a>
                </div>
              `).join('')}
            </td>
          </tr>
          ` : ''}
          
          <!-- View Full Results CTA -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="${resultsUrl}" style="display: inline-block; background-color: #fff; color: #059669; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; border: 2px solid #059669;">View My Full Results →</a>
            </td>
          </tr>
          
          <!-- Why Sea Moss Section -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; padding: 25px;">
                <h3 style="margin: 0 0 15px; color: #065f46; font-size: 18px; font-weight: bold;">🌊 Why Sea Moss?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #047857; font-size: 14px; line-height: 1.8;">
                  <li><strong>92+ Essential Minerals</strong> - Complete nutrition in every serving</li>
                  <li><strong>100% Natural</strong> - Wildcrafted and small-batch crafted</li>
                  <li><strong>Immune Support</strong> - Boost your natural defenses</li>
                  <li><strong>Gut Health</strong> - Prebiotic properties for digestion</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <p style="margin: 0 0 12px; color: #059669; font-size: 16px; font-weight: bold;">With Gratitude,</p>
              <p style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: bold;">The Taste of Gratitude Team</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">📧 hello@tasteofgratitude.net</p>
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">📍 Atlanta Farmers Markets | Online Delivery Available</p>
                <p style="margin: 0; color: #9ca3af; font-size: 12px;">Questions? Reply to this email - we'd love to hear from you!</p>
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

/**
 * Generate Quiz Results Email Text (Plain text version)
 */
function generateQuizResultsEmailText({ name, goal, recommendations, resultsUrl }) {
  const topRec = recommendations[0];
  let text = `TASTE OF GRATITUDE - YOUR PERFECT BLEND\n\n`;
  text += `Hi ${name || 'Friend'},\n\n`;
  text += `Thank you for taking our wellness quiz! Based on your answers, we've curated the perfect sea moss products to support your ${goal} goals.\n\n`;
  text += `⭐ TOP PICK:\n`;
  text += `${topRec.name} - $${((topRec.price || topRec.priceCents) / 100).toFixed(2)}\n`;
  text += `${topRec.recommendationReason || topRec.description}\n`;
  text += `Shop: ${BASE_URL}/order?add=${topRec.id}\n\n`;
  
  if (recommendations.length > 1) {
    text += `MORE RECOMMENDATIONS:\n`;
    recommendations.slice(1, 4).forEach(rec => {
      text += `• ${rec.name} - $${((rec.price || rec.priceCents) / 100).toFixed(2)}\n`;
    });
    text += `\n`;
  }
  
  text += `View your full results: ${resultsUrl}\n\n`;
  text += `With gratitude,\nThe Taste of Gratitude Team\n\n`;
  text += `📧 hello@tasteofgratitude.net`;
  
  return text;
}

/**
 * Generate Follow-Up #1 Email HTML (3 Days)
 */
function generateFollowUp3DaysHTML({ name, topProduct, resultsUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Did You Try Your Sea Moss Yet?</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px;">
          
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">🌊</div>
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: bold;">Did You Try Your Sea Moss Yet?</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">We noticed you took our wellness quiz a few days ago! Have you had a chance to try ${topProduct?.name || 'your personalized blend'}?</p>
              
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px; color: #065f46; font-size: 18px; font-weight: bold;">💚 Customer Stories</h3>
                <p style="margin: 0 0 12px; color: #047857; font-size: 14px; line-height: 1.6; font-style: italic;">"I've been using the Elderberry Moss for 2 weeks and I already feel more energized! My immune system feels stronger too." - Sarah M.</p>
                <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6; font-style: italic;">"The Golden Glow Gel helped reduce my joint pain significantly. I love that it's all natural!" - Marcus J.</p>
              </div>
              
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">Ready to start your wellness journey? Your personalized recommendations are waiting for you:</p>
              
              <div style="text-align: center;">
                <a href="${resultsUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View My Recommendations →</a>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <p style="margin: 0 0 8px; color: #059669; font-size: 14px; font-weight: bold;">Questions? We're here to help!</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">📧 hello@tasteofgratitude.net</p>
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

/**
 * Generate Follow-Up #2 Email HTML (7 Days)
 */
function generateFollowUp7DaysHTML({ name, passportUrl, resultsUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Gratitude Passport Unlocks Rewards</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px;">
          
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
              <div style="font-size: 64px; margin-bottom: 15px;">🎁</div>
              <h1 style="margin: 0; color: #78350f; font-size: 28px; font-weight: bold;">Unlock Exclusive Rewards!</h1>
              <p style="margin: 12px 0 0; color: #92400e; font-size: 16px; font-weight: 500;">Join the Gratitude Passport Program</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">We'd love to reward you for being part of our wellness community! Join our <strong>Gratitude Passport</strong> rewards program and start earning points with every purchase and market visit.</p>
              
              <div style="background-color: #f9fafb; border: 2px solid #059669; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px; color: #059669; font-size: 18px; font-weight: bold;">🌟 Rewards You'll Love</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1f2937; font-size: 14px; line-height: 1.8;">
                  <li><strong>2 stamps</strong> = Free 2oz wellness shot</li>
                  <li><strong>5 stamps</strong> = 15% off your next order</li>
                  <li><strong>10 stamps</strong> = VIP wellness club status</li>
                  <li><strong>Market visits</strong> = Bonus points & samples</li>
                </ul>
              </div>
              
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">Plus, as a quiz taker, you'll receive <strong>bonus welcome points</strong> when you sign up today!</p>
              
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${passportUrl}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 8px rgba(251,191,36,0.3);">Get My Passport →</a>
              </div>
              
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">Already started shopping? <a href="${resultsUrl}" style="color: #059669; text-decoration: none; font-weight: 600;">View your quiz results →</a></p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <p style="margin: 0 0 8px; color: #059669; font-size: 14px; font-weight: bold;">With Gratitude,</p>
              <p style="margin: 0 0 15px; color: #1f2937; font-size: 16px; font-weight: bold;">The Taste of Gratitude Team</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">📧 hello@tasteofgratitude.net</p>
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
