/**
 * Gratitude Referrals
 * 
 * Referral code generation and tracking
 */

import { connectToDatabase } from '../db-admin';
import { generateReferralCode, EARNING_RATES } from './core';
import { earnFromActivity } from './transactions';
import { incrementReferralCount, setReferredBy, findByReferralCode } from './accounts';

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
  
  const { db } = await connectToDatabase();
  await db.collection('gratitude_accounts').updateOne(
    { customerId },
    { $set: { 'referrals.code': code } }
  );
  
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
  
  const { db } = await connectToDatabase();
  
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
  const existing = await db.collection('gratitude_referrals').findOne({
    $or: [
      { referredCustomerId: newCustomerId },
      { referredEmail: newCustomerEmail }
    ]
  });
  
  if (existing) {
    return { success: false, error: 'Customer already referred' };
  }
  
  // Record the referral
  const referral = {
    referralCode,
    referrerId: referrerAccount.customerId,
    referredCustomerId: newCustomerId,
    referredEmail: newCustomerEmail,
    orderId,
    orderTotal,
    referrerCredited: false,
    createdAt: new Date()
  };
  
  await db.collection('gratitude_referrals').insertOne(referral);
  
  // Link new customer to referrer
  await setReferredBy(newCustomerId, referrerAccount.customerId);
  
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
  const { db } = await connectToDatabase();
  const { getAccount } = await import('./accounts');
  
  // Get new customer's account
  const newAccount = await getAccount(newCustomerId);
  if (!newAccount?.referrals?.referredBy) {
    return { success: false, error: 'No referrer found' };
  }
  
  const referrerId = newAccount.referrals.referredBy;
  
  // Check if already credited
  const existingCredit = await db.collection(TRANSACTIONS_COLLECTION).findOne({
    customerId: referrerId,
    'source.type': 'referral',
    'source.metadata.referredCustomerId': newCustomerId
  });
  
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
    await db.collection('gratitude_referrals').updateOne(
      { referredCustomerId: newCustomerId },
      { $set: { referrerCredited: true, creditedAt: new Date() } }
    );
  }
  
  return result;
}

/**
 * Get referral stats for a customer
 * @param {string} customerId - Customer ID
 */
export async function getReferralStats(customerId) {
  const { db } = await connectToDatabase();
  const { getAccount } = await import('./accounts');
  
  const account = await getAccount(customerId);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }
  
  // Get all referrals made by this customer
  const referrals = await db.collection('gratitude_referrals')
    .find({ referrerId: customerId })
    .sort({ createdAt: -1 })
    .toArray();
  
  const successful = referrals.filter(r => r.referrerCredited);
  const pending = referrals.filter(r => !r.referrerCredited);
  
  return {
    success: true,
    code: account.referrals?.code || null,
    totalReferrals: referrals.length,
    successfulReferrals: successful.length,
    pendingReferrals: pending.length,
    creditsEarned: successful.length * EARNING_RATES.referral,
    referrals: referrals.map(r => ({
      email: r.referredEmail,
      date: r.createdAt,
      credited: r.referrerCredited,
      orderTotal: r.orderTotal
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

const TRANSACTIONS_COLLECTION = 'gratitude_transactions';

export default {
  getOrCreateReferralCode,
  processReferralConversion,
  creditReferrer,
  getReferralStats,
  generateReferralLink,
  generateShareMessages
};
