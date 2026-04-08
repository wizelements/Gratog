/**
 * Email Configuration - Sender addresses for different email types
 * Domain: tasteofgratitude.shop (verified with Resend)
 */

const DOMAIN = 'tasteofgratitude.shop';

export const EMAIL_SENDERS = {
  // Order-related emails
  orders: {
    address: `orders@${DOMAIN}`,
    name: 'Taste of Gratitude Orders',
    formatted: `Taste of Gratitude Orders <orders@${DOMAIN}>`
  },
  
  // Customer support
  support: {
    address: `support@${DOMAIN}`,
    name: 'Taste of Gratitude Support',
    formatted: `Taste of Gratitude Support <support@${DOMAIN}>`
  },
  
  // General info/welcome emails
  info: {
    address: `info@${DOMAIN}`,
    name: 'Taste of Gratitude',
    formatted: `Taste of Gratitude <info@${DOMAIN}>`
  },
  
  // Community/newsletter
  community: {
    address: `community@${DOMAIN}`,
    name: 'Taste of Gratitude Community',
    formatted: `Taste of Gratitude Community <community@${DOMAIN}>`
  },
  
  // Rewards/coupons/promotions
  rewards: {
    address: `rewards@${DOMAIN}`,
    name: 'Taste of Gratitude Rewards',
    formatted: `Taste of Gratitude Rewards <rewards@${DOMAIN}>`
  },
  
  // Contact form inbox (forwards to owner)
  nook: {
    address: `nook@${DOMAIN}`,
    name: 'Taste of Gratitude',
    formatted: `Taste of Gratitude <nook@${DOMAIN}>`
  },

  // Default/fallback
  hello: {
    address: `hello@${DOMAIN}`,
    name: 'Taste of Gratitude',
    formatted: `Taste of Gratitude <hello@${DOMAIN}>`
  }
};

// Map email types to appropriate senders
export const EMAIL_TYPE_MAP = {
  // Order lifecycle
  order: EMAIL_SENDERS.orders,
  order_confirmation: EMAIL_SENDERS.orders,
  order_status: EMAIL_SENDERS.orders,
  payment_confirmed: EMAIL_SENDERS.orders,
  shipping_update: EMAIL_SENDERS.orders,
  ready_for_pickup: EMAIL_SENDERS.orders,
  out_for_delivery: EMAIL_SENDERS.orders,
  delivered: EMAIL_SENDERS.orders,
  
  // Customer engagement
  welcome: EMAIL_SENDERS.info,
  account_created: EMAIL_SENDERS.info,
  password: EMAIL_SENDERS.support,
  password_reset: EMAIL_SENDERS.support,
  
  // Marketing/community
  campaign: EMAIL_SENDERS.community,
  newsletter: EMAIL_SENDERS.community,
  newsletter_confirmation: EMAIL_SENDERS.community,
  promotional: EMAIL_SENDERS.community,
  
  // Promotions
  coupon: EMAIL_SENDERS.rewards,
  discount: EMAIL_SENDERS.rewards,
  reward: EMAIL_SENDERS.rewards,
  loyalty_reward: EMAIL_SENDERS.rewards,
  referral: EMAIL_SENDERS.rewards,
  review_thank_you: EMAIL_SENDERS.rewards,

  // Community engagement
  challenge: EMAIL_SENDERS.community,
  
  // Support
  support_ticket: EMAIL_SENDERS.support,
  support_reply: EMAIL_SENDERS.support,
  feedback_request: EMAIL_SENDERS.support,

  // Contact form
  contact_form: EMAIL_SENDERS.nook,
  
  // Default
  default: EMAIL_SENDERS.hello
};

/**
 * Get the appropriate sender for an email type
 * @param {string} emailType - The type of email being sent
 * @returns {object} Sender configuration with address, name, and formatted
 */
export function getSender(emailType) {
  return EMAIL_TYPE_MAP[emailType] || EMAIL_TYPE_MAP.default;
}

/**
 * Get formatted "from" address for an email type
 * @param {string} emailType - The type of email being sent
 * @returns {string} Formatted from address like "Name <email@domain>"
 */
export function getFromAddress(emailType) {
  const sender = getSender(emailType);
  return sender.formatted;
}

const emailConfig = {
  EMAIL_SENDERS,
  EMAIL_TYPE_MAP,
  getSender,
  getFromAddress,
  DOMAIN
};

export default emailConfig;
