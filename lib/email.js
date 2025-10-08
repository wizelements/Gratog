// Email service - supports both real SendGrid and mock mode
import sgMail from '@sendgrid/mail';

const USE_REAL_EMAIL = process.env.SENDGRID_API_KEY;

const EMAIL_LOG = [];

if (USE_REAL_EMAIL) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ Using REAL SendGrid Email');
} else {
  console.log('⚠️ Using MOCK Email (set SENDGRID_API_KEY for real email)');
}

export async function sendEmail({ to, from, subject, html, text }) {
  const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || 'hello@tasteofgratitude.com';
  
  if (USE_REAL_EMAIL) {
    try {
      const result = await sgMail.send({
        to,
        from: fromEmail,
        subject,
        html,
        text
      });
      
      console.log('📧 [REAL EMAIL] Sent to:', to);
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        status: 'sent',
        to,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('📧 [EMAIL ERROR]:', error.message);
      return {
        success: false,
        error: error.message
      };
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
