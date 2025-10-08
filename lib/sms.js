// SMS service - supports both real Twilio and mock mode
import twilio from 'twilio';

const USE_REAL_SMS = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;

let twilioClient = null;
const SMS_LOG = [];

if (USE_REAL_SMS) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Using REAL Twilio SMS');
} else {
  console.log('⚠️ Using MOCK SMS (set TWILIO env vars for real SMS)');
}

export async function sendSMS(to, message, from) {
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || 'TasteOfGratitude';
  
  if (USE_REAL_SMS && twilioClient) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: to
      });
      
      console.log('📱 [REAL SMS] Sent:', result.sid);
      
      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      console.error('📱 [SMS ERROR]:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  } else {
    // Mock mode
    console.log('📱 [MOCK SMS] To:', to);
    console.log('📱 [MOCK SMS] Message:', message);
    
    const smsRecord = {
      to,
      from: fromNumber,
      message,
      sentAt: new Date(),
      status: 'sent',
      sid: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    SMS_LOG.push(smsRecord);
    
    return {
      success: true,
      sid: smsRecord.sid,
      status: 'sent',
      to,
      message: 'SMS sent successfully (MOCK)'
    };
  }
}

export function getSMSLog() {
  return SMS_LOG;
}

export function isRealSMS() {
  return USE_REAL_SMS;
}
