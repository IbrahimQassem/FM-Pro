import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advertisingRequest, validateCampaign, safeAdUrl, eligible, advertisingAdmin } from '../lib/advertising.js';

const campaign = { name: 'Synthetic campaign', advertiserId: 'a', status: 'active', startAt: 100, endAt: 200,
  platforms: ['app', 'web'], placements: ['home.sponsor'], priority: 1,
  creative: { kind: 'image', title: 'Synthetic sponsor', imageUrl: 'https://cdn.company.com/ad.png', targetUrl: 'https://company.com/' } };
test('campaign schema validates dates, implemented capabilities and private agreement fields', () => {
  assert.equal(validateCampaign(campaign).schemaVersion, 1);
  for (const change of [{ endAt: 100 }, { startAt: NaN }, { platforms: ['tv'] }, { placements: ['player.overlay'] },
    { platforms: ['app', 'app'] }, { priority: -1 }, { status: 'deleted' }, { advertiserId: '../a' }, { creative: { ...campaign.creative, kind: 'video' } }]) {
    assert.throws(() => validateCampaign({ ...campaign, ...change }));
  }
  assert.equal(validateCampaign({ ...campaign, creative: { kind: 'sponsorship', title: 'Supported sponsor' } }).creative.imageUrl, '');
});
test('URL actions reject credentials, scripts, cleartext, local networks and custom ports', () => {
  for (const url of ['javascript:alert(1)', 'http://company.com', 'https://user:pass@company.com', 'https://127.0.0.1', 'https://[::1]', 'https://localhost', 'https://thing.local', 'https://company.com:8443']) assert.throws(() => safeAdUrl(url));
  assert.equal(safeAdUrl('https://company.com/path?q=x'), 'https://company.com/path?q=x');
});
test('server clock window is start inclusive and end exclusive with platform and advertiser gating', () => {
  const valid = validateCampaign(campaign);
  assert.equal(eligible(valid, { isActive: true }, 'app', 'home.sponsor', 100), true);
  for (const now of [99, 200, 201]) assert.equal(eligible(valid, { isActive: true }, 'app', 'home.sponsor', now), false);
  assert.equal(eligible(valid, { isActive: false }, 'app', 'home.sponsor', 150), false);
  assert.equal(eligible({ ...valid, status: 'paused' }, { isActive: true }, 'app', 'home.sponsor', 150), false);
  assert.equal(eligible({ ...valid, platforms: ['web'] }, { isActive: true }, 'app', 'home.sponsor', 150), false);
});
test('version/root and admin authorization fail before database access', async () => {
  for (const data of [{ root: 'HudHudDev', version: 2 }, { root: 'unknown', version: 1 }]) assert.throws(() => advertisingRequest(data));
  for (const auth of [undefined, { uid: 'listener', token: {} }, { uid: 'listener', token: { admin: 'true' } },
    { uid: 'station-admin', token: { admin: true, role: 'station_admin' } }, { uid: 'moderator', token: { admin: true, role: 'moderator' } }]) {
    await assert.rejects(advertisingAdmin({ firestore: null, request: { auth, data: { version: 1, root: 'HudHudDev' } } }), { code: auth ? 'permission-denied' : 'unauthenticated' });
  }
});
