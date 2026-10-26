import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSubscriptionInput,
  deviceId,
  verifiedUid,
  verifiedUser,
  allowedSubscriptionRoles,
  ensureActiveSubscriptionProfile,
} from '../lib/station-subscriptions.js';
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
  const auth = { getUser: async uid => ({uid,emailVerified:false,disabled:false}) };
  await assert.rejects(verifiedUid({data:{uid:'forged'}},auth), { code: 'unauthenticated' });
  await assert.rejects(verifiedUid({auth:{uid:'a'},data:{emailVerified:true}},auth), { code: 'permission-denied' });
  await assert.rejects(verifiedUser({auth:{uid:'a'}}, { getUser: async uid => ({uid,emailVerified:true,disabled:true}) }), { code: 'permission-denied' });

  const activeUser = { uid: 'u1', email: 'u1@example.com', emailVerified: true, disabled: false };
  const user = await verifiedUser({auth:{uid:'u1'}}, { getUser: async () => activeUser });
  assert.equal(user.uid, 'u1');
  const uid = await verifiedUid({auth:{uid:'u1'}}, { getUser: async () => activeUser });
  assert.equal(uid, 'u1');
});

test('allowedSubscriptionRoles allows listener, station_admin, super_admin', () => {
  assert.deepEqual(allowedSubscriptionRoles, ['listener', 'station_admin', 'super_admin']);
});

test('ensureActiveSubscriptionProfile creates self-healing profile when missing', async () => {
  const created = [];
  const mockTx = {
    get: async ref => {
      // Deletion jobs or profile doc
      return { exists: false, data: () => ({}) };
    },
    set: (ref, data) => {
      created.push({ path: ref.path, data });
    },
    update: () => {},
  };
  const mockFirestore = {
    doc: path => ({ path }),
  };

  const authUser = { uid: 'user-new', email: 'new@example.com', displayName: 'New Listener', photoURL: 'https://example.com/p.jpg' };
  const profile = await ensureActiveSubscriptionProfile(mockTx, mockFirestore, 'user-new', 'HudHudDev', authUser);

  assert.equal(profile.role, 'listener');
  assert.equal(created.length, 1);
  assert.equal(created[0].path, 'HudHudDev/users/users/user-new');
  assert.equal(created[0].data.role, 'listener');
  assert.equal(created[0].data.isActive, true);
  assert.equal(Object.hasOwn(created[0].data, 'email'), false);
  assert.equal(created[0].data.displayName, 'New Listener');
});

test('ensureActiveSubscriptionProfile permits listener, station_admin, and super_admin', async () => {
  for (const role of ['listener', 'station_admin', 'super_admin']) {
    const mockTx = {
      get: async ref => {
        if (ref.path.includes('accountDeletionRequests')) return { exists: false };
        return {
          exists: true,
          get: field => {
            if (field === 'isActive') return true;
            if (field === 'role') return role;
            if (field === 'email') return 'admin@example.com';
            return null;
          },
          data: () => ({ isActive: true, role }),
        };
      },
      update: () => {},
    };
    const mockFirestore = { doc: path => ({ path }) };
    const p = await ensureActiveSubscriptionProfile(mockTx, mockFirestore, 'uid-1', 'HudHudDev');
    assert.ok(p);
  }
});

test('ensureActiveSubscriptionProfile rejects inactive profile, disallowed roles, or active deletion requests', async () => {
  const mockFirestore = { doc: path => ({ path }) };

  // Inactive profile
  const inactiveTx = {
    get: async ref => {
      if (ref.path.includes('accountDeletionRequests')) return { exists: false };
      return { exists: true, get: f => f === 'isActive' ? false : 'listener' };
    },
  };
  await assert.rejects(ensureActiveSubscriptionProfile(inactiveTx, mockFirestore, 'u', 'HudHudDev'), { code: 'failed-precondition' });

  // Disallowed role
  const badRoleTx = {
    get: async ref => {
      if (ref.path.includes('accountDeletionRequests')) return { exists: false };
      return { exists: true, get: f => f === 'isActive' ? true : 'guest' };
    },
  };
  await assert.rejects(ensureActiveSubscriptionProfile(badRoleTx, mockFirestore, 'u', 'HudHudDev'), { code: 'failed-precondition' });

  // Deletion request in progress
  const deletionTx = {
    get: async ref => {
      if (ref.path.includes('accountDeletionRequests')) return { exists: true };
      return { exists: true, get: () => true };
    },
  };
  await assert.rejects(ensureActiveSubscriptionProfile(deletionTx, mockFirestore, 'u', 'HudHudDev'), { code: 'failed-precondition' });
});

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const exists of [false, true]) {
    test(`${root}: R10 subscription ${exists ? 'repair' : 'creation'} does not project Auth email or derive a name`, async () => {
      const writes = [];
      const tx = { get: async ref => ({ exists: !ref.path.includes('accountDeletionRequests') && exists,
        get: key => ({ isActive: true, role: 'listener', displayName: 'Existing name' })[key] }),
        set: (_ref, data) => writes.push(data), update: (_ref, data) => writes.push(data) };
      await ensureActiveSubscriptionProfile(tx, { doc: path => ({ path }) }, 'synthetic-user', root,
        { email: 'private-localpart@example.test', displayName: '', photoURL: 'https://example.test/avatar' });
      assert.equal(writes.some(data => Object.hasOwn(data, 'email')), false, 'Auth email must not enter a profile write');
      if (exists) assert.equal(writes.length, 0);
      else { assert.equal(writes.length, 1); assert.notEqual(writes[0].displayName, 'private-localpart'); }
    });
  }
}
