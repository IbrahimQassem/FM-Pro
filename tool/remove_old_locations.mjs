#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_CANONICAL_LOCATIONS } from './firebase_seed/canonical_locations.mjs';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { FieldValue, Timestamp, GeoPoint } = require('firebase-admin/firestore');
const canonicalIds = new Set(ALL_CANONICAL_LOCATIONS.map(item => item.id));
const roots = ['HudHudDev', 'HudHudOfficial'];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 128 &&
  id === id.trim() && !id.includes('/') && id !== '.' && id !== '..';

// Preserve Firestore value types and timestamp precision in recoverable backups.
export function encodeCleanupValue(value) {
  if (value instanceof Timestamp) return { t: 'timestamp', v: [value.seconds, value.nanoseconds] };
  if (value instanceof GeoPoint) return { t: 'point', v: [value.latitude, value.longitude] };
  if (value instanceof Date) return { t: 'date', v: value.toISOString() };
  if (Buffer.isBuffer(value)) return { t: 'bytes', v: value.toString('base64') };
  if (value?.firestore && typeof value.path === 'string') return { t: 'ref', v: value.path };
  if (Array.isArray(value)) return { t: 'array', v: value.map(encodeCleanupValue) };
  if (value !== null && typeof value === 'object') {
    return { t: 'map', v: Object.keys(value).sort().map(key => [key, encodeCleanupValue(value[key])]) };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return { t: 'number', v: String(value) };
  if (value === null || ['string', 'boolean', 'number'].includes(typeof value)) return { t: 'value', v: value };
  throw new Error('Unsupported backup value; no cleanup is permitted.');
}

export function decodeCleanupValue(node, db) {
  switch (node.t) {
    case 'timestamp': return new Timestamp(...node.v);
    case 'point': return new GeoPoint(...node.v);
    case 'date': return new Date(node.v);
    case 'bytes': return Buffer.from(node.v, 'base64');
    case 'ref': return db.doc(node.v);
    case 'array': return node.v.map(value => decodeCleanupValue(value, db));
    case 'map': return Object.fromEntries(node.v.map(([key, value]) => [key, decodeCleanupValue(value, db)]));
    case 'number': return Number(node.v);
    case 'value': return node.v;
    default: throw new Error('Unsupported backup encoding.');
  }
}

export function parseCleanupArgs(args) {
  const values = {};
  const flags = new Set();
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (['--apply', '--restore', '--dry-run'].includes(key)) {
      if (flags.has(key)) throw new Error('Duplicate mode.');
      flags.add(key);
    } else if (['--project', '--root', '--report', '--backup', '--max-items'].includes(key)) {
      if (values[key] !== undefined || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Missing or duplicate option.');
      values[key] = args[++index];
    } else throw new Error('Unknown cleanup option.');
  }
  const projectId = values['--project'];
  const root = values['--root'];
  if (!projectId || !/^[a-z][a-z0-9-]{3,62}$/.test(projectId) || !roots.includes(root)) {
    throw new Error('Explicit --project and --root HudHudDev|HudHudOfficial are required.');
  }
  if (flags.size > 1) throw new Error('Select exactly one mode.');
  const mode = flags.has('--apply') ? 'apply' : flags.has('--restore') ? 'restore' : 'dry-run';
  if (mode !== 'dry-run' && (!values['--report'] || !values['--backup'])) {
    throw new Error('Apply/restore requires --report and --backup.');
  }
  const maxItems = Number(values['--max-items'] ?? 25);
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 100) throw new Error('--max-items must be 1..100.');
  return { projectId, root, mode, reportPath: values['--report'], backupPath: values['--backup'], maxItems };
}

function referenced(location, station) {
  return [location.id, location.data.cityCode].filter(Boolean).includes(station.data.cityCode) ||
    station.data.locationId === location.id;
}

export function createCleanupReport({ projectId, root, locations, stations, generation = '' }) {
  const candidates = [], blocked = [];
  for (const location of [...locations].sort((a, b) => a.id.localeCompare(b.id))) {
    if (canonicalIds.has(location.id)) continue;
    if (stations.some(station => referenced(location, station))) {
      blocked.push({ id: location.id, reason: 'referenced' });
    } else candidates.push({ id: location.id, data: encodeCleanupValue(location.data) });
  }
  const report = { version: 1, projectId, root, generation, candidates, blocked };
  return { ...report, runId: digest(report) };
}

export function validateCleanupReport(report, projectId, root) {
  const { runId, ...body } = report;
  if (report.version !== 1 || report.projectId !== projectId || report.root !== root ||
      !Array.isArray(report.candidates) || !Array.isArray(report.blocked) || runId !== digest(body) ||
      report.candidates.some(item => !validId(item.id) || canonicalIds.has(item.id)) ||
      new Set(report.candidates.map(item => item.id)).size !== report.candidates.length) {
    throw new Error('Cleanup manifest is invalid, changed or targets a different environment.');
  }
  return report;
}

