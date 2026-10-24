#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentIdentity, contentIdentityScope, validContentId } from '../functions/lib/admin-content.js';
import { encodeCleanupValue, ensureCleanupBackup } from './remove_old_locations.mjs';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { FieldValue, FieldPath } = require('firebase-admin/firestore');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const relation = kind => kind === 'programs' ? 'stationId' : 'programId';
const parentKind = kind => kind === 'programs' ? 'stations' : 'programs';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const owned = (data, kind, item) => data?.targetKind === kind && data.targetId === item.id && data.keyHash === item.key;
export const identityScopeKey = contentIdentityScope;

export function parseIdentityArgs(args) {
  const options = {}, modes = [];
  const names = { '--project': 'projectId', '--root': 'root', '--kind': 'kind', '--parent': 'parentId', '--report': 'reportPath', '--backup': 'backupPath', '--max-items': 'maxItems', '--max-records': 'maxRecords' };
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (['--dry-run', '--apply', '--restore'].includes(key)) modes.push(key.slice(2));
    else if (names[key] && options[names[key]] === undefined && args[index + 1] && !args[index + 1].startsWith('--')) options[names[key]] = args[++index];
    else throw new Error('Unknown, duplicate or missing identity option.');
  }
  if (modes.length > 1) throw new Error('Select one identity mode.');
  options.mode = modes[0] ?? 'dry-run';
  options.maxItems = Number(options.maxItems ?? 25); options.maxRecords = Number(options.maxRecords ?? 5000);
  if (!/^[a-z][a-z0-9-]{3,62}$/.test(options.projectId ?? '') || !['HudHudDev', 'HudHudOfficial'].includes(options.root) ||
      !['programs', 'episodes'].includes(options.kind) || !validContentId(options.parentId) ||
      !Number.isInteger(options.maxItems) || options.maxItems < 1 || options.maxItems > 100 ||
      !Number.isInteger(options.maxRecords) || options.maxRecords < 1 || options.maxRecords > 10000 ||
      (options.mode !== 'dry-run' && (!options.reportPath || !options.backupPath))) throw new Error('Explicit valid target and bounded reviewed options are required.');
  return options;
}

export function identityManifest({ projectId, root, kind, parentId, parentVersion, records, reservations, generation = '' }) {
  const keys = new Map(reservations.map(item => [item.id, item.data]));
  const items = [], blockers = [], seen = new Map();
  for (const record of [...records].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = record.key !== undefined ? record.key : contentIdentity(kind, record.data ?? {});
    const parent = record.parentId ?? record.data?.[relation(kind)];
    if (!validContentId(record.id) || parent !== parentId || !/^[a-f0-9]{64}$/.test(key ?? '')) {
      blockers.push({ id: record.id, reason: 'invalid-content' }); continue;
    }
    if (seen.has(key)) blockers.push({ id: record.id, otherId: seen.get(key), reason: 'duplicate-identity' });
    seen.set(key, record.id);
    const item = { id: record.id, key, hadReservation: keys.has(key) };
    if (keys.has(key) && !owned(keys.get(key), kind, item)) blockers.push({ id: record.id, reason: 'reservation-conflict' });
    items.push(item);
  }
  const body = { version: 1, projectId, root, kind, parentId, parentVersion: encodeCleanupValue(parentVersion), generation, items, blockers };
  return { ...body, runId: digest(body) };
}

export function validateIdentityManifest(report, target) {
  const { runId, ...body } = report;
  if (report.version !== 1 || runId !== digest(body) || ['projectId', 'root', 'kind', 'parentId'].some(key => report[key] !== target[key]) ||
      !Array.isArray(report.items) || report.items.length > 10000 || !Array.isArray(report.blockers) ||
      report.items.some(item => !validContentId(item.id) || !/^[a-f0-9]{64}$/.test(item.key) || typeof item.hadReservation !== 'boolean') ||
      new Set(report.items.map(item => item.id)).size !== report.items.length || new Set(report.items.map(item => item.key)).size !== report.items.length) {
    throw new Error('Identity manifest is invalid, changed or targets another scope.');
  }
  return report;
}

