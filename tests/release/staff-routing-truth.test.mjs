import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function staff(address) {
  const messages = [];
  const context = vm.createContext({ process: { env: { STAFF_EMAIL: address } }, console });
  const source = await readFile(new URL('../../lib/staff-notifications.js', import.meta.url), 'utf8');
  const dependencies = {
    './resend-email': { sendEmail: async message => { messages.push(message); return { success: true, messageId: 'unit-only' }; } },
    '@/lib/logger': { logger: { info() {}, error() {} } },
    '@/lib/owner-alerts': { sendOwnerAlert() {}, buildOrderConfirmedAlert() {} },
  };
  const module = new vm.SourceTextModule(source, { context });
  await module.link(key => new vm.SyntheticModule(Object.keys(dependencies[key]), function () {
    for (const [name, value] of Object.entries(dependencies[key])) this.setExport(name, value);
  }, { context }));
  await module.evaluate();
  return { api: module.namespace, messages };
}
const order = {
  id: 'unit-order', orderNumber: 'UNIT', fulfillmentType: 'pickup_dunwoody',
  customer: { name: 'Unit Buyer', email: 'buyer@example.invalid' },
  items: [{ name: 'Unit item', price: 11.99, quantity: 1 }], pricing: { total: 11.99 },
};
test('staff notifications cannot invent an operational recipient', async () => {
  const app = await staff(undefined);
  assert.equal((await app.api.notifyStaffPickupOrder(order)).error, 'NO_STAFF_EMAIL');
  assert.equal((await app.api.notifyStaffStatusChange(order, 'paid', 'ready')).error, 'NO_STAFF_EMAIL');
  assert.equal(app.messages.length, 0);
});
test('invalid staff routing fails before provider submission', async () => {
  const app = await staff('not-an-email');
  assert.equal((await app.api.notifyStaffPickupOrder(order)).error, 'INVALID_STAFF_EMAIL');
  assert.equal(app.messages.length, 0);
});
test('pickup type alone cannot invent a location or Saturday schedule', async () => {
  const app = await staff('staff@example.invalid');
  assert.equal((await app.api.notifyStaffPickupOrder(order)).success, true);
  assert.doesNotMatch(app.messages[0].html, /Saturday 9|DHA Dunwoody/);
  assert.match(app.messages[0].html, /Confirm pickup/);
});
test('delivery notification cannot promise unconfigured 24-hour preparation', async () => {
  const app = await staff('staff@example.invalid');
  await app.api.notifyStaffPickupOrder({ ...order, fulfillmentType: 'delivery',
    deliveryAddress: { street: 'Unit street', city: 'Atlanta', state: 'GA', zip: '30301' } });
  assert.doesNotMatch(app.messages[0].html, /Within 24 hours/);
  assert.match(app.messages[0].html, /Confirm preparation and dispatch time/);
});
