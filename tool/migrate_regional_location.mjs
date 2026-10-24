#!/usr/bin/env node
// One bounded atomic regional scope. Never imports credentials or runs on import.
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseCleanupArgs,
  ensureCleanupBackup,
} from './remove_old_locations.mjs';
import { CANONICAL_GENERAL_ARABIC_LOCATION as target } from './firebase_seed/canonical_locations.mjs';
const require = createRequire(
  new URL('../functions/package.json', import.meta.url),
);
const { FieldValue } = require('firebase-admin/firestore');
const fields = [
  'countryCode',
  'countryNameAr',
  'cityCode',
  'cityNameAr',
  'locationType',
];
const projection = (data) =>
  Object.fromEntries(fields.map((key) => [key, data[key] ?? null]));
const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a, b) => hash(a) === hash(b);
const shape = (doc) => ({
  id: doc.id,
  version:
    doc.updateTime.toDate().toISOString() + ':' + doc.updateTime.nanoseconds,
  before: projection(doc.data()),
  missing: fields.filter((key) => !Object.hasOwn(doc.data(), key)),
});
export function parseRegionalArgs(args) {
  if (args.includes('--max-items'))
    throw new Error(
      'Regional migration is one atomic scope, bounded to450 stations.',
    );
  const { maxItems: _, ...options } = parseCleanupArgs(args);
  return options;
}
const finalProjection = projection(target);
const restoredProjection = (item) =>
  Object.fromEntries(
    fields.map((key) => [
      key,
      item.missing.includes(key) ? FieldValue.delete() : item.before[key],
    ]),
  );

