import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { advertisingAdmin, serveAds, recordAdEvent, collectAdDeliveries } from '../../functions/lib/advertising.js';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
let app, db, env;
const now = Date.UTC(2026, 8, 20, 12);
const admin = (root, data) => advertisingAdmin({ firestore: db, now, request: { auth: { uid: 'synthetic-admin', token: { admin: true } }, data: { version: 1, root, ...data } } });
const serve = (root, platform = 'app', time = now) => serveAds({ firestore: db, now: time, data: { root, version: 1, platform, placement: 'home.sponsor' } });
const event = (root, deliveryId, type = 'impression', time = now) => recordAdEvent({ firestore: db, now: time, data: { root, version: 1, deliveryId, event: type } });
const value = { name: 'Synthetic', advertiserId: 'advertiser', status: 'active', startAt: now, endAt: now + 86400000,
  platforms: ['app'], placements: ['home.sponsor'], priority: 1, agreementReference: 'PRIVATE',
  creative: { kind: 'sponsorship', title: 'Synthetic sponsor', targetUrl: 'https://company.com/' } };
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Emulator required');
  app = initializeApp({ projectId: 'demo-hudhud-advertising' }); db = getFirestore(app);
  env = await initializeTestEnvironment({ projectId: 'demo-hudhud-advertising', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
});
after(async () => { await env?.cleanup(); if (app) await deleteApp(app); });
test('both roots deliver only eligible campaigns, isolate private contracts and deduplicate concurrent events', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    await admin(root, { action: 'saveAdvertiser', id: 'advertiser', value: { name: 'Synthetic organization', isActive: true } });
    await admin(root, { action: 'saveCampaign', id: 'campaign', value });
    assert.equal((await serve(root, 'web')).ad, null);
    assert.equal((await serve(root, 'app', now - 1)).ad, null);
    assert.equal((await serve(root, 'app', value.endAt)).ad, null);
    const { ad } = await serve(root);
    assert.ok(ad.deliveryId); assert.equal(ad.agreementReference, undefined); assert.equal(ad.advertiserId, undefined);
    await Promise.all(Array.from({ length: 8 }, () => event(root, ad.deliveryId)));
    await Promise.all(Array.from({ length: 4 }, () => event(root, ad.deliveryId, 'click')));
    const report = await admin(root, { action: 'report', campaignId: 'campaign', from: '2026-09-20', to: '2026-09-20' });
    assert.equal(report.rows.length, 1); assert.equal(report.rows[0].impressions, 1); assert.equal(report.rows[0].clicks, 1);
    const sibling = root === 'HudHudDev' ? 'HudHudOfficial' : 'HudHudDev';
    assert.equal((await event(sibling, ad.deliveryId)).accepted, false);
    assert.equal((await event(root, ad.deliveryId, 'impression', now + 60001)).accepted, false);
    await assert.rejects(admin(root, { action: 'saveCampaign', id: 'campaign', revision: 0, value }), { code: 'aborted' });
    const other = await serve(root);
    await admin(root, { action: 'saveCampaign', id: 'campaign', revision: 1, value: { ...value, status: 'paused' } });
    assert.equal((await serve(root)).ad, null); assert.equal((await event(root, other.ad.deliveryId)).accepted, false);
    await admin(root, { action: 'saveCampaign', id: 'campaign', revision: 2, value });
    await admin(root, { action: 'saveAdvertiser', id: 'advertiser', revision: 1, value: { name: 'Synthetic', isActive: false } });
    assert.equal((await serve(root)).ad, null);
    await assert.rejects(admin(root, { action: 'saveCampaign', id: 'campaign', revision: 3, value }), { code: 'failed-precondition' });
  }
});
test('direct documents and reports are private even for admin SDK clients using Rules', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) for (const context of [env.unauthenticatedContext(), env.authenticatedContext('listener'), env.authenticatedContext('admin', { admin: true })]) {
    for (const path of [`${root}/advertisers/advertisers/advertiser`, `${root}/adCampaigns/campaigns/campaign`, `${root}/adDeliveries/deliveries/receipt`, `${root}/adCampaigns/campaigns/campaign/daily/2026-09-20_app_home.sponsor`]) {
      const reference = doc(context.firestore(), path); await assertFails(getDoc(reference)); await assertFails(setDoc(reference, { isActive: true }));
    }
  }
});
test('cleanup deletes expired receipts without deleting campaign reports', async () => {
  await collectAdDeliveries(db, now + 86400001);
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    assert.equal((await db.collection(`${root}/adDeliveries/deliveries`).get()).size, 0);
    assert.equal((await admin(root, { action: 'report', campaignId: 'campaign', from: '2026-09-20', to: '2026-09-20' })).rows.length, 1);
  }
});
