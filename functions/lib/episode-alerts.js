import { randomUUID } from 'node:crypto';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { alertRoots, identifier, profilePath, deviceOwnerPath, removeDeviceIfCurrent, collectStaleDevices } from './station-subscriptions.js';
const hour = 3600000;
const jobsPath = root => `${root}/episodeAlerts/jobs`;
export function firstPublication(before, after) {
  return after?.isPublished === true && before?.isPublished !== true && identifier(after.stationId) && identifier(after.programId);
}
export async function enqueueEpisodeAlert({ firestore, root, episodeId, before, after, now = Date.now() }) {
  if (!alertRoots.includes(root) || !identifier(episodeId) || !firstPublication(before, after)) return;
  const marker = firestore.doc(`${root}/episodeAlertPublications/markers/${episodeId}`);
  await firestore.runTransaction(async tx => {
    const existing = await tx.get(marker);
    if (existing.exists) return;
    tx.create(marker, { createdAt: Timestamp.fromMillis(now) });
    tx.create(firestore.doc(`${jobsPath(root)}/${episodeId}`), { episodeId, stationId: after.stationId, programId: after.programId, createdAt: Timestamp.fromMillis(now), dueAt: Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + 24 * hour), cleanupAt: Timestamp.fromMillis(now + 30 * 24 * hour), cursor: '', status: 'pending', attempts: 0 });
  });
}
export async function processEpisodeAlert({ firestore, auth, send, reference, now = Date.now() }) {
  const lease = randomUUID();
  const job = await firestore.runTransaction(async tx => {
    const snapshot = await tx.get(reference);
    const data = snapshot.data();
    if (!data || data.status === 'done' || data.dueAt.toMillis() > now || (data.leaseUntil?.toMillis() ?? 0) > now) return null;
    if (data.expiresAt.toMillis() <= now) { tx.update(reference, { status: 'done' }); return null; }
    tx.update(reference, { lease, leaseUntil: Timestamp.fromMillis(now + 10 * 60000) });
    return data;
  });
  if (!job) return;
  const root = reference.path.split('/')[0];
  const finish = async changes => firestore.runTransaction(async tx => {
    const current = await tx.get(reference);
    if (current.get('lease') === lease) tx.update(reference, { ...changes, leaseUntil: Timestamp.fromMillis(0) });
  });
  try {
    const [episode, station, program] = await Promise.all([
      firestore.doc(`${root}/episodes/episodes/${job.episodeId}`).get(),
      firestore.doc(`${root}/stations/stations/${job.stationId}`).get(),
      firestore.doc(`${root}/programs/programs/${job.programId}`).get(),
    ]);
    if (episode.get('isPublished') !== true || episode.get('stationId') !== job.stationId || episode.get('programId') !== job.programId || station.get('isActive') !== true || program.get('isActive') !== true || program.get('stationId') !== job.stationId || episode.get('adminDeletionToken')) {
      await finish({ status: 'done' }); return;
    }
    let query = firestore.collectionGroup('subscriptions').where('targetType', '==', 'station').where('targetId', '==', job.stationId).where('isActive', '==', true).where('notificationsEnabled', '==', true).orderBy(FieldPath.documentId()).limit(25);
    if (job.cursor) query = query.startAfter(firestore.doc(job.cursor));
    const page = await query.get();
    let transient = false;
    const visited = new Set();
    for (const sub of page.docs) {
      const parts = sub.ref.path.split('/');
      if (parts.length !== 6 || parts[0] !== root || parts[1] !== 'users' || parts[2] !== 'users' || parts[4] !== 'subscriptions' || visited.has(parts[3])) continue;
      const uid = parts[3];
      const profileRef = firestore.doc(profilePath(root, uid));
      const canonical = await profileRef.collection('subscriptions').doc(`station_${job.stationId}`).get();
      if (canonical.exists && canonical.id !== sub.id) continue;
      if (!canonical.exists) {
        const legacy = await profileRef.collection('subscriptions').where('targetType', '==', 'station').where('targetId', '==', job.stationId).limit(101).get();
        if (legacy.size > 100) continue;
        const effective = [...legacy.docs].sort((a,b) => (b.get('updatedAt')?.toMillis?.() ?? 0) - (a.get('updatedAt')?.toMillis?.() ?? 0) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))[0];
        if (effective?.id !== sub.id) continue;
      }
      visited.add(uid);
      const [profile, currentSub, devices, barriers] = await Promise.all([
        profileRef.get(), sub.ref.get(), profileRef.collection('alertDevices').limit(20).get(),
        Promise.all(alertRoots.map(r => firestore.doc(`${r}/accountDeletionRequests/requests/${uid}`).get())),
      ]);
      if (barriers.some(doc => doc.exists) || profile.get('isActive') !== true || currentSub.get('isActive') !== true || currentSub.get('notificationsEnabled') !== true || currentSub.get('targetType') !== 'station' || currentSub.get('targetId') !== job.stationId) continue;
      let user;
      try { user = await auth.getUser(uid); } catch (error) { if (error.code === 'auth/user-not-found') continue; throw error; }
      if (user.disabled || !user.emailVerified) continue;
      const pending = [];
      for (const device of devices.docs) {
        const owner = await firestore.doc(deviceOwnerPath(device.id)).get();
        if (owner.get('uid') !== uid || owner.get('root') !== root) continue;
        const delivery = reference.collection('deliveries').doc(device.id);
        if ((await delivery.get()).get('status') === 'sent') continue;
        if ((device.get('updatedAt')?.toMillis?.() ?? 0) < now - 30 * 24 * hour) {
          await removeDeviceIfCurrent(firestore, device, root, uid); continue;
        }
        pending.push({ device, delivery });
      }
      if (!pending.length) continue;
      // Recheck revocation after resolving device receipts, immediately before the send.
      const [latestProfile, latestSubscription, latestEpisode] = await Promise.all([profileRef.get(), sub.ref.get(), episode.ref.get()]);
      if (latestProfile.get('isActive') !== true || latestSubscription.get('isActive') !== true || latestSubscription.get('notificationsEnabled') !== true || latestSubscription.get('targetType') !== 'station' || latestSubscription.get('targetId') !== job.stationId || latestEpisode.get('isPublished') !== true) continue;
      const response = await send({ tokens: pending.map(item => item.device.get('token')), notification: { title: String(station.get('name') ?? '').slice(0, 100), body: String(episode.get('title') ?? '').slice(0, 200) }, data: { version: '1', type: 'episode', eventId: `${root}:${job.episodeId}`, root, stationId: job.stationId, programId: job.programId, episodeId: job.episodeId }, android: { ttl: 24 * hour, notification: { tag: `${root}:${job.episodeId}` } }, apns: { headers: { 'apns-collapse-id': job.episodeId.slice(0, 64) } } });
      for (let index = 0; index < pending.length; index++) {
        const item = pending[index]; const result = response.responses[index];
        if (result.success) await item.delivery.set({ status: 'sent', updatedAt: Timestamp.fromMillis(now) });
        else if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(result.error?.code)) {
          await removeDeviceIfCurrent(firestore, item.device, root, uid);
        } else transient = true;
      }
    }
    const attempts = job.attempts + 1;
    await finish(transient ? { attempts, dueAt: Timestamp.fromMillis(now + Math.min(hour, 60000 * 2 ** Math.min(attempts, 6))) } : { cursor: page.docs.at(-1)?.ref.path ?? job.cursor, attempts: 0, dueAt: Timestamp.fromMillis(now), status: page.size < 25 ? 'done' : 'pending' });
  } catch {
    await finish({ attempts: job.attempts + 1, dueAt: Timestamp.fromMillis(now + Math.min(hour, 60000 * 2 ** Math.min(job.attempts + 1, 6))) });
  }
}
export async function collectEpisodeAlerts({ firestore, auth, send, now = Date.now() }) {
  await collectStaleDevices(firestore, now);
  for (const root of alertRoots) {
    const jobs = await firestore.collection(jobsPath(root)).where('status', '==', 'pending').where('dueAt', '<=', Timestamp.fromMillis(now)).limit(20).get();
    for (const reference of jobs.docs.map(doc => doc.ref)) await processEpisodeAlert({ firestore, auth, send, reference, now });
    const expired = await firestore.collection(jobsPath(root)).where('cleanupAt', '<=', Timestamp.fromMillis(now)).limit(20).get();
    for (const doc of expired.docs) await firestore.recursiveDelete(doc.ref);
  }
}
