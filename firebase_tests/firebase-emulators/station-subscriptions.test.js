import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';
import { setSubscription, registerDevice, unregisterDevice, deviceId, removeAccountDevices } from '../../functions/lib/station-subscriptions.js';
import { enqueueEpisodeAlert, processEpisodeAlert } from '../../functions/lib/episode-alerts.js';
import { notifyUpcomingProgramsForRoot, collectNotificationOperations } from '../../functions/lib/program-notifications.js';
import { broadcastNotification } from '../../functions/lib/user-management.js';
import { claimDelivery, startDelivery } from '../../functions/lib/notification-delivery.js';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
let app, db, env;
const root = 'HudHudDev';
const auth = { getUser: async uid => ({uid,emailVerified:true,disabled:false}) };
const token = 'synthetic-registration-token-for-tests';
const data = {root,stationId:'s',isActive:true,notificationsEnabled:true};
const userPath = uid => `${root}/users/users/${uid}`;
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Emulator required');
  app = initializeApp({projectId:'demo-hudhud-subscriptions'}); db = getFirestore(app);
  env = await initializeTestEnvironment({projectId:'demo-hudhud-subscriptions', firestore:{rules:await readFile('firestore.rules','utf8')}});
});
after(async () => { await env.cleanup(); await deleteApp(app); });
async function seed(root, uid='a') {
  await db.doc(`${root}/users/users/${uid}`).set({isActive:true,role:'listener'});
  await db.doc(`${root}/stations/stations/s`).set({isActive:true,name:'Synthetic station'});
  await db.doc(`${root}/programs/programs/p`).set({isActive:true,stationId:'s'});
}
test('both roots normalize legacy duplicates, preserve timestamps and reject disabled profiles', async () => {
  for (const r of ['HudHudDev','HudHudOfficial']) {
    await seed(r);
    const base = `${r}/users/users/a/subscriptions`;
    await db.doc(`${base}/legacy`).set({targetType:'station',targetId:'s',isActive:true,notificationsEnabled:false,createdAt:Timestamp.fromMillis(100),updatedAt:Timestamp.fromMillis(100)});
    await Promise.all([setSubscription({firestore:db,uid:'a',data:{...data,root:r}}),setSubscription({firestore:db,uid:'a',data:{...data,root:r}})]);
    const records = await db.collection(base).get(); assert.equal(records.size,1); assert.equal(records.docs[0].id,'station_s'); assert.equal(records.docs[0].get('createdAt').toMillis(),100);
    await db.doc(`${r}/users/users/a`).update({isActive:false});
    await assert.rejects(setSubscription({firestore:db,uid:'a',data:{...data,root:r}}));
    await db.doc(`${r}/users/users/a`).update({isActive:true});
  }
});
test('device ownership transfers, unregister is owner-only and deletion cleans registrations', async () => {
  await seed(root,'a'); await seed(root,'b');
  await registerDevice({firestore:db,uid:'a',data:{root,token}});
  await registerDevice({firestore:db,uid:'b',data:{root,token}});
  assert.equal((await db.doc(`${userPath('a')}/alertDevices/${deviceId(token)}`).get()).exists,false);
  await unregisterDevice({firestore:db,uid:'a',data:{token}});
  assert.equal((await db.doc(`${userPath('b')}/alertDevices/${deviceId(token)}`).get()).exists,true);
  await removeAccountDevices(db,'b',root);
  assert.equal((await db.doc(`notificationDeviceOwners/${deviceId(token)}`).get()).exists,false);
});
test('publication retries send once, edits/republication do not enqueue again, opt-out is respected', async () => {
  await seed(root,'a'); await setSubscription({firestore:db,uid:'a',data});
  await registerDevice({firestore:db,uid:'a',data:{root,token}});
  const now=Date.now(); const published={isPublished:true,stationId:'s',programId:'p',title:'Synthetic episode'};
  await db.doc(`${root}/episodes/episodes/e`).set(published);
  await Promise.all([1,2].map(() => enqueueEpisodeAlert({firestore:db,root,episodeId:'e',after:published,now})));
  const ref=db.doc(`${root}/episodeAlerts/jobs/e`); let calls=0;
  const send=async message => {calls++; assert.equal(message.tokens.length,1); assert.equal(message.data.episodeId,'e'); assert.equal('url' in message.data,false); return {responses:[{success:true}]};};
  await processEpisodeAlert({firestore:db,auth,send,reference:ref,now});
  await processEpisodeAlert({firestore:db,auth,send,reference:ref,now}); assert.equal(calls,1);
  await enqueueEpisodeAlert({firestore:db,root,episodeId:'e',before:{isPublished:false},after:published,now});
  assert.equal((await ref.get()).get('status'),'done');
  await db.doc(`${root}/episodes/episodes/e2`).set(published);
  await enqueueEpisodeAlert({firestore:db,root,episodeId:'e2',after:published,now});
  await setSubscription({firestore:db,uid:'a',data:{...data,isActive:false,notificationsEnabled:false}});
  await processEpisodeAlert({firestore:db,auth,send,reference:db.doc(`${root}/episodeAlerts/jobs/e2`),now}); assert.equal(calls,1);
});
test('transient send failures retry and invalid tokens are removed', async () => {
  await setSubscription({firestore:db,uid:'a',data}); await registerDevice({firestore:db,uid:'a',data:{root,token}});
  const now=Date.now(); const published={isPublished:true,stationId:'s',programId:'p',title:'Retry episode'};
  await db.doc(`${root}/episodes/episodes/retry`).set(published); await enqueueEpisodeAlert({firestore:db,root,episodeId:'retry',after:published,now});
  const reference=db.doc(`${root}/episodeAlerts/jobs/retry`);
  await processEpisodeAlert({firestore:db,auth,send:async () => ({responses:[{success:false,error:{code:'messaging/internal-error'}}]}),reference,now});
  assert.equal((await reference.get()).get('status'),'pending');
  await processEpisodeAlert({firestore:db,auth,send:async () => ({responses:[{success:false,error:{code:'messaging/registration-token-not-registered'}}]}),reference,now:now+3600000});
  assert.equal((await db.doc(`${userPath('a')}/alertDevices/${deviceId(token)}`).get()).exists,false);
});
test('device and delivery collections are private even to admin clients', async () => {
  for (const context of [env.unauthenticatedContext(),env.authenticatedContext('a',{email_verified:true}),env.authenticatedContext('admin',{admin:true})]) {
    for (const path of [`${userPath('a')}/alertDevices/device`, 'notificationDeviceOwners/device', `${root}/episodeAlerts/jobs/e`, `${root}/episodeAlertPublications/markers/e`, `${root}/notificationOperations/operations/program`, `${root}/episodeAlerts/jobs/e/deliveries/device`]) {
      await assertFails(getDoc(doc(context.firestore(),path))); await assertFails(setDoc(doc(context.firestore(),path),{token:'forged'}));
    }
  }
});

