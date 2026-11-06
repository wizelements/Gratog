import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  ensureTursoAdminSchema, adminByEmail, authenticateTursoAdmin,
  issueTursoAdminReset, consumeTursoAdminReset,
  changeTursoAdminPassword, verifyAdminInTurso, isOwnerEmail,
  getTursoAdminClient, SHARED_ADMIN_EMAIL, resolveAdminRecoveryInbox
} from '../lib/auth/turso-admin-store.mjs';

function createTestDb() {
  return createClient({ url: 'file::memory:' });
}

test('Turso admin onboarding and recovery are owner-only, single-use and revoking', async () => {
  const db = createTestDb();
  try {
    await ensureTursoAdminSchema(db);
    await ensureTursoAdminSchema(db);
    const owner = await adminByEmail(db, 'silverwatkins@gmail.com');
    const partner = await adminByEmail(db, 'jenneisha.glover@gmail.com');
    const shared = await adminByEmail(db, SHARED_ADMIN_EMAIL);
    assert.ok(owner?.id);
    assert.ok(partner?.id);
    assert.ok(shared?.id);
    assert.notEqual(owner.id, partner.id);
    assert.notEqual(shared.id, owner.id);
    assert.notEqual(shared.id, partner.id);
    assert.equal(owner.password_hash, null);
    assert.equal(await authenticateTursoAdmin(db, 'silverwatkins@gmail.com', 'wrong'), null);
    assert.equal(await adminByEmail(db, 'unknown@x.com'), null);
    assert.equal(isOwnerEmail('SilverWatkins@GMAIL.com'), true);
    assert.equal(isOwnerEmail('outsider@gmail.com'), false);
    assert.equal(resolveAdminRecoveryInbox('Silver Watkins'), 'silverwatkins@gmail.com');
    assert.equal(resolveAdminRecoveryInbox(' SILVERWATKINS@gmail.com '), 'silverwatkins@gmail.com');
    assert.equal(resolveAdminRecoveryInbox('genisha.glover@gmail.com'), 'jenneisha.glover@gmail.com');
    assert.equal(resolveAdminRecoveryInbox('jenneisha.glover@gmail.com'), 'jenneisha.glover@gmail.com');
    assert.equal(resolveAdminRecoveryInbox(SHARED_ADMIN_EMAIL), 'silverwatkins@gmail.com');
    assert.equal(resolveAdminRecoveryInbox('not an owner'), null);

    let emailedToken;
    let recipient;
    let calls = 0;
    const send = async ({ email, token }) => {
      calls++;
      recipient = email;
      emailedToken = token;
      return 'message-id-' + calls;
    };
    assert.equal((await issueTursoAdminReset(db, 'outsider@gmail.com', send)).requested, false);
    assert.equal(calls, 0);
    assert.equal((await issueTursoAdminReset(db, 'Silver Watkins', send)).requested, true);
    assert.equal(recipient, 'silverwatkins@gmail.com');
    assert.match(emailedToken, /^[a-f0-9]{64}$/);
    assert.equal((await issueTursoAdminReset(db, 'genisha.glover@gmail.com', send)).throttled, true);
    assert.equal(calls, 1);

    // Cannot use another token or a short password, even with an active account.
    assert.equal(await consumeTursoAdminReset(db, randomBytes(32).toString('hex'), 'VeryStrongPassword1!'), false);
    assert.equal(await consumeTursoAdminReset(db, emailedToken, 'short'), false);
    assert.equal(await consumeTursoAdminReset(db, emailedToken, 'VeryStrongPassword1!'), true);
    assert.equal(await consumeTursoAdminReset(db, emailedToken, 'VeryStrongPassword2!'), false);
    const loggedIn = await authenticateTursoAdmin(db, SHARED_ADMIN_EMAIL, 'VeryStrongPassword1!');
    assert.ok(loggedIn?.id);
    assert.equal(Number(loggedIn.session_version), 2);
    assert.equal(await verifyAdminInTurso(db, { id: loggedIn.id, email: loggedIn.email, role: loggedIn.role, sessionVersion: 1 }), null);
    assert.ok(await verifyAdminInTurso(db, { id: loggedIn.id, email: loggedIn.email, role: loggedIn.role, sessionVersion: 2 }));
    assert.equal(await verifyAdminInTurso(db, { id: loggedIn.id, email: partner.email, role: loggedIn.role, sessionVersion: 2 }), null);
    assert.equal(await changeTursoAdminPassword(db, loggedIn, 'incorrect', 'AnotherStrongPassword1!'), false);
    assert.equal(await changeTursoAdminPassword(db, loggedIn, 'VeryStrongPassword1!', 'AnotherStrongPassword1!'), true);
    assert.equal(await authenticateTursoAdmin(db, 'silverwatkins@gmail.com', 'VeryStrongPassword1!'), null);
    assert.ok(await authenticateTursoAdmin(db, SHARED_ADMIN_EMAIL, 'AnotherStrongPassword1!'));
    assert.equal(await authenticateTursoAdmin(db, 'silverwatkins@gmail.com', 'AnotherStrongPassword1!'), null);
    assert.equal((await adminByEmail(db, 'silverwatkins@gmail.com')).password_hash, null);
    assert.equal((await adminByEmail(db, 'jenneisha.glover@gmail.com')).password_hash, null);
  } finally { db.close(); }
});

