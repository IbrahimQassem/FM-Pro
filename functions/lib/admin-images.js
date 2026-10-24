import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { administrativeActor } from './admin-content-authorization.js';
import { validContentId } from './admin-content.js';

export const maxAdminImageBytes = 2 * 1024 * 1024;
const hour = 3_600_000;
const roots = ['HudHudDev', 'HudHudOfficial'];
const fields = {
  stations: ['logoUrl', 'thumbnailUrl'],
  programs: ['coverUrl', 'thumbnailUrl'],
  episodes: ['coverUrl'],
  banners: ['imageUrl'],
  campaigns: ['imageUrl'],
  notifications: ['imageUrl'],
};
const uuid = (value) =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    value,
  );
const invalid = () => {
  throw new HttpsError(
    'invalid-argument',
    'Choose a supported image and destination.',
  );
};

function imageBytes(base64) {
  if (
    typeof base64 !== 'string' ||
    !base64.length ||
    base64.length > Math.ceil(maxAdminImageBytes / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  )
    invalid();
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > maxAdminImageBytes || bytes.toString('base64') !== base64)
    invalid();
  const raster =
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    (bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP');
  if (!raster) invalid();
  if (bytes[0] === 137) {
    // libvips may expose only the first APNG frame; inspect chunk types before decoding.
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = bytes.readUInt32BE(offset);
      if (length > bytes.length - offset - 12) break;
      if (bytes.toString('ascii', offset + 4, offset + 8) === 'acTL') invalid();
      offset += length + 12;
    }
  }
  return bytes;
}
export async function normalizeAdminImage(base64, { field, kind } = {}) {
  const bytes = imageBytes(base64);
  try {
    const image = sharp(bytes, {
      limitInputPixels: 16_000_000,
      animated: false,
      failOn: 'warning',
    });
    const metadata = await image.metadata();
    if (
      !['jpeg', 'png', 'webp'].includes(metadata.format) ||
      (metadata.pages ?? 1) !== 1
    )
      invalid();
    const edge =
      field === 'thumbnailUrl'
        ? 480
        : field === 'logoUrl'
          ? 720
          : field === 'coverUrl'
            ? 1280
            : 1600;
    const budget =
      (field === 'thumbnailUrl' ? 48 : field === 'logoUrl' ? 64 : 160) * 1024;
    const attempts = [
      [edge, 75],
      [edge, 60],
      [Math.round(edge * 0.75), 60],
      [Math.round(edge * 0.5), 55],
      [Math.min(edge, 320), 50],
      [192, 50],
    ];
    for (let index = 0; index < attempts.length; index++) {
      const [size, quality] = attempts[index];
      const resized = image
        .clone()
        .rotate()
        .resize(size, size, { fit: 'inside', withoutEnlargement: true });
      let output =
        kind === 'notifications'
          ? await resized
              .flatten({ background: '#ffffff' })
              .jpeg({ quality, mozjpeg: true })
              .toBuffer()
          : await resized
              .webp({ quality, alphaQuality: 70, effort: 6 })
              .toBuffer();
      // Flat logos may encode smaller losslessly; retain the smaller sanitized result.
      if (
        kind !== 'notifications' &&
        index === 0 &&
        ['png', 'webp'].includes(metadata.format)
      ) {
        const lossless = await image
          .clone()
          .rotate()
          .resize(size, size, { fit: 'inside', withoutEnlargement: true })
          .webp({ lossless: true, effort: 6 })
          .toBuffer();
        if (lossless.length < output.length) output = lossless;
      }
      if (output.length <= budget) return output;
    }
    invalid();
  } catch {
    invalid();
  }
}

export async function uploadAdminImage(args) {
  try {
    return await upload(args);
  } catch (error) {
    throw error instanceof HttpsError
      ? error
      : new HttpsError(
          'unavailable',
          'Image upload could not complete. Retry.',
        );
  }
}