export async function runIdentityBackfill(options, db) {
  const { projectId, root, kind, parentId, mode, reportPath, backupPath, maxItems = 25, maxRecords = 5000 } = options;
  parseIdentityArgs(['--project', projectId, '--root', root, '--kind', kind, '--parent', parentId, `--${mode}`, '--max-items', String(maxItems), '--max-records', String(maxRecords),
    ...(reportPath ? ['--report', reportPath] : []), ...(backupPath ? ['--backup', backupPath] : [])]);
  if (db.projectId !== projectId) throw new Error('Firestore project does not match the explicit identity target.');
  const parent = db.doc(`${root}/${parentKind(kind)}/${parentKind(kind)}/${parentId}`);
  const collection = db.collection(`${root}/${kind}/${kind}`);
  const query = collection.where(relation(kind), '==', parentId);
  const marker = db.doc(`${root}/identityScopes/scopes/${identityScopeKey(kind, parentId)}`);
  const lock = db.doc(`${root}/identityScopeLocks/locks/${identityScopeKey(kind, parentId)}`);
  if (mode === 'dry-run') {
    const before = await parent.get();
    if (!before.exists) throw new Error('Identity scope parent is missing.');
    const records = [], reservations = []; let cursor;
    for (;;) {
      let page = query.orderBy(FieldPath.documentId()).limit(Math.min(100, maxRecords - records.length + 1));
      if (cursor) page = page.startAfter(cursor);
      const snapshot = await page.get();
      if (records.length + snapshot.size > maxRecords) throw new Error('Scope exceeds the reviewed record bound.');
      for (const item of snapshot.docs) records.push({ id: item.id, key: contentIdentity(kind, item.data()), parentId: item.get(relation(kind)) });
      const refs = snapshot.docs.map(item => contentIdentity(kind, item.data())).filter(Boolean).map(key => db.doc(`${root}/importKeys/importKeys/${key}`));
      if (refs.length) for (const reservation of await db.getAll(...refs)) if (reservation.exists) reservations.push({ id: reservation.id, data: { targetId: reservation.get('targetId'), targetKind: reservation.get('targetKind'), keyHash: reservation.get('keyHash') } });
      if (snapshot.size < 100) break;
      cursor = snapshot.docs.at(-1);
    }
    const after = await parent.get();
    if (!after.exists || !before.updateTime.isEqual(after.updateTime)) throw new Error('Scope changed during preview; start a new preview.');
    const report = identityManifest({ projectId, root, kind, parentId, parentVersion: before.updateTime, records, reservations, generation: randomUUID() });
    if (reportPath) { await mkdir(dirname(resolve(reportPath)), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
    return { mode, report, changed: 0 };
  }
  if (resolve(reportPath) === resolve(backupPath)) throw new Error('Report and backup must be separate files.');
  const report = validateIdentityManifest(JSON.parse(await readFile(reportPath, 'utf8')), options);
  if (report.blockers.length) throw new Error('Resolve all reviewed identity blockers before apply or restore.');
  if (mode === 'apply') await ensureCleanupBackup(backupPath, report);
  else if (await readFile(backupPath, 'utf8') !== JSON.stringify(report, null, 2) + '\n') throw new Error('Restore backup does not match the identity manifest.');
  const run = db.doc(`${root}/identityBackfills/runs/${report.runId}`);
  const stableParent = snapshot => snapshot.exists && same(encodeCleanupValue(snapshot.updateTime), report.parentVersion);
  const range = await db.runTransaction(async tx => {
    const [progress, scope, current, owner] = await Promise.all([tx.get(run), tx.get(marker), tx.get(parent), tx.get(lock)]);
    if (owner.exists && owner.get('runId') !== report.runId) throw new Error('Another maintenance run owns this scope.');
    if (!owner.exists) tx.create(lock, { runId: report.runId });
    if (mode === 'apply') {
      if (!stableParent(current)) throw new Error('Parent changed; review a new manifest.');
      if (progress.exists && ['restoring', 'restored'].includes(progress.get('status'))) throw new Error('A restored run requires a fresh preview.');
      if (scope.exists && scope.get('runId') !== report.runId) throw new Error('Another run already owns the scope marker.');
      if (!progress.exists) tx.create(run, { status: 'applying', completed: 0, total: report.items.length, targetKind: kind, parentId, createdAt: FieldValue.serverTimestamp() });
      return { start: progress.get('completed') ?? 0, end: report.items.length };
    } else {
      if (!progress.exists) throw new Error('No matching applied run exists.');
      if (scope.exists && scope.get('runId') !== report.runId) throw new Error('Another run owns the scope; do not remove its keys.');
      if (scope.exists) tx.delete(marker);
      if (progress.get('status') !== 'restored') tx.update(run, { status: 'restoring', restoreCompleted: progress.get('restoreCompleted') ?? 0 });
      return { start: progress.get('restoreCompleted') ?? 0, end: progress.get('completed') };
    }
  });
  let processed = 0, changed = 0;
  for (const item of report.items.slice(range.start, range.end)) {
    if (processed >= maxItems) break;
    const keyRef = db.doc(`${root}/importKeys/importKeys/${item.key}`);
    const content = collection.doc(item.id);
    const checkpoint = run.collection('items').doc(item.key);
    const result = await db.runTransaction(async tx => {
      const [current, key, point, progress, currentParent, scope, owner] = await Promise.all([tx.get(content), tx.get(keyRef), tx.get(checkpoint), tx.get(run), tx.get(parent), tx.get(marker), tx.get(lock)]);
      if (owner.get('runId') !== report.runId) throw new Error('Maintenance scope ownership changed.');
      if (mode === 'apply') {
        if (progress.get('status') !== 'applying') throw new Error('The run phase changed; stop apply.');
        if (point.exists) return 'done';
        if (!stableParent(currentParent) || !current.exists || current.get(relation(kind)) !== parentId || contentIdentity(kind, current.data()) !== item.key) throw new Error('Content or scope changed; review a new manifest.');
        if (key.exists && !owned(key.data(), kind, item)) throw new Error('Identity reservation changed; no overwrite is permitted.');
        if (!key.exists) tx.create(keyRef, { targetKind: kind, targetId: item.id, keyHash: item.key, reservedAt: FieldValue.serverTimestamp(), backfillRunId: report.runId });
        tx.create(checkpoint, { status: key.exists ? 'unchanged' : 'created' });
        tx.update(run, { completed: progress.get('completed') + 1 });
        return key.exists ? 'processed' : 'changed';
      }
      if (progress.get('status') !== 'restoring') throw new Error('The run phase changed; stop restore.');
      if (!point.exists) throw new Error('An applied checkpoint is missing; stop restore.');
      if (point.get('status') === 'restored') return 'done';
      if (scope.exists) throw new Error('Scope marker was replaced; stop restoration.');
      const remove = key.exists && key.get('backfillRunId') === report.runId && owned(key.data(), kind, item);
      if (remove) tx.delete(keyRef);
      tx.update(checkpoint, { status: 'restored', removed: remove });
      tx.update(run, { restoreCompleted: progress.get('restoreCompleted') + 1 });
      return remove ? 'changed' : 'processed';
    });
    processed++;
    if (result === 'changed') changed++;
  }
  let complete = false;
  if (mode === 'apply') complete = await db.runTransaction(async tx => {
    const [progress, currentParent, count, scope, owner] = await Promise.all([tx.get(run), tx.get(parent), tx.get(query.count()), tx.get(marker), tx.get(lock)]);
    if (owner.get('runId') !== report.runId) throw new Error('Maintenance scope ownership changed.');
    if (!['applying', 'complete'].includes(progress.get('status'))) throw new Error('The run phase changed; no completion marker is permitted.');
    if (progress.get('completed') !== report.items.length) return false;
    if (!stableParent(currentParent) || count.data().count !== report.items.length) throw new Error('Scope changed or manifest is incomplete; no completion marker is permitted.');
    if (scope.exists && scope.get('runId') !== report.runId) throw new Error('Another run owns the completed scope.');
    if (!scope.exists) {
      tx.create(marker, { version: 1, state: 'complete', targetKind: kind, parentId, runId: report.runId, completedAt: FieldValue.serverTimestamp() });
      tx.update(run, { status: 'complete' });
    }
    tx.delete(lock);
    return true;
  });
  else complete = await db.runTransaction(async tx => {
    const [progress, owner] = await Promise.all([tx.get(run), tx.get(lock)]);
    if (owner.get('runId') !== report.runId) throw new Error('Maintenance scope ownership changed.');
    if (progress.get('restoreCompleted') !== progress.get('completed')) return false;
    if (progress.get('status') !== 'restored') tx.update(run, { status: 'restored' });
    tx.delete(lock);
    return true;
  });
  return { mode, changed, processed, complete, total: range.end };
}

async function main() {
  const options = parseIdentityArgs(process.argv.slice(2));
  const { initializeApp } = require('firebase-admin/app'); const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId: options.projectId });
  try {
    const result = await runIdentityBackfill(options, getFirestore(app));
    console.log(JSON.stringify({ mode: result.mode, changed: result.changed, processed: result.processed ?? 0, complete: result.complete ?? false, total: result.report?.items.length ?? result.total, blockers: result.report?.blockers.length ?? 0 }));
  } finally { const { deleteApp } = require('firebase-admin/app'); await deleteApp(app); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Identity maintenance stopped safely; review its manifest and checkpoints.'); process.exitCode = 1; });
