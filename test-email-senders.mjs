#!/usr/bin/env node
/**
 * Test all email sender addresses
 */

const TEST_EMAIL = process.argv[2] || 'silverwatkins@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not set');
  process.exit(1);
}

const EMAIL_SENDERS = {
  orders: 'Taste of Gratitude Orders <orders@tasteofgratitude.net>',
  support: 'Taste of Gratitude Support <support@tasteofgratitude.net>',
  info: 'Taste of Gratitude <info@tasteofgratitude.net>',
  community: 'Taste of Gratitude Community <community@tasteofgratitude.net>',
  rewards: 'Taste of Gratitude Rewards <rewards@tasteofgratitude.net>',
  hello: 'Taste of Gratitude <hello@tasteofgratitude.net>'
};

console.log('═'.repeat(60));
console.log('EMAIL SENDER ADDRESS TEST');
console.log('═'.repeat(60));
console.log(`To: ${TEST_EMAIL}`);
console.log('═'.repeat(60));

async function sendTestEmail(name, from, subject) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: TEST_EMAIL,
      subject,
      html: `
        <div style="font-family: Arial; padding: 20px; max-width: 500px;">
          <h2 style="color: #D4AF37;">✅ ${name} Email Test</h2>
          <p><strong>From:</strong> ${from}</p>
          <p><strong>Type:</strong> ${name}</p>
          <p style="color: #666; font-size: 12px;">Sent: ${new Date().toISOString()}</p>
        </div>
      `
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log(`✅ ${name.padEnd(12)} | ${from.split('<')[1]?.replace('>', '') || from}`);
    return true;
  } else {
    console.log(`❌ ${name.padEnd(12)} | ${data.message}`);
    return false;
  }
}

async function runTests() {
  const tests = [
    ['Orders', EMAIL_SENDERS.orders, '📦 Order Confirmation Test'],
    ['Support', EMAIL_SENDERS.support, '🎧 Support Email Test'],
    ['Info', EMAIL_SENDERS.info, 'ℹ️ Info/Welcome Email Test'],
    ['Community', EMAIL_SENDERS.community, '👥 Newsletter/Community Test'],
    ['Rewards', EMAIL_SENDERS.rewards, '🎁 Rewards/Coupon Test'],
    ['Hello', EMAIL_SENDERS.hello, '👋 General Email Test']
  ];

  let passed = 0;
  for (const [name, from, subject] of tests) {
    if (await sendTestEmail(name, from, subject)) passed++;
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  console.log('═'.repeat(60));
  console.log(`Results: ${passed}/${tests.length} passed`);
  console.log(`📬 Check ${TEST_EMAIL} for ${passed} test emails`);
}

runTests().catch(console.error);