test('Approved alternative recovery inbox updates only the shared admin', async () => {
  const db = createTestDb();
  try {
    await ensureTursoAdminSchema(db);
    let token;
    let inbox;
    const result = await issueTursoAdminReset(db, 'genisha.glover@gmail.com', async ({ email, token: linkToken }) => {
      inbox = email;
      token = linkToken;
      return 'owner-recovery-delivery';
    });
    assert.equal(result.requested, true);
    assert.equal(inbox, 'jenneisha.glover@gmail.com');
    assert.equal(await consumeTursoAdminReset(db, token, 'NewSharedAdminPassword1!'), true);
    assert.ok(await authenticateTursoAdmin(db, SHARED_ADMIN_EMAIL, 'NewSharedAdminPassword1!'));
    assert.equal(await authenticateTursoAdmin(db, 'jenneisha.glover@gmail.com', 'NewSharedAdminPassword1!'), null);
    assert.equal(await consumeTursoAdminReset(db, token, 'DifferentPassword1!'), false);
  } finally { db.close(); }
});

test('Failed email delivery never creates a consumable token', async () => {
  const db = createTestDb();
  try {
    await ensureTursoAdminSchema(db);
    let raw;
    await assert.rejects(
      issueTursoAdminReset(db, 'jenneisha.glover@gmail.com', async ({ token }) => {
        raw = token; throw Error('Resend refused');
      }), /Resend refused/
    );
    const r = await db.execute('SELECT count(*) AS n FROM tog_admin_resets');
    assert.equal(Number(r.rows[0].n), 0);
    assert.equal(await consumeTursoAdminReset(db, raw, 'StrongValidPassword1!'), false);
  } finally { db.close(); }
});

test('Expired accepted tokens are rejected', async () => {
  const db = createTestDb();
  try {
    await ensureTursoAdminSchema(db);
    let raw;
    await issueTursoAdminReset(db, 'jenneisha.glover@gmail.com', async ({ token }) => {
      raw = token; return 'provider-id';
    });
    await db.execute('UPDATE tog_admin_resets SET expires_at=0');
    assert.equal(await consumeTursoAdminReset(db, raw, 'StrongValidPassword1!'), false);
  } finally { db.close(); }
});

test('Turso rejects a staging database URL in production', () => {
  assert.throws(() => getTursoAdminClient({
    TURSO_DATABASE_URL: 'libsql://gratog-migration-cert-staging.example.turso.io',
    TURSO_AUTH_TOKEN: 'never-used',
    VERCEL_ENV: 'production'
  }), /PRODUCTION_CANNOT_USE_STAGING/);
});

test('Admin login and reset routes do not depend on MongoDB', () => {
  const names = [
    'app/api/admin/auth/login/route.ts',
    'app/api/admin/auth/reset-password/route.ts',
    'app/api/admin/auth/change-password/route.ts',
    'app/api/admin/auth/me/route.ts',
    'app/api/admin/auth/logout/route.ts',
    'app/api/admin/auth/csrf/route.ts',
    'lib/auth/turso-admin-store.mjs',
    'lib/auth/turso-admin-mailer.mjs',
  ];
  for (const file of names) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /connectToDatabase|MONGODB_URI|mongo(d(b)?)?\b/i, file);
  }
});