export async function runRegionalMigration(options, db) {
  const { projectId, root, mode = 'dry-run', reportPath, backupPath } = options;
  parseCleanupArgs([
    '--project',
    projectId,
    '--root',
    root,
    ...(mode === 'dry-run'
      ? []
      : [`--${mode}`, '--report', reportPath, '--backup', backupPath]),
  ]);
  if (db.projectId !== projectId)
    throw new Error('Client project does not match explicit target.');
  const locations = db.collection(`${root}/locations/locations`);
  const stations = db.collection(`${root}/stations/stations`);
  const location = locations.doc('global-ar');
  const locationQuery = locations.where('cityCode', '==', 'global-ar').limit(2);
  const stationQuery = stations.where('cityCode', '==', 'global-ar').limit(451);
  if (mode === 'dry-run') {
    const [reference, duplicates, children] = await Promise.all([
      location.get(),
      locationQuery.get(),
      stationQuery.get(),
    ]);
    if (
      !reference.exists ||
      duplicates.size !== 1 ||
      duplicates.docs[0].id !== 'global-ar'
    )
      throw new Error('Regional reference is missing or ambiguous.');
    if (children.size > 450)
      throw new Error(
        'Scope exceeds450 stations; a reviewed larger migration is required.',
      );
    const items = children.docs
      .map(shape)
      .sort((a, b) => a.id.localeCompare(b.id));
    const referenceItem = shape(reference);
    for (const item of [referenceItem, ...items]) {
      if (!['YE', 'ARAB'].includes(item.before.countryCode))
        throw new Error('Unexpected regional country; manual review required.');
    }
    const body = {
      version: 1,
      projectId,
      root,
      runId: randomUUID(),
      reference: referenceItem,
      items,
      target: finalProjection,
    };
    const report = { ...body, digest: hash(body) };
    if (reportPath) {
      await mkdir(dirname(resolve(reportPath)), { recursive: true });
      await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', {
        flag: 'wx',
        mode: 0o600,
      });
    }
    return { changed: 0, count: items.length, report };
  }
  if (resolve(reportPath) === resolve(backupPath))
    throw new Error('Report and backup must differ.');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const { digest, ...body } = report;
  if (
    digest !== hash(body) ||
    report.version !== 1 ||
    report.projectId !== projectId ||
    report.root !== root ||
    !same(report.target, finalProjection) ||
    !/^[a-f0-9-]{36}$/.test(report.runId) ||
    report.items.length > 450 ||
    new Set(report.items.map((item) => item.id)).size !== report.items.length ||
    report.items.some(
      (item) => !/^[^/]{1,128}$/.test(item.id) || ['.', '..'].includes(item.id),
    )
  )
    throw new Error('Report target, scope or integrity is invalid.');
  if (mode === 'apply') await ensureCleanupBackup(backupPath, report);
  else if (
    (await readFile(backupPath, 'utf8')) !==
    JSON.stringify(report, null, 2) + '\n'
  )
    throw new Error('Restore backup differs from reviewed report.');
  const checkpoint = db.doc(`${root}/regionalMigrations/runs/${report.runId}`);
  return db.runTransaction(async (tx) => {
    const [current, duplicates, children, progress, catalog] =
      await Promise.all([
        tx.get(location),
        tx.get(locationQuery),
        tx.get(stationQuery),
        tx.get(checkpoint),
        tx.get(db.doc(`${root}/locations`)),
      ]);
    if (progress.exists && progress.get('digest') !== digest)
      throw new Error('Checkpoint belongs to another report.');
    if (mode === 'apply' && progress.get('state') === 'applied')
      return { changed: 0, complete: true };
    if (mode === 'restore' && progress.get('state') === 'restored')
      return { changed: 0, complete: true };
    if (
      progress.exists &&
      (progress.get('digest') !== digest ||
        progress.get('state') !== 'applied' ||
        mode === 'apply')
    )
      throw new Error('Migration checkpoint does not permit this transition.');
    if (mode === 'restore' && !progress.exists)
      throw new Error('Restore requires an applied checkpoint.');
    if (
      !current.exists ||
      duplicates.size !== 1 ||
      duplicates.docs[0].id !== 'global-ar'
    )
      throw new Error('Reference became missing or ambiguous.');
    const actual = children.docs
      .map(shape)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (
      actual.length !== report.items.length ||
      actual.some((item, i) => item.id !== report.items[i].id)
    )
      throw new Error('Regional membership changed; preview again.');
    const currentReference = shape(current);
    if (
      mode === 'apply'
        ? !same(currentReference, report.reference) ||
          !same(actual, report.items)
        : !same(currentReference.before, finalProjection) ||
          actual.some((item) => !same(item.before, finalProjection))
    )
      throw new Error('Reviewed source changed; no writes applied.');
    const restoring = mode === 'restore';
    tx.update(location, {
      ...(restoring ? restoredProjection(report.reference) : finalProjection),
      adminRelationRevision: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (let i = 0; i < actual.length; i++)
      tx.update(stations.doc(actual[i].id), {
        ...(restoring ? restoredProjection(report.items[i]) : finalProjection),
        updatedAt: FieldValue.serverTimestamp(),
      });
    tx.set(
      catalog.ref,
      { adminIdentityRevision: FieldValue.increment(1) },
      { merge: true },
    );
    tx.set(checkpoint, {
      state: restoring ? 'restored' : 'applied',
      digest,
      at: FieldValue.serverTimestamp(),
    });
    tx.create(
      db.doc(`${root}/auditLogs/auditLogs/regional-${report.runId}-${mode}`),
      {
        targetKind: 'locations',
        targetId: 'global-ar',
        action: restoring ? 'regional-restore' : 'regional-migration',
        actorUid: 'maintenance:regional-v1',
        actorEmail: '',
        timestamp: FieldValue.serverTimestamp(),
        summary: 'Explicit reviewed regional scope migration',
        stationCount: actual.length,
      },
    );
    return { changed: actual.length + 1, complete: true };
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const options = parseRegionalArgs(process.argv.slice(2));
    const { initializeApp } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore(initializeApp({ projectId: options.projectId }));
    const result = await runRegionalMigration(options, db);
    console.log(
      JSON.stringify({
        changed: result.changed,
        count: result.count,
        complete: result.complete,
      }),
    );
  } catch {
    console.error(
      'Regional migration stopped; check explicit target, reviewed report, backup and scope.',
    );
    process.exitCode = 1;
  }
}
