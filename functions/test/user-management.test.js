import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSuperAdminCaller,
  setUserPassword,
  toggleUserDisabled,
  assignStationAccess,
  migrateLegacyUsers,
  broadcastNotification,
} from '../lib/user-management.js';

test('assertSuperAdminCaller validates auth and role claims', () => {
  // Unauthenticated
  assert.throws(() => assertSuperAdminCaller({}), /Authentication is required/);

  // Non-admin listener
  assert.throws(
    () =>
      assertSuperAdminCaller({
        auth: { uid: 'user1', token: { role: 'listener' } },
      }),
    /Super admin privileges are required/,
  );

  // Station admin without super admin
  assert.throws(
    () =>
      assertSuperAdminCaller({
        auth: {
          uid: 'user1',
          token: { admin: true, role: 'station_admin' },
        },
      }),
    /Super admin privileges are required/,
  );

  // Valid Super Admin by role
  assert.equal(
    assertSuperAdminCaller({
      auth: { uid: 'admin1', token: { role: 'super_admin' } },
    }),
    'admin1',
  );

  // Valid Super Admin by legacy admin claim without sub-role
  assert.equal(
    assertSuperAdminCaller({
      auth: { uid: 'admin2', token: { admin: true } },
    }),
    'admin2',
  );
});

test('setUserPassword updates auth password, verifies email, and ensures profile', async () => {
  let updatedAuth = null;
  const mockAuth = {
    getUser: async (uid) => ({ uid, email: 'listener@test.com', displayName: 'Listener' }),
    updateUser: async (uid, data) => {
      updatedAuth = { uid, ...data };
    },
  };

  let firestoreDoc = null;
  let firestoreUpdated = null;
  const mockFirestore = {
    doc: (path) => ({
      get: async () => ({
        exists: firestoreDoc !== null,
        data: () => firestoreDoc,
      }),
      set: async (data) => {
        firestoreDoc = data;
      },
      update: async (data) => {
        firestoreUpdated = data;
      },
    }),
  };

  // Missing target UID or short password
  await assert.rejects(
    setUserPassword({
      auth: mockAuth,
      firestore: mockFirestore,
      targetUid: '',
      newPassword: 'short',
      root: 'HudHudDev',
    }),
    /A target user ID is required/,
  );
  await assert.rejects(
    setUserPassword({
      auth: mockAuth,
      firestore: mockFirestore,
      targetUid: 'u1',
      newPassword: 'short',
      root: 'HudHudDev',
    }),
    /Password must be at least 8 characters long/,
  );

  const result = await setUserPassword({
    auth: mockAuth,
    firestore: mockFirestore,
    targetUid: 'user-legacy-123',
    newPassword: 'new-secure-password',
    root: 'HudHudDev',
  });

  assert.equal(result.success, true);
  assert.equal(result.uid, 'user-legacy-123');
  assert.equal(updatedAuth.password, 'new-secure-password');
  assert.equal(updatedAuth.emailVerified, true);
  assert.equal(firestoreDoc.isActive, true);
});

test('toggleUserDisabled disables user, revokes tokens, and updates profile', async () => {
  let updatedAuth = null;
  let revokedUid = null;
  const mockAuth = {
    updateUser: async (uid, data) => {
      updatedAuth = { uid, ...data };
    },
    revokeRefreshTokens: async (uid) => {
      revokedUid = uid;
    },
  };

  let profileData = null;
  const mockFirestore = {
    doc: (path) => ({
      set: async (data, options) => {
        profileData = { ...(profileData || {}), ...data };
      },
    }),
  };

  // Self-disable prevented
  await assert.rejects(
    toggleUserDisabled({
      auth: mockAuth,
      firestore: mockFirestore,
      callerUid: 'admin1',
      targetUid: 'admin1',
      disabled: true,
      reason: 'test',
      root: 'HudHudDev',
    }),
    /Administrators cannot disable their own account/,
  );

  // Disable target user
  const result = await toggleUserDisabled({
    auth: mockAuth,
    firestore: mockFirestore,
    callerUid: 'admin1',
    targetUid: 'violator99',
    disabled: true,
    reason: 'UGC violations',
    root: 'HudHudDev',
  });

  assert.equal(result.success, true);
  assert.equal(result.disabled, true);
  assert.equal(updatedAuth.disabled, true);
  assert.equal(revokedUid, 'violator99');
  assert.equal(profileData.isActive, false);
  assert.equal(profileData.disabledReason, 'UGC violations');
});

