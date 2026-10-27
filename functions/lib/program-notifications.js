import { logger } from 'firebase-functions';
import { createHash } from 'node:crypto';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { claimDelivery, startDelivery, finishDelivery, notificationFailure } from './notification-delivery.js';

export const programRoots = ['HudHudDev', 'HudHudOfficial'];

/**
 * Returns Yemen time details (Asia/Aden: UTC+3):
 * - weekday: ISO 8601 (1 = Monday ... 7 = Sunday)
 * - currentMinute: minute of day (0..1439)
 * - ymd: formatted date string YYYY-MM-DD
 */
export function getYemenTimeInfo(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Aden',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));

  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = weekdayMap[map.weekday] || 1;
  const hour = parseInt(map.hour, 10) % 24;
  const minute = parseInt(map.minute, 10);
  const currentMinute = hour * 60 + minute;
  const ymd = `${map.year}-${map.month}-${map.day}`;

  return { weekday, currentMinute, ymd };
}

/**
 * Evaluates whether a program should trigger a notification now:
 * - Program is active (isActive === true)
 * - Today's weekday is in schedule.weekdays
 * - Program starts within 0 to 10 minutes from now (startMinute - currentMinute in [0, 10])
 * - Has not already been notified today (lastNotifiedDate !== todayYmd)
 */
export function normalizedSchedule(schedule) {
  if (!schedule || !Array.isArray(schedule.weekdays) || !schedule.weekdays.length ||
    schedule.weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7) ||
    !Number.isInteger(schedule.startMinute) || schedule.startMinute < 0 || schedule.startMinute > 1439 ||
    !Number.isInteger(schedule.endMinute) || schedule.endMinute <= schedule.startMinute || schedule.endMinute > 1440 ||
    !Number.isInteger(schedule.utcOffsetMinutes) || schedule.utcOffsetMinutes < -720 || schedule.utcOffsetMinutes > 840) return null;
  return { ...schedule, weekdays: [...new Set(schedule.weekdays)].sort((a, b) => a - b) };
}
const visible = data => data?.isActive === true && !data.adminDeletionToken;
const hash = tuple => createHash('sha256').update(JSON.stringify(tuple)).digest('hex');
const native = value => Number.isSafeInteger(value?.seconds) && value.seconds >= -62135596800 && value.seconds <= 253402300799 &&
  Number.isInteger(value.nanoseconds) && value.nanoseconds >= 0 && value.nanoseconds < 1000000000;
