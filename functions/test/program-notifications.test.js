import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import {
  collectNotificationOperations,
  getYemenTimeInfo,
  shouldNotifyProgram,
  createProgramFcmMessage,
  notifyUpcomingProgramsForRoot,
} from '../lib/program-notifications.js';

describe('Program Start FCM Notifier', () => {
  describe('getYemenTimeInfo', () => {
    it('accurately resolves Yemen timezone date, minute, and weekday', () => {
      // 2026-10-19 06:15:00 UTC = 09:15:00 in Yemen (Asia/Aden, UTC+3)
      // 2026-10-19 is a Monday (ISO weekday 1)
      const date = new Date('2026-10-19T06:15:00Z');
      const info = getYemenTimeInfo(date);

      assert.strictEqual(info.weekday, 1, 'Monday must be ISO weekday 1');
      assert.strictEqual(info.currentMinute, 9 * 60 + 15, '09:15 must be minute 555');
      assert.strictEqual(info.ymd, '2026-10-19');
    });

    it('handles midnight crossover correctly in Yemen time', () => {
      // 2026-10-18 22:30:00 UTC = 2026-10-19 01:30:00 in Yemen
      const date = new Date('2026-10-18T22:30:00Z');
      const info = getYemenTimeInfo(date);

      assert.strictEqual(info.ymd, '2026-10-19');
      assert.strictEqual(info.currentMinute, 1 * 60 + 30);
      assert.strictEqual(info.weekday, 1);
    });
  });

  describe('shouldNotifyProgram', () => {
    const baseProgram = {
      isActive: true,
      schedule: {
        weekdays: [1, 2, 3, 4, 5],
        startMinute: 600, // 10:00 AM
        endMinute: 660,
        utcOffsetMinutes: 180,
      },
      lastNotifiedDate: '2026-10-18',
    };

    it('returns true when program starts within 0..10 minutes on scheduled weekday', () => {
      const timeInfo = { weekday: 1, currentMinute: 595, ymd: '2026-10-19' }; // 5 mins before start
      assert.strictEqual(shouldNotifyProgram(baseProgram, timeInfo), true);

      const timeInfoExact = { weekday: 1, currentMinute: 600, ymd: '2026-10-19' }; // Exactly start time
      assert.strictEqual(shouldNotifyProgram(baseProgram, timeInfoExact), true);
    });

    it('returns false when program starts in more than 10 minutes', () => {
      const timeInfo = { weekday: 1, currentMinute: 580, ymd: '2026-10-19' }; // 20 mins before start
      assert.strictEqual(shouldNotifyProgram(baseProgram, timeInfo), false);
    });

    it('returns false when program has already started in the past (> 0 mins ago)', () => {
      const timeInfo = { weekday: 1, currentMinute: 605, ymd: '2026-10-19' }; // 5 mins after start
      assert.strictEqual(shouldNotifyProgram(baseProgram, timeInfo), false);
    });

    it('enforces idempotency: returns false if already notified today', () => {
      const programAlreadyNotified = {
        ...baseProgram,
        lastNotifiedDate: '2026-10-19',
      };
      const timeInfo = { weekday: 1, currentMinute: 595, ymd: '2026-10-19' };
      assert.strictEqual(shouldNotifyProgram(programAlreadyNotified, timeInfo), false);
    });

    it('returns false when today is not in scheduled weekdays', () => {
      const timeInfoWeekend = { weekday: 7, currentMinute: 595, ymd: '2026-10-19' }; // Sunday
      assert.strictEqual(shouldNotifyProgram(baseProgram, timeInfoWeekend), false);
    });

    it('returns false when program is inactive', () => {
      const inactive = { ...baseProgram, isActive: false };
      const timeInfo = { weekday: 1, currentMinute: 595, ymd: '2026-10-19' };
      assert.strictEqual(shouldNotifyProgram(inactive, timeInfo), false);
    });
  });

  describe('createProgramFcmMessage', () => {
    it('constructs topic-based FCM message without user tokens', () => {
      const message = createProgramFcmMessage({
        programId: 'morning-glory',
        programTitle: 'صباحك يا بلادي',
        stationId: 'sanaa-fm',
        stationName: 'إذاعة صنعاء',
      });

      assert.strictEqual(message.topic, 'program_morning-glory');
      assert.match(message.notification.body, /صباحك يا بلادي/);
      assert.match(message.notification.body, /إذاعة صنعاء/);
      assert.strictEqual(message.data.programId, 'morning-glory');
      assert.strictEqual(message.data.stationId, 'sanaa-fm');
    });
  });

  describe('notifyUpcomingProgramsForRoot', () => {
    it('scans active programs, sends FCM notifications to topic, and updates lastNotifiedDate', async () => {
      const sentMessages = [];
      const updates = [];

      const programs = [
        // Program 1: Upcoming in 5 minutes -> Should notify
        {
          id: 'prog-1',
          data: () => ({
            title: 'برنامج الصباح',
            stationId: 'st-1',
            isActive: true,
            schedule: { weekdays: [1], startMinute: 600, endMinute: 660, utcOffsetMinutes: 180 },
            lastNotifiedDate: '2026-10-18',
          }),
          ref: {
            update: async (payload) => updates.push({ id: 'prog-1', payload }),
          },
        },
        // Program 2: Already notified today -> Skipped
        {
          id: 'prog-2',
          data: () => ({
            title: 'برنامج الظهيرة',
            stationId: 'st-1',
            isActive: true,
            schedule: { weekdays: [1], startMinute: 600, endMinute: 660, utcOffsetMinutes: 180 },
            lastNotifiedDate: '2026-10-19',
          }),
          ref: {
            update: async (payload) => updates.push({ id: 'prog-2', payload }),
          },
        },
      ];

      const mockFirestore = notificationStore(programs, updates);

      const mockMessaging = {
        send: async (msg) => { sentMessages.push(msg); },
      };

      // 06:55 UTC = 09:55 Yemen time (minute 595, exactly 5 minutes before 600)
      const testDate = new Date('2026-10-19T06:55:00Z');

      const summary = await notifyUpcomingProgramsForRoot({
        firestore: mockFirestore,
        messaging: mockMessaging,
        root: 'HudHudDev',
        now: testDate,
      });

      assert.strictEqual(summary.checked, 2);
      assert.strictEqual(summary.notified, 1);
      assert.strictEqual(summary.skipped, 1);
      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].topic, 'hudhuddev_program_prog-1');
      assert.strictEqual(updates.length, 1);
      assert.strictEqual(updates[0].id, 'prog-1');
      assert.strictEqual(updates[0].payload.lastNotifiedDate, '2026-10-19');

      // Also verify official root produces production topic
      const officialMsg = createProgramFcmMessage({
        programId: 'morning-glory',
        programTitle: 'الصباح',
        root: 'HudHudOfficial',
      });
      assert.strictEqual(officialMsg.topic, 'program_morning-glory');
    });
  });
});

