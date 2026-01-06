#!/usr/bin/env node
/**
 * Simple Resend test - uses fetch directly (no dependencies)
 */

const TEST_EMAIL = process.argv[2] || 'silverwatkins@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'hello@tasteofgratitude.net';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not set');
  console.log('Usage: export $(grep -v "^#" .env.local | xargs) && node test-resend-simple.mjs [email]');
  process.exit(1);
}

console.log('═'.repeat(50));
console.log('RESEND EMAIL TEST');
console.log('═'.repeat(50));
console.log(`From: ${FROM_EMAIL}`);
console.log(`To: ${TEST_EMAIL}`);
console.log(`API Key: ${RESEND_API_KEY.slice(0,10)}...`);
console.log('═'.repeat(50));

async function sendTestEmail() {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: TEST_EMAIL,
      subject: '🧪 Test Email from Taste of Gratitude',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">✅ Email Test Successful!</h1>
          <p>This is a test email from <strong>Taste of Gratitude</strong>.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
          <hr style="border: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            From: ${FROM_EMAIL}<br>
            Domain: tasteofgratitude.net
          </p>
        </div>
      `,
      text: `Test email from Taste of Gratitude. Sent at: ${new Date().toISOString()}`
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log(`   ID: ${data.id}`);
    console.log(`\n📬 Check ${TEST_EMAIL} for the test email`);
  } else {
    console.log('\n❌ EMAIL FAILED');
    console.log(`   Status: ${response.status}`);
    console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
  }
}

sendTestEmail().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
