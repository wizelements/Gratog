/**
 * Executes the real TypeScript route and admin-session implementation in Node's
 * module VM with bounded DB/auth dependencies. No packages, service credentials,
 * network, Mongo server or Square transactions are used by this contract suite.
 * Run: node --experimental-vm-modules --test tests/release/order-status-access.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { generateOrderAccessToken, verifyOrderAccessToken } from '../../lib/order-access-token.js';
import * as policy from '../../lib/auth/admin-session-policy.mjs';
import {getTursoVerifiedAdminSession} from '../../lib/auth/turso-admin-session.mjs';
import {persistTursoAdminAudit} from '../../lib/auth/turso-admin-audit.mjs';

const routePath = 'app/api/orders/[id]/status/route.ts';
const sessionPath = 'lib/auth/unified-admin.ts';
const oldSecret = process.env.ORDER_ACCESS_TOKEN_SECRET;
process.env.ORDER_ACCESS_TOKEN_SECRET = 'order-status-contract-test-only-key-20261018';
test.after(() => {
  if (oldSecret === undefined) delete process.env.ORDER_ACCESS_TOKEN_SECRET;
  else process.env.ORDER_ACCESS_TOKEN_SECRET = oldSecret;
});

async function loadTypeScript(path, bindings, environment = {}) {
  const context = createContext({
    URL, Date, JSON, Set, Map, Headers, Response, TextEncoder, Buffer,
    process: { env: { NODE_ENV: 'test', JWT_SECRET: 'a'.repeat(40), ...environment } },
    console: { error() {}, warn() {}, log() {} },
  });
  const source = stripTypeScriptTypes(readFileSync(path, 'utf8'), { mode: 'strip' });
  const module = new SourceTextModule(source, { context, identifier: path });
  await module.link(specifier => {
    assert.ok(bindings[specifier], `Unmocked dependency: ${specifier}`);
    const values = bindings[specifier];
    return new SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context, identifier: specifier });
  });
  await module.evaluate();
  return module.namespace;
}

class AdminAuthError extends Error {
  constructor(message = 'Unauthorized', statusCode = 401) {
    super(message); this.statusCode = statusCode;
  }
}
class TursoPreviewRefusal extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

const privateOrder = () => ({
  id: 'canonical-order-1', orderNumber: 'TOG-private-1', status: 'confirmed', paymentStatus: 'paid',
  customer: { name: 'Private Customer', email: 'buyer@example.invalid' },
  items: [{ name: 'Private item', quantity: 1 }], total: 11.99,
  fulfillment: { type: 'delivery', address: { street: 'Private address' } },
  createdAt: '2026-10-18T04:00:00.000Z', updatedAt: '2026-10-18T04:01:00.000Z',
});
const validToken = (orderId = 'canonical-order-1', customerEmail = 'buyer@example.invalid') =>
  generateOrderAccessToken({ orderId, customerEmail, ttlMs: 60_000 });

function request({ method = 'GET', token, queryToken, body, headers = {} } = {}) {
  const url = new URL('https://tasteofgratitude.shop/api/orders/TOG-private-1/status');
  if (queryToken) url.searchParams.set('token', queryToken);
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set('x-order-access-token', token);
  return {
    method, url: url.toString(), headers: requestHeaders,
    cookies: { get: () => undefined },
    json: async () => { if (body instanceof Error) throw body; return body; },
  };
}
const params = () => ({ params: Promise.resolve({ id: 'TOG-private-1' }) });

async function routeFixture(provider = 'mongodb') {
  const state = {
    order: privateOrder(), marketOrder: null, auth: { authenticated: false },
    admin: null, adminError: null, connections: 0, reads: [], writes: [],
    adminReads: 0, adminWrites: 0, tursoReads: 0, tursoError: null,
  };
  const routes = await loadTypeScript(routePath, {
    'next/server': { NextRequest: class {}, NextResponse: { json: (value, init) => Response.json(value, init) } },
    '@/lib/db-optimized': { connectToDatabase: async () => {
      state.connections++;
      return { db: { collection: name => ({
        findOne: async query => {
          state.reads.push({ name, query });
          return name === 'orders' ? state.order : state.marketOrder;
        },
        findOneAndUpdate: async (query, update) => {
          state.writes.push({ name, query, update });
          return { ...privateOrder(), ...update.$set };
        },
      }) } };
    } },
    '@/lib/auth/unified-admin': {
      AdminAuthError,
      getAdminSession: async () => {
        state.adminReads++;
        if (state.adminError) throw state.adminError;
        return state.admin;
      },
      requireAdminSession: async () => {
        state.adminWrites++;
        if (state.adminError) throw state.adminError;
        if (!state.admin) throw new AdminAuthError();
        return state.admin;
      },
    },
    '@/lib/rewards-security': { verifyRequestAuthentication: async () => state.auth },
    '@/lib/order-access-token': { verifyOrderAccessToken },
    '@/lib/checkout/turso-order-read.mjs': { getTursoPreviewOrder: async () => {
      state.tursoReads++;
      if (state.tursoError) throw state.tursoError;
      return state.order;
    } },
    '@/lib/checkout/turso-preview-runtime.mjs': { TursoPreviewRefusal },
  }, { DATABASE_PROVIDER: provider });
  return { state, routes };
}

test('anonymous and malformed-token polling disclose no order data and do not query orders', async () => {
  for (const token of [undefined, 'invalid.signature']) {
    const { state, routes } = await routeFixture();
    const response = await routes.GET(request({ token }), params());
    assert.equal(response.status, 401);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const content = await response.text();
    for (const secret of ['Private Customer', 'Private item', 'Private address', '11.99']) {
      assert.equal(content.includes(secret), false);
    }
    assert.equal(state.connections, 0);
    assert.equal(state.tursoReads, 0);
  }
});

test('guest header and signed-link query tokens preserve authorized status polling', async () => {
  for (const input of [{ token: validToken() }, { queryToken: validToken() }]) {
    const { routes, state } = await routeFixture();
    const response = await routes.GET(request(input), params());
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.order.id, 'canonical-order-1');
    assert.equal(result.order.total, 11.99);
    assert.equal(result.order.customerName, 'Private Customer');
    assert.equal(state.adminReads, 0);
  }
});

test('a valid credential for another order or email never grants access', async () => {
  for (const token of [validToken('other-order'), validToken('canonical-order-1', 'other@example.invalid')]) {
    const { routes } = await routeFixture();
    const response = await routes.GET(request({ token }), params());
    assert.equal(response.status, 401);
    assert.equal((await response.text()).includes('Private Customer'), false);
  }
});

test('a signed owner session grants access but an unrelated JWT with userId admin does not', async () => {
  const { state, routes } = await routeFixture();
  state.auth = { authenticated: true, authType: 'jwt_cookie', userEmail: '  BUYER@example.invalid  ' };
  assert.equal((await routes.GET(request(), params())).status, 200);
  state.auth = { authenticated: true, authType: 'jwt_cookie', userEmail: 'intruder@example.invalid', userId: 'admin' };
  assert.equal((await routes.GET(request(), params())).status, 401);
  state.auth = { authenticated: true, authType: 'admin_key' };
  assert.equal((await routes.GET(request(), params())).status, 200);
});

test('active administrator reads work and unavailable revalidation returns 503 without order data', async () => {
  const { state, routes } = await routeFixture();
  state.admin = { id: 'admin-1', email: 'staff@example.invalid' };
  assert.equal((await routes.GET(request(), params())).status, 200);
  state.admin = null;
  state.adminError = new AdminAuthError('Database unavailable', 503);
  const before = state.reads.length;
  const response = await routes.GET(request(), params());
  assert.equal(response.status, 503);
  assert.equal(state.reads.length, before);
  assert.equal((await response.text()).includes('Private Customer'), false);
});

test('a valid guest token does not depend on the Mongo-backed admin service', async () => {
  const { state, routes } = await routeFixture('turso');
  state.adminError = new AdminAuthError('Administrator store unavailable', 503);
  assert.equal((await routes.GET(request({ token: validToken() }), params())).status, 200);
  assert.equal(state.adminReads, 0);
  assert.equal(state.connections, 0);
  assert.equal(state.tursoReads, 1);
});

test('Turso reads, misses and integrity failures never fall back to Mongo', async () => {
  const { state, routes } = await routeFixture('turso');
  assert.equal((await routes.GET(request({ token: validToken() }), params())).status, 200);
  state.order = null;
  assert.equal((await routes.GET(request({ token: validToken() }), params())).status, 404);
  state.tursoError = new TursoPreviewRefusal('ORDER_RECORD_RECONCILIATION_REQUIRED');
  const response = await routes.GET(request({ token: validToken() }), params());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'ORDER_RECORD_RECONCILIATION_REQUIRED');
  assert.equal(state.connections, 0);
});

test('legacy market tokens bind to stored identities and email rather than URL text alone', async () => {
  const { state, routes } = await routeFixture();
  state.order = null;
  state.marketOrder = { ...privateOrder(), id: undefined, _id: 'mongo-private-id' };
  assert.equal((await routes.GET(request({ token: validToken('TOG-private-1') }), params())).status, 200);
  assert.equal((await routes.GET(request({ token: validToken('different-reference') }), params())).status, 401);
});

test('both update methods require an active administrator before any write', async () => {
  const { state, routes } = await routeFixture();
  for (const method of ['PUT', 'PATCH']) {
    assert.equal((await routes[method](request({ method, body: { status: 'READY' } }), params())).status, 401);
  }
  assert.equal(state.connections, 0);
  assert.equal(state.writes.length, 0);
});

test('administrators cannot directly assign or erase payment/refund state through status updates', async () => {
  const { state, routes } = await routeFixture();
  state.admin = { id: 'admin-1', email: 'staff@example.invalid' };
  const bodies = [
    ...['paid', 'PAID', 'pending', 'failed', 'refunded', 'partially_refunded', null, false, ''].map(paymentStatus => ({ status: 'CONFIRMED', paymentStatus })),
    ...['paid', 'REFUNDED', 'partial_refund', 'partially_refunded', 'payment_processing',
      'PENDING_PAYMENT', 'PREORDER_PENDING_PAYMENT', 'SHIPPING_PENDING_PAYMENT'].map(status => ({ status })),
  ];
  for (const body of bodies) {
    for (const method of ['PUT', 'PATCH']) {
      const response = await routes[method](request({ method, body }), params());
      assert.equal(response.status, 409, JSON.stringify(body));
      assert.equal((await response.json()).code, 'PAYMENT_STATE_REQUIRES_VERIFICATION');
    }
  }
  assert.equal(state.connections, 0);
  assert.equal(state.writes.length, 0);
});

test('verified staff can still update every fulfillment status used by the market dashboard', async () => {
  const { state, routes } = await routeFixture();
  state.admin = { id: 'admin-1', email: 'staff@example.invalid' };
  for (const status of ['PREPARING', 'READY', 'PICKED_UP', 'PREORDER_PREPARE', 'PREORDER_READY', 'SHIPPING_SHIPPED', 'SHIPPING_DELIVERED']) {
    const response = await routes.PATCH(request({ method: 'PATCH', body: { status } }), params());
    assert.equal(response.status, 200, status);
    const changed = state.writes.at(-1).update.$set;
    assert.equal(changed.status, status);
    assert.equal(changed.statusUpdatedBy, 'staff@example.invalid');
    assert.equal(Object.hasOwn(changed, 'paymentStatus'), false);
  }
});

test('Turso status writes fail closed before either Mongo authentication or order access', async () => {
  const { state, routes } = await routeFixture(' turso ');
  state.admin = { id: 'admin-1', email: 'staff@example.invalid' };
  for (const method of ['PUT', 'PATCH']) {
    const response = await routes[method](request({ method, body: { status: 'READY' } }), params());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'TURSO_FULFILLMENT_WRITE_NOT_CERTIFIED');
  }
  assert.equal(state.adminWrites, 0);
  assert.equal(state.connections, 0);
  assert.equal(state.writes.length, 0);
});

test('malformed payloads and estimated times are rejected without mutation', async () => {
  const { state, routes } = await routeFixture();
  state.admin = { id: 'admin-1', email: 'staff@example.invalid' };
  for (const body of [new SyntaxError('Bad JSON'), null, [], 'READY', {}, { status: {} },
    { estimatedReady: {} }, { estimatedReady: 'not-a-time' }]) {
    assert.equal((await routes.PATCH(request({ method: 'PATCH', body }), params())).status, 400);
  }
  assert.equal(state.writes.length, 0);
});

async function sessionFixture() {
  const state = {
    payload: { id: 'admin-1', email: 'old@example.invalid', role: 'admin', sessionVersion:1, iat: 1, exp: 9999999999 },
    record: { isActive: true, role: 'admin', email: 'current@example.invalid',tokenVersion:1 },
    dbError: null, lookups: 0, jwtError: null,
  };
  class ObjectId {
    constructor(value) { this.value = value; }
    static isValid(value) { return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value); }
  }
  const sessions = await loadTypeScript(sessionPath, {
    'next/server': { NextRequest: class {}, NextResponse: class {} },
    jose: { jwtVerify: async () => { if (state.jwtError) throw state.jwtError; return { payload: state.payload }; }, SignJWT: class {} },
    '@/lib/checkout/turso-preview-runtime.mjs':{tursoPreviewSelected:()=>false,openTursoPreview:async()=>{throw Error('UNEXPECTED_SQL_OPEN')}},
    '@/lib/auth/turso-admin-session.mjs':{getTursoVerifiedAdminSession},
    '@/lib/auth/turso-admin-audit.mjs':{persistTursoAdminAudit},
    '@/lib/auth/admin-session-policy.mjs':policy,
    bcryptjs: { hash: async () => '', compare: async () => false },
    mongodb: { ObjectId },
    '@/lib/db-optimized': { connectToDatabase: async () => {
      if (state.dbError) throw state.dbError;
      return { db: { collection: () => ({ findOne: async () => { state.lookups++; return state.record; } }) } };
    } },
    '@/lib/logger': { logger: { error() {}, warn() {}, debug() {}, info() {} } },
  });
  const input = request({ headers: { authorization: 'Bearer fixture-admin-jwt' } });
  return { state, sessions, input };
}

test('administrator sessions support both active schemas and refresh email without elevating a prior token', async () => {
  const { state, sessions, input } = await sessionFixture();
  let session = await sessions.getAdminSession(input);
  assert.equal(session.email, 'current@example.invalid');
  assert.equal(session.role, 'admin');
  state.record = { active: true, role: 'super_admin', email: 'legacy@example.invalid',tokenVersion:1 };
  session = await sessions.getAdminSession(input);
  assert.equal(session.role, 'admin');
  assert.equal(session.email, 'legacy@example.invalid');
});

test('revoked, missing and downgraded administrator records invalidate an otherwise signed session', async () => {
  const { state, sessions, input } = await sessionFixture();
  for (const record of [null, { role: 'admin' }, { isActive: false, role: 'admin' },
    { active: false, isActive: true, role: 'admin' }, { active: true, isActive: false, role: 'admin' },
    { isActive: true, role: 'viewer' }, { active: true, role: 'staff' }]) {
    state.record = record;
    assert.equal(await sessions.getAdminSession(input), null, JSON.stringify(record));
  }
});

test('administrator verification fails closed with an explicit 503 on database failure', async () => {
  const { state, sessions, input } = await sessionFixture();
  state.dbError = new Error('TURSO_APP_CUTOVER_BLOCKED');
  await assert.rejects(sessions.getAdminSession(input), error =>
    error.statusCode === 503 && error.code === 'ADMIN_VERIFICATION_UNAVAILABLE');
  await assert.rejects(sessions.requireAdminSession(input), error => error.statusCode === 503);
});

test('invalid or non-admin JWTs are rejected without looking up administrator records', async () => {
  const { state, sessions, input } = await sessionFixture();
  state.payload = { ...state.payload, role: 'customer' };
  assert.equal(await sessions.getAdminSession(input), null);
  state.jwtError = new Error('Invalid signature');
  assert.equal(await sessions.getAdminSession(input), null);
  assert.equal(state.lookups, 0);
});

test('guest UI sends an access header without putting credentials in polling URLs, and manual-paid controls are removed', () => {
  const page = readFileSync('app/order/status/[id]/page.tsx', 'utf8');
  assert.match(page, /'x-order-access-token': accessToken\.current/);
  assert.match(page, /window\.sessionStorage\.getItem\(storageKey\)/);
  assert.match(page, /url\.searchParams\.delete\('token'\)/);
  assert.match(page, /credentials: 'same-origin'/);
  assert.match(page, /pendingRequest\.current\?\.abort\(\)/);
  assert.doesNotMatch(page, /fetch\([^\n]+\?token=/);
  const dashboard = readFileSync('components/market/MarketDayDashboard.tsx', 'utf8');
  assert.doesNotMatch(dashboard, /markOrderPaid|setShowMarkPaidDialog|paymentStatus: 'PAID'/);
  assert.match(dashboard, /Awaiting verified payment/);
  assert.match(dashboard, /updateOrderStatus\(order\.orderNumber, 'READY'\)/);
});