test('assignStationAccess sets custom claims and updates profile with all or specific stations', async () => {
  let customClaims = null;
  const mockAuth = {
    getUser: async (uid) => ({ uid, customClaims: {} }),
    setCustomUserClaims: async (uid, claims) => {
      customClaims = claims;
    },
  };

  let profileData = null;
  const mockFirestore = {
    doc: (path) => ({
      set: async (data, options) => {
        profileData = { ...(profileData || {}), ...data };
      },
    }),
  };

  // Specific station scoping
  const scopedResult = await assignStationAccess({
    auth: mockAuth,
    firestore: mockFirestore,
    callerUid: 'superAdmin1',
    targetUid: 'stationEditor2',
    role: 'station_admin',
    allStations: false,
    stationIds: ['sanaa_fm', 'aden_fm'],
    root: 'HudHudDev',
  });

  assert.equal(scopedResult.success, true);
  assert.equal(scopedResult.allStations, false);
  assert.deepEqual(scopedResult.assignedStations, ['sanaa_fm', 'aden_fm']);
  assert.equal(customClaims.admin, true);
  assert.equal(customClaims.allStations, false);
  assert.deepEqual(customClaims.assignedStations, ['sanaa_fm', 'aden_fm']);
  assert.equal(profileData.role, 'station_admin');
  assert.equal(profileData.assignedBy, 'superAdmin1');

  // All stations scoping
  await assignStationAccess({
    auth: mockAuth,
    firestore: mockFirestore,
    callerUid: 'superAdmin1',
    targetUid: 'stationEditor2',
    role: 'station_admin',
    allStations: true,
    stationIds: [],
    root: 'HudHudDev',
  });

  assert.equal(customClaims.allStations, true);
  assert.deepEqual(customClaims.assignedStations, ['*']);
  assert.equal(profileData.allStations, true);
});

test('migrateLegacyUsers migrates legacy documents to canonical schema and enforces one-time execution', async () => {
  const store = new Map();
  const legacyDocs = [
    {
      id: 'legacy-user-1',
      data: () => ({
        name: 'أحمد اليمني',
        email: 'ahmed@legacy.test',
        role: 'listener',
        isActive: true,
      }),
    },
    {
      id: 'legacy-user-2',
      data: () => ({
        username: 'samir_fm',
        email: 'samir@legacy.test',
        disabled: false,
      }),
    },
  ];

  const mockFirestore = {
    doc: (path) => ({
      path,
      get: async () => ({
        exists: store.has(path),
        data: () => store.get(path),
      }),
      set: async (data, options) => {
        store.set(path, { ...(options?.merge ? store.get(path) || {} : {}), ...data });
      },
      update: async (data) => {
        store.set(path, { ...(store.get(path) || {}), ...data });
      },
    }),
    collection: (path) => ({
      path,
      get: async () => ({
        empty: legacyDocs.length === 0,
        size: legacyDocs.length,
        docs: legacyDocs,
      }),
    }),
    batch: () => {
      const operations = [];
      return {
        set: (ref, data, options) => {
          operations.push(() => ref.set(data, options));
        },
        update: (ref, data) => {
          operations.push(() => ref.update(data));
        },
        commit: async () => {
          for (const op of operations) await op();
        },
      };
    },
  };

  // First run: executes migration
  const result = await migrateLegacyUsers({
    firestore: mockFirestore,
    callerUid: 'superAdmin1',
    sourcePath: 'HudHudFmGooglePlay/Users/Users',
    targetRoot: 'HudHudOfficial',
    overwrite: false,
    force: false,
  });

  assert.equal(result.success, true);
  assert.equal(result.totalSource, 2);
  assert.equal(result.migratedCount, 2);
  assert.equal(result.alreadyExecuted, undefined);

  // Verify migrated document in target
  const user1 = store.get('HudHudOfficial/users/users/legacy-user-1');
  assert.ok(user1);
  assert.equal(user1.displayName, 'أحمد اليمني');
  assert.equal(user1.email, 'ahmed@legacy.test');
  assert.equal(user1.role, 'listener');
  assert.equal(user1.isActive, true);
  assert.equal(user1.migratedFrom, 'HudHudFmGooglePlay/Users/Users');

  // Verify migration audit record exists
  const migrationRecord = store.get('HudHudOfficial/system/migrations/migration_legacy_users');
  assert.ok(migrationRecord);
  assert.equal(migrationRecord.status, 'completed');
  assert.equal(migrationRecord.migratedCount, 2);

  // Second run: blocked by one-time guard
  const secondRun = await migrateLegacyUsers({
    firestore: mockFirestore,
    callerUid: 'superAdmin1',
    sourcePath: 'HudHudFmGooglePlay/Users/Users',
    targetRoot: 'HudHudOfficial',
    overwrite: false,
    force: false,
  });

  assert.equal(secondRun.success, true);
  assert.equal(secondRun.alreadyExecuted, true);
  assert.match(secondRun.message, /already been executed/);
});

