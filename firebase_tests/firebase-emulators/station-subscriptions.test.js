import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';
import { setSubscription, registerDevice, unregisterDevice, deviceId, removeAccountDevices } from '../../functions/lib/station-subscriptions.js';
import { enqueueEpisodeAlert, processEpisodeAlert } from '../../functions/lib/episode-alerts.js';
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
    for (const path of [`${userPath('a')}/alertDevices/device`, 'notificationDeviceOwners/device', `${root}/episodeAlerts/jobs/e`, `${root}/episodeAlertPublications/markers/e`]) {
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
