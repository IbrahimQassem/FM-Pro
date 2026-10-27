import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { getAuth } from 'firebase/auth';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocsFromServer } from 'firebase/firestore';
import { loadUserCount } from '../lib/user-count.ts';
import { callableEmulator } from './support/callable-emulator.ts';

void test('R07 existing users aggregate route provides counts to verified active scoped administrators',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async (t) => {
    assert.ok(process.env.GCLOUD_PROJECT?.startsWith('demo-'), 'Synthetic demo project required');
    const require = createRequire(new URL('../../functions/package.json', import.meta.url));
    const { initializeApp, deleteApp } = require('firebase-admin/app');
    const { getAuth: getAdminAuth } = require('firebase-admin/auth');
    const authApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT }, `r07-auth-${crypto.randomUUID()}`);
    try {
      for (const role of ['station_admin', 'moderator'] as const) {
        const harness = await callableEmulator({ admin: true, role, assignedStations: ['synthetic-r07'] });
        const user = getAuth(harness.app).currentUser!;
        try {
          await getAdminAuth(authApp).updateUser(user.uid, { emailVerified: true, disabled: false });
          await user.reload();
          await user.getIdToken(true);
          assert.equal(user.emailVerified, true, 'Verified Auth setup must succeed before business assertion');
          for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
            await t.test(`${root}/${role}: promised total succeeds without profile list access`, async () => {
              const fixtureId = `r07-count-${crypto.randomUUID()}`;
              const reference = harness.adminDb.doc(`${root}/users/users/${fixtureId}`);
              await reference.set({ displayName: 'Synthetic aggregate fixture', isActive: true, role: 'listener' });
              try {
                await assert.rejects(getDocsFromServer(collection(harness.db, `${root}/users/users`)),
                  { code: 'permission-denied' }, 'Scoped administrator still cannot list listener profiles');
                let result: Awaited<ReturnType<typeof loadUserCount>> | undefined;
                let permissionDenied = false;
                try {
                  result = await loadUserCount(harness.db, root);
                } catch (error) {
                  if ((error as { code?: string }).code !== 'permission-denied') throw error;
                  permissionDenied = true;
                }
                assert.equal(permissionDenied, false,
                  'R07 business failure: existing routed count adapter receives permission-denied; expected authorized aggregate success');
                assert.ok(result, 'Count adapter must return a successful aggregate');
                assert.equal(Number.isSafeInteger(result.total), true);
                assert.ok(result.total >= 1, 'Root aggregate includes the seeded synthetic account');
                assert.ok(Number.isFinite(Date.parse(result.asOf)), 'Response exposes a count timestamp');
              } finally {
                await reference.delete();
              }
            });
          }
        } finally {
          await harness.close();
        }
      }
    } finally {
      await deleteApp(authApp);
    }
  });

void test('R07 real callable rejects guest, listener, forged request roles and revoked current authority',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async (t) => {
    assert.ok(process.env.GCLOUD_PROJECT?.startsWith('demo-'), 'Synthetic demo project required');
    const require = createRequire(new URL('../../functions/package.json', import.meta.url));
    const { initializeApp, deleteApp } = require('firebase-admin/app');
    const { getAuth: getAdminAuth } = require('firebase-admin/auth');
    const authApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT }, `r07-security-${crypto.randomUUID()}`);
    const admin = await callableEmulator({ admin: true, role: 'station_admin' });
    const listener = await callableEmulator({ role: 'listener' });
    const guest = initializeClientApp({ projectId: process.env.GCLOUD_PROJECT, apiKey: 'demo-key' }, `r07-guest-${crypto.randomUUID()}`);
    connectFunctionsEmulator(getFunctions(guest), '127.0.0.1', 5001);
    const current = getAuth(admin.app).currentUser!;
    const invoke = httpsCallable(getFunctions(admin.app), 'adminGetUserCount');
    const listenerInvoke = httpsCallable(getFunctions(listener.app), 'adminGetUserCount');
    const guestInvoke = httpsCallable(getFunctions(guest), 'adminGetUserCount');
    try {
      await getAdminAuth(authApp).updateUser(current.uid, { emailVerified: true, disabled: false });
      await current.reload(); await current.getIdToken(true);
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        await t.test(`${root}: guest receives unauthenticated`, async () => {
          await assert.rejects(guestInvoke({ root }), { code: 'functions/unauthenticated' });
        });
        await t.test(`${root}: owner profile role cannot grant aggregate access`, async () => {
          const uid = getAuth(listener.app).currentUser!.uid;
          const own = listener.adminDb.doc(`${root}/users/users/${uid}`);
          await own.set({ role: 'super_admin', isActive: true });
          try { await assert.rejects(listenerInvoke({ root }), { code: 'functions/permission-denied' }); }
          finally { await own.delete(); }
        });
        await t.test(`${root}: extra request role and uid are invalid`, async () => {
          await assert.rejects(invoke({ root, role: 'super_admin' }), { code: 'functions/invalid-argument' });
          await assert.rejects(invoke({ root, uid: 'synthetic-other' }), { code: 'functions/invalid-argument' });
        });
      }
      await t.test('unknown root rejected', async () => {
        await assert.rejects(invoke({ root: 'other' }), { code: 'functions/invalid-argument' });
      });
      await t.test('current unverified Auth rejected despite cached token', async () => {
        await getAdminAuth(authApp).updateUser(current.uid, { emailVerified: false });
        await assert.rejects(invoke({ root: 'HudHudDev' }), { code: 'functions/permission-denied' });
        await getAdminAuth(authApp).updateUser(current.uid, { emailVerified: true });
      });
      await t.test('current disabled Auth rejected despite cached token', async () => {
        await getAdminAuth(authApp).updateUser(current.uid, { disabled: true });
        await assert.rejects(invoke({ root: 'HudHudDev' }), { code: 'functions/permission-denied' });
        await getAdminAuth(authApp).updateUser(current.uid, { disabled: false });
      });
      await t.test('revoked current admin claim rejected despite cached privileged token', async () => {
        await getAdminAuth(authApp).setCustomUserClaims(current.uid, { admin: false, role: 'listener' });
        await assert.rejects(invoke({ root: 'HudHudDev' }), { code: 'functions/permission-denied' });
      });
    } finally {
      await deleteClientApp(guest); await listener.close(); await admin.close(); await deleteApp(authApp);
    }
  });