async function upload({
  firestore,
  bucket,
  callerUid,
  callerRole,
  callerClaims,
  callerEmail,
  data,
  now = Date.now(),
}) {
  const actor = administrativeActor({
    callerUid,
    callerRole,
    callerClaims,
    callerEmail,
  });
  if (callerClaims?.admin !== true)
    throw new HttpsError(
      'permission-denied',
      'Administrative privileges required.',
    );
  const {
    root,
    kind,
    field,
    stationId,
    programId,
    recordId,
    operationId,
    imageBase64,
  } = data ?? {};
  if (
    !roots.includes(root) ||
    !Object.hasOwn(fields, kind) ||
    !fields[kind].includes(field) ||
    !uuid(operationId) ||
    Object.keys(data).some(
      (key) =>
        ![
          'root',
          'kind',
          'field',
          'stationId',
          'programId',
          'recordId',
          'operationId',
          'imageBase64',
        ].includes(key),
    ) ||
    (recordId !== undefined && !validContentId(recordId))
  )
    invalid();
  if (!actor.isSuperAdmin && !['programs', 'episodes'].includes(kind))
    throw new HttpsError(
      'permission-denied',
      'Super admin privileges required.',
    );
  if (
    ['programs', 'episodes'].includes(kind) &&
    (!validContentId(stationId) || !actor.canManageStation(stationId))
  )
    throw new HttpsError('permission-denied', 'Station access required.');
  if (kind === 'episodes' && !validContentId(programId)) invalid();

  async function access(tx) {
    const profiles = await Promise.all(
      roots.map((r) =>
        tx.get(
          firestore.doc(`${r}/accountDeletionRequests/requests/${callerUid}`),
        ),
      ),
    );
    const profile = await tx.get(
      firestore.doc(`${root}/users/users/${callerUid}`),
    );
    if (profiles.some((p) => p.exists) || profile.get('isActive') === false)
      throw new HttpsError('permission-denied', 'This account is unavailable.');
    if (['programs', 'episodes'].includes(kind)) {
      const station = await tx.get(
        firestore.doc(`${root}/stations/stations/${stationId}`),
      );
      if (!station.exists || station.get('adminDeletionToken'))
        throw new HttpsError(
          'failed-precondition',
          'The parent station is unavailable.',
        );
      if (kind === 'episodes') {
        const program = await tx.get(
          firestore.doc(`${root}/programs/programs/${programId}`),
        );
        if (
          !program.exists ||
          program.get('adminDeletionToken') ||
          program.get('stationId') !== stationId
        )
          throw new HttpsError(
            'failed-precondition',
            'The parent program changed.',
          );
      }
    }
    if (
      recordId &&
      ['stations', 'programs', 'episodes', 'banners'].includes(kind)
    ) {
      const current = await tx.get(
        firestore.doc(`${root}/${kind}/${kind}/${recordId}`),
      );
      if (!current.exists || current.get('adminDeletionToken'))
        throw new HttpsError(
          'failed-precondition',
          'The record is unavailable.',
        );
      if (
        ['programs', 'episodes'].includes(kind) &&
        (!validContentId(current.get('stationId')) ||
          !actor.canManageStation(current.get('stationId')))
      )
        throw new HttpsError(
          'permission-denied',
          'Existing station access required.',
        );
    }
  }

  const input = imageBytes(imageBase64);
  let details;
  const result = (job) => ({
    url: job.get('url'),
    bytes: job.get('bytes'),
    width: job.get('width'),
    height: job.get('height'),
    inputBytes: job.get('inputBytes'),
    uploadId: operationId,
  });
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify([
        kind,
        field,
        stationId ?? '',
        programId ?? '',
        recordId ?? '',
      ]),
    )
    .update(input)
    .digest('hex');
  const reference = firestore.doc(`${root}/adminImages/images/${operationId}`);
  const quota = firestore.doc(
    `${root}/adminImageUploadLimits/actors/${createHash('sha256').update(callerUid).digest('hex')}`,
  );
  const storage = typeof bucket === 'function' ? bucket() : bucket;
  const extension = kind === 'notifications' ? 'jpg' : 'webp';
  const objectPath = `${root}/admin-images/${operationId}.${extension}`;
  const token = randomUUID();
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(storage.name)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  const previous = await firestore.runTransaction(async (tx) => {
    await access(tx);
    const [job, limit] = await Promise.all([tx.get(reference), tx.get(quota)]);
    if (job.exists) {
      if (
        job.get('ownerUid') !== callerUid ||
        job.get('fingerprint') !== fingerprint
      )
        throw new HttpsError(
          'permission-denied',
          'Upload operation does not match.',
        );
      if (job.get('state') === 'ready') return result(job);
      throw new HttpsError(
        job.get('state') === 'uploading' ? 'aborted' : 'failed-precondition',
        'Upload is pending or expired.',
      );
    }
    const window = Math.floor(now / hour);
    const count =
      limit.get('window') === window ? (limit.get('count') ?? 0) : 0;
    if (now - (limit.get('lastAt')?.toMillis?.() ?? 0) < 5000 || count >= 30)
      throw new HttpsError(
        'resource-exhausted',
        'Wait before uploading another image.',
      );
    tx.set(quota, {
      window,
      count: count + 1,
      lastAt: Timestamp.fromMillis(now),
    });
    tx.create(reference, {
      inputBytes: input.length,
      root,
      ownerUid: callerUid,
      kind,
      field,
      fingerprint,
      objectPath,
      url,
      state: 'uploading',
      createdAt: Timestamp.fromMillis(now),
      dueAt: Timestamp.fromMillis(now + hour),
    });
    return null;
  });
  if (previous) return previous;
  try {
    const bytes = await normalizeAdminImage(imageBase64, { field, kind });
    const dimensions = await sharp(bytes).metadata();
    details = {
      bytes: bytes.length,
      width: dimensions.width,
      height: dimensions.height,
      inputBytes: input.length,
    };
    await storage.file(objectPath).save(bytes, {
      resumable: false,
      metadata: {
        contentType: kind === 'notifications' ? 'image/jpeg' : 'image/webp',
        cacheControl: 'public,max-age=86400,immutable',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    await firestore.runTransaction(async (tx) => {
      await access(tx);
      const job = await tx.get(reference);
      if (
        !job.exists ||
        job.get('state') !== 'uploading' ||
        job.get('fingerprint') !== fingerprint
      )
        throw new HttpsError('aborted', 'The upload expired.');
      tx.update(reference, {
        ...details,
        state: 'ready',
        dueAt: FieldValue.delete(),
        readyAt: FieldValue.serverTimestamp(),
      });
      tx.create(
        firestore.doc(`${root}/auditLogs/auditLogs/image-${operationId}`),
        {
          targetKind: 'adminImages',
          targetId: operationId,
          action: 'image-upload',
          actorUid: callerUid,
          actorEmail: actor.email,
          timestamp: FieldValue.serverTimestamp(),
          summary: `Upload ${kind} ${field}`,
        },
      );
    });
  } catch (error) {
    // A lost database acknowledgement must not downgrade an already-ready asset.
    const recovered = await firestore
      .runTransaction(async (tx) => {
        const job = await tx.get(reference);
        if (job.get('state') === 'ready') return result(job);
        if (job.exists && job.get('state') === 'uploading')
          tx.update(reference, { state: 'failed' });
        return { failed: true };
      })
      .catch(() => null);
    if (recovered && !recovered.failed) return recovered;
    if (recovered?.failed && !(error instanceof HttpsError))
      throw new HttpsError('failed-precondition', 'Choose the image again.');
    throw error;
  }
  return { url, uploadId: operationId, ...details };
}

/** Ready assets are reusable editorial media; only interrupted/failed work expires. */
export async function collectAdminImages(firestore, bucket, now = Date.now()) {
  for (const root of roots) {
    const jobs = await firestore
      .collection(`${root}/adminImages/images`)
      .where('dueAt', '<=', Timestamp.fromMillis(now))
      .orderBy('dueAt')
      .limit(25)
      .get();
    for (const job of jobs.docs) {
      const path = await firestore.runTransaction(async (tx) => {
        const current = await tx.get(job.ref);
        if (
          !current.exists ||
          current.get('state') === 'ready' ||
          (current.get('dueAt')?.toMillis?.() ?? Infinity) > now
        )
          return null;
        if (
          !uuid(job.id) ||
          current.get('root') !== root ||
          current.get('objectPath') !==
            `${root}/admin-images/${job.id}.${current.get('kind') === 'notifications' ? 'jpg' : 'webp'}`
        )
          throw new Error('Invalid editorial image cleanup record.');
        tx.update(job.ref, { state: 'deleting' });
        return current.get('objectPath');
      });
      if (!path) continue;
      const storage = typeof bucket === 'function' ? bucket() : bucket;
      await storage.file(path).delete({ ignoreNotFound: true });
      await job.ref.update({ state: 'expired', dueAt: FieldValue.delete() });
    }
  }
}