export async function ensureCleanupBackup(path, report) {
  const bytes = JSON.stringify(report, null, 2) + '\n';
  await mkdir(dirname(resolve(path)), { recursive: true });
  let handle;
  try {
    handle = await open(path, 'wx', 0o600);
    await handle.writeFile(bytes, 'utf8');
    await handle.sync();
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  } finally { await handle?.close(); }
  if (await readFile(path, 'utf8') !== bytes) throw new Error('Backup mismatch; no cleanup is permitted.');
  const directory = await open(dirname(resolve(path)), 'r');
  try { await directory.sync(); } finally { await directory.close(); }
}

export async function runCleanup(options, db) {
  const { projectId, root, mode, reportPath, backupPath, maxItems = 25 } = options;
  if (db.projectId !== projectId) throw new Error('Firestore client project does not match the explicit target.');
  parseCleanupArgs(['--project', projectId, '--root', root, `--${mode}`,
    ...(reportPath ? ['--report', reportPath] : []), ...(backupPath ? ['--backup', backupPath] : []),
    '--max-items', String(maxItems)]);
  if (mode === 'dry-run') {
    const [locations, stations] = await Promise.all([
      db.collection(`${root}/locations/locations`).get(), db.collection(`${root}/stations/stations`).get(),
    ]);
    const report = createCleanupReport({ projectId, root, generation: randomUUID(),
      locations: locations.docs.map(doc => ({ id: doc.id, data: doc.data() })),
      stations: stations.docs.map(doc => ({ id: doc.id, data: doc.data() })),
    });
    if (reportPath) {
      await mkdir(dirname(resolve(reportPath)), { recursive: true });
      await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    return { mode, report, changed: 0 };
  }
  if (resolve(reportPath) === resolve(backupPath)) throw new Error('Report and backup must be separate files.');
  const report = validateCleanupReport(JSON.parse(await readFile(reportPath, 'utf8')), projectId, root);
  if (mode === 'apply') await ensureCleanupBackup(backupPath, report);
  else if (await readFile(backupPath, 'utf8') !== JSON.stringify(report, null, 2) + '\n') throw new Error('Restore backup does not match the report.');

  let changed = 0, skipped = 0;
  for (const item of report.candidates) {
    if (changed >= maxItems) break;
    const ref = db.doc(`${root}/locations/locations/${item.id}`);
    const checkpoint = db.doc(`${root}/locationCleanup/runs/${report.runId}/items/${item.id}`);
    const result = await db.runTransaction(async tx => {
      const [current, progress] = await Promise.all([tx.get(ref), tx.get(checkpoint)]);
      const state = progress.data()?.state;
      if ((mode === 'apply' && state === 'deleted') || (mode === 'restore' && state === 'restored')) return false;
      if (mode === 'restore') {
        if (!state && current.exists && digest(encodeCleanupValue(current.data())) === digest(item.data)) return false;
        if (state !== 'deleted' || current.exists) throw new Error('Restore refuses missing checkpoints or existing locations.');
        tx.create(ref, decodeCleanupValue(item.data, db));
      } else {
        if (state === 'restored') throw new Error('Restored runs cannot be reapplied; generate a new report.');
        if (!current.exists || digest(encodeCleanupValue(current.data())) !== digest(item.data)) throw new Error('Location changed since review; generate a new report.');
        const value = current.data();
        const codes = [...new Set([item.id, value.cityCode].filter(code => typeof code === 'string' && code.length > 0))];
        const [byCode, byId] = await Promise.all([
          tx.get(db.collection(`${root}/stations/stations`).where('cityCode', 'in', codes).limit(1)),
          tx.get(db.collection(`${root}/stations/stations`).where('locationId', '==', item.id).limit(1)),
        ]);
        if (!byCode.empty || !byId.empty) throw new Error('Location became referenced; cleanup refused.');
        tx.delete(ref);
      }
      tx.set(checkpoint, { state: mode === 'apply' ? 'deleted' : 'restored', at: FieldValue.serverTimestamp() });
      tx.set(db.doc(`${root}/locations`), { adminIdentityRevision: FieldValue.increment(1) }, { merge: true });
      return true;
    });
    if (result) changed++; else skipped++;
  }
  return { mode, changed, skipped, total: report.candidates.length, runId: report.runId };
}

async function main() {
  try {
    const options = parseCleanupArgs(process.argv.slice(2));
    const { Firestore } = require('@google-cloud/firestore');
    const result = await runCleanup(options, new Firestore({ projectId: options.projectId }));
    console.log(JSON.stringify({ mode: result.mode, changed: result.changed,
      candidates: result.report?.candidates.length ?? result.total, blocked: result.report?.blocked.length,
      skipped: result.skipped }));
  } catch {
    console.error('Location cleanup failed. Check explicit options, reviewed manifest, backup and references.');
    process.exitCode = 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