test('audience pagination resumes beyond the first 25 records without duplicate sends', async () => {
  const now=Date.now();
  for (let index=0;index<26;index++) {
    const uid=`paged-${String(index).padStart(2,'0')}`;
    await seed(root,uid);
    await setSubscription({firestore:db,uid,data});
    await registerDevice({firestore:db,uid,data:{root,token:`synthetic-paged-device-token-${index}`},now});
  }
  const after={isPublished:true,stationId:'s',programId:'p',title:'Paged episode'};
  await db.doc(`${root}/episodes/episodes/paged`).set(after);
  await enqueueEpisodeAlert({firestore:db,root,episodeId:'paged',after,now});
  const reference=db.doc(`${root}/episodeAlerts/jobs/paged`); const sent=[];
  const send=async message => { sent.push(...message.tokens); return {responses:message.tokens.map(() => ({success:true}))}; };
  for (let page=0;page<4;page++) await processEpisodeAlert({firestore:db,auth,send,reference,now});
  assert.equal(sent.length,26); assert.equal(new Set(sent).size,26); assert.equal((await reference.get()).get('status'),'done');
});

test('canonical and latest legacy opt-outs override older active duplicate records', async () => {
  const root='HudHudOfficial'; const now=Date.now();
  for (const uid of ['canonical-off','legacy-off']) {
    await seed(root,uid); await registerDevice({firestore:db,uid,data:{root,token:`synthetic-optout-device-token-${uid}`},now});
    const collection=db.collection(`${root}/users/users/${uid}/subscriptions`);
    await collection.doc('old-active').set({targetType:'station',targetId:'s',isActive:true,notificationsEnabled:true,createdAt:Timestamp.fromMillis(100),updatedAt:Timestamp.fromMillis(100)});
    await collection.doc(uid==='canonical-off'?'station_s':'new-inactive').set({targetType:'station',targetId:'s',isActive:false,notificationsEnabled:false,createdAt:Timestamp.fromMillis(100),updatedAt:Timestamp.fromMillis(200)});
  }
  const after={isPublished:true,stationId:'s',programId:'p',title:'Optout episode'};
  await db.doc(`${root}/episodes/episodes/optout`).set(after); await enqueueEpisodeAlert({firestore:db,root,episodeId:'optout',after,now});
  const reference=db.doc(`${root}/episodeAlerts/jobs/optout`); let calls=0;
  const send=async message => { calls++; return {responses:message.tokens.map(()=>({success:true}))}; };
  for(let page=0;page<4;page++) await processEpisodeAlert({firestore:db,auth,send,reference,now});
  assert.equal(calls,0); assert.equal((await reference.get()).get('status'),'done');
});