// Serial transactions model lease ownership; emulator tests cover native contention.
function notificationStore(programs, updates = []) {
  const values = new Map(programs.map(item => [item.id, item.data()]));
  const stations = new Map(programs.map(item => [item.data().stationId, { name: 'Synthetic station', isActive: true }]));
  const operations = new Map(), metadata = new Map();
  let nativeTick = 0;
  const commitTime = () => new Timestamp(1800000000, ++nativeTick);
  const bucket = path => path.split('/').at(-2) === 'operations' ? operations : path.split('/').at(-2) === 'stations' ? stations : values;
  const metadataKey = (storage, id) => `${storage === operations ? 'operations' : storage === stations ? 'stations' : 'programs'}/${id}`;
  for (const storage of [values, stations, operations]) {
    const set = storage.set.bind(storage), remove = storage.delete.bind(storage);
    storage.set = (id, data, time = commitTime()) => {
      const key = metadataKey(storage, id), old = metadata.get(key);
      if (!storage.has(id) || !isDeepStrictEqual(storage.get(id), data)) metadata.set(key, { createTime: old?.createTime ?? time, updateTime: time });
      return set(id, data);
    };
    storage.delete = id => { metadata.delete(metadataKey(storage, id)); return remove(id); };
    for (const [id] of storage) { const time = commitTime(); metadata.set(metadataKey(storage, id), { createTime: time, updateTime: time }); }
  }
  const reference = (id, storage = values, path = '') => ({
    id, path,
    get: async () => ({ id, exists: storage.has(id), ...metadata.get(metadataKey(storage, id)), data: () => storage.get(id) }),
    update: async data => {
      if (!storage.has(id)) throw new Error('Synthetic missing-document update');
      updates.push({ id, payload: data }); storage.set(id, { ...storage.get(id), ...data });
    },
  });
  let queue = Promise.resolve();
  const transactionTrace = [];
  return {
    operations, values, stations, transactionTrace,
    doc: path => reference(path.split('/').at(-1), bucket(path), path),
    collection: root => ({ doc: sub => ({ collection: () => ({
      where: () => ({ get: async () => ({ docs: programs.map(item => ({ ...item,
        data: () => values.get(item.id), ref: reference(item.id, values, `${root}/programs/programs/${item.id}`) })), size: programs.length }) }),
      doc: id => reference(id, sub === 'stations' ? stations : values, `${root}/${sub}/${sub}/${id}`),
    }) }) }),
    runTransaction(fn) {
      const task = queue.then(async () => {
        const trace = { reads: [], writes: [] }; transactionTrace.push(trace);
        const result = await fn({
          get: ref => { assert.equal(trace.writes.length, 0, 'transaction reads must precede writes'); trace.reads.push(ref.path); return ref.get(); },
          set: (ref, data) => { trace.writes.push({ path: ref.path, data, kind: 'set' }); },
          update: (ref, data) => { trace.writes.push({ path: ref.path, data, kind: 'update' }); },
        });
        for (const write of trace.writes) if (write.kind === 'update' && !bucket(write.path).has(write.path.split('/').at(-1))) throw new Error('Synthetic missing-document update');
        const time = commitTime();
        for (const write of trace.writes) {
          const storage = bucket(write.path), id = write.path.split('/').at(-1);
          storage.set(id, write.kind === 'set' ? write.data : { ...storage.get(id), ...write.data }, time);
          if (storage === values) updates.push({ id, payload: write.data });
        }
        return result;
      });
      queue = task.catch(() => {}); return task;
    },
  };
}