const sameTime = (a, b) => native(a) && native(b) && a.seconds === b.seconds && a.nanoseconds === b.nanoseconds;
const millis = value => native(value) ? value.toMillis() : NaN;
export function localTime(instant, offset) {
  const date = new Date(instant + offset * 60000);
  const year = date.getUTCFullYear();
  if (!Number.isFinite(date.getTime()) || year < 1 || year > 9999) return null;
  return { weekday: date.getUTCDay() || 7, currentMinute: date.getUTCHours() * 60 + date.getUTCMinutes(), ymd: date.toISOString().slice(0, 10) };
}
export function legacyDates(date, offset) {
  const start = Date.parse(`${date}T00:00:00.000Z`) - offset * 60000;
  if (!localTime(start, 0) || !localTime(start + 86400000, 0)) return null;
  const first = localTime(start, 180), last = localTime(start + 86400000 - 1, 180);
  return first && last ? [...new Set([first.ymd, last.ymd])].sort() : null;
}
function intent(program, instant) {
  const schedule = normalizedSchedule(program?.schedule);
  const time = schedule && localTime(instant, schedule.utcOffsetMinutes);
  return time && shouldNotifyProgram(program, time) ? { schedule, time } : null;
}
export function fingerprint(id, program, schedule) {
  return hash(['program-schedule-v2', id, program.stationId, true, true, schedule.weekdays,
    schedule.startMinute, schedule.endMinute, schedule.utcOffsetMinutes]);
}
export function shouldNotifyProgram(programData, timeInfo) {
  const schedule = normalizedSchedule(programData?.schedule);
  if (!visible(programData) || !schedule || !schedule.weekdays.includes(timeInfo.weekday)) return false;
  const diff = schedule.startMinute - timeInfo.currentMinute;
  return diff >= 0 && diff <= 10 && programData.lastNotifiedDate !== timeInfo.ymd;
}
function stampBlocks(program, date, dates) {
  const stamp = program.lastNotifiedDate, version = program.lastNotifiedPolicyVersion;
  if (stamp === undefined && version === undefined) return false;
  if (typeof stamp !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(stamp) || !Number.isFinite(Date.parse(`${stamp}T00:00:00Z`)) ||
    new Date(`${stamp}T00:00:00Z`).toISOString().slice(0, 10) !== stamp) return true;
  if (version === 2) return stamp === date;
  return version === undefined || version === 1 ? dates.includes(stamp) : true;
}
const hex = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
function validCarry(proof, program, programId, dates, fp, sources, delivery, now) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return false;
  const fields = ['version', 'manifestHash', 'cutoverAt', 'programCreateTime', 'scheduleFingerprint', 'legacyDates', 'legacyKeys', 'evidenceHashes',
    'decision', 'legacySourceKey', 'legacySourceCreateTime', 'legacySourceUpdateTime', 'recordedAt'];
  if (Object.keys(proof).length !== fields.length || Object.keys(proof).some(key => !fields.includes(key)) || proof.version !== 1 ||
    !hex(proof.manifestHash) || !native(proof.cutoverAt) || !native(proof.recordedAt) ||
    !sameTime(proof.programCreateTime, program.createTime) || proof.scheduleFingerprint !== fp ||
    JSON.stringify(proof.legacyDates) !== JSON.stringify(dates) || !Array.isArray(proof.legacyKeys) ||
    JSON.stringify(proof.legacyKeys) !== JSON.stringify(dates.map(date => hash([programId, date]))) ||
    !Array.isArray(proof.evidenceHashes) || proof.evidenceHashes.length > 3 || !proof.evidenceHashes.every(hex)) return false;
  const present = sources.filter(source => source.snapshot.exists);
  if (present.length !== 1 || present[0].key !== proof.legacySourceKey) return false;
  const source = present[0].snapshot, data = source.data();
  if (!sameTime(source.createTime, proof.legacySourceCreateTime) || !sameTime(source.updateTime, proof.legacySourceUpdateTime) ||
    data.fingerprint !== undefined || !Number.isSafeInteger(data.attempts) || data.attempts < 1 ||
    !['createdAt', 'updatedAt', 'expiresAt', 'cleanupAt'].every(field => native(data[field])) ||
    millis(data.updatedAt) < millis(data.createdAt) || millis(data.expiresAt) <= millis(data.createdAt) ||
    millis(data.cleanupAt) < millis(data.expiresAt) || !['claimed', 'sending'].includes(data.phase) ||
    millis(data.expiresAt) <= now ||
    !['createdAt', 'expiresAt', 'cleanupAt'].every(field => sameTime(data[field], delivery[field])) ||
    !Number.isSafeInteger(delivery.attempts) || delivery.attempts < data.attempts) return false;
  if (proof.decision === 'carried-prepared') return data.status === 'pending' && data.phase === 'claimed' &&
    typeof data.lease === 'string' && !!data.lease && native(data.leaseUntil) && millis(data.leaseUntil) <= now;
  if (proof.decision !== 'carried-retryable' || data.status !== 'failed' || data.retryable !== true || !native(data.retryAt) || millis(data.retryAt) > now) return false;
  return data.reason === 'preparation-failed' || notificationFailure({ code: data.reason }).retryable === true;
}
function legacyPolicy(program, programId, date, dates, fp, sources, delivery, now) {
  if (stampBlocks(program.data(), date, dates)) return 'terminal';
  for (const source of sources) {
    const data = source.snapshot.data();
    if (source.snapshot.exists && (['sent', 'unknown'].includes(data?.status) ||
      (data?.status === 'pending' && data.phase === 'sending' && native(data.leaseUntil) && millis(data.leaseUntil) <= now))) return 'terminal';
  }
  const evidence = sources.some(source => source.snapshot.exists);
  if (!evidence && delivery?.programCompatibility === undefined) return 'clear';
  return validCarry(delivery?.programCompatibility, program, programId, dates, fp, sources, delivery, now) ? 'clear' : 'defer';
}

