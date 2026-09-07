import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, before, after } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes } from 'firebase/storage';

const projectId = 'demo-hudhud-profile-images';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
let app, auth, functions, storage, firestore, bucket, adminAuth, imageBase64, collectProfileImages;
before(async () => {
  for (const key of ['FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST']) assert.ok(process.env[key], `${key} required`);
  assert.equal(process.env.GCLOUD_PROJECT,projectId);
  await import('../../functions/index.js');
  ({collectProfileImages} = await import('../../functions/lib/profile-images.js'));
  adminAuth = require('firebase-admin/auth').getAuth();
  firestore = require('firebase-admin/firestore').getFirestore();
  bucket = require('firebase-admin/storage').getStorage().bucket(`${projectId}.appspot.com`);
  app = initializeApp({projectId,apiKey:'demo-key',storageBucket:bucket.name});
  auth = getAuth(app); connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  functions = getFunctions(app); connectFunctionsEmulator(functions,'127.0.0.1',5001);
  storage = getStorage(app); connectStorageEmulator(storage,'127.0.0.1',9199);
  imageBase64 = (await require('sharp')({create:{width:20,height:20,channels:3,background:'#8e3e63'}}).png().toBuffer()).toString('base64');
});
after(async () => { if (app) await deleteApp(app); });

