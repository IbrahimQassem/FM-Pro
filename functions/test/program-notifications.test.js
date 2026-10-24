import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
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
            schedule: { weekdays: [1], startMinute: 600, endMinute: 660 },
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
            schedule: { weekdays: [1], startMinute: 600, endMinute: 660 },
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
  const operations = new Map();
  const reference = (id, operation = false) => ({
    id,
    get: async () => ({ exists: (operation ? operations : values).has(id), data: () => (operation ? operations : values).get(id) }),
    update: async data => { updates.push({ id, payload: data }); values.set(id, { ...values.get(id), ...data }); },
  });
  const docs = programs.map(item => ({ ...item, ref: reference(item.id) }));
  let queue = Promise.resolve();
  return {
    operations,
    doc: path => reference(path.split('/').at(-1), true),
    collection: () => ({ doc: sub => ({ collection: () => ({
      where: () => ({ get: async () => ({ docs, size: docs.length }) }),
      doc: () => ({ get: async () => ({ exists: true, data: () => ({ name: 'Synthetic station' }) }) }),
    }) }) }),
    runTransaction(fn) {
      const task = queue.then(() => fn({
        get: ref => ref.get(),
        set: (ref, data) => operations.set(ref.id, data),
        update: (ref, data) => operations.set(ref.id, { ...operations.get(ref.id), ...data }),
      }));
      queue = task.catch(() => {}); return task;
    },
  };
}
const upcoming = () => [{ id: 'race-program', data: () => ({ title: 'Synthetic', stationId: 'station', isActive: true, schedule: { weekdays: [1], startMinute: 600 } }) }];
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
  const collection = db.collection;
  db.collection = root => ({ doc: sub => ({ collection: () => {
    const source = collection(root).doc(sub).collection();
    if (sub === 'programs') return { ...source, where: () => ({ get: async () => ({ size: 1, docs: [{ ...programs[0], ref: { get: async () => ({ data: programs[0].data }), update: async () => { throw new Error('Synthetic stamp failure'); } } }] }) }) };
    return source;
  } }) });
  const args = { firestore: db, messaging: { send: async () => { sends++; return 'ack'; } }, root: 'HudHudDev', now: notifyDate };
  await notifyUpcomingProgramsForRoot(args); await notifyUpcomingProgramsForRoot(args);
  assert.equal(sends, 1); assert.equal([...db.operations.values()][0].status, 'sent');
});