/**
 * Builds standard topic-based FCM payload for program notification.
 * Namespaces topic with root to avoid cross-environment collisions (IR-08).
 */
export function createProgramFcmMessage({ programId, programTitle, stationId, stationName, root }) {
  const topic = root && root !== 'HudHudOfficial'
    ? `${root.toLowerCase()}_program_${programId}`
    : `program_${programId}`;
  return {
    topic,
    notification: {
      title: 'بدء برنامج مباشر 📻',
      body: `يبدأ الآن برنامج "${programTitle}" عبر ${stationName || 'إذاعتك المفضلة'}`,
    },
    data: {
      type: 'program_live',
      programId: String(programId),
      stationId: String(stationId || ''),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'program_alerts',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };
}

/**
 * Scans programs in root collection, identifies programs starting within 10 minutes,
 * sends FCM topic messages, and stamps lastNotifiedDate.
 */
export async function notifyUpcomingProgramsForRoot({ firestore, messaging, root, now = new Date() }) {
  if (!programRoots.includes(root)) throw new Error(`Unknown root environment: ${root}`);
  const started = Date.now(), clock = () => now.getTime() + Date.now() - started;
  const snapshot = await firestore.collection(root).doc('programs').collection('programs').where('isActive', '==', true).get();
  let checked = 0, notified = 0, skipped = 0;
  for (const doc of snapshot.docs) {
    checked++;
    const initial = intent(doc.data(), clock());
    if (!initial || typeof doc.data().stationId !== 'string' || !doc.data().stationId.trim() ||
      doc.data().stationId !== doc.data().stationId.trim() || doc.data().stationId.includes('/') || typeof messaging?.send !== 'function') { skipped++; continue; }
    const programRef = firestore.doc(`${root}/programs/programs/${doc.id}`);
    const stationRef = firestore.doc(`${root}/stations/stations/${doc.data().stationId}`);
    const date = initial.time.ymd, dates = legacyDates(date, initial.schedule.utcOffsetMinutes);
    if (!dates) { skipped++; continue; }
    const fp = fingerprint(doc.id, doc.data(), initial.schedule);
    const reference = firestore.doc(`${root}/notificationOperations/operations/${hash(['program-start-v2', doc.id, date])}`);
    const aliases = dates.map(day => { const key = hash([doc.id, day]); return { key, reference: firestore.doc(`${root}/notificationOperations/operations/${key}`) }; });
    const readAliases = async read => {
      const values = [];
      for (const alias of aliases) values.push({ key: alias.key, snapshot: await read(alias.reference) });
      return values;
    };
    let lease, sending = false;
    try {
      const program = await programRef.get(), station = await stationRef.get();
      if (!program.exists || !station.exists || !visible(station.data()) || !visible(program.data()) ||
        program.data().stationId !== doc.data().stationId) { skipped++; continue; }
      const previous = await reference.get();
      if (legacyPolicy(program, doc.id, date, dates, fp, await readAliases(ref => ref.get()), previous.data(), clock()) !== 'clear') { skipped++; continue; }
      lease = await claimDelivery({ firestore, reference, fingerprint: fp, now: clock() });
      if (!lease) { skipped++; continue; }
      // Construct the canonical station reference through the existing collection API;
      // all authoritative source reads and payload preparation happen in startDelivery.
      const freshStationRef = firestore.collection(root).doc('stations').collection('stations').doc(doc.data().stationId);
      let message, birth, terminal = false;
      const began = await startDelivery({ firestore, reference, lease, now: clock(), validate: async tx => {
        message = undefined; birth = undefined; terminal = false;
        const fresh = await tx.get(programRef), freshStation = await tx.get(freshStationRef);
        const current = (await tx.get(reference)).data(), sources = await readAliases(ref => tx.get(ref));
        if (!fresh.exists || !freshStation.exists || !sameTime(fresh.createTime, program.createTime) ||
          !sameTime(freshStation.createTime, station.createTime) || !visible(freshStation.data())) return false;
        const currentIntent = intent(fresh.data(), clock());
        if (!currentIntent || currentIntent.time.ymd !== date || fresh.data().stationId !== doc.data().stationId ||
          fingerprint(doc.id, fresh.data(), currentIntent.schedule) !== fp || current?.fingerprint !== fp) return false;
        const policy = legacyPolicy(fresh, doc.id, date, dates, fp, sources, current, clock());
        terminal = policy === 'terminal';
        if (policy !== 'clear') return false;
        message = createProgramFcmMessage({ programId: doc.id, programTitle: fresh.data().title || 'برنامج مميز',
          stationId: fresh.data().stationId, stationName: freshStation.data().name || '', root });
        birth = fresh.createTime;
        return true;
      } });
      if (!began) {
        if (terminal) await finishDelivery({ firestore, reference, lease, status: 'unknown', reason: 'legacy-compatibility-suppression', now: clock() });
        skipped++; continue;
      }
      sending = true;
      let outcome;
      try { await messaging.send(message); outcome = { status: 'sent' }; }
      catch (error) { outcome = notificationFailure(error); }
      await finishDelivery({ firestore, reference, lease, ...outcome, now: clock() });
      if (outcome.status === 'sent') {
        notified++;
        await firestore.runTransaction(async tx => {
          const fresh = await tx.get(programRef), freshStation = await tx.get(stationRef);
          const schedule = normalizedSchedule(fresh.data()?.schedule);
          if (!fresh.exists || !sameTime(fresh.createTime, birth) || !visible(fresh.data()) || !visible(freshStation.data()) ||
            !schedule || fresh.data().stationId !== doc.data().stationId || fingerprint(doc.id, fresh.data(), schedule) !== fp ||
            (fresh.data().lastNotifiedPolicyVersion === 2 && fresh.data().lastNotifiedDate > date)) return;
          tx.update(programRef, { lastNotifiedDate: date, lastNotifiedPolicyVersion: 2 });
        });
      }
    } catch (error) {
      if (lease) await finishDelivery({ firestore, reference, lease, status: sending ? 'unknown' : 'failed', retryable: !sending,
        reason: sending ? 'delivery-uncertain' : 'preparation-failed', now: clock() });
      if (error?.code !== 'delivery/payload-conflict') logger.warn('Program notification operation needs delivery-state review.');
      if (!sending) skipped++;
    }
  }
  return { root, total: snapshot.size, checked, notified, skipped };
}

/** Bounded retention for private program/broadcast receipts; episode receipts follow their job cleanup. */
export async function collectNotificationOperations({ firestore, root, now = Date.now() }) {
  if (!programRoots.includes(root)) throw new Error('Unknown notification root.');
  const expired = await firestore.collection(`${root}/notificationOperations/operations`)
    .where(FieldPath.documentId(), '>=', 'broadcast_').where(FieldPath.documentId(), '<', 'broadcast`')
    .where('cleanupAt', '<=', Timestamp.fromMillis(now)).orderBy('cleanupAt').orderBy(FieldPath.documentId()).limit(20).get();
  if (expired.empty) return;
  const batch = firestore.batch();
  for (const item of expired.docs) batch.delete(item.ref);
  await batch.commit();
}
