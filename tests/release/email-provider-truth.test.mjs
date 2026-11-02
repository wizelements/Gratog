import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Execute the real service with isolated provider/database boundaries. These
// are unit regressions, never evidence of provider delivery or checkout.
async function service({ configured = true, response = { data: { id: 'provider-id' } } } = {}) {
  const records = [];
  let sends = 0;
  const context = vm.createContext({
    process: { env: configured ? { RESEND_API_KEY: 'unit-test-only' } : {} },
    console: { log() {}, error() {} },
  });
  const dependencies = {
    resend: { Resend: class { emails = { send: async () => { sends++; return response; } }; } },
    '@/lib/email/unsubscribe-headers': { buildListUnsubscribeHeaders: () => null },
    '@/lib/logger': { logger: { info() {}, warn() {}, error() {} } },
    '@/lib/email-config': {
      getFromAddress: () => 'sender@example.invalid',
      EMAIL_SENDERS: { hello: { formatted: 'sender@example.invalid' }, support: { address: 'help@example.invalid' } },
    },
    '@/lib/site-config': {
      CONTACT_PHONE_DISPLAY: '', CONTACT_PHONE_HREF: '', HAS_PUBLIC_PHONE: false,
      SUPPORT_EMAIL: 'help@example.invalid',
    },
    '@/lib/db-optimized': { connectToDatabase: async () => ({ db: {
      collection: () => ({ insertOne: async row => { records.push(row); } }),
    } }) },
  };
  const source = await readFile(new URL('../../lib/resend-email.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, { context });
  await module.link(specifier => {
    const exports = dependencies[specifier];
    if (!exports) throw new Error('Unexpected dependency: ' + specifier);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return { send: module.namespace.sendEmail, records, sends: () => sends };
}
const email = { to: 'unit@example.invalid', subject: 'Unit test', text: 'No external email is sent.' };

test('missing provider credentials cannot report notification success', async () => {
  const app = await service({ configured: false });
  const result = await app.send(email);
  assert.equal(result.success, false);
  assert.equal(result.error, 'EMAIL_PROVIDER_NOT_CONFIGURED');
  assert.equal(app.sends(), 0);
  assert.equal(app.records[0].status, 'failed');
  assert.equal(app.records[0].messageId, null);
});
test('provider acceptance is recorded separately from confirmed delivery', async () => {
  const app = await service();
  const result = await app.send(email);
  assert.equal(result.success, true);
  assert.equal(result.status, 'accepted');
  assert.equal(result.messageId, 'provider-id');
  assert.equal(app.records[0].status, 'accepted');
});
test('missing provider acknowledgement cannot mark an email as accepted', async () => {
  const app = await service({ response: { data: {} } });
  const result = await app.send(email);
  assert.equal(result.success, false);
  assert.equal(result.error, 'EMAIL_PROVIDER_ACKNOWLEDGEMENT_MISSING');
  assert.equal(app.records[0].status, 'failed');
});
test('provider rejection remains a durable failed attempt', async () => {
  const app = await service({ response: { error: { message: 'Rejected by test provider' } } });
  assert.equal((await app.send(email)).success, false);
  assert.equal(app.records[0].status, 'failed');
  assert.equal(app.records[0].messageId, null);
});