test('broadcastNotification sends FCM message to topic and stores record in firestore', async () => {
  let sentPayload = null;
  const mockMessaging = {
    send: async (payload) => {
      sentPayload = payload;
      return 'projects/sanadev-fm/messages/msg-12345';
    },
  };

  const store = new Map();
  const mockFirestore = {
    doc: (path) => ({
      path,
      set: async (data) => {
        store.set(path, data);
      },
    }),
  };

  const result = await broadcastNotification({
    messaging: mockMessaging,
    firestore: mockFirestore,
    callerUid: 'superAdmin1',
    callerEmail: 'admin@hudhudfm.com',
    root: 'HudHudOfficial',
    data: {
      title: 'بث مباشر خاص',
      body: 'استمع الآن إلى التغطية الإخبارية المباشرة',
      targetType: 'station',
      targetId: 'station-sanaa',
      targetLabel: 'إذاعة صنعاء',
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.messageId, 'projects/sanadev-fm/messages/msg-12345');
  assert.equal(result.topic, 'hudhud_fm_announcements');

  // Verify FCM payload structure
  assert.equal(sentPayload.topic, 'hudhud_fm_announcements');
  assert.equal(sentPayload.notification.title, 'بث مباشر خاص');
  assert.equal(sentPayload.notification.body, 'استمع الآن إلى التغطية الإخبارية المباشرة');
  assert.equal(sentPayload.data.type, 'station');
  assert.equal(sentPayload.data.targetId, 'station-sanaa');
  assert.equal(sentPayload.data.stationId, 'station-sanaa');
  assert.equal(sentPayload.data.root, 'HudHudOfficial');

  // Verify Firestore document
  const savedDoc = store.get(`HudHudOfficial/notifications/notifications/${result.notificationId}`);
  assert.ok(savedDoc);
  assert.equal(savedDoc.title, 'بث مباشر خاص');
  assert.equal(savedDoc.body, 'استمع الآن إلى التغطية الإخبارية المباشرة');
  assert.equal(savedDoc.targetType, 'station');
  assert.equal(savedDoc.targetId, 'station-sanaa');
  assert.equal(savedDoc.targetLabel, 'إذاعة صنعاء');
  assert.equal(savedDoc.sentBy, 'admin@hudhudfm.com');
  assert.equal(savedDoc.status, 'sent');
  assert.equal(savedDoc.messageId, 'projects/sanadev-fm/messages/msg-12345');

  // Validation errors
  await assert.rejects(
    broadcastNotification({
      messaging: mockMessaging,
      firestore: mockFirestore,
      callerUid: 'superAdmin1',
      root: 'HudHudOfficial',
      data: { title: '', body: 'محتوى الإشعار' },
    }),
    /عنوان الإشعار مطلوب/,
  );

  await assert.rejects(
    broadcastNotification({
      messaging: mockMessaging,
      firestore: mockFirestore,
      callerUid: 'superAdmin1',
      root: 'HudHudOfficial',
      data: { title: 'عنوان', body: 'a'.repeat(251) },
    }),
    /يجب ألا يتجاوز نص الإشعار/,
  );

  await assert.rejects(
    broadcastNotification({
      messaging: mockMessaging,
      firestore: mockFirestore,
      callerUid: 'superAdmin1',
      root: 'HudHudOfficial',
      data: { title: 'عنوان', body: 'محتوى', targetType: 'invalid_type' },
    }),
    /نوع الهدف غير صالح/,
  );
});

test('broadcastNotification resolves episode metadata and formats imageUrl correctly', async () => {
  let sentPayload = null;
  const mockMessaging = {
    send: async (payload) => {
      sentPayload = payload;
      return 'projects/sanadev-fm/messages/msg-ep-99';
    },
  };

  const store = new Map();
  store.set('HudHudOfficial/episodes/episodes/ep123', {
    stationId: 'station-aden',
    programId: 'prog-morning',
    title: 'حلقة الصباح',
  });

  const mockFirestore = {
    doc: (path) => ({
      path,
      get: async () => ({
        exists: store.has(path),
        data: () => store.get(path),
      }),
      set: async (data) => {
        store.set(path, data);
      },
    }),
  };

  const result = await broadcastNotification({
    messaging: mockMessaging,
    firestore: mockFirestore,
    callerUid: 'superAdmin1',
    callerEmail: 'admin@hudhudfm.com',
    root: 'HudHudOfficial',
    data: {
      title: 'حلقة جديدة متاحة الآن',
      body: 'استمع إلى حلقة الصباح عبر أثير إذاعة عدن',
      targetType: 'episode',
      targetId: 'ep123',
      targetLabel: 'حلقة الصباح',
      imageUrl: 'https://example.com/banner.jpg',
    },
  });

  assert.equal(result.success, true);
  assert.equal(sentPayload.notification.imageUrl, 'https://example.com/banner.jpg');
  assert.equal(sentPayload.android.notification.imageUrl, 'https://example.com/banner.jpg');
  assert.equal(sentPayload.apns.fcmOptions.imageUrl, 'https://example.com/banner.jpg');
  assert.equal(sentPayload.apns.payload.aps['mutable-content'], 1);
  assert.equal(sentPayload.data.type, 'episode');
  assert.equal(sentPayload.data.stationId, 'station-aden');
  assert.equal(sentPayload.data.programId, 'prog-morning');
  assert.equal(sentPayload.data.episodeId, 'ep123');
  assert.equal(sentPayload.data.eventId, 'HudHudOfficial:ep123');
});