const upcoming = () => [{ id: 'race-program', data: () => ({ title: 'Synthetic', stationId: 'station', isActive: true, schedule: { weekdays: [1], startMinute: 600, endMinute: 660, utcOffsetMinutes: 180 } }) }];
const notifyDate = new Date('2026-10-19T06:55:00Z');
it('concurrent scheduled runs claim only one program send', async () => {
  const db = notificationStore(upcoming()); let sends = 0;
  const args = { firestore: db, messaging: { send: async () => { sends++; return 'ack'; } }, root: 'HudHudDev', now: notifyDate };
  await Promise.all([notifyUpcomingProgramsForRoot(args), notifyUpcomingProgramsForRoot(args)]);
  assert.equal(sends, 1);
  assert.equal([...db.operations.values()][0].status, 'sent');
});
it('known program send failure retries after backoff without marking the program notified', async () => {
  const updates = []; const db = notificationStore(upcoming(), updates); let sends = 0;
  const args = { firestore: db, messaging: { send: async () => { sends++; if (sends === 1) throw Object.assign(new Error('synthetic'), { code: 'messaging/server-unavailable' }); return 'ack'; } }, root: 'HudHudDev' };
  await notifyUpcomingProgramsForRoot({ ...args, now: notifyDate });
  assert.equal(updates.length, 0);
  assert.equal([...db.operations.values()][0].status, 'failed');
  await notifyUpcomingProgramsForRoot({ ...args, now: new Date(notifyDate.getTime() + 121000) });
  assert.equal(sends, 2); assert.equal(updates.length, 1);
});
it('lost program acknowledgement is explicit unknown and never automatically resent', async () => {
  const db = notificationStore(upcoming()); let sends = 0;
  const args = { firestore: db, messaging: { send: async () => { sends++; throw new Error('synthetic transport failure'); } }, root: 'HudHudOfficial', now: notifyDate };
  await notifyUpcomingProgramsForRoot(args); await notifyUpcomingProgramsForRoot(args);
  assert.equal(sends, 1); assert.equal([...db.operations.values()][0].status, 'unknown');
});
it('missing program sender never records an alert as delivered', async () => {
  const updates = []; const db = notificationStore(upcoming(), updates);
  const result = await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate });
  assert.equal(result.notified, 0); assert.equal(updates.length, 0); assert.equal(db.operations.size, 0);
});
it('a preparation read failure remains retryable because no send began', async () => {
  const db = notificationStore(upcoming()); const original = db.collection; let failed = false; let sends = 0;
  db.collection = root => {
    const parent = original(root);
    const originalDoc = parent.doc;
    parent.doc = sub => { if (sub === 'stations' && !failed) { failed = true; throw new Error('Synthetic pre-send read failure'); } return originalDoc(sub); };
    return parent;
  };
  const args = { firestore: db, messaging: { send: async () => { sends++; return 'ack'; } }, root: 'HudHudDev' };
  await notifyUpcomingProgramsForRoot({ ...args, now: notifyDate });
  assert.equal(sends, 0); assert.equal([...db.operations.values()][0].status, 'failed');
  await notifyUpcomingProgramsForRoot({ ...args, now: new Date(notifyDate.getTime() + 121000) });
  assert.equal(sends, 1);
});
it('provider acknowledgement survives failure of the compatibility date stamp', async () => {
  const programs = upcoming(); const db = notificationStore(programs); let sends = 0;
  const transact = db.runTransaction.bind(db); let stampFailures = 0;
  db.runTransaction = fn => transact(tx => fn({ ...tx, update: (ref, patch) => {
    if (patch.lastNotifiedDate !== undefined) { stampFailures++; throw new Error('Synthetic stamp failure'); }
    return tx.update(ref, patch);
  } }));
  const args = { firestore: db, messaging: { send: async () => { sends++; return 'ack'; } }, root: 'HudHudDev', now: notifyDate };
  await notifyUpcomingProgramsForRoot(args); await notifyUpcomingProgramsForRoot(args);
  assert.equal(sends, 1); assert.equal([...db.operations.values()][0].status, 'sent');
  assert.equal(stampFailures, 1, 'actual conditional stamp transaction failure hook must fire');
});

// R13 business RED uses the existing notifier, not a proposed timezone/migration
// export. Every field needed by the accepted schedule/station policy is explicit.
for (const [instant, expectedSends] of [['2026-10-19T07:00:00Z', 0], ['2026-10-19T10:00:00Z', 1]]) {
  it(`R13 explicit UTC offset: Monday10:00 at ${instant} sends ${expectedSends}`, async () => {
    const programs = [{ id: 'utc-program', data: () => ({ title: 'Synthetic UTC program', stationId: 'station', isActive: true,
      schedule: { weekdays: [1], startMinute: 600, endMinute: 660, utcOffsetMinutes: 0 } }) }];
    const updates = [], sent = [], firestore = notificationStore(programs, updates);
    const station = await firestore.collection('HudHudDev').doc('stations').collection('stations').doc('station').get();
    assert.equal(station.exists, true); assert.equal(station.data().isActive, true);
    const result = await notifyUpcomingProgramsForRoot({ firestore, root: 'HudHudDev', now: new Date(instant),
      messaging: { send: async message => { sent.push(message); return 'synthetic-in-memory-ack'; } } });
    assert.equal(sent.length, expectedSends, 'The accepted UTC schedule must use its own offset, not fixed Yemen eligibility.');
    assert.equal(result.notified, expectedSends); assert.equal(updates.length, expectedSends);
    if (expectedSends) {
      assert.equal(sent[0].topic, 'hudhuddev_program_utc-program');
      assert.equal(updates[0].payload.lastNotifiedDate, '2026-10-19');
      assert.equal([...firestore.operations.values()][0].status, 'sent');
    } else assert.equal(firestore.operations.size, 0, 'An ineligible UTC occurrence must not claim an intent.');
  });
}

