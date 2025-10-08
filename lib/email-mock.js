// Mock Email service (replace with SendGrid when ready)
// To use real SendGrid: yarn add @sendgrid/mail
// Then use: import sgMail from '@sendgrid/mail'

const EMAIL_LOG = [];

export async function sendEmail({ to, subject, html, text }) {
  console.log('📧 [MOCK EMAIL] Sending to:', to);
  console.log('📧 [MOCK EMAIL] Subject:', subject);
  console.log('📧 [MOCK EMAIL] Content:', text || 'HTML email');
  
  const emailRecord = {
    to,
    from: 'hello@tasteofgratitude.com',
    subject,
    html,
    text,
    sentAt: new Date(),
    status: 'sent',
    messageId: `EMAIL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  EMAIL_LOG.push(emailRecord);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return {
    success: true,
    messageId: emailRecord.messageId,
    status: 'sent',
    to,
    message: 'Email sent successfully (MOCK)'
  };
}

export function getEmailLog() {
  return EMAIL_LOG;
}

// Real SendGrid implementation (commented out):
/*
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
  return await sgMail.send({
    to,
    from: 'hello@tasteofgratitude.com',
    subject,
    html,
    text
  });
}
*/
