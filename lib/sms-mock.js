// Mock SMS service (replace with Twilio when ready)
// To use real Twilio: yarn add twilio
// Then use: import twilio from 'twilio'

import { logger } from '@/lib/logger';

const SMS_LOG = [];

export async function sendSMS(to, message, from = 'TasteOfGratitude') {
  console.log('📱 [MOCK SMS] Sending to:', to);
  console.log('📱 [MOCK SMS] Message:', message);
  
  const smsRecord = {
    to,
    from,
    message,
    sentAt: new Date(),
    status: 'sent',
    sid: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  SMS_LOG.push(smsRecord);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    sid: smsRecord.sid,
    status: 'sent',
    to,
    message: 'SMS sent successfully (MOCK)'
  };
}

export function getSMSLog() {
  return SMS_LOG;
}

// Real Twilio implementation (commented out):
/*
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to, message) {
  return await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to
  });
}
*/