const operationHash = tuple => createHash('sha256').update(JSON.stringify(tuple)).digest('hex');
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  it(`${root} uses the V2 occurrence key for an otherwise healthy due occurrence`, async () => {
    const db = notificationStore(upcoming()); let sends = 0;
    await notifyUpcomingProgramsForRoot({ firestore: db, root, now: notifyDate,
      messaging: { send: async () => { sends++; } } });
    assert.equal(sends, 1);
    assert.equal([...db.operations.values()][0].status, 'sent');
    assert.deepEqual([...db.operations.keys()], [operationHash(['program-start-v2', 'race-program', '2026-10-19'])]);
  });
  it(`${root} binds the prepared receipt to the accepted schedule fingerprint`, async () => {
    const db = notificationStore(upcoming()); let observed;
    await notifyUpcomingProgramsForRoot({ firestore: db, root, now: notifyDate,
      messaging: { send: async () => { observed = { ...[...db.operations.values()][0] }; } } });
    assert.equal(observed.phase, 'sending');
    assert.equal(observed.fingerprint, operationHash(['program-schedule-v2', 'race-program', 'station', true, true, [1], 600, 660, 180]));
  });
  for (const change of ['program inactive', 'station inactive', 'schedule changed', 'station relationship changed', 'display names changed']) {
    it(`${root} revalidates ${change} at the actual send-start transaction`, async () => {
      const db = notificationStore(upcoming()); const transact = db.runTransaction.bind(db);
      const originalDoc = db.doc.bind(db); const originalCollection = db.collection.bind(db);
      let preReads = 0, fired = 0; const messages = [];
      // Observe actual pre-send reads; the mutation hook is storage-only and runs before the next transaction.
      const observe = ref => { const get = ref.get; ref.get = async () => { preReads++; return get(); }; return ref; };
      db.collection = path => {
        const parent = originalCollection(path); const doc = parent.doc;
        parent.doc = sub => { const p = doc(sub); const collection = p.collection;
          p.collection = () => { const c = collection(); const cd = c.doc;
            c.doc = id => observe(cd(id)); return c; }; return p; };
        return parent;
      };
      db.doc = path => observe(originalDoc(path));
      db.runTransaction = fn => {
        if (!fired && preReads > 0 && [...db.operations.values()].some(value => value.phase === 'claimed')) {
          fired++;
          const program = db.values.get('race-program');
          if (change === 'program inactive') db.values.set('race-program', { ...program, isActive: false });
          if (change === 'station inactive') db.stations.set('station', { name: 'Synthetic station', isActive: false });
          if (change === 'schedule changed') db.values.set('race-program', { ...program, schedule: { ...program.schedule, startMinute: 601 } });
          if (change === 'station relationship changed') {
            db.stations.set('other', { name: 'Other station', isActive: true });
            db.values.set('race-program', { ...program, stationId: 'other' });
          }
          if (change === 'display names changed') {
            db.values.set('race-program', { ...program, title: 'Current title' });
            db.stations.set('station', { name: 'Current station', isActive: true });
          }
        }
        return transact(fn);
      };
      await notifyUpcomingProgramsForRoot({ firestore: db, root, now: notifyDate,
        messaging: { send: async message => { messages.push(message); } } });
      assert.equal(fired, 1, 'storage mutation hook must execute before actual startDelivery');
      assert.ok(preReads > 0);
      if (change === 'display names changed') {
        assert.equal(messages.length, 1);
        assert.ok(messages[0].notification.body.includes('Current title'));
        assert.ok(messages[0].notification.body.includes('Current station'));
      } else assert.equal(messages.length, 0, 'a stale prepared occurrence must not start sending');
    });
  }
  for (const status of ['sent', 'unknown', 'backoff']) {
    it(`${root} preserves legacy ${status} suppression without modifying raw evidence`, async () => {
      const db = notificationStore(upcoming()); let sends = 0;
      const key = operationHash(['race-program', '2026-10-19']);
      const receipt = { status: status === 'backoff' ? 'failed' : status, retryable: status === 'backoff',
        retryAt: Timestamp.fromMillis(notifyDate.getTime() + 60000), expiresAt: Timestamp.fromMillis(notifyDate.getTime() + 3600000) };
      db.operations.set(key, receipt);
      await notifyUpcomingProgramsForRoot({ firestore: db, root, now: notifyDate,
        messaging: { send: async () => { sends++; } } });
      assert.equal(sends, 0); assert.deepEqual(db.operations.get(key), receipt);
    });
  }
}

