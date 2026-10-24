import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { contentIdentity, contentIdentityScope, validContentId } from './admin-content.js';

const fail = (message, reason = 'relationship-changed') => {
  throw new HttpsError('failed-precondition', message, { reason });
};
const locationFields = [
  'countryCode',
  'countryNameAr',
  'cityCode',
  'cityNameAr',
  'locationType',
];
const locationValue = (data, key) =>
  key === 'locationType' && data[key] === undefined
    ? data.cityCode === 'yemen'
      ? 'national'
      : 'governorate'
    : data[key];
const equalLocation = (first, second) =>
  locationFields.every(
    (key) => locationValue(first, key) === locationValue(second, key),
  );

export function assertCounterAdjustment(value, delta) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    !Number.isSafeInteger(value + delta) ||
    value + delta < 0
  ) {
    fail(
      'The relationship counter is inconsistent. Review the related record.',
      'relationship-counter',
    );
  }
}

/** Collect reads first and defer every write until validation has completed. */
export async function prepareContentRelations(
  tx,
  db,
  { root, kind, id, current, content, locationId, actorFields },
) {
  const writes = [],
    relatedTargets = [];
  const existing = current.exists ? current.data() : null;
  const reference = (group, target) =>
    db.doc(`${root}/${group}/${group}/${target}`);
  if (kind === 'stations') {
    if (!validContentId(locationId))
      fail('Select an active reference location.');
    const location = await tx.get(reference('locations', locationId));
    if (
      !location.exists ||
      location.data().isActive !== true ||
      !equalLocation(location.data(), content)
    ) {
      fail('The selected location changed. Select it again before saving.');
    }
    writes.push(() =>
      tx.update(location.ref, {
        adminRelationRevision: FieldValue.increment(1),
      }),
    );
  }
  if (kind === 'locations') {
    const catalog = db.doc(`${root}/locations`);
    await tx.get(catalog);
    const duplicates = await tx.get(
      db
        .collection(`${root}/locations/locations`)
        .where('countryCode', '==', content.countryCode)
        .where('cityCode', '==', content.cityCode)
        .limit(2),
    );
    if (duplicates.docs.some((item) => item.id !== id))
      throw new HttpsError(
        'already-exists',
        'The location identity already exists.',
      );
    if (existing && !equalLocation(existing, content)) {
      const children = await tx.get(
        db
          .collection(`${root}/stations/stations`)
          .where('countryCode', '==', existing.countryCode)
          .where('cityCode', '==', existing.cityCode)
          .limit(451),
      );
      if (children.size > 450)
        fail(
          'This location has more than 450 stations. Transfer some before editing.',
          'location-children-limit',
        );
      for (const child of children.docs) {
        writes.push(() =>
          tx.update(child.ref, {
            ...Object.fromEntries(
              locationFields.map((key) => [key, content[key]]),
            ),
            ...actorFields,
          }),
        );
        relatedTargets.push({ kind: 'stations', id: child.id });
      }
    }
    writes.push(() =>
      tx.set(
        catalog,
        { adminIdentityRevision: FieldValue.increment(1) },
        { merge: true },
      ),
    );
  }
  if (kind === 'programs' || kind === 'episodes') {
    const relation = kind === 'programs' ? 'stationId' : 'programId';
    const group = kind === 'programs' ? 'stations' : 'programs';
    const count = kind === 'programs' ? 'programsCount' : 'episodesCount';
    const next = await tx.get(reference(group, content[relation]));
    if (!next.exists || next.data().adminDeletionToken)
      fail('The parent record is unavailable.');
    if (kind === 'episodes' && next.data().stationId !== content.stationId)
      fail('The selected program changed stations.');
    if (!existing || existing[relation] !== content[relation]) {
      if (existing && !validContentId(existing[relation]))
        fail('The previous relationship is invalid.');
      const previous = existing
        ? await tx.get(reference(group, existing[relation]))
        : null;
      if (
        previous &&
        (!previous.exists ||
          (kind === 'episodes' &&
            previous.data().stationId !== existing.stationId))
      ) {
        fail('The previous parent is missing or inconsistent.');
      }
      assertCounterAdjustment(next.get(`stats.${count}`), 1);
      if (previous) assertCounterAdjustment(previous.get(`stats.${count}`), -1);
      if (previous)
        writes.push(() =>
          tx.update(previous.ref, {
            [`stats.${count}`]: FieldValue.increment(-1),
          }),
        );
      writes.push(() =>
        tx.update(next.ref, { [`stats.${count}`]: FieldValue.increment(1) }),
      );
    }
    if (
      kind === 'programs' &&
      existing &&
      existing.stationId !== content.stationId
    ) {
      const children = await tx.get(
        db
          .collection(`${root}/episodes/episodes`)
          .where('programId', '==', id)
          .limit(451),
      );
      if (children.size > 450)
        fail(
          'This program has more than 450 episodes. Transfer some before moving it.',
          'program-children-limit',
        );
      for (const child of children.docs) {
        if (
          child.data().adminDeletionToken ||
          child.data().stationId !== existing.stationId
        )
          fail('A program episode is deleting or has an inconsistent station.');
        writes.push(() =>
          tx.update(child.ref, {
            stationId: content.stationId,
            ...actorFields,
          }),
        );
        relatedTargets.push({ kind: 'episodes', id: child.id });
      }
    }
  }
  return { writes, relatedTargets };
}

