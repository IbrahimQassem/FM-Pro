import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAdminUserCount } from '../lib/admin-user-count.js';

function fixture(role = 'station_admin', root = 'HudHudDev') {
  const calls = [];
  const claims = { admin: true, role };
  const user = { emailVerified: true, disabled: false, customClaims: { ...claims } };
  const request = { auth: { uid: 'synthetic-admin', token: claims }, data: { root } };
  const auth = { getUser: async uid => { assert.equal(uid, request.auth.uid); return user; } };
  const firestore = { collection: path => {
    calls.push(path);
    return { count: () => ({ get: async () => ({ data: () => ({ count: 2001 }) }) }) };
  } };
  return { request, user, auth, firestore, calls, now: () => new Date('2026-10-26T12:00:00Z') };
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const role of ['super_admin', 'station_admin', 'moderator']) test(`${root}/${role}: aggregate only, no profile download`, async () => {
    const f = fixture(role, root);
    assert.deepEqual(await getAdminUserCount(f), { root, total: 2001, asOf: '2026-10-26T12:00:00.000Z' });
    assert.deepEqual(f.calls, [`${root}/users/users`]);
  });
}
for (const [name, mutate, code] of [
  ['guest', f => { f.request.auth = null; }, 'unauthenticated'],
  ['listener', f => { f.request.auth.token.role = 'listener'; }, 'permission-denied'],
  ['missing admin claim', f => { f.request.auth.token.admin = false; }, 'permission-denied'],
  ['unknown role', f => { f.request.auth.token.role = 'owner'; }, 'permission-denied'],
  ['unverified current Auth', f => { f.user.emailVerified = false; }, 'permission-denied'],
  ['disabled current Auth', f => { f.user.disabled = true; }, 'permission-denied'],
  ['revoked current admin', f => { f.user.customClaims.admin = false; }, 'permission-denied'],
  ['changed current role', f => { f.user.customClaims.role = 'listener'; }, 'permission-denied'],
  ['body forged role', f => { f.request.data.role = 'super_admin'; }, 'invalid-argument'],
  ['body forged uid', f => { f.request.data.uid = 'other'; }, 'invalid-argument'],
  ['unknown root', f => { f.request.data.root = 'production'; }, 'invalid-argument'],
  ['missing root', f => { f.request.data = {}; }, 'invalid-argument'],
  ['array body', f => { f.request.data = []; }, 'invalid-argument'],
]) test(`deny ${name} before counting`, async () => {
  const f = fixture(); mutate(f);
  await assert.rejects(getAdminUserCount(f), { code });
  assert.deepEqual(f.calls, []);
});
test('legacy admin=true super-admin convention remains supported when both current and token claims agree', async () => {
  const f = fixture(); delete f.request.auth.token.role; delete f.user.customClaims.role;
  assert.equal((await getAdminUserCount(f)).total, 2001);
});
test('Auth lookup failure returns no user metadata and does not count', async () => {
  const f = fixture(); f.auth.getUser = async () => { throw new Error('Synthetic confidential lookup detail'); };
  await assert.rejects(getAdminUserCount(f), error => error.code === 'unavailable' && !error.message.includes('confidential'));
  assert.deepEqual(f.calls, []);
});