// Query fixture models storage ordering/filtering only; cleanup policy remains in the actual collector.
function collectionStore(entries) {
  const records = new Map(entries); const pageSizes = [];
  const ref = id => ({ id, path: `HudHudDev/notificationOperations/operations/${id}` });
  const query = (filters = [], cap = Infinity, ordering = []) => ({
    where: (field, op, value) => query([...filters, [field, op, value]], cap, ordering),
    orderBy: field => query(filters, cap, [...ordering, field]),
    limit: value => query(filters, value, ordering),
    get: async () => {
      const comparable = value => value?.toMillis?.() ?? value;
      const rows = [...records].filter(([id, value]) => filters.every(([field, op, expected]) => {
        const actual = comparable((field === '__name__' || field?.isEqual?.(FieldPath.documentId())) ? id : value[field]); const right = comparable(expected);
        return actual !== undefined && ({ '<=': actual <= right, '>=': actual >= right, '<': actual < right, '>': actual > right, '==': actual === right })[op];
      })).sort((a, b) => comparable(a[1].cleanupAt) - comparable(b[1].cleanupAt) || a[0].localeCompare(b[0])).slice(0, cap);
      pageSizes.push(rows.length);
      return { empty: rows.length === 0, docs: rows.map(([id, value]) => ({ id, ref: ref(id), data: () => value })) };
    },
  });
  return { records, pageSizes, collection: () => query(), batch: () => {
    const deletes = []; return { delete: reference => deletes.push(reference.id), commit: async () => deletes.forEach(id => records.delete(id)) };
  } };
}
it('collector retains raw program sent and unknown evidence while cleaning eligible broadcasts', async () => {
  const sent = operationHash(['sent-program', '2026-10-19']); const unknown = operationHash(['unknown-program', '2026-10-19']);
  const expired = { cleanupAt: Timestamp.fromMillis(1000), status: 'sent' };
  const db = collectionStore([[sent, expired], [unknown, { ...expired, status: 'unknown' }], ['broadcast_expired', expired], ['broadcast_fresh', { ...expired, cleanupAt: Timestamp.fromMillis(3000) }]]);
  await collectNotificationOperations({ firestore: db, root: 'HudHudDev', now: 2000 });
  assert.equal(db.records.has('broadcast_expired'), false);
  assert.equal(db.records.has('broadcast_fresh'), true);
  assert.equal(db.records.has(sent), true); assert.equal(db.records.has(unknown), true);
});
it('collector makes bounded broadcast progress despite an earlier raw-program retention backlog', async () => {
  const entries = Array.from({ length: 21 }, (_, index) => [operationHash(['program', index]), { cleanupAt: Timestamp.fromMillis(1000), status: 'sent' }]);
  const db = collectionStore([...entries, ['broadcast_due', { cleanupAt: Timestamp.fromMillis(1500), status: 'sent' }]]);
  await collectNotificationOperations({ firestore: db, root: 'HudHudOfficial', now: 2000 });
  assert.ok(db.pageSizes.every(size => size <= 20));
  assert.equal(db.records.has('broadcast_due'), false, 'retained program receipts must not starve eligible broadcast cleanup');
  assert.equal(entries.filter(([id]) => db.records.has(id)).length, 21);
});
it('collector preserves default broadcast retention cutoff and twenty-item bound', async () => {
  const db = collectionStore(Array.from({ length: 25 }, (_, index) => [`broadcast_${index}`, { cleanupAt: Timestamp.fromMillis(1000), status: 'sent' }]));
  await collectNotificationOperations({ firestore: db, root: 'HudHudDev', now: 2000 });
  assert.equal(db.records.size, 5); assert.deepEqual(db.pageSizes, [20]);
});

