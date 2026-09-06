/**
 * Gratitude Referrals
 * 
 * Referral code generation and tracking
 */

import { getTursoConnection } from '../db/turso';
import { randomUUID } from 'node:crypto';
import { generateReferralCode, EARNING_RATES } from './core';
import { earnFromActivity } from './transactions';
import { incrementReferralCount, findByReferralCode } from './accounts';

/**
 * Get or create referral code for a customer
 * @param {string} customerId - Customer ID
 */
export async function getOrCreateReferralCode(customerId) {
  const { findByCustomerId } = await import('./accounts');
  const account = await findByCustomerId(customerId);
  
  if (!account) {
    return { success: false, error: 'Account not found' };
  }
  
  if (account.referrals?.code) {
    return { 
      success: true, 
      code: account.referrals.code,
      referredCount: account.referrals.referredCount || 0
    };
  }
  
  // Generate new code
  const code = generateReferralCode(customerId);
  
  await getTursoConnection().run('UPDATE reward_accounts SET referral_code=?,updated_at=? WHERE customer_id=?',code,new Date().toISOString(),customerId);
  
  return { success: true, code, referredCount: 0 };
}

/**
 * Process a referral conversion
 * @param {Object} params - Conversion params
 */
export async function processReferralConversion(params) {
  const {
    referralCode,
    newCustomerId,
    newCustomerEmail,
    orderId,
    orderTotal
  } = params;
  
  const db = getTursoConnection();
  
  // Find referrer
  const referrerAccount = await findByReferralCode(referralCode);
  if (!referrerAccount) {
    return { success: false, error: 'Invalid referral code' };
  }
  
  // Prevent self-referral
  if (referrerAccount.customerId === newCustomerId) {
    return { success: false, error: 'Cannot refer yourself' };
  }
  
  // Check if this customer was already referred
  const normalizedEmail=String(newCustomerEmail||'').trim().toLowerCase()||null;
  const existing = await db.get('SELECT id FROM reward_referrals WHERE referred_customer_id=? OR referred_email_normalized=? LIMIT 1',newCustomerId,normalizedEmail);
  
  if (existing) {
    return { success: false, error: 'Customer already referred' };
  }
  
  // Record the referral
  const referral = {
    id: randomUUID(),
    referralCode,
    referrerId: referrerAccount.customerId,
    referredCustomerId: newCustomerId,
    referredEmail: newCustomerEmail,
    orderId,
    orderTotal,
    referrerCredited: false,
    createdAt: new Date()
  };
  
  await db.transactionAsync(async(tx)=>{await tx.run(`INSERT INTO reward_referrals(id,referral_code,referrer_customer_id,referred_customer_id,referred_email_normalized,order_id,order_total_cents,referrer_credited,created_at) VALUES(?,?,?,?,?,?,?,0,?)`,referral.id,referralCode,referrerAccount.customerId,newCustomerId,normalizedEmail,orderId,orderTotal,new Date().toISOString());await tx.run('UPDATE reward_accounts SET referred_by=?,updated_at=? WHERE customer_id=?',referrerAccount.customerId,new Date().toISOString(),newCustomerId)});
  
  return { 
    success: true, 
    referral,
    message: 'Referral recorded. Referrer will be credited on first purchase.'
  };
}

/**
 * Credit referrer when referred customer makes first purchase
 * @param {string} newCustomerId - New customer ID
 * @param {string} orderId - Order ID
 */
export async function creditReferrer(newCustomerId, orderId) {
  const db = getTursoConnection();
  const { getAccount } = await import('./accounts');
  
  // Get new customer's account
  const newAccount = await getAccount(newCustomerId);
  if (!newAccount?.referrals?.referredBy) {
    return { success: false, error: 'No referrer found' };
  }
  
  const referrerId = newAccount.referrals.referredBy;
  
  // Check if already credited
  const existingCredit = await db.get('SELECT id FROM reward_transactions WHERE source_event_id=? LIMIT 1',`referral:${referrerId}:${newCustomerId}`);
  
  if (existingCredit) {
    return { success: false, error: 'Referrer already credited' };
  }
  
  // Credit the referrer
  const result = await earnFromActivity({
    customerId: referrerId,
    activityType: 'referral',
    credits: EARNING_RATES.referral,
    description: `Referral bonus: ${newAccount.customerId.slice(0, 8)}`,
    metadata: {
      referredCustomerId: newCustomerId,
      orderId
    }
  });
  
  if (result.success) {
    await incrementReferralCount(referrerId);
    
    // Mark referral as credited
    await db.run('UPDATE reward_referrals SET referrer_credited=1,credited_at=? WHERE referred_customer_id=?',new Date().toISOString(),newCustomerId);
  }
  
  return result;
}

/**
 * Get referral stats for a customer
 * @param {string} customerId - Customer ID
 */
export async function getReferralStats(customerId) {
  const db = getTursoConnection();
  const { getAccount } = await import('./accounts');
  
  const account = await getAccount(customerId);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }
  
  // Get all referrals made by this customer
  const referrals = await db.all('SELECT * FROM reward_referrals WHERE referrer_customer_id=? ORDER BY created_at DESC',customerId);
  
  const successful = referrals.filter(r => Boolean(r.referrer_credited));
  const pending = referrals.filter(r => !Boolean(r.referrer_credited));
  
  return {
    success: true,
    code: account.referrals?.code || null,
    totalReferrals: referrals.length,
    successfulReferrals: successful.length,
    pendingReferrals: pending.length,
    creditsEarned: successful.length * EARNING_RATES.referral,
    referrals: referrals.map(r => ({
      email: r.referred_email_normalized,
      date: new Date(r.created_at),
      credited: Boolean(r.referrer_credited),
      orderTotal: r.order_total_cents
    }))
  };
}

/**
 * Generate shareable referral link
 * @param {string} code - Referral code
 * @param {string} baseUrl - Site base URL
 */
export function generateReferralLink(code, baseUrl = 'https://tasteofgratitude.shop') {
  return `${baseUrl}/register?ref=${encodeURIComponent(code)}`;
}

/**
 * Generate referral message templates
 * @param {string} code - Referral code
 */
export function generateShareMessages(code) {
  const link = generateReferralLink(code);
  
  return {
    text: `I'm loving Taste of Gratitude! Join me and get 50 bonus credits (worth $1+) when you sign up: ${link}`,
    email: {
      subject: 'Try Taste of Gratitude — Sea Moss & Fresh Juices',
      body: `Hey!\n\nI've been getting my sea moss and fresh juices from Taste of Gratitude and they're amazing.\n\nSign up with my link and you'll get 50 bonus credits to start:\n${link}\n\nCheers!`
    },
    social: {
      twitter: `Just discovered @TasteOfGratitude — amazing sea moss gels & fresh juices! Get 50 bonus credits when you join: ${link}`,
      facebook: `I'm loving Taste of Gratitude for my daily sea moss and fresh juices! Join with my link and get 50 bonus credits to start. ${link}`
    }
  };
}

export default {
  getOrCreateReferralCode,
  processReferralConversion,
  creditReferrer,
  getReferralStats,
  generateReferralLink,
  generateShareMessages
};