/** Reserve a natural key with content/counters/audit in the same transaction. */
export async function prepareContentIdentity(
  tx,
  db,
  { root, kind, id, content, existing },
) {
  const key = contentIdentity(kind, content);
  if (!key) return [];
  const keyRef = db.doc(`${root}/importKeys/importKeys/${key}`);
  const reserved = await tx.get(keyRef);
  let trustedReservation = false;
  if (
    reserved.exists &&
    reserved.data().targetId === id &&
    existing &&
    contentIdentity(kind, existing) === key
  ) {
    trustedReservation = true;
  } else if (reserved.exists && validContentId(reserved.data().targetId)) {
    const owner = await tx.get(
      db.doc(`${root}/${kind}/${kind}/${reserved.data().targetId}`),
    );
    if (owner.exists && contentIdentity(kind, owner.data()) === key) {
      throw new HttpsError(
        'already-exists',
        'The content identity is reserved by another record.',
      );
    }
  }
  if (!trustedReservation) {
    const parentField = kind === 'programs' ? 'stationId' : 'programId';
    const scope = await tx.get(db.doc(`${root}/identityScopes/scopes/${contentIdentityScope(kind, content[parentField])}`));
    trustedReservation = scope.exists && scope.get('version') === 1 && scope.get('state') === 'complete' &&
      scope.get('targetKind') === kind && scope.get('parentId') === content[parentField] &&
      /^[a-f0-9]{64}$/.test(scope.get('runId') ?? '');
  }
  if (!trustedReservation) {
    // Legacy records predate reservations. Never infer their absence from the
    // loaded preview; scan the parent scope with a hard bound before first claim.
    const parentField = kind === 'programs' ? 'stationId' : 'programId';
    const siblings = await tx.get(
      db
        .collection(`${root}/${kind}/${kind}`)
        .where(parentField, '==', content[parentField])
        .limit(451),
    );
    if (siblings.size > 450)
      fail(
        'Legacy content identity needs a reviewed backfill before this save.',
        'identity-backfill',
      );
    for (const sibling of siblings.docs) {
      if (sibling.id !== id && contentIdentity(kind, sibling.data()) === key) {
        throw new HttpsError(
          'already-exists',
          'A matching content record already exists. Refresh the import preview.',
        );
      }
    }
  }
  const writes = [];
  const previousKey = existing ? contentIdentity(kind, existing) : null;
  if (previousKey && previousKey !== key) {
    const oldRef = db.doc(`${root}/importKeys/importKeys/${previousKey}`);
    const old = await tx.get(oldRef);
    if (old.exists && old.data().targetId === id)
      writes.push(() => tx.delete(oldRef));
  }
  writes.push(() =>
    tx.set(keyRef, {
      targetKind: kind,
      targetId: id,
      keyHash: key,
      reservedAt: FieldValue.serverTimestamp(),
    }),
  );
  return writes;
}