const offsetBoundaryCases = [
  { name: 'negative -720 offset uses previous local weekday', utc: '2026-10-19T00:05:00Z', weekdays: [7], startMinute: 725, endMinute: 780, offset: -720, expected: 1, date: '2026-10-18' },
  { name: '+840 rollover keys the local date instead of UTC date', utc: '2026-10-18T10:00:00Z', weekdays: [1], startMinute: 0, endMinute: 60, offset: 840, expected: 1, date: '2026-10-19' },
  { name: 'non-hour +345 offset remains eligible', utc: '2026-10-19T04:15:00Z', weekdays: [1], startMinute: 600, endMinute: 660, offset: 345, expected: 1, date: '2026-10-19' },
  { name: 'local midnight does not lead into tomorrow', utc: '2026-10-19T20:55:00Z', weekdays: [2], startMinute: 0, endMinute: 60, offset: 180, expected: 0 },
  { name: 'same local day inclusive ten-minute lead remains eligible', utc: '2026-10-19T06:50:00Z', weekdays: [1], startMinute: 600, endMinute: 660, offset: 180, expected: 1, date: '2026-10-19' },
];
for (const item of offsetBoundaryCases) {
  it(`C04 runtime boundary: ${item.name}`, async () => {
    const db = notificationStore([{ id: 'boundary', data: () => ({ title: 'Boundary', stationId: 'station', isActive: true,
      schedule: { weekdays: item.weekdays, startMinute: item.startMinute, endMinute: item.endMinute, utcOffsetMinutes: item.offset } }) }]);
    let sends = 0;
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: new Date(item.utc), messaging: { send: async () => { sends++; } } });
    assert.equal(sends, item.expected, 'eligibility must use the accepted offset-derived calendar');
    if (item.expected && item.offset === 840) assert.deepEqual([...db.operations.keys()], [operationHash(['program-start-v2', 'boundary', item.date])]);
    if (!item.expected) assert.equal(db.operations.size, 0);
  });
}
const invalidSchedules = [
  ['missing offset', { utcOffsetMinutes: undefined }], ['offset below -720', { utcOffsetMinutes: -721 }],
  ['offset above +840', { utcOffsetMinutes: 841 }], ['fractional offset', { utcOffsetMinutes: 180.5 }],
  ['string offset', { utcOffsetMinutes: '180' }], ['nonfinite offset', { utcOffsetMinutes: Infinity }],
  ['missing end', { endMinute: undefined }], ['end equals start', { endMinute: 600 }],
  ['end exceeds 1440', { endMinute: 1441 }], ['fractional end', { endMinute: 660.5 }],
  ['invalid weekday alongside valid weekday', { weekdays: [1, 8] }], ['string weekdays', { weekdays: '1' }],
  ['empty weekdays', { weekdays: [] }], ['fractional start', { startMinute: 600.5 }],
];
for (const [name, patch] of invalidSchedules) {
  it(`C04 runtime rejects ${name} without claiming or sending`, async () => {
    const program = upcoming()[0].data(); const schedule = { ...program.schedule, ...patch };
    for (const key of Object.keys(schedule)) if (schedule[key] === undefined) delete schedule[key];
    const db = notificationStore([{ id: 'race-program', data: () => ({ ...program, schedule }) }]); let sends = 0;
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async () => { sends++; } } });
    assert.equal(sends, 0); assert.equal(db.operations.size, 0);
  });
}
it('C04 runtime canonicalizes duplicate unordered weekdays in the persisted fingerprint', async () => {
  const program = upcoming()[0].data();
  const db = notificationStore([{ id: 'race-program', data: () => ({ ...program, schedule: { ...program.schedule, weekdays: [3, 1, 1] } }) }]); let sends = 0;
  await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async () => { sends++; } } });
  assert.equal(sends, 1);
  assert.equal([...db.operations.values()][0].fingerprint, operationHash(['program-schedule-v2', 'race-program', 'station', true, true, [1, 3], 600, 660, 180]));
});
it('C04 actual start transaction reads program, station and overlapping legacy evidence before sending', async () => {
  const db = notificationStore(upcoming()); let sends = 0;
  await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async () => { sends++; } } });
  assert.equal(sends, 1);
  const start = db.transactionTrace.find(trace => trace.writes.some(write => write.data.phase === 'sending'));
  assert.ok(start, 'actual sending transition must be observed');
  for (const path of ['HudHudDev/programs/programs/race-program', 'HudHudDev/stations/stations/station',
    `HudHudDev/notificationOperations/operations/${operationHash(['race-program', '2026-10-19'])}`]) {
    assert.ok(start.reads.includes(path), `actual start transaction must read ${path}`);
  }
});
for (const change of ['program missing', 'station missing', 'program deleting', 'station deleting']) {
  it(`C04 actual start refuses ${change} after a healthy preparation`, async () => {
    const db = notificationStore(upcoming()); const transact = db.runTransaction.bind(db); let fired = 0, sends = 0;
    db.runTransaction = fn => {
      if (!fired && [...db.operations.values()].some(value => value.phase === 'claimed')) {
        fired++;
        if (change === 'program missing') db.values.delete('race-program');
        if (change === 'station missing') db.stations.delete('station');
        if (change === 'program deleting') db.values.set('race-program', { ...db.values.get('race-program'), adminDeletionToken: 'synthetic-deletion' });
        if (change === 'station deleting') db.stations.set('station', { ...db.stations.get('station'), adminDeletionToken: 'synthetic-deletion' });
      }
      return transact(fn);
    };
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async () => { sends++; } } });
    assert.equal(fired, 1); assert.equal(sends, 0);
  });
}