test('PKG-08: profile self-healing and support for listener, station_admin and super_admin', async () => {
  const root = 'HudHudDev';
  await db.doc(`${root}/stations/stations/s`).set({ isActive: true, name: 'Active Station' });

  // 1. Missing profile auto-creation (self-healing)
  const newUid = 'self-healing-listener';
  const authUser = { uid: newUid, email: 'healed@hudhud.fm', displayName: 'Healed User' };
  // Verify doc does not exist
  assert.equal((await db.doc(`${root}/users/users/${newUid}`).get()).exists, false);

  // Subscribe should auto-create profile
  await setSubscription({
    firestore: db,
    uid: newUid,
    authUser,
    data: { root, stationId: 's', isActive: true, notificationsEnabled: true },
  });

  const healedProfile = await db.doc(`${root}/users/users/${newUid}`).get();
  assert.equal(healedProfile.exists, true);
  assert.equal(healedProfile.get('role'), 'listener');
  assert.equal(healedProfile.get('isActive'), true);
  assert.equal(healedProfile.get('email'), 'healed@hudhud.fm');

  const subDoc = await db.doc(`${root}/users/users/${newUid}/subscriptions/station_s`).get();
  assert.equal(subDoc.exists, true);
  assert.equal(subDoc.get('isActive'), true);

  // 2. Roles station_admin and super_admin can subscribe
  for (const role of ['station_admin', 'super_admin']) {
    const adminUid = `admin-${role}`;
    await db.doc(`${root}/users/users/${adminUid}`).set({
      isActive: true,
      role,
      displayName: `Admin ${role}`,
      email: `${role}@hudhud.fm`,
    });
    await setSubscription({
      firestore: db,
      uid: adminUid,
      data: { root, stationId: 's', isActive: true, notificationsEnabled: false },
    });
    const adminSub = await db.doc(`${root}/users/users/${adminUid}/subscriptions/station_s`).get();
    assert.equal(adminSub.exists, true);
    assert.equal(adminSub.get('isActive'), true);
  }

  // 3. Inactive station rejection
  await db.doc(`${root}/stations/stations/inactive-station`).set({ isActive: false, name: 'Inactive' });
  await assert.rejects(
    setSubscription({
      firestore: db,
      uid: newUid,
      data: { root, stationId: 'inactive-station', isActive: true, notificationsEnabled: false },
    }),
    { code: 'not-found' }
  );
});

