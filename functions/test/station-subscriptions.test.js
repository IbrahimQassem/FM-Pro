import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubscriptionInput, deviceId, verifiedUid } from '../lib/station-subscriptions.js';
import { firstPublication } from '../lib/episode-alerts.js';
test('subscription input enforces roots, IDs and inactive alert invariant', () => {
  const valid = { root: 'HudHudDev', stationId: 's', isActive: true, notificationsEnabled: false };
  assert.deepEqual(validateSubscriptionInput(valid), valid);
  for (const invalid of [{root:'other'}, {stationId:'../x'}, {isActive:false,notificationsEnabled:true}, {notificationsEnabled:'true'}]) assert.throws(() => validateSubscriptionInput({...valid,...invalid}));
});
test('device identity is stable and rejects malformed registrations', () => {
  assert.equal(deviceId('synthetic-device-token-123'), deviceId('synthetic-device-token-123'));
  assert.throws(() => deviceId('short')); assert.throws(() => deviceId('token with whitespace longer than twenty'));
});
test('first publication includes published creates, excludes edits and unpublication', () => {
  const published = {isPublished:true,stationId:'s',programId:'p'};
  assert.equal(firstPublication(undefined,published),true);
  assert.equal(firstPublication({isPublished:false},published),true);
  assert.equal(firstPublication(published,published),false);
  assert.equal(firstPublication(published,{...published,isPublished:false}),false);
});
test('verified identity comes from Auth, never request data', async () => {
  const auth = { getUser: async uid => ({uid,emailVerified:false}) };
  await assert.rejects(verifiedUid({data:{uid:'forged'}},auth));
  await assert.rejects(verifiedUid({auth:{uid:'a'},data:{emailVerified:true}},auth));
});
