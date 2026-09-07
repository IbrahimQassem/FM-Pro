import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export const maxProfileImageBytes = 1024 * 1024;
const hour = 60 * 60 * 1000;
const roots = ['HudHudDev', 'HudHudOfficial'];
const profilePath = (root, uid) => `${root}/users/users/${uid}`;
const uploadsPath = root => `${root}/profileImageUploads/uploads`;

export async function normalizeProfileImage(base64) {
  if (typeof base64 !== 'string' || base64.length === 0 || base64.length > Math.ceil(maxProfileImageBytes / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpsError('invalid-argument', 'Choose a JPEG or PNG image smaller than 1 MB.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > maxProfileImageBytes || bytes.toString('base64') !== base64) throw new HttpsError('invalid-argument', 'Invalid image encoding.');
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error('unsupported-image');
    // Re-encoding strips EXIF/GPS and other input metadata; originals are never stored.
    return await image.rotate().resize(720, 720, { fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
  } catch { throw new HttpsError('invalid-argument', 'Choose a valid JPEG or PNG image.'); }
}

export async function activeProfile(transaction, firestore, uid, root) {
  const profile = await transaction.get(firestore.doc(profilePath(root, uid)));
  const jobs = await Promise.all(roots.map(r => transaction.get(firestore.doc(`${r}/accountDeletionRequests/requests/${uid}`))));
  if (jobs.some(job => job.exists) || !profile.exists || profile.get('isActive') !== true || profile.get('role') !== 'listener') throw new HttpsError('failed-precondition', 'An active listener profile is required.');
  return profile;
}

/** A cleanup reservation prevents a concurrent finalization from using a deleted object. */
export async function cleanupProfileImage({ firestore, bucket, reference, now = Date.now() }) {
  const object = await firestore.runTransaction(async transaction => {
    const job = await transaction.get(reference);
    if (!job.exists) return null;
    const { uid, root, objectPath } = job.data();
    if (!roots.includes(root) || typeof uid !== 'string' || !uid || uid.includes('/') || objectPath !== `${root}/profile-images/${uid}/${job.id}.jpg`) throw new Error('invalid-profile-image-job');
    const profile = await transaction.get(firestore.doc(profilePath(root, uid)));
    const deletionJobs = await Promise.all(roots.map(r => transaction.get(firestore.doc(`${r}/accountDeletionRequests/requests/${uid}`))));
    if (profile.get('avatarUploadId') === job.id && !deletionJobs.some(item => item.exists)) {
      transaction.update(reference, { dueAt: Timestamp.fromMillis(now + 24 * hour) });
      return null;
    }
    transaction.update(reference, { state: 'deleting', dueAt: Timestamp.fromMillis(Math.max(now + hour, job.get('settleAt')?.toMillis?.() ?? now)) });
    return { path: objectPath, settleAt: job.get('settleAt')?.toMillis?.() ?? now };
  });
  if (!object) return;
  await (typeof bucket === 'function' ? bucket() : bucket).file(object.path).delete({ ignoreNotFound: true });
  // Retain a tombstone beyond the callable lifetime for a late in-flight save.
  if (object.settleAt <= now) await reference.delete();
}

export async function updateProfileImage({ firestore, bucket, uid, root, displayName, imageBase64 }) {
  const bytes = await normalizeProfileImage(imageBase64);
  const id = randomUUID();
  const objectPath = `${root}/profile-images/${uid}/${id}.jpg`;
  const reference = firestore.collection(uploadsPath(root)).doc(id);
  const token = randomUUID();
  const avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  const now = Date.now();
  await firestore.runTransaction(async transaction => {
    const profile = await activeProfile(transaction, firestore, uid, root);
    if (now - (profile.get('lastImageUploadAt')?.toMillis?.() ?? 0) < 5000) throw new HttpsError('resource-exhausted', 'Wait before uploading another image.');
    transaction.update(profile.ref, {lastImageUploadAt: Timestamp.fromMillis(now)});
    transaction.create(reference, { uid, root, objectPath, state: 'uploading', createdAt: Timestamp.fromMillis(now), settleAt: Timestamp.fromMillis(now + hour), dueAt: Timestamp.fromMillis(now + hour) });
  });
  try {
    await bucket.file(objectPath).save(bytes, { resumable: false, metadata: { contentType: 'image/jpeg', cacheControl: 'private,max-age=0,no-store', metadata: { firebaseStorageDownloadTokens: token } } });
    const oldId = await firestore.runTransaction(async transaction => {
      const profile = await activeProfile(transaction, firestore, uid, root);
      const job = await transaction.get(reference);
      if (!job.exists || job.get('state') !== 'uploading') throw new HttpsError('aborted', 'Image upload expired. Try again.');
      transaction.update(profile.ref, { displayName, avatarUrl, avatarUploadId: id, avatarStoragePath: objectPath, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(reference, { state: 'ready', dueAt: Timestamp.fromMillis(Date.now() + 24 * hour) });
      return profile.get('avatarUploadId');
    });
    if (typeof oldId === 'string' && oldId && !oldId.includes('/')) {
      // Failure is retried by the scheduled collector; the successful profile update remains successful.
      await cleanupProfileImage({firestore,bucket,reference:firestore.collection(uploadsPath(root)).doc(oldId)}).catch(() => undefined);
    }
    return { updated: true };
  } catch (error) {
    await cleanupProfileImage({firestore,bucket,reference}).catch(() => undefined);
    throw error instanceof HttpsError ? error : new HttpsError('unavailable', 'Could not save the profile image. Try again.');
  }
}

export async function cleanupAccountImages(firestore, bucket, uid, root) {
  const jobs = await firestore.collection(uploadsPath(root)).where('uid', '==', uid).get();
  for (const job of jobs.docs) await cleanupProfileImage({firestore,bucket,reference:job.ref});
}

export async function collectProfileImages(firestore, bucket, now = Date.now()) {
  for (const root of roots) {
    const jobs = await firestore.collection(uploadsPath(root)).where('dueAt', '<=', Timestamp.fromMillis(now)).orderBy('dueAt').limit(200).get();
    for (const job of jobs.docs) await cleanupProfileImage({firestore,bucket,reference:job.ref,now});
  }
}