it('committed start retry replaces prepared payload with the successful transaction snapshots', async () => {
  const db = notificationStore(upcoming()); const transact = db.runTransaction.bind(db); let retried = 0; const messages = [];
  db.runTransaction = fn => transact(async tx => {
    if (!retried && [...db.operations.values()].some(data => data.phase === 'claimed')) {
      retried++;
      await fn({ ...tx, update: () => {} }); // Discard the first attempt's writes, as a retry does.
      assert.equal(messages.length, 0);
      db.values.set('race-program', { ...db.values.get('race-program'), title: 'Successful attempt title' });
      db.stations.set('station', { ...db.stations.get('station'), name: 'Successful attempt station' });
    }
    return fn(tx);
  });
  await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async message => { messages.push(message); } } });
  assert.equal(retried, 1); assert.equal(messages.length, 1);
  assert.ok(messages[0].notification.body.includes('Successful attempt title'));
  assert.ok(messages[0].notification.body.includes('Successful attempt station'));
});
for (const source of ['program', 'station']) {
  it(`actual start rejects an identical-data ${source} delete/recreate after preparation`, async () => {
    const db = notificationStore(upcoming()); const transact = db.runTransaction.bind(db); let fired = 0, sends = 0;
    db.runTransaction = fn => {
      if (!fired && [...db.operations.values()].some(data => data.phase === 'claimed')) {
        fired++; const map = source === 'program' ? db.values : db.stations, id = source === 'program' ? 'race-program' : 'station';
        const body = map.get(id); map.delete(id); map.set(id, body);
      }
      return transact(fn);
    };
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async () => { sends++; } } });
    assert.equal(fired, 1); assert.equal(sends, 0);
  });
}
for (const change of ['schedule edit', 'program reincarnation', 'newer version2 date']) {
  it(`acknowledgement retains sent receipt without stale stamp after ${change}`, async () => {
    const updates = [], db = notificationStore(upcoming(), updates); let sends = 0;
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async () => {
      sends++; const data = db.values.get('race-program');
      if (change === 'schedule edit') db.values.set('race-program', { ...data, schedule: { ...data.schedule, endMinute: 700 } });
      if (change === 'program reincarnation') { db.values.delete('race-program'); db.values.set('race-program', data); }
      if (change === 'newer version2 date') db.values.set('race-program', { ...data, lastNotifiedDate: '2026-10-20', lastNotifiedPolicyVersion: 2 });
    } } });
    assert.equal(sends, 1); assert.equal(updates.length, 0);
    assert.equal([...db.operations.values()][0].status, 'sent');
    if (change === 'newer version2 date') assert.equal(db.values.get('race-program').lastNotifiedDate, '2026-10-20');
  });
}
for (const legacy of ['pending prepared', 'pending sending live', 'pending sending expired', 'retryable ready', 'retryable backoff', 'nonretryable', 'malformed']) {
  it(`legacy ${legacy} cannot be bypassed with a fresh V2 claim`, async () => {
    const db = notificationStore(upcoming()); const now = notifyDate.getTime(); let sends = 0;
    const stamp = value => Timestamp.fromMillis(value);
    const record = { status: 'pending', phase: 'claimed', lease: 'synthetic-legacy', attempts: 2,
      leaseUntil: stamp(now + 10000), createdAt: stamp(now - 5000), updatedAt: stamp(now - 4000),
      expiresAt: stamp(now + 100000), cleanupAt: stamp(now + 200000) };
    if (legacy.startsWith('pending sending')) { record.phase = 'sending'; record.leaseUntil = stamp(now + (legacy.endsWith('expired') ? -1 : 10000)); }
    if (legacy.startsWith('retryable')) Object.assign(record, { status: 'failed', retryable: true, reason: 'messaging/server-unavailable', retryAt: stamp(now + (legacy.endsWith('ready') ? -1 : 10000)) });
    if (legacy === 'nonretryable') Object.assign(record, { status: 'failed', retryable: false, reason: 'ineligible' });
    if (legacy === 'malformed') Object.assign(record, { status: 'unsupported', attempts: 0 });
    const key = operationHash(['race-program', '2026-10-19']); db.operations.set(key, record);
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: notifyDate, messaging: { send: async () => { sends++; } } });
    assert.equal(sends, 0); assert.equal(db.operations.size, 1); assert.deepEqual(db.operations.get(key), record);
  });
}
it('overlapping Yemen-date terminal evidence suppresses the offset-derived occurrence', async () => {
  const program = upcoming()[0].data();
  const db = notificationStore([{ id: 'race-program', data: () => ({ ...program, schedule: { weekdays: [1], startMinute: 0, endMinute: 60, utcOffsetMinutes: 840 } }) }]);
  const legacyKey = operationHash(['race-program', '2026-10-18']); db.operations.set(legacyKey, { status: 'sent' }); let sends = 0;
  await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: new Date('2026-10-18T10:00:00Z'), messaging: { send: async () => { sends++; } } });
  assert.equal(sends, 0); assert.equal(db.operations.size, 1); assert.equal(db.operations.get(legacyKey).status, 'sent');
});
it('version2 local stamp is not reinterpreted as a different overlapping Yemen date', async () => {
  const program = upcoming()[0].data(); let sends = 0;
  const db = notificationStore([{ id: 'race-program', data: () => ({ ...program, lastNotifiedDate: '2026-10-18', lastNotifiedPolicyVersion: 2,
    schedule: { weekdays: [1], startMinute: 0, endMinute: 60, utcOffsetMinutes: 840 } }) }]);
  await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: new Date('2026-10-18T10:00:00Z'), messaging: { send: async () => { sends++; } } });
  assert.equal(sends, 1); assert.equal(db.values.get('race-program').lastNotifiedDate, '2026-10-19');
  assert.equal(db.values.get('race-program').lastNotifiedPolicyVersion, 2);
});

