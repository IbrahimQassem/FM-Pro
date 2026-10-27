
// B16 guard-only native component verification. Unique demo projects prevent the
// root-wide notifier from touching unrelated primary count/editorial fixtures.
// These invoke real SDK transactions with synthetic in-memory sends only; they
// do not prove deployed scheduling, FCM, production isolation, indexes or billing.
import { createHash as programNativeCreateHash } from 'node:crypto';
import { notifyUpcomingProgramsForRoot, collectNotificationOperations } from '../../functions/lib/program-notifications.js';
import { createProgramDateDemoFirestore, ProgramDateBackupStore, previewProgramNotificationDates,
  executeProgramNotificationDateMigration } from '../../tool/migrate_program_notification_dates.mjs';
const { Timestamp: ProgramNativeTimestamp, FieldPath: ProgramNativeFieldPath } = require('firebase-admin/firestore');
const programNativeHash = tuple => programNativeCreateHash('sha256').update(JSON.stringify(tuple)).digest('hex');
const programNativeRoots = ['HudHudDev', 'HudHudOfficial'];
const programNativeSleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function programNativeSession(run) {
  const projectId = `demo-program-native-${randomUUID()}`, emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  assert.match(projectId, /^demo-/); assert.match(emulatorHost ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  const secondary = initializeApp({ projectId }, projectId), firestore = getFirestore(secondary);
  const owned = createProgramDateDemoFirestore({ projectId, emulatorHost });
  const directory = await mkdtemp(join(tmpdir(), 'hudhud-program-native-')); await chmod(directory, 0o700);
  const key = randomBytes(32), expiresAt = Date.now() + 7 * 86400000, tracked = new Set();
  try {
    const store = await ProgramDateBackupStore.open({ directory, key, expiresAt });
    await run({ projectId, emulatorHost, db: firestore, owned, store, directory, key, expiresAt, tracked });
  } finally {
    // Exact tracked synthetic documents only; no primary/root-wide deletion.
    try { for (const path of tracked) await firestore.recursiveDelete(firestore.doc(path)); }
    finally { key.fill(0); await owned.terminate(); await deleteApp(secondary); await rm(directory, { recursive: true, force: true }); }
  }
}
async function programNativeSeed(f, root, schedule = { weekdays: [1], startMinute: 600, endMinute: 660, utcOffsetMinutes: 0 }) {
  const id = `native-program-${randomUUID()}`, stationId = `native-station-${randomUUID()}`;
  const station = f.db.doc(`${root}/stations/stations/${stationId}`), program = f.db.doc(`${root}/programs/programs/${id}`);
  f.tracked.add(station.path); f.tracked.add(program.path);
  await station.create({ name: 'Synthetic native station', isActive: true });
  await program.create({ title: 'Synthetic native program', stationId, isActive: true, schedule });
  return { root, id, stationId, station, program, schedule };
}
const programNativeOperation = (f, p, date) => {
  const ref = f.db.doc(`${p.root}/notificationOperations/operations/${programNativeHash(['program-start-v2', p.id, date])}`);
  f.tracked.add(ref.path); return ref;
};
async function programNativeLegacy(f, p, date, data) {
  const ref = f.db.doc(`${p.root}/notificationOperations/operations/${programNativeHash([p.id, date])}`);
  f.tracked.add(ref.path); await ref.create(data); return ref;
}
const programNativeEqualVersion = (actual, expected) => {
  assert.equal(actual.seconds, expected.seconds); assert.equal(actual.nanoseconds, expected.nanoseconds); assert.equal(actual.isEqual(expected), true);
};
async function programNativeInput(f, p, { fromLocalDate: selectedDate, toLocalDate, maxItems = 25, store = f.store } = {}) {
  const cutoverAt = new Date().toISOString(), fromLocalDate = selectedDate ?? cutoverAt.slice(0, 10);
  const options = { projectId: f.projectId, root: p.root, programId: p.id, fromLocalDate, toLocalDate: toLocalDate ?? fromLocalDate, cutoverAt, maxItems };
  const manifest = await previewProgramNotificationDates(options, f.owned); await store.put(manifest);
  const job = f.db.doc(`${p.root}/notificationOperations/operations/program_date_migration_${manifest.manifestHash}`);
  f.tracked.add(job.path);
  for (const item of manifest.items) {
    f.tracked.add(`${p.root}/notificationOperations/operations/${item.v2Key}`);
    for (const legacy of item.legacy) f.tracked.add(`${p.root}/notificationOperations/operations/${legacy.key}`);
  }
  return { options, manifest, store, reviewedHash: manifest.manifestHash, owner: `native-owner-${randomUUID()}`, job };
}
const programNativeApply = (f, input, mode = 'apply', extra = {}) => executeProgramNotificationDateMigration({ ...input.options, mode, ...(extra.options ?? {}) }, extra.firestore ?? f.owned,
  { manifest: input.manifest, store: extra.store ?? input.store, reviewedHash: input.reviewedHash, owner: extra.owner ?? input.owner });
const programNativeItem = (input, index = 0) => input.job.collection('items').doc(String(index).padStart(3, '0'));
const programNativeDefaultSchedule = () => ({ weekdays: [1, 2, 3, 4, 5, 6, 7], startMinute: 1439, endMinute: 1440, utcOffsetMinutes: 0 });
async function programNativeCurrent(f, root) {
  return programNativeSeed(f, root, programNativeDefaultSchedule());
}
async function programNativeSnapshot(ref) {
  const snapshot = await ref.get();
  return snapshot.exists ? { exists: true, data: snapshot.data(), createTime: snapshot.createTime, updateTime: snapshot.updateTime } : { exists: false };
}
async function programNativeUnchanged(ref, before) { assert.deepEqual(await programNativeSnapshot(ref), before); }
async function programNativeAba(ref) {
  const before = await ref.get(); assert.equal(before.exists, true);
  await ref.update({ nativeFixtureTemporary: true }); await ref.set(before.data());
  const after = await ref.get(); assert.equal(after.updateTime.isEqual(before.updateTime), false, 'ABA must have a changed native version');
  assert.deepEqual(after.data(), before.data()); return { before, after };
}
async function programNativePendingAck(f, input, phase = 'item') {
  const original = Transaction.prototype.commit; assert.equal(typeof original, 'function'); let fired = false;
  Transaction.prototype.commit = async function (...args) {
    const hasWrites = this._writeBatch && !this._writeBatch.isEmpty, result = await original.apply(this, args);
    if (hasWrites && !fired) {
      const job = await input.job.get();
      const matches = job.exists && (phase === 'item' ? job.get('pendingReceiptIndex') === 0 :
        job.get('pendingReceiptIndex') === null && job.get('receiptVersions')?.length === 1 && job.get('status') === 'completed');
      if (matches) { fired = true; throw Object.assign(new Error('Synthetic acknowledgement loss AFTER real native commit'), { code: 'synthetic-program-native-ack-loss' }); }
    }
    return result;
  };
  try { await assert.rejects(programNativeApply(f, input), error => error.code === 'synthetic-program-native-ack-loss'); }
  finally { Transaction.prototype.commit = original; }
  assert.equal(fired, true, 'the injection must follow a genuine SDK commit');
}

for (const root of programNativeRoots) {
  test(`${root}: native notifier UTC schedule, V2 intent and policy stamp use local time with synthetic sends`, async () => programNativeSession(async f => {
    const p = await programNativeSeed(f, root), operation = programNativeOperation(f, p, '2026-10-19'), messages = [];
    const call = now => notifyUpcomingProgramsForRoot({ firestore: f.db, root, now: new Date(now), messaging: { send: async message => { messages.push(message); } } });
    assert.equal((await call('2026-10-19T07:00:00Z')).notified, 0); assert.equal(messages.length, 0); assert.equal((await operation.get()).exists, false);
    assert.equal((await call('2026-10-19T10:00:00Z')).notified, 1); assert.equal(messages.length, 1);
    assert.equal(messages[0].data.programId, p.id); assert.equal(messages[0].topic, root === 'HudHudOfficial' ? `program_${p.id}` : `hudhuddev_program_${p.id}`);
    const receipt = await operation.get(); assert.equal(receipt.get('status'), 'sent');
    assert.equal(receipt.get('fingerprint'), programNativeHash(['program-schedule-v2', p.id, p.stationId, true, true, [1], 600, 660, 0]));
    const source = await p.program.get(); assert.equal(source.get('lastNotifiedDate'), '2026-10-19'); assert.equal(source.get('lastNotifiedPolicyVersion'), 2);
    const beforeReplay = await programNativeSnapshot(operation);
    await call('2026-10-19T10:00:00Z'); assert.equal(messages.length, 1); await programNativeUnchanged(operation, beforeReplay);
  }));
  test(`${root}: actual concurrent native claims send at most once and unknown acknowledgement never replays`, async () => programNativeSession(async f => {
    const p = await programNativeSeed(f, root), operation = programNativeOperation(f, p, '2026-10-19'); let sends = 0;
    const args = { firestore: f.db, root, now: new Date('2026-10-19T10:00:00Z'), messaging: { send: async () => { sends++; } } };
    const result = await Promise.all([notifyUpcomingProgramsForRoot(args), notifyUpcomingProgramsForRoot(args)]);
    assert.equal(sends, 1); assert.equal(result.reduce((sum, value) => sum + value.notified, 0), 1); assert.equal((await operation.get()).get('status'), 'sent');
    const q = await programNativeSeed(f, root), uncertain = programNativeOperation(f, q, '2026-10-19'); let unknown = 0;
    const lost = { ...args, messaging: { send: async () => { unknown++; throw new Error('Synthetic uncertain delivery'); } } };
    await notifyUpcomingProgramsForRoot(lost); const before = await programNativeSnapshot(uncertain);
    await notifyUpcomingProgramsForRoot(lost); assert.equal(unknown, 1); assert.equal(before.data.status, 'unknown'); await programNativeUnchanged(uncertain, before);
  }));
}
for (const item of [
  { name: '-720 previous weekday', now: '2026-10-19T00:05:00Z', date: '2026-10-18', weekdays: [7], startMinute: 725, endMinute: 780, offset: -720 },
  { name: '+840 next local date', now: '2026-10-18T10:00:00Z', date: '2026-10-19', weekdays: [1], startMinute: 0, endMinute: 60, offset: 840 },
  { name: '+345 non-hour offset', now: '2026-10-19T04:15:00Z', date: '2026-10-19', weekdays: [1], startMinute: 600, endMinute: 660, offset: 345 },
]) test(`native offset boundary ${item.name} persists the offset-derived occurrence key`, async () => programNativeSession(async f => {
  const p = await programNativeSeed(f, 'HudHudDev', { weekdays: item.weekdays, startMinute: item.startMinute, endMinute: item.endMinute, utcOffsetMinutes: item.offset });
  const operation = programNativeOperation(f, p, item.date); let sends = 0;
  await notifyUpcomingProgramsForRoot({ firestore: f.db, root: p.root, now: new Date(item.now), messaging: { send: async () => { sends++; } } });
  assert.equal(sends, 1); assert.equal((await operation.get()).get('status'), 'sent'); assert.equal((await p.program.get()).get('lastNotifiedDate'), item.date);
}));
test('native notifier retains the same-local-day no-next-day lead boundary', async () => programNativeSession(async f => {
  const p = await programNativeSeed(f, 'HudHudDev', { weekdays: [2], startMinute: 0, endMinute: 60, utcOffsetMinutes: 180 }); let sends = 0;
  const operation = programNativeOperation(f, p, '2026-10-20');
  await notifyUpcomingProgramsForRoot({ firestore: f.db, root: p.root, now: new Date('2026-10-19T20:55:00Z'), messaging: { send: async () => { sends++; } } });
  assert.equal(sends, 0); assert.equal((await operation.get()).exists, false);
}));
for (const mutation of ['schedule', 'inactive program', 'inactive station', 'station relationship', 'deleting program', 'deleting station', 'missing program', 'missing station', 'program recreation', 'station recreation']) {
  test(`native delivery-start revalidation refuses ${mutation} before its source read`, async () => programNativeSession(async f => {
    const p = await programNativeSeed(f, 'HudHudDev'), operation = programNativeOperation(f, p, '2026-10-19');
    const alternate = f.db.doc(`${p.root}/stations/stations/native-other-${randomUUID()}`);
    if (mutation === 'station relationship') { f.tracked.add(alternate.path); await alternate.create({ isActive: true, name: 'Synthetic other station' }); }
    const beforeProgram = await p.program.get(), beforeStation = await p.station.get(), originalGet = Transaction.prototype.get; let fired = false, sends = 0;
    Transaction.prototype.get = async function (ref, ...args) {
      if (!fired && ref?.path === p.program.path) {
        fired = true; const claimed = await operation.get(); assert.equal(claimed.get('phase'), 'claimed');
        // Program/station are not yet read-locked by this actual start TX.
        if (mutation === 'schedule') await p.program.update({ 'schedule.startMinute': 601 });
        if (mutation === 'inactive program') await p.program.update({ isActive: false });
        if (mutation === 'inactive station') await p.station.update({ isActive: false });
        if (mutation === 'station relationship') await p.program.update({ stationId: alternate.id });
        if (mutation === 'deleting program') await p.program.update({ adminDeletionToken: 'synthetic-native-deletion' });
        if (mutation === 'deleting station') await p.station.update({ adminDeletionToken: 'synthetic-native-deletion' });
        if (mutation === 'missing program' || mutation === 'program recreation') await p.program.delete();
        if (mutation === 'missing station' || mutation === 'station recreation') await p.station.delete();
        if (mutation === 'program recreation') await p.program.create(beforeProgram.data());
        if (mutation === 'station recreation') await p.station.create(beforeStation.data());
      }
      return originalGet.call(this, ref, ...args);
    };
    try { await notifyUpcomingProgramsForRoot({ firestore: f.db, root: p.root, now: new Date('2026-10-19T10:00:00Z'), messaging: { send: async () => { sends++; } } }); }
    finally { Transaction.prototype.get = originalGet; }
    assert.equal(fired, true); assert.equal(sends, 0);
    const stationChanged = ['inactive station', 'deleting station', 'missing station', 'station recreation'].includes(mutation);
    const changed = await (stationChanged ? p.station : p.program).get(), previous = stationChanged ? beforeStation : beforeProgram;
    if (mutation.startsWith('missing')) assert.equal(changed.exists, false);
    else assert.equal(changed.updateTime.isEqual(previous.updateTime), false, 'The actual source version must change');
    if (mutation === 'program recreation') assert.equal((await p.program.get()).createTime.isEqual(beforeProgram.createTime), false);
    if (mutation === 'station recreation') assert.equal((await p.station.get()).createTime.isEqual(beforeStation.createTime), false);
    assert.notEqual((await operation.get()).get('phase'), 'sending');
  }));
}
test('native retry rebuilds display payload from the successful start transaction snapshots', async () => programNativeSession(async f => {
  const p = await programNativeSeed(f, 'HudHudDev'), operation = programNativeOperation(f, p, '2026-10-19'), messages = [];
  const originalGet = Transaction.prototype.get, originalCommit = Transaction.prototype.commit; let start, injected = false, edit, reads = 0;
  Transaction.prototype.get = async function (ref, ...args) {
    if (ref?.path === p.program.path) {
      reads++; if (!start) start = this;
      if (injected && this !== start) await edit;
    }
    return originalGet.call(this, ref, ...args);
  };
  Transaction.prototype.commit = async function (...args) {
    if (!injected && this === start) {
      injected = true;
      // Queue edits but NEVER await competing writes while this TX holds reads.
      edit = Promise.all([p.program.update({ title: 'Successful native title' }), p.station.update({ name: 'Successful native station' })]);
      edit.catch(() => {});
      throw Object.assign(new Error('Synthetic pre-dispatch native retry'), { code: 10 });
    }
    return originalCommit.apply(this, args);
  };
  try {
    await notifyUpcomingProgramsForRoot({ firestore: f.db, root: p.root, now: new Date('2026-10-19T10:00:00Z'), messaging: { send: async message => {
      assert.equal((await operation.get()).get('phase'), 'sending'); messages.push(message);
    } } });
  } finally { Transaction.prototype.get = originalGet; Transaction.prototype.commit = originalCommit; if (edit) await edit; }
  assert.equal(injected, true); assert.ok(reads >= 2); assert.equal(messages.length, 1);
  assert.ok(messages[0].notification.body.includes('Successful native title')); assert.ok(messages[0].notification.body.includes('Successful native station'));
}));
for (const mutation of ['schedule edit', 'program recreation', 'newer policy2 date']) test(`native provider-ack stamp preserves sent authority after ${mutation}`, async () => programNativeSession(async f => {
  const p = await programNativeSeed(f, 'HudHudOfficial'), operation = programNativeOperation(f, p, '2026-10-19'); let sends = 0;
  const birth = await p.program.get();
  const result = await notifyUpcomingProgramsForRoot({ firestore: f.db, root: p.root, now: new Date('2026-10-19T10:00:00Z'), messaging: { send: async () => {
    sends++;
    if (mutation === 'schedule edit') await p.program.update({ 'schedule.endMinute': 700 });
    if (mutation === 'program recreation') { await p.program.delete(); await p.program.create(birth.data()); }
    if (mutation === 'newer policy2 date') await p.program.update({ lastNotifiedDate: '2026-10-20', lastNotifiedPolicyVersion: 2 });
  } } });
  assert.equal(sends, 1); assert.equal(result.notified, 1); assert.equal(result.skipped, 0); assert.equal((await operation.get()).get('status'), 'sent');
  const after = await p.program.get(); assert.equal(after.get('lastNotifiedDate'), mutation === 'newer policy2 date' ? '2026-10-20' : undefined);
  if (mutation === 'program recreation') assert.equal(after.createTime.isEqual(birth.createTime), false);
}));

for (const root of programNativeRoots) {
  test(`${root}: real owned date migration preserves sources and seals the exact native suppression commit`, async () => programNativeSession(async f => {
    const p = await programNativeCurrent(f, root), date = new Date().toISOString().slice(0, 10), legacy = await programNativeLegacy(f, p, date, { status: 'sent' });
    const sources = await Promise.all([p.program, p.station, legacy].map(programNativeSnapshot));
    const input = await programNativeInput(f, p, { fromLocalDate: date }); assert.equal((await input.job.get()).exists, false);
    const operation = f.db.doc(`${root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`);
    const result = await programNativeApply(f, input); assert.equal(result.completed, true); assert.equal(result.applied, 1);
    const target = await operation.get(), receipt = await programNativeItem(input).get(), job = await input.job.get();
    assert.equal(target.get('status'), 'unknown'); assert.equal(target.get('reason'), 'legacy-compatibility-suppression'); assert.equal(target.get('retryable'), false);
    assert.equal(receipt.get('action'), 'created-suppression'); assert.equal(receipt.get('targetChanged'), true);
    assert.equal(receipt.get('targetCreateTime'), null); assert.equal(receipt.get('targetUpdateTime'), null);
    programNativeEqualVersion(target.createTime, receipt.updateTime); programNativeEqualVersion(target.updateTime, receipt.updateTime);
    programNativeEqualVersion(receipt.createTime, receipt.updateTime); programNativeEqualVersion(job.get('receiptVersions')[0], receipt.updateTime);
    assert.equal(job.get('pendingReceiptIndex'), null); assert.equal(job.get('status'), 'completed');
    assert.equal(target.get('programCompatibility.manifestHash'), input.manifest.manifestHash);
    for (let i = 0; i < sources.length; i++) await programNativeUnchanged([p.program, p.station, legacy][i], sources[i]);
    const before = await programNativeSnapshot(operation), proof = await programNativeSnapshot(programNativeItem(input)), checkpoint = await programNativeSnapshot(input.job);
    assert.equal((await programNativeApply(f, input)).applied, 0);
    await programNativeUnchanged(operation, before); await programNativeUnchanged(programNativeItem(input), proof); await programNativeUnchanged(input.job, checkpoint);
    assert.equal((await programNativeApply(f, input, 'restore')).status, 'rollback-held');
    await programNativeUnchanged(operation, before); await programNativeUnchanged(programNativeItem(input), proof);
  }));
  for (const state of ['absent', 'terminal']) test(`${root}: native ${state} target no-op retains its own version through sealing and held rollback`, async () => programNativeSession(async f => {
    const p = await programNativeCurrent(f, root), date = new Date().toISOString().slice(0, 10), operation = programNativeOperation(f, p, date);
    if (state === 'terminal') await operation.create({ status: 'sent', fingerprint: programNativeHash(['existing-other-binding']) });
    const before = await programNativeSnapshot(operation), input = await programNativeInput(f, p); await programNativeApply(f, input);
    const receipt = await programNativeItem(input).get(); assert.equal(receipt.get('targetChanged'), false);
    if (state === 'terminal') {
      programNativeEqualVersion(receipt.get('targetCreateTime'), before.createTime); programNativeEqualVersion(receipt.get('targetUpdateTime'), before.updateTime);
      assert.equal(receipt.updateTime.isEqual(before.updateTime), false, 'No-op must not borrow later receipt metadata');
    } else { assert.equal(receipt.get('targetCreateTime'), null); assert.equal(receipt.get('targetUpdateTime'), null); }
    await programNativeUnchanged(operation, before);
    const originalReceipt = await programNativeSnapshot(programNativeItem(input)); await programNativeApply(f, input, 'restore');
    await programNativeUnchanged(operation, before); await programNativeUnchanged(programNativeItem(input), originalReceipt);
    assert.equal((await input.job.get()).get('pendingReceiptIndex'), null);
  }));
}
test('native strengthening retains existing target birth and binds its new version to the immutable item', async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudDev'), date = new Date().toISOString().slice(0, 10), operation = programNativeOperation(f, p, date), now = Date.now();
  await programNativeLegacy(f, p, date, { status: 'unknown' });
  await operation.create({ status: 'pending', phase: 'claimed', lease: 'synthetic-existing-native-lease', attempts: 2,
    fingerprint: programNativeHash(['other-reviewed-binding']), createdAt: ProgramNativeTimestamp.fromMillis(now - 5000), updatedAt: ProgramNativeTimestamp.fromMillis(now - 4000),
    leaseUntil: ProgramNativeTimestamp.fromMillis(now + 100000), expiresAt: ProgramNativeTimestamp.fromMillis(now + 86400000), cleanupAt: ProgramNativeTimestamp.fromMillis(now + 30 * 86400000) });
  const before = await operation.get(), input = await programNativeInput(f, p, { fromLocalDate: date }); assert.equal(input.manifest.items[0].action, 'strengthened-suppression');
  await programNativeApply(f, input); const after = await operation.get(), receipt = await programNativeItem(input).get();
  programNativeEqualVersion(after.createTime, before.createTime); programNativeEqualVersion(after.updateTime, receipt.updateTime);
  programNativeEqualVersion(receipt.get('targetCreateTime'), before.createTime); programNativeEqualVersion(receipt.get('targetUpdateTime'), before.updateTime);
  assert.equal(after.get('fingerprint'), before.get('fingerprint')); assert.equal(after.get('status'), 'unknown'); assert.equal(after.get('retryable'), false);
}));
for (const status of ['prepared', 'retryable']) test(`native ${status} state carry preserves original clocks, attempts, backoff and source identities`, async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudOfficial'), date = new Date().toISOString().slice(0, 10), now = Date.now(), stamp = ms => ProgramNativeTimestamp.fromMillis(ms);
  const data = { status: status === 'prepared' ? 'pending' : 'failed', phase: 'claimed', lease: 'synthetic-reviewed-old-worker', attempts: 4,
    createdAt: stamp(now - 10000), updatedAt: stamp(now - 5000), leaseUntil: stamp(now - 1000), expiresAt: stamp(now + 86400000), cleanupAt: stamp(now + 30 * 86400000),
    ...(status === 'retryable' ? { retryable: true, reason: 'messaging/server-unavailable', retryAt: stamp(now + 120000) } : {}) };
  const legacy = await programNativeLegacy(f, p, date, data), original = await programNativeSnapshot(legacy), input = await programNativeInput(f, p, { fromLocalDate: date });
  assert.equal(input.manifest.items[0].action, status === 'prepared' ? 'carried-prepared' : 'carried-retryable'); await programNativeApply(f, input);
  const operation = f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`), after = await operation.get(), receipt = await programNativeItem(input).get();
  for (const key of Object.keys(data)) assert.deepEqual(after.get(key), data[key]);
  programNativeEqualVersion(after.createTime, receipt.updateTime); programNativeEqualVersion(after.updateTime, receipt.updateTime);
  programNativeEqualVersion(after.get('programCompatibility.legacySourceCreateTime'), original.createTime);
  programNativeEqualVersion(after.get('programCompatibility.legacySourceUpdateTime'), original.updateTime);
  await programNativeUnchanged(legacy, original);
  if (status === 'retryable') {
    const { claimDelivery } = await import('../../functions/lib/notification-delivery.js');
    const before = await programNativeSnapshot(operation);
    assert.equal(await claimDelivery({ firestore: f.db, reference: operation, fingerprint: after.get('fingerprint'), now: Date.now() }), null);
    await programNativeUnchanged(operation, before);
  }
}));
for (const phase of ['item', 'seal']) test(`native ${phase} ACK loss cold-resumes authentic SDK/file capabilities without reapplying the occurrence`, async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudDev'), date = new Date().toISOString().slice(0, 10); await programNativeLegacy(f, p, date, { status: 'sent' });
  const input = await programNativeInput(f, p); await programNativePendingAck(f, input, phase);
  const original = await programNativeSnapshot(programNativeItem(input)), target = f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`), before = await programNativeSnapshot(target);
  const job = await input.job.get();
  if (phase === 'item') { assert.equal(job.get('pendingReceiptIndex'), 0); assert.equal(job.get('status'), 'applying'); programNativeEqualVersion(job.updateTime, original.updateTime); }
  else { assert.equal(job.get('pendingReceiptIndex'), null); programNativeEqualVersion(job.get('receiptVersions')[0], original.updateTime); }
  const cold = createProgramDateDemoFirestore({ projectId: f.projectId, emulatorHost: f.emulatorHost });
  try {
    const store = await ProgramDateBackupStore.open({ directory: f.directory, key: f.key, expiresAt: f.expiresAt });
    const result = await programNativeApply(f, input, 'apply', { firestore: cold, store }); assert.equal(result.completed, true); assert.equal(result.applied, 0);
  } finally { await cold.terminate(); }
  await programNativeUnchanged(target, before); await programNativeUnchanged(programNativeItem(input), original);
  programNativeEqualVersion((await input.job.get()).get('receiptVersions')[0], original.updateTime);
}));
test('native sealed no-op receipt delete/recreate is rejected without adopting its new birth', async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudOfficial'), input = await programNativeInput(f, p); await programNativeApply(f, input);
  const ref = programNativeItem(input), original = await ref.get(), job = await programNativeSnapshot(input.job);
  assert.equal(original.get('targetChanged'), false); await ref.delete(); await ref.create(original.data());
  const recreated = await ref.get(); assert.equal(recreated.createTime.isEqual(original.createTime), false); programNativeEqualVersion(recreated.createTime, recreated.updateTime);
  await assert.rejects(programNativeApply(f, input)); await assert.rejects(programNativeApply(f, input, 'restore'));
  await programNativeUnchanged(input.job, job); assert.equal((await f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`).get()).exists, false);
}));
for (const drift of ['prior target ABA', 'prior receipt recreation']) test(`native next-item transaction stops ${drift} before any new occurrence write`, async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudDev'), date = new Date().toISOString().slice(0, 10), tomorrow = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  await programNativeLegacy(f, p, date, { status: 'sent' }); await programNativeLegacy(f, p, tomorrow, { status: 'unknown' });
  const input = await programNativeInput(f, p, { fromLocalDate: date, toLocalDate: tomorrow }); assert.equal(input.manifest.items.length, 2);
  const first = f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`), second = f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[1].v2Key}`);
  const originalCommit = Transaction.prototype.commit, originalGet = Transaction.prototype.get; let armed = false, fired = false, sealed;
  Transaction.prototype.commit = async function (...args) {
    const empty = this._writeBatch?.isEmpty, result = await originalCommit.apply(this, args);
    if (empty && !armed) {
      const job = await input.job.get();
      if (job.get('nextIndex') === 1 && job.get('pendingReceiptIndex') === null && job.get('receiptVersions')?.length === 1) {
        armed = true; sealed = await programNativeSnapshot(input.job);
      }
    }
    return result;
  };
  Transaction.prototype.get = async function (ref, ...args) {
    if (armed && !fired && ref?.path === input.job.path) {
      fired = true;
      // BEFORE this item TX reads job/source locks; no competing locked await.
      if (drift === 'prior target ABA') await programNativeAba(first);
      else { const old = await programNativeItem(input).get(); await old.ref.delete(); await old.ref.create(old.data()); assert.equal((await old.ref.get()).createTime.isEqual(old.createTime), false); }
    }
    return originalGet.call(this, ref, ...args);
  };
  try { await assert.rejects(programNativeApply(f, input)); }
  finally { Transaction.prototype.commit = originalCommit; Transaction.prototype.get = originalGet; }
  assert.equal(armed, true); assert.equal(fired, true); assert.equal((await second.get()).exists, false); assert.equal((await programNativeItem(input, 1).get()).exists, false);
  await programNativeUnchanged(input.job, sealed);
}));
test('native expired pending lease is sealed before takeover using actual elapsed time', { timeout: 240000 }, async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudDev'), input = await programNativeInput(f, p); await programNativePendingAck(f, input);
  const pending = await input.job.get(), receipt = await programNativeSnapshot(programNativeItem(input));
  assert.equal(pending.get('pendingReceiptIndex'), 0); programNativeEqualVersion(pending.updateTime, receipt.updateTime);
  const delay = Math.max(0, pending.get('leaseUntilMs') - Date.now() + 20); assert.ok(delay <= 120100);
  // A real bounded wait: never edit pending job clocks (that loses its anchor)
  // and never add a public source/runtime clock override for this rehearsal.
  await programNativeSleep(delay); assert.ok(Date.now() > pending.get('leaseUntilMs'));
  const result = await programNativeApply(f, input, 'apply', { owner: 'native-expired-lease-replacement' }); assert.equal(result.completed, true);
  const after = await input.job.get(); assert.equal(after.get('owner'), 'native-expired-lease-replacement'); assert.equal(after.get('generation'), pending.get('generation') + 1);
  assert.equal(after.get('pendingReceiptIndex'), null); programNativeEqualVersion(after.get('receiptVersions')[0], receipt.updateTime);
  await programNativeUnchanged(programNativeItem(input), receipt);
}));
test('native backup recovery-window expiry stops before lease without claiming full TTL expiry', { timeout: 60000 }, async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudOfficial');
  const options = { projectId: f.projectId, root: p.root, programId: p.id, fromLocalDate: new Date().toISOString().slice(0, 10), toLocalDate: new Date().toISOString().slice(0, 10), cutoverAt: new Date().toISOString() };
  const manifest = await previewProgramNotificationDates(options, f.owned), expiresAt = Date.now() + 3603000;
  const store = await ProgramDateBackupStore.open({ directory: f.directory, key: f.key, expiresAt }); await store.put(manifest);
  const job = f.db.doc(`${p.root}/notificationOperations/operations/program_date_migration_${manifest.manifestHash}`); f.tracked.add(job.path);
  await programNativeSleep(Math.max(0, expiresAt - 3600000 - Date.now() + 20)); assert.ok(expiresAt - Date.now() < 3600000);
  await assert.rejects(executeProgramNotificationDateMigration({ ...options, mode: 'apply' }, f.owned,
    { manifest, store, reviewedHash: manifest.manifestHash, owner: 'native-backup-window' }));
  assert.equal((await job.get()).exists, false);
}));

for (const root of programNativeRoots) test(`${root}: actual collector deletes at most20 expired broadcasts with progress and retains all raw/job/item evidence`, async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, root), input = await programNativeInput(f, p); await programNativeApply(f, input);
  const beforeJob = await programNativeSnapshot(input.job), beforeItem = await programNativeSnapshot(programNativeItem(input)), cutoff = Date.now();
  const raw = [];
  for (const status of ['sent', 'unknown']) {
    const ref = f.db.doc(`${root}/notificationOperations/operations/${programNativeHash(['held-native-program', status, randomUUID()])}`); f.tracked.add(ref.path);
    await ref.create({ status, cleanupAt: ProgramNativeTimestamp.fromMillis(cutoff - 1000000) }); raw.push([ref, await programNativeSnapshot(ref)]);
  }
  const expired = [];
  for (let i = 0; i < 25; i++) {
    const ref = f.db.doc(`${root}/notificationOperations/operations/broadcast_${randomUUID()}`); f.tracked.add(ref.path);
    await ref.create({ status: 'sent', cleanupAt: ProgramNativeTimestamp.fromMillis(i === 24 ? cutoff : cutoff - 1000) }); expired.push(ref);
  }
  const fresh = f.db.doc(`${root}/notificationOperations/operations/broadcast_${randomUUID()}`); f.tracked.add(fresh.path);
  await fresh.create({ status: 'sent', cleanupAt: ProgramNativeTimestamp.fromMillis(cutoff + 1) }); const freshBefore = await programNativeSnapshot(fresh);
  await collectNotificationOperations({ firestore: f.db, root, now: cutoff });
  assert.equal((await Promise.all(expired.map(ref => ref.get()))).filter(value => value.exists).length, 5, 'Exactly20 returned expired broadcast documents are deleted');
  await collectNotificationOperations({ firestore: f.db, root, now: cutoff });
  assert.equal((await Promise.all(expired.map(ref => ref.get()))).filter(value => value.exists).length, 0, 'The next bounded query reaches the remainder including cutoff equality');
  await programNativeUnchanged(fresh, freshBefore); await programNativeUnchanged(input.job, beforeJob); await programNativeUnchanged(programNativeItem(input), beforeItem);
  for (const [ref, snapshot] of raw) await programNativeUnchanged(ref, snapshot);
  // This is a result/deletion bound, never a physical-read/index/billing claim.
}));
test('native max25 preview cursor and max1 partial apply/held rollback preserve unprocessed occurrences', async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudDev'), start = new Date().toISOString().slice(0, 10), end = new Date(Date.parse(`${start}T00:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10);
  const input = await programNativeInput(f, p, { toLocalDate: end }); assert.equal(input.manifest.items.length, 25); assert.ok(input.manifest.nextCursor);
  const tail = await previewProgramNotificationDates({ ...input.options, cursor: input.manifest.nextCursor }, f.owned); assert.equal(tail.items.length, 6); assert.equal(tail.nextCursor, null);
  assert.equal((await input.job.get()).exists, false, 'Both preview chunks are read-only');
  const first = await programNativeApply(f, input, 'apply', { options: { maxItems: 1 } }); assert.equal(first.applied, 1); assert.equal(first.chunkCompleted, false); assert.equal(first.completed, false);
  assert.equal((await input.job.get()).get('nextIndex'), 1); assert.equal((await input.job.get()).get('receiptVersions').length, 1); assert.equal((await programNativeItem(input, 1).get()).exists, false);
  const original = await programNativeSnapshot(programNativeItem(input));
  assert.equal((await programNativeApply(f, input, 'restore')).status, 'rollback-held'); await programNativeUnchanged(programNativeItem(input), original);
  for (const item of input.manifest.items) assert.equal((await f.db.doc(`${p.root}/notificationOperations/operations/${item.v2Key}`).get()).exists, false, 'Clear no-op and future unprocessed targets remain absent');
  assert.equal((await input.job.get()).get('nextIndex'), 1);
}));
test('native competing migration owners serialize one authorized item without duplicate target/proof application', async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudOfficial'), date = new Date().toISOString().slice(0, 10); await programNativeLegacy(f, p, date, { status: 'sent' });
  const input = await programNativeInput(f, p), other = createProgramDateDemoFirestore({ projectId: f.projectId, emulatorHost: f.emulatorHost });
  let settled;
  try { settled = await Promise.allSettled([programNativeApply(f, input), programNativeApply(f, input, 'apply', { firestore: other, owner: 'other-native-migration-owner' })]); }
  finally { await other.terminate(); }
  assert.equal(settled.filter(result => result.status === 'fulfilled').length, 1); assert.equal(settled.filter(result => result.status === 'rejected').length, 1);
  const job = await input.job.get(), receipt = await programNativeItem(input).get(); assert.equal(job.get('nextIndex'), 1); assert.equal(job.get('receiptVersions').length, 1);
  const target = await f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`).get(); programNativeEqualVersion(target.createTime, receipt.updateTime);
  programNativeEqualVersion(job.get('receiptVersions')[0], receipt.updateTime); assert.equal((await input.job.collection('items').get()).size, 1);
}));
test('native source ABA and foreign scope/capabilities refuse mutation instead of adopting new versions', async () => programNativeSession(async f => {
  for (const field of ['program', 'station', 'legacy']) {
    const p = await programNativeCurrent(f, 'HudHudDev'), date = new Date().toISOString().slice(0, 10), legacy = await programNativeLegacy(f, p, date, { status: 'sent' });
    const input = await programNativeInput(f, p), source = field === 'program' ? p.program : field === 'station' ? p.station : legacy;
    await programNativeAba(source); await assert.rejects(programNativeApply(f, input)); assert.equal((await input.job.get()).exists, false);
    assert.equal((await f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`).get()).exists, false);
  }
  const p = await programNativeCurrent(f, 'HudHudOfficial'), input = await programNativeInput(f, p);
  await assert.rejects(programNativeApply(f, input, 'apply', { firestore: Object.freeze({ ...f.owned }) }));
  await assert.rejects(executeProgramNotificationDateMigration({ ...input.options, mode: 'apply', projectId: 'production-scope-refused' }, f.owned,
    { manifest: input.manifest, store: input.store, reviewedHash: input.reviewedHash, owner: input.owner }));
  await assert.rejects(executeProgramNotificationDateMigration({ ...input.options, mode: 'apply', root: 'OtherRoot' }, f.owned,
    { manifest: input.manifest, store: input.store, reviewedHash: input.reviewedHash, owner: input.owner }));
  assert.equal((await input.job.get()).exists, false);
}));
test('native backup permission loss after lease readback blocks the next actual item transaction', async () => programNativeSession(async f => {
  const p = await programNativeCurrent(f, 'HudHudDev'), input = await programNativeInput(f, p), originalCommit = Transaction.prototype.commit, originalGet = Transaction.prototype.get;
  let armed = false, fired = false, leased;
  Transaction.prototype.commit = async function (...args) {
    const empty = this._writeBatch?.isEmpty, result = await originalCommit.apply(this, args);
    if (empty && !armed) {
      const job = await input.job.get();
      if (job.exists && job.get('nextIndex') === 0 && job.get('pendingReceiptIndex') === null) { armed = true; leased = await programNativeSnapshot(input.job); }
    }
    return result;
  };
  Transaction.prototype.get = async function (ref, ...args) {
    if (armed && !fired && ref?.path === input.job.path) { fired = true; await chmod(f.directory, 0o755); }
    return originalGet.call(this, ref, ...args);
  };
  try { await assert.rejects(programNativeApply(f, input)); }
  finally { Transaction.prototype.commit = originalCommit; Transaction.prototype.get = originalGet; await chmod(f.directory, 0o700); }
  assert.equal(armed, true); assert.equal(fired, true); await programNativeUnchanged(input.job, leased);
  assert.equal((await programNativeItem(input).get()).exists, false);
  assert.equal((await f.db.doc(`${p.root}/notificationOperations/operations/${input.manifest.items[0].v2Key}`).get()).exists, false);
}));
test('native legacy mapping preserves live/backoff/expiry and refuses malformed or multiple-owner uncertainty', async () => programNativeSession(async f => {
  for (const kind of ['live prepared', 'live sending', 'expired sending', 'retryable backoff', 'terminal failed', 'expired prepared', 'malformed', 'multiple owners']) {
    const p = await programNativeCurrent(f, 'HudHudOfficial'), date = new Date().toISOString().slice(0, 10), now = Date.now(), stamp = ms => ProgramNativeTimestamp.fromMillis(ms);
    const data = { status: 'pending', phase: 'claimed', lease: 'synthetic-native-legacy-owner', attempts: 3,
      createdAt: stamp(now - 10000), updatedAt: stamp(now - 5000), leaseUntil: stamp(now + 120000), expiresAt: stamp(now + 86400000), cleanupAt: stamp(now + 30 * 86400000) };
    if (kind.includes('sending')) data.phase = 'sending';
    if (kind === 'expired sending') data.leaseUntil = stamp(now - 1000);
    if (kind === 'retryable backoff') Object.assign(data, { status: 'failed', retryable: true, reason: 'messaging/server-unavailable', retryAt: stamp(now + 120000) });
    if (kind === 'terminal failed') Object.assign(data, { status: 'failed', retryable: false, reason: 'ineligible', retryAt: stamp(now + 120000) });
    if (kind === 'expired prepared') Object.assign(data, { leaseUntil: stamp(now - 2000), expiresAt: stamp(now - 1000) });
    if (kind === 'malformed') Object.assign(data, { status: 'unsupported', attempts: 0 });
    const legacy = await programNativeLegacy(f, p, date, data), before = await programNativeSnapshot(legacy);
    if (kind === 'multiple owners') await programNativeLegacy(f, p, new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10), data);
    const input = await programNativeInput(f, p, { fromLocalDate: date }), item = input.manifest.items[0];
    const expected = { 'live prepared': 'carried-prepared', 'live sending': 'blocked', 'expired sending': 'created-suppression', 'retryable backoff': 'carried-retryable',
      'terminal failed': 'carried-terminal-failed', 'expired prepared': 'carried-terminal-failed', malformed: 'blocked', 'multiple owners': 'blocked' }[kind];
    assert.equal(item.action, expected, kind);
    if (expected === 'blocked') { await assert.rejects(programNativeApply(f, input)); assert.equal((await input.job.get()).exists, false); }
    else {
      await programNativeApply(f, input); const target = await f.db.doc(`${p.root}/notificationOperations/operations/${item.v2Key}`).get();
      if (kind === 'live prepared') { programNativeEqualVersion(target.get('leaseUntil'), data.leaseUntil); assert.equal(target.get('attempts'), 3); }
      if (kind === 'retryable backoff') programNativeEqualVersion(target.get('retryAt'), data.retryAt);
      if (kind === 'terminal failed' || kind === 'expired prepared') { assert.equal(target.get('status'), 'failed'); assert.equal(target.get('retryable'), false); programNativeEqualVersion(target.get('expiresAt'), data.expiresAt); }
      if (kind === 'expired sending') assert.equal(target.get('status'), 'unknown');
    }
    await programNativeUnchanged(legacy, before);
  }
}));