test('verified uploads, private access, replacement, cleanup and both-root account deletion', async () => {
  const credential = await createUserWithEmailAndPassword(auth,'image-fixture@example.test','fixture-password');
  const uid = credential.user.uid;
  const call = httpsCallable(functions,'updateAccountProfile');
  await assert.rejects(call({root:'HudHudDev',displayName:'Fixture',imageBase64}), error => error.code === 'functions/failed-precondition');
  await adminAuth.updateUser(uid,{emailVerified:true});
  await credential.user.getIdToken(true);
  const profiles = ['HudHudDev','HudHudOfficial'].map(root=>firestore.doc(`${root}/users/users/${uid}`));
  for (const profile of profiles) await profile.set({displayName:'Fixture',role:'listener',isActive:true});
  const data = {root:'HudHudDev',displayName:'Fixture',imageBase64};
  await assert.rejects(call({...data,avatarUrl:''}),error=>error.code==='functions/invalid-argument');
  assert.equal((await call(data)).data.updated,true);
  const uploaded = (await profiles[0].get()).data();
  assert.match(uploaded.avatarUrl,/^https:\/\//);
  assert.equal((await bucket.file(uploaded.avatarStoragePath).exists())[0],true);
  await assert.rejects(uploadBytes(ref(storage,uploaded.avatarStoragePath),new Uint8Array([1,2,3])));
  await assert.rejects(getBytes(ref(storage,uploaded.avatarStoragePath)));
  await assert.rejects(call(data),error=>error.code==='functions/resource-exhausted');
  await call({root:'HudHudDev',displayName:'Renamed',avatarUrl:uploaded.avatarUrl});
  assert.equal((await bucket.file(uploaded.avatarStoragePath).exists())[0],true,'Name-only edits retain the uploaded image');
  await call({root:'HudHudDev',displayName:'Fixture',avatarUrl:'assets/images/mascot/mascot_avatar_default.webp'});
  assert.equal((await bucket.file(uploaded.avatarStoragePath).exists())[0],false,'Replacing a photo removes its object');
  await profiles[0].update({lastImageUploadAt:require('firebase-admin/firestore').Timestamp.fromMillis(0)});
  const currentPaths=[];
  for (const root of ['HudHudDev','HudHudOfficial']) {
    await call({...data,root});
    const profile=await firestore.doc(`${root}/users/users/${uid}`).get();
    currentPaths.push(profile.get('avatarStoragePath'));
  }
  await collectProfileImages(firestore,bucket,Date.now()+2*24*60*60*1000);
  for (const path of currentPaths) assert.equal((await bucket.file(path).exists())[0],true,'Collector preserves referenced images');
  await httpsCallable(functions,'deleteAccountData')({});
  for (const path of currentPaths) assert.equal((await bucket.file(path).exists())[0],false,'Deletion removes both-root images');
  await assert.rejects(adminAuth.getUser(uid),error=>error.code==='auth/user-not-found');
  await collectProfileImages(firestore,bucket,Date.now()+4*24*60*60*1000);
  for (const root of ['HudHudDev','HudHudOfficial']) assert.equal((await firestore.collection(`${root}/profileImageUploads/uploads`).where('uid','==',uid).get()).empty,true);
});


test('collector removes abandoned uploads and retains inactive users current images', async () => {
  const {Timestamp} = require('firebase-admin/firestore');
  const id = 'abandoned-fixture';
  const path = `HudHudDev/profile-images/absent-user/${id}.jpg`;
  const reference = firestore.doc(`HudHudDev/profileImageUploads/uploads/${id}`);
  await bucket.file(path).save(Buffer.from('fixture'));
  await reference.set({uid:'absent-user',root:'HudHudDev',objectPath:path,state:'uploading',settleAt:Timestamp.fromMillis(0),dueAt:Timestamp.fromMillis(0)});
  await collectProfileImages(firestore,bucket);
  assert.equal((await bucket.file(path).exists())[0],false);
  assert.equal((await reference.get()).exists,false);
  const retainedId = 'inactive-fixture';
  const retainedPath = `HudHudDev/profile-images/inactive-user/${retainedId}.jpg`;
  await bucket.file(retainedPath).save(Buffer.from('fixture'));
  await firestore.doc(`HudHudDev/profileImageUploads/uploads/${retainedId}`).set({uid:'inactive-user',root:'HudHudDev',objectPath:retainedPath,state:'ready',settleAt:Timestamp.fromMillis(0),dueAt:Timestamp.fromMillis(0)});
  await firestore.doc('HudHudDev/users/users/inactive-user').set({isActive:false,avatarUploadId:retainedId});
  await collectProfileImages(firestore,bucket);
  assert.equal((await bucket.file(retainedPath).exists())[0],true);
});

test('account deletion wins against an upload paused after its durable reservation', async () => {
  const {updateProfileImage} = await import('../../functions/lib/profile-images.js');
  const credential = await createUserWithEmailAndPassword(auth,'overlap-fixture@example.test','fixture-password');
  const uid = credential.user.uid;
  await adminAuth.updateUser(uid,{emailVerified:true});
  await credential.user.getIdToken(true);
  const profile = firestore.doc(`HudHudDev/users/users/${uid}`);
  await profile.set({displayName:'Overlap fixture',role:'listener',isActive:true});
  let releaseSave;
  let announceSave;
  const started = new Promise(resolve=>{announceSave=resolve;});
  const release = new Promise(resolve=>{releaseSave=resolve;});
  const delayedBucket = {
    name:bucket.name,
    file(path) {
      return {
        async save(...args) {announceSave();await release;return bucket.file(path).save(...args);},
        delete(options) {return bucket.file(path).delete(options);},
      };
    },
  };
  const pending = updateProfileImage({firestore,bucket:delayedBucket,uid,root:'HudHudDev',displayName:'Overlap fixture',imageBase64});
  const rejected = assert.rejects(pending,error=>error.code==='failed-precondition');
  await started;
  await httpsCallable(functions,'deleteAccountData')({});
  releaseSave();
  await rejected;
  assert.equal((await profile.get()).exists,false);
  assert.equal((await bucket.getFiles({prefix:`HudHudDev/profile-images/${uid}/`}))[0].length,0);
  await collectProfileImages(firestore,bucket,Date.now()+2*60*60*1000);
  assert.equal((await firestore.collection('HudHudDev/profileImageUploads/uploads').where('uid','==',uid).get()).empty,true);
});