for (const r of ['HudHudDev', 'HudHudOfficial']) {
  async function deliveryFixture(label) {
    const id = `delivery-${label}-${r}`;
    const now = Date.now();
    await db.doc(`${r}/users/users/${id}`).set({ isActive: true, role: 'listener' });
    await db.doc(`${r}/stations/stations/${id}`).set({ isActive: true, name: 'Synthetic delivery station' });
    await db.doc(`${r}/programs/programs/${id}`).set({ isActive: true, stationId: id });
    await setSubscription({ firestore: db, uid: id, data: { root: r, stationId: id, isActive: true, notificationsEnabled: true } });
    const token = `synthetic-delivery-device-${id}`;
    await registerDevice({ firestore: db, uid: id, data: { root: r, token }, now });
    const after = { isPublished: true, stationId: id, programId: id, title: 'Synthetic episode' };
    await db.doc(`${r}/episodes/episodes/${id}`).set(after);
    await enqueueEpisodeAlert({ firestore: db, root: r, episodeId: id, after, now });
    return { now, reference: db.doc(`${r}/episodeAlerts/jobs/${id}`), receipt: db.doc(`${r}/episodeAlerts/jobs/${id}/deliveries/${deviceId(token)}`) };
  }
  test(`${r}: lost episode acknowledgement stays unknown across retries`, async () => {
    const fixture = await deliveryFixture('lost-ack'); let sends = 0;
    const args = { firestore: db, auth, ...fixture, send: async () => { sends++; throw new Error('Synthetic lost acknowledgement'); } };
    await processEpisodeAlert(args);
    await processEpisodeAlert({ ...args, now: fixture.now + 3600000 });
    assert.equal(sends, 1);
    assert.equal((await fixture.receipt.get()).get('status'), 'unknown');
  });
  test(`${r}: an expired job lease cannot start a second in-flight device send`, async () => {
    const fixture = await deliveryFixture('inflight'); let sends = 0;
    let began, release;
    const entered = new Promise(resolve => { began = resolve; });
    const blocked = new Promise(resolve => { release = resolve; });
    const first = processEpisodeAlert({ firestore: db, auth, ...fixture, send: async () => {
      sends++; began(); await blocked; return { responses: [{ success: true }] };
    } });
    await entered;
    try {
      await processEpisodeAlert({ firestore: db, auth, ...fixture, now: fixture.now + 11 * 60000, send: async () => {
        sends++; return { responses: [{ success: true }] };
      } });
    } finally { release(); await first; }
    assert.equal(sends, 1);
    assert.equal((await fixture.receipt.get()).get('status'), 'unknown');
  });
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: program claims serialize, known failures retry and lost acknowledgement never resends`, async () => {
    const now = new Date('2026-10-19T06:55:00Z');
    const base = { isActive: true, title: 'Synthetic scheduled program', stationId: 's', schedule: { weekdays: [1], startMinute: 600 } };
    const create = id => db.doc(`${root}/programs/programs/${id}`).set(base);
    await create('delivery-program-concurrent'); let sends = 0; const messages = [];
    const args = { firestore: db, root, now, messaging: { send: async message => { sends++; messages.push(message); return 'ack'; } } };
    await Promise.all([notifyUpcomingProgramsForRoot(args), notifyUpcomingProgramsForRoot(args)]);
    assert.equal(sends, 1);
    assert.equal(messages[0].topic, root === 'HudHudDev' ? 'hudhuddev_program_delivery-program-concurrent' : 'program_delivery-program-concurrent');
    await create('delivery-program-unknown'); let uncertainSends = 0;
    const uncertain = { ...args, messaging: { send: async () => { uncertainSends++; throw new Error('Synthetic lost acknowledgement'); } } };
    await notifyUpcomingProgramsForRoot(uncertain); await notifyUpcomingProgramsForRoot(uncertain);
    assert.equal(uncertainSends, 1);
    await create('delivery-program-retry'); let retrySends = 0;
    const retry = { ...args, messaging: { send: async () => { retrySends++; if (retrySends === 1) throw Object.assign(new Error('Synthetic provider rejection'), { code: 'messaging/server-unavailable' }); return 'ack'; } } };
    await notifyUpcomingProgramsForRoot(retry);
    await notifyUpcomingProgramsForRoot({ ...retry, now: new Date(now.getTime() + 121000) });
    assert.equal(retrySends, 2);
    const operations = await db.collection(`${root}/notificationOperations/operations`).get();
    assert.equal(operations.docs.filter(item => item.get('status') === 'sent').length, 2);
    assert.equal(operations.docs.filter(item => item.get('status') === 'unknown').length, 1);
    await collectNotificationOperations({ firestore: db, root, now: now.getTime() + 31 * 86400000 });
    assert.equal((await db.collection(`${root}/notificationOperations/operations`).get()).empty, true);
  });
  test(`${root}: native delivery transaction admits one lease and fences an expired sending attempt`, async () => {
    const reference = db.doc(`${root}/notificationOperations/operations/native-lease`);
    const claims = await Promise.all([claimDelivery({ firestore: db, reference, now: 1000 }), claimDelivery({ firestore: db, reference, now: 1000 })]);
    const leases = claims.filter(Boolean); assert.equal(leases.length, 1);
    assert.equal(await startDelivery({ firestore: db, reference, lease: leases[0], now: 1001 }), true);
    assert.equal(await claimDelivery({ firestore: db, reference, now: 601001 }), null);
    assert.equal((await reference.get()).get('status'), 'unknown');
  });
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: manual broadcasts serialize, preserve unknown and recover acknowledged history writes`, async () => {
    const input = { operationId: 'native-manual-concurrent', title: 'Synthetic broadcast', body: 'Synthetic body' };
    let sends = 0; const messages = [];
    const args = { firestore: db, callerUid: 'synthetic-super', root, data: input,
      messaging: { send: async message => { sends++; messages.push(message); return 'synthetic-ack'; } } };
    await Promise.all([broadcastNotification(args), broadcastNotification(args)]);
    assert.equal(sends, 1);
    assert.equal(messages[0].topic, root === 'HudHudDev' ? 'hudhuddev_hudhud_fm_announcements' : 'hudhud_fm_announcements');
    await assert.rejects(broadcastNotification({ ...args, data: { ...input, body: 'Changed body' } }), { code: 'failed-precondition' });
    let uncertainSends = 0;
    const uncertain = { ...args, data: { ...input, operationId: 'native-manual-uncertain' }, messaging: { send: async () => { uncertainSends++; throw new Error('Synthetic lost ack'); } } };
    assert.equal((await broadcastNotification(uncertain)).status, 'unknown');
    assert.equal((await broadcastNotification(uncertain)).status, 'unknown'); assert.equal(uncertainSends, 1);
    let acknowledged = 0, failed = false;
    const failureDb = { doc: db.doc.bind(db), runTransaction: fn => db.runTransaction(tx => fn(new Proxy(tx, {
      get(target, key) {
        if (key === 'set') return (ref, value) => {
          if (ref.path.includes('/notifications/') && acknowledged && !failed) { failed = true; throw new Error('Synthetic history failure'); }
          return target.set(ref, value);
        };
        return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
      },
    }))) };
    const recovery = { ...args, firestore: failureDb, data: { ...input, operationId: 'native-manual-history-failure' }, messaging: { send: async () => { acknowledged++; return 'recovered-ack'; } } };
    await assert.rejects(broadcastNotification(recovery));
    const result = await broadcastNotification(recovery);
    assert.equal(acknowledged, 1); assert.equal(result.status, 'sent'); assert.equal(result.messageId, 'recovered-ack');
    assert.equal((await db.doc(`${root}/notifications/notifications/${result.notificationId}`).get()).get('status'), 'sent');
  });
}