async function reviewedCarryStore(decision, offset = 180) {
  const program = upcoming()[0].data();
  const db = notificationStore([{ id: 'race-program', data: () => ({ ...program, schedule: { ...program.schedule, utcOffsetMinutes: offset } }) }]);
  const instant = new Date(offset === 0 ? '2026-10-19T09:55:00Z' : notifyDate);
  const now = instant.getTime(), stamp = ms => Timestamp.fromMillis(ms);
  const dates = offset === 0 ? ['2026-10-19', '2026-10-20'] : ['2026-10-19'];
  const key = operationHash(['race-program', dates[0]]);
  const data = { status: decision === 'carried-prepared' ? 'pending' : 'failed', phase: 'claimed', lease: 'reviewed-old-lease', attempts: 3,
    retryable: true, reason: 'preparation-failed', leaseUntil: stamp(now - 1000), retryAt: stamp(now - 1000),
    createdAt: stamp(now - 10000), updatedAt: stamp(now - 5000), expiresAt: stamp(now + 600000), cleanupAt: stamp(now + 86400000) };
  db.operations.set(key, data);
  const sourceRef = db.doc(`HudHudDev/notificationOperations/operations/${key}`), source = await sourceRef.get();
  const birth = (await db.doc('HudHudDev/programs/programs/race-program').get()).createTime;
  const fp = operationHash(['program-schedule-v2', 'race-program', 'station', true, true, [1], 600, 660, offset]);
  const proof = { version: 1, manifestHash: 'a'.repeat(64), cutoverAt: stamp(now - 2000), programCreateTime: birth, scheduleFingerprint: fp,
    legacyDates: dates, legacyKeys: dates.map(date => operationHash(['race-program', date])), evidenceHashes: ['b'.repeat(64)], decision,
    legacySourceKey: key, legacySourceCreateTime: source.createTime, legacySourceUpdateTime: source.updateTime, recordedAt: stamp(now - 1000) };
  const v2Key = operationHash(['program-start-v2', 'race-program', '2026-10-19']);
  db.operations.set(v2Key, { ...data, fingerprint: fp, programCompatibility: proof });
  return { db, instant, key, v2Key, data, proof };
}
for (const decision of ['carried-prepared', 'carried-retryable']) {
  it(`runtime reclaims an exact reviewed ${decision} without resetting original clocks or lineage`, async () => {
    const { db, instant, key, v2Key, data, proof } = await reviewedCarryStore(decision); let sends = 0;
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: instant, messaging: { send: async () => { sends++; } } });
    assert.equal(sends, 1); assert.equal(db.operations.get(v2Key).status, 'sent');
    assert.equal(db.operations.get(v2Key).attempts, 4); assert.deepEqual(db.operations.get(v2Key).programCompatibility, proof);
    for (const field of ['createdAt', 'expiresAt', 'cleanupAt']) assert.deepEqual(db.operations.get(v2Key)[field], data[field]);
    assert.deepEqual(db.operations.get(key), data);
  });
}
it('reviewed carry validates two ascending date/key tuples without independently sorting hashes', async () => {
  const { db, instant, v2Key, proof } = await reviewedCarryStore('carried-prepared', 0); let sends = 0;
  await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: instant, messaging: { send: async () => { sends++; } } });
  assert.equal(sends, 1); assert.deepEqual(db.operations.get(v2Key).programCompatibility.legacyKeys, proof.legacyKeys);
});
for (const invalid of ['source ABA', 'wrong program birth', 'malformed proof', 'reset original clock', 'new restrictive alias after lease']) {
  it(`runtime holds a reviewed carry after ${invalid}`, async () => {
    const { db, instant, key, v2Key, data, proof } = await reviewedCarryStore('carried-prepared'); let sends = 0, fired = 0;
    if (invalid === 'source ABA') { db.operations.set(key, { ...data, reason: 'temporary' }); db.operations.set(key, data); }
    if (invalid === 'wrong program birth') db.operations.set(v2Key, { ...db.operations.get(v2Key), programCompatibility: { ...proof, programCreateTime: new Timestamp(1700000000, 1) } });
    if (invalid === 'malformed proof') db.operations.set(v2Key, { ...db.operations.get(v2Key), programCompatibility: { ...proof, unknown: true } });
    if (invalid === 'reset original clock') db.operations.set(v2Key, { ...db.operations.get(v2Key), expiresAt: Timestamp.fromMillis(instant.getTime() + 3600000) });
    if (invalid === 'new restrictive alias after lease') {
      const transact = db.runTransaction.bind(db);
      db.runTransaction = fn => {
        if (!fired && db.operations.get(v2Key).attempts === 4) { fired++; db.operations.set(key, { ...data, status: 'sent' }); }
        return transact(fn);
      };
    }
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: instant, messaging: { send: async () => { sends++; } } });
    assert.equal(sends, 0);
    if (invalid === 'new restrictive alias after lease') {
      assert.equal(fired, 1); assert.equal(db.operations.get(v2Key).status, 'unknown');
      assert.equal(db.operations.get(v2Key).reason, 'legacy-compatibility-suppression');
    } else assert.equal(db.operations.get(v2Key).attempts, 3);
  });
}

for (const [instant, offset] of [['0001-01-01T06:55:00Z', 180], ['9999-12-31T09:55:00Z', 0]]) {
  it(`runtime refuses a derived day interval outside native calendar bounds at ${instant}`, async () => {
    const utc = new Date(instant), local = new Date(utc.getTime() + offset * 60000); let sends = 0;
    const db = notificationStore([{ id: 'native-bound', data: () => ({ title: 'Native bound', stationId: 'station', isActive: true,
      schedule: { weekdays: [local.getUTCDay() || 7], startMinute: 600, endMinute: 660, utcOffsetMinutes: offset } }) }]);
    await notifyUpcomingProgramsForRoot({ firestore: db, root: 'HudHudDev', now: utc, messaging: { send: async () => { sends++; } } });
    assert.equal(sends, 0); assert.equal(db.operations.size, 0);
  });
}
