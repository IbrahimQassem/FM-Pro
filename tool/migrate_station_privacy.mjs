#!/usr/bin/env node
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const privacyToolVersion = 'station-privacy-v1';
export const privacyLimits = Object.freeze({ records: 100, readPage: 50, transactionsPerBatch: 25, concurrency: 1 });
export const privateStationFields = Object.freeze('owner address contactPerson contactPhone contactEmail streamType audioCodec bitrateKbps sampleRateHz transmitterPower transmitterLocation coverageArea rds'.split(' '));
const privateKeys = new Set(privateStationFields);
const roots = ['HudHudDev', 'HudHudOfficial'];
const operations = ['station-private', 'profile-email'];
const maximumRetention = 30 * 24 * 60 * 60 * 1000;
const minimumRecoveryWindow = 60 * 60 * 1000;
const backupToken = Symbol('verified-private-backup');
const demoTransports = new WeakMap();
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const fail = code => { const error = new Error(`Privacy migration stopped: ${code}.`); error.name = 'PrivacyMigrationError'; error.code = code; throw error; };
const digest = value => createHash('sha256').update(value).digest('hex');
const safeId = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value && !value.includes('/') && value !== '.' && value !== '..';
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stable = value => JSON.stringify(value);
const same = (a, b) => stable(a) === stable(b);
const within = (path, parent) => { const suffix = relative(parent, path); return suffix === '' || (!suffix.startsWith(`..${sep}`) && suffix !== '..' && !isAbsolute(suffix)); };

// Explicit tags preserve Firestore value types in the private before-image.
// Plain records always remain maps, including maps that resemble SDK values.
export function privacyValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : { $number: String(value) };
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) fail('unsupported-value');
    return { $date: value.toISOString() };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(privacyValue);
  if (!value || typeof value !== 'object') fail('unsupported-value');
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) {
    return { $map: Object.fromEntries(Object.keys(value).sort().map(key => [key, privacyValue(value[key])])) };
  }
  if (value.constructor?.name === 'Timestamp' && Number.isSafeInteger(value.seconds) && Number.isInteger(value.nanoseconds)) {
    return { $timestamp: [value.seconds, value.nanoseconds] };
  }
  if (value.constructor?.name === 'GeoPoint' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) return { $geo: [value.latitude, value.longitude] };
  if (typeof value.path === 'string' && value.firestore && value.parent) return { $reference: value.path };
  fail('unsupported-value');
}
function untag(value) {
  // Only plain maps/arrays and primitives are needed by the migration planner;
  // opaque public SDK values remain tagged and are never rewritten.
  if (Array.isArray(value)) return value.map(untag);
  if (value && typeof value === 'object' && Object.keys(value).length === 1 && value.$map) {
    return Object.fromEntries(Object.entries(value.$map).map(([key, item]) => [key, untag(item)]));
  }
  return value;
}
function scope(input) {
  if (typeof input.projectId !== 'string' || !/^[a-z][a-z0-9-]{4,62}$/.test(input.projectId) || !roots.includes(input.root) || !operations.includes(input.operation)) fail('invalid-scope');
}
function demoScope(input) {
  scope(input);
  const host = input.emulatorHost ?? process.env.FIRESTORE_EMULATOR_HOST;
  const match = typeof host === 'string' && /^(?:127\.0\.0\.1|localhost|\[::1\]):(\d+)$/.exec(host);
  if (!input.projectId.startsWith('demo-') || !match || Number(match[1]) < 1 || Number(match[1]) > 65535) fail('production-mutation-disabled');
  return host;
}

/** Own the SDK configuration; callers cannot register an arbitrary transport. */
export function createPrivacyDemoFirestore({ projectId, emulatorHost }) {
  const host = demoScope({ projectId, emulatorHost, root: roots[0], operation: operations[0] });
  // The installed SDK gives this environment variable precedence over settings.
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== host) fail('conflicting-emulator-transport');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { Firestore, FieldPath } = require('firebase-admin/firestore');
  const client = new Firestore();
  // Public settings() freezes configuration after this call; no private SDK API.
  client.settings({ projectId, host, ssl: false });
  const facade = Object.freeze({ projectId, privacyDocumentId: FieldPath.documentId(),
    doc: client.doc.bind(client), collection: client.collection.bind(client),
    getAll: client.getAll.bind(client), runTransaction: client.runTransaction.bind(client),
    terminate: client.terminate.bind(client) });
  demoTransports.set(facade, { projectId, host });
  return facade;
}
function demoMutation(input, firestore) {
  const host = demoScope(input);
  if (firestore.projectId !== input.projectId) fail('project-mismatch');
  const binding = demoTransports.get(firestore);
  if (!binding || binding.projectId !== input.projectId || binding.host !== host) fail('untrusted-mutation-transport');
}
function version(snapshot) {
  if (!snapshot.exists) return null;
  const stamp = snapshot.updateTime;
  if (!stamp || !Number.isSafeInteger(stamp.seconds) || !Number.isInteger(stamp.nanoseconds)) fail('missing-document-version');
  return `${stamp.seconds}:${stamp.nanoseconds}`;
}
const image = snapshot => ({ exists: snapshot.exists, version: version(snapshot), data: snapshot.exists ? privacyValue(snapshot.data()) : null });
const fingerprint = value => digest(stable(value));
function privateValues(data) {
  const values = {};
  for (const key of privateStationFields) {
    if (!Object.hasOwn(data, key)) continue;
    if (typeof data[key] !== 'string') fail('invalid-private-data');
    values[key] = data[key].trim();
    if (key === 'contactEmail' && values[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[key])) fail('invalid-private-data');
  }
  return values;
}
function stationPlan(before) {
  const source = untag(before.source.data);
  if (source.adminDeletionToken) fail('deletion-in-progress');
  const legacy = privateValues(source);
  const publicData = Object.fromEntries(Object.entries(before.source.data.$map).filter(([key]) => !privateKeys.has(key)));
  let canonical;
  let writePrivate = false;
  if (before.private.exists) {
    const current = untag(before.private.data);
    if (current.schemaVersion !== 1 || !Number.isSafeInteger(current.revision) || current.revision < 1 || Object.keys(current).some(key => !privateKeys.has(key) && key !== 'schemaVersion' && key !== 'revision')) fail('invalid-private-schema');
    const values = privateValues(current);
    if (Object.keys(legacy).some(key => !Object.hasOwn(values, key) || values[key] !== legacy[key])) fail('private-collision');
    canonical = before.private.data;
  } else {
    canonical = privacyValue({ ...legacy, schemaVersion: 1, revision: 1 });
    writePrivate = true;
  }
  return { source: { $map: publicData }, private: canonical, writePrivate };
}
function plan(entry, operation) {
  if (!entry.before.source.exists) fail('source-missing');
  if (operation === 'station-private') return stationPlan(entry.before);
  if (entry.before.deletionJobs.some(item => item.exists)) fail('deletion-in-progress');
  const map = entry.before.source.data.$map;
  return { source: { $map: Object.fromEntries(Object.entries(map).filter(([key]) => key !== 'email')) }, private: null, writePrivate: false };
}
function paths(root, operation, id) {
  return { source: `${root}/${operation === 'station-private' ? 'stations/stations' : 'users/users'}/${id}`,
    private: `${root}/stationPrivate/stations/${id}`,
    deletionJobs: roots.map(item => `${item}/accountDeletionRequests/requests/${id}`) };
}

export async function previewPrivacy({ firestore, projectId, root, operation, cursor = null, limit = privacyLimits.records }) {
  scope({ projectId, root, operation });
  if (firestore.projectId !== projectId) fail('project-mismatch');
  if ((cursor !== null && !safeId(cursor)) || !Number.isInteger(limit) || limit < 1 || limit > privacyLimits.records) fail('invalid-bound');
  const entries = [];
  let scanned = 0;
  let last = cursor;
  let exhausted = false;
  while (scanned < limit) {
    const pageSize = Math.min(privacyLimits.readPage, limit - scanned);
    const collection = firestore.collection(`${root}/${operation === 'station-private' ? 'stations/stations' : 'users/users'}`);
    let query = collection.orderBy(firestore.privacyDocumentId ?? '__name__');
    if (last !== null) query = query.startAfter(last);
    const page = await query.limit(pageSize).get();
    for (const snapshot of page.docs) {
      if (!safeId(snapshot.id)) fail('invalid-document-id');
      scanned++;
      last = snapshot.id;
      const data = snapshot.data();
      if (!(operation === 'station-private' ? privateStationFields.some(key => Object.hasOwn(data, key)) : Object.hasOwn(data, 'email'))) continue;
      const target = paths(root, operation, snapshot.id);
      const before = { source: image(snapshot), private: null, deletionJobs: [] };
      if (operation === 'station-private') before.private = image(await firestore.doc(target.private).get());
      else before.deletionJobs = await Promise.all(target.deletionJobs.map(async path => image(await firestore.doc(path).get())));
      const entry = { id: snapshot.id, before, status: 'ready' };
      try { entry.after = plan(entry, operation); }
      catch (error) { if (error.name !== 'PrivacyMigrationError') throw error; entry.status = 'conflict'; entry.reason = error.code; }
      entries.push(entry);
    }
    if (page.size < pageSize) { exhausted = true; break; }
  }
  const manifest = { schemaVersion: 1, toolVersion: privacyToolVersion, projectId, root, operation, cursor,
    nextCursor: exhausted ? null : last, scanned, exhausted, entries };
  manifest.hash = fingerprint(manifest);
  return manifest;
}

export function verifyPrivacyManifest(manifest, expectedHash, { allowConflicts = false } = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('invalid-manifest');
  scope(manifest);
  const { hash, ...body } = manifest;
  if (!validHash(hash) || hash !== expectedHash || fingerprint(body) !== hash || manifest.schemaVersion !== 1 || manifest.toolVersion !== privacyToolVersion ||
      !Number.isInteger(manifest.scanned) || manifest.scanned < 0 || manifest.scanned > privacyLimits.records ||
      !Array.isArray(manifest.entries) || manifest.entries.length > manifest.scanned ||
      new Set(manifest.entries.map(entry => entry.id)).size !== manifest.entries.length ||
      typeof manifest.exhausted !== 'boolean' || (manifest.cursor !== null && !safeId(manifest.cursor)) ||
      (manifest.nextCursor !== null && !safeId(manifest.nextCursor))) fail('invalid-manifest');
  for (const entry of manifest.entries) {
    if (!safeId(entry.id) || !entry.before) fail('manifest-conflict');
    if (entry.status === 'conflict' && allowConflicts) {
      let reason;
      try { plan(entry, manifest.operation); } catch (error) { if (error.name !== 'PrivacyMigrationError') throw error; reason = error.code; }
      if (!reason || entry.reason !== reason || entry.after !== undefined) fail('manifest-conflict');
    } else if (entry.status !== 'ready' || !same(plan(entry, manifest.operation), entry.after)) fail('manifest-conflict');
  }
  return manifest;
}

export class PrivatePrivacyBackupStore {
  #directory; #key; #now; #expiry; #identity;
  constructor(token, directory, key, now, expiry, identity) {
    if (token !== backupToken) fail('use-backup-store-factory');
    this.#directory = directory; this.#key = key; this.#now = now; this.#expiry = expiry; this.#identity = identity;
  }
  static async open({ directory, key, expiresAt, now = () => Date.now() }) {
    if (typeof directory !== 'string' || !isAbsolute(directory) || !Buffer.isBuffer(key) || key.length !== 32) fail('invalid-backup-config');
    const actual = await realpath(directory).catch(() => fail('backup-directory-unavailable'));
    const repo = await realpath(repositoryRoot).catch(() => fail('repository-unavailable'));
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || (stat.mode & 0o077) !== 0 || (process.geteuid && stat.uid !== process.geteuid()) || within(actual, repo) || actual.split(sep).includes('.boss')) fail('unsafe-backup-directory');
    for (let parent = actual; ; parent = dirname(parent)) {
      const git = await lstat(join(parent, '.git')).catch(error => { if (error.code !== 'ENOENT') fail('backup-directory-unavailable'); return null; });
      if (git) fail('unsafe-backup-directory');
      if (dirname(parent) === parent) break;
    }
    const createdAt = now();
    if (!Number.isSafeInteger(expiresAt) || expiresAt - createdAt < minimumRecoveryWindow || expiresAt - createdAt > maximumRetention) fail('invalid-backup-expiry');
    return new PrivatePrivacyBackupStore(backupToken, actual, Buffer.from(key), now, expiresAt, { device: stat.dev, inode: stat.ino });
  }
  async #checkDirectory() {
    try {
      const actual = await realpath(this.#directory);
      const stat = await lstat(this.#directory);
      if (actual !== this.#directory || stat.isSymbolicLink() || !stat.isDirectory() ||
          (stat.mode & 0o077) !== 0 || (process.geteuid && stat.uid !== process.geteuid()) ||
          stat.dev !== this.#identity.device || stat.ino !== this.#identity.inode) fail('unsafe-backup-directory');
    } catch { fail('unsafe-backup-directory'); }
  }
  #path(hash) { if (!validHash(hash)) fail('invalid-backup-id'); return resolve(this.#directory, `${hash}.privacy.aes`); }
  async #syncDirectory() { const handle = await open(this.#directory, 'r'); try { await handle.sync(); } finally { await handle.close(); } }
  async writeVerified(manifest) {
    await this.#checkDirectory();
    verifyPrivacyManifest(manifest, manifest.hash, { allowConflicts: true });
    const createdAt = this.#now();
    if (this.#expiry - createdAt < minimumRecoveryWindow) fail('backup-recovery-window');
    const iv = randomBytes(12);
    const header = { schemaVersion: 1, algorithm: 'aes-256-gcm', manifestHash: manifest.hash, createdAt, expiresAt: this.#expiry, iv: iv.toString('base64') };
    const cipher = createCipheriv('aes-256-gcm', this.#key, iv);
    cipher.setAAD(Buffer.from(stable(header)));
    const ciphertext = Buffer.concat([cipher.update(stable(manifest)), cipher.final()]);
    const envelope = { ...header, tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
    let handle;
    try {
      handle = await open(this.#path(manifest.hash), 'wx', 0o600);
      await handle.writeFile(stable(envelope));
      await handle.sync();
    } catch (error) {
      if (error.code !== 'EEXIST') fail('backup-persistence-failed');
    } finally { await handle?.close(); }
    await this.#syncDirectory().catch(() => fail('backup-persistence-failed'));
    return this.readVerified(manifest.hash);
  }
  async readVerified(hash, recoveryWindow = minimumRecoveryWindow) {
    await this.#checkDirectory();
    const path = this.#path(hash);
    try {
      const stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 || (process.geteuid && stat.uid !== process.geteuid())) fail('unsafe-backup-file');
      const raw = await readFile(path, 'utf8');
      await this.#checkDirectory();
      const envelope = JSON.parse(raw);
      const { tag, ciphertext, ...header } = envelope;
      if (header.schemaVersion !== 1 || header.algorithm !== 'aes-256-gcm' || header.manifestHash !== hash ||
          !Number.isSafeInteger(header.createdAt) || !Number.isSafeInteger(header.expiresAt) ||
          header.expiresAt - header.createdAt > maximumRetention || header.expiresAt - this.#now() < recoveryWindow ||
          header.createdAt > this.#now()) fail('backup-expired-or-invalid');
      const iv = Buffer.from(header.iv, 'base64');
      const authTag = Buffer.from(tag, 'base64');
      if (iv.length !== 12 || authTag.length !== 16) fail('backup-integrity');
      const decipher = createDecipheriv('aes-256-gcm', this.#key, iv);
      decipher.setAAD(Buffer.from(stable(header)));
      decipher.setAuthTag(authTag);
      const manifest = JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8'));
      verifyPrivacyManifest(manifest, hash, { allowConflicts: true });
      return { manifest, expiresAt: header.expiresAt, createdAt: header.createdAt };
    } catch (error) {
      if (error.name === 'PrivacyMigrationError') throw error;
      fail('backup-integrity');
    }
  }
}

export function privacyJobPath(root, hash) {
  if (!roots.includes(root) || !validHash(hash)) fail('invalid-job-scope');
  return `${root}/privacyMigrationJobs/jobs/${hash}`;
}
function boundJob(job, manifest) {
  const fields = new Set(['schemaVersion', 'toolVersion', 'manifestHash', 'projectId', 'root', 'operation', 'owner', 'generation', 'leaseUntil', 'nextIndex', 'status', 'expiresAt']);
  if (!job || Object.keys(job).some(key => !fields.has(key)) || job.schemaVersion !== 1 || job.toolVersion !== privacyToolVersion || job.manifestHash !== manifest.hash || job.projectId !== manifest.projectId || job.root !== manifest.root || job.operation !== manifest.operation ||
      !Number.isInteger(job.nextIndex) || job.nextIndex < 0 || job.nextIndex > manifest.entries.length || !Number.isSafeInteger(job.generation) || job.generation < 1 ||
      !['running', 'completed'].includes(job.status) || (job.status === 'completed' && job.nextIndex !== manifest.entries.length) ||
      typeof job.owner !== 'string' || !job.owner || !Number.isSafeInteger(job.leaseUntil) || !Number.isSafeInteger(job.expiresAt)) fail('job-conflict');
}
const receiptPath = (jobPath, index) => `${jobPath}/items/${String(index).padStart(3, '0')}`;
function currentImages(snapshots, operation) {
  return { source: image(snapshots[0]), private: operation === 'station-private' ? image(snapshots[1]) : null,
    deletionJobs: operation === 'profile-email' ? snapshots.slice(1).map(image) : [] };
}
function beforeMatches(current, before) { return same(current, before); }
function afterMatches(current, entry, receipt, receiptVersion, operation) {
  if (!current.source.exists || !same(current.source.data, entry.after.source) || current.source.version !== receiptVersion ||
    receipt.manifestHash !== receipt.manifestExpected || receipt.index !== receipt.indexExpected || receipt.sourceBefore !== fingerprint({ id: entry.id, before: entry.before }) || receipt.after !== fingerprint(entry.after)) return false;
  if (operation === 'profile-email') return current.deletionJobs.every(item => !item.exists);
  return current.private.exists && same(current.private.data, entry.after.private) &&
    current.private.version === (entry.after.writePrivate ? receiptVersion : entry.before.private.version);
}
async function verifyCommitted(firestore, manifest, index) {
  const entry = manifest.entries[index];
  const target = paths(manifest.root, manifest.operation, entry.id);
  const refs = [target.source, ...(manifest.operation === 'station-private' ? [target.private] : target.deletionJobs), receiptPath(privacyJobPath(manifest.root, manifest.hash), index)].map(path => firestore.doc(path));
  const snapshots = await firestore.getAll(...refs);
  const receiptSnapshot = snapshots.pop();
  const receipt = receiptSnapshot.data();
  if (!receiptSnapshot.exists || !afterMatches(currentImages(snapshots, manifest.operation), entry,
    { ...receipt, manifestExpected: manifest.hash, indexExpected: index }, version(receiptSnapshot), manifest.operation)) fail('postimage-conflict');
}

/** Demo/rehearsal executor only. Production authorization is a separate checkpoint. */
export async function applyPrivacy({ firestore, manifest, expectedManifestHash, backupStore,
  projectId, root, operation, emulatorHost, now = () => Date.now(), owner = randomUUID(), leaseMs = 60000, fault = () => {}, deleteValue }) {
  demoMutation({ projectId, root, operation, emulatorHost }, firestore);
  verifyPrivacyManifest(manifest, expectedManifestHash);
  if (manifest.projectId !== projectId || manifest.root !== root || manifest.operation !== operation) fail('manifest-scope-mismatch');
  if (!(backupStore instanceof PrivatePrivacyBackupStore) || typeof deleteValue !== 'function' || typeof owner !== 'string' || !owner || !Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000) fail('invalid-executor-config');
  if (!Number.isSafeInteger(now()) || now() <= 0 || !Number.isSafeInteger(now() + leaseMs)) fail('invalid-clock');
  const verified = await backupStore.readVerified(manifest.hash);
  if (!same(verified.manifest, manifest)) fail('backup-manifest-mismatch');
  await fault('after-backup');
  const jobPath = privacyJobPath(root, manifest.hash);
  const jobRef = firestore.doc(jobPath);
  const lease = await firestore.runTransaction(async tx => {
    const snapshot = await tx.get(jobRef);
    // Retry-time guard: even an empty manifest must never create an expired job.
    const currentBackup = await backupStore.readVerified(manifest.hash);
    if (currentBackup.expiresAt !== verified.expiresAt || !same(currentBackup.manifest, manifest)) fail('backup-manifest-mismatch');
    if (verified.expiresAt - now() < minimumRecoveryWindow) fail('backup-recovery-window');
    const prior = snapshot.data();
    if (snapshot.exists) {
      boundJob(prior, manifest);
      if (prior.expiresAt !== verified.expiresAt) fail('backup-job-mismatch');
      if (prior.status === 'completed') return { ...prior, completed: true };
      if (prior.leaseUntil > now()) fail('lease-busy');
      if (prior.generation === Number.MAX_SAFE_INTEGER) fail('job-generation-overflow');
    }
    const job = { schemaVersion: 1, toolVersion: privacyToolVersion, manifestHash: manifest.hash, projectId, root, operation,
      owner, generation: snapshot.exists ? prior.generation + 1 : 1, leaseUntil: now() + leaseMs,
      nextIndex: snapshot.exists ? prior.nextIndex : 0, status: manifest.entries.length ? 'running' : 'completed', expiresAt: verified.expiresAt };
    tx.set(jobRef, job);
    return job;
  });
  for (let index = 0; index < lease.nextIndex; index++) await verifyCommitted(firestore, manifest, index);
  if (lease.completed) return { status: 'completed', applied: 0, alreadyApplied: manifest.entries.length };
  let applied = 0;
  // Each batch performs at most25 transactions and never launches parallel work.
  for (let batch = lease.nextIndex; batch < manifest.entries.length; batch += privacyLimits.transactionsPerBatch) {
    const end = Math.min(manifest.entries.length, batch + privacyLimits.transactionsPerBatch);
    for (let index = batch; index < end; index++) {
      const entry = manifest.entries[index];
      const target = paths(root, operation, entry.id);
      const receiptRef = firestore.doc(receiptPath(jobPath, index));
      await fault('before-item', index);
      // Recheck the durable file before every target transaction. A removed,
      // corrupted or expired backup must not permit later items to continue.
      await backupStore.readVerified(manifest.hash);
      await firestore.runTransaction(async tx => {
        const refs = [jobRef, receiptRef, firestore.doc(target.source), ...(operation === 'station-private' ? [firestore.doc(target.private)] : target.deletionJobs.map(path => firestore.doc(path)))];
        const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
        const [jobSnapshot, receiptSnapshot, ...dataSnapshots] = snapshots;
        const job = jobSnapshot.data();
        boundJob(job, manifest);
        await backupStore.readVerified(manifest.hash);
        if (verified.expiresAt - now() < minimumRecoveryWindow) fail('backup-recovery-window');
        if (job.owner !== owner || job.generation !== lease.generation || job.leaseUntil <= now() || job.nextIndex !== index || receiptSnapshot.exists) fail('lease-or-checkpoint-conflict');
        const current = currentImages(dataSnapshots, operation);
        if (!beforeMatches(current, entry.before)) fail('source-conflict');
        // Recompute and compare the approved plan inside the transaction.
        if (!same(plan({ before: current }, operation), entry.after)) fail('source-conflict');
        const removed = operation === 'station-private' ? privateStationFields.filter(key => Object.hasOwn(untag(current.source.data), key)) : ['email'];
        tx.update(refs[2], Object.fromEntries(removed.map(key => [key, deleteValue()])));
        if (entry.after.writePrivate) tx.create(refs[3], untag(entry.after.private));
        tx.create(receiptRef, { schemaVersion: 1, manifestHash: manifest.hash, sourceBefore: fingerprint({ id: entry.id, before: entry.before }), after: fingerprint(entry.after), index });
        await fault('before-checkpoint', index);
        await backupStore.readVerified(manifest.hash);
        if (job.leaseUntil <= now() || verified.expiresAt - now() < minimumRecoveryWindow) fail('lease-or-backup-expired');
        // The checkpoint and data commit atomically: no acknowledged item can be
        // checkpointed before its write or lost after commit-before-acknowledgement.
        tx.update(jobRef, { nextIndex: index + 1, leaseUntil: now() + leaseMs,
          status: index + 1 === manifest.entries.length ? 'completed' : 'running' });
      });
      applied++;
      await fault('after-commit-before-ack', index);
      await verifyCommitted(firestore, manifest, index);
      await fault('after-checkpoint', index);
    }
  }
  return { status: 'completed', applied, alreadyApplied: lease.nextIndex };
}

/** Privacy rollback is intentionally not a whole-snapshot restoration. */
export async function restorePrivacy({ firestore, manifest, expectedManifestHash, backupStore, projectId, root, operation, emulatorHost }) {
  demoMutation({ projectId, root, operation, emulatorHost }, firestore);
  verifyPrivacyManifest(manifest, expectedManifestHash);
  if (manifest.projectId !== projectId || manifest.root !== root || manifest.operation !== operation || !(backupStore instanceof PrivatePrivacyBackupStore)) fail('manifest-scope-mismatch');
  const verified = await backupStore.readVerified(manifest.hash);
  if (!same(verified.manifest, manifest)) fail('backup-manifest-mismatch');
  for (let index = 0; index < manifest.entries.length; index++) await verifyCommitted(firestore, manifest, index);
  // Apply changes no safe public field: safe before/after values are identical.
  // Keep moved metadata private and email absent. A safe rollback therefore
  // verifies the exact postimage and performs zero data writes; drift conflicts.
  return { status: 'privacy-preserved', verified: manifest.entries.length, restoredPublicFields: 0, restoredEmails: 0 };
}

export async function verifyPrivacy({ firestore, manifest, expectedManifestHash }) {
  verifyPrivacyManifest(manifest, expectedManifestHash);
  if (firestore.projectId !== manifest.projectId) fail('project-mismatch');
  for (let index = 0; index < manifest.entries.length; index++) await verifyCommitted(firestore, manifest, index);
  return { status: 'verified', verified: manifest.entries.length };
}

export function parsePrivacyOptions(argv) {
  const result = { mode: 'preview', limit: privacyLimits.records, cursor: null };
  const seen = new Set();
  const values = new Set(['project', 'root', 'operation', 'cursor', 'limit', 'backup-dir', 'key-file', 'expires-at', 'manifest-hash']);
  for (const argument of argv) {
    if (['--apply', '--restore', '--verify'].includes(argument)) {
      if (result.mode !== 'preview') fail('conflicting-mode');
      result.mode = argument.slice(2);
      continue;
    }
    if (argument === '--dry-run') continue;
    const match = /^--([^=]+)=(.+)$/.exec(argument);
    if (!match || !values.has(match[1]) || seen.has(match[1])) fail('invalid-option');
    seen.add(match[1]);
    result[match[1]] = match[1] === 'limit' ? Number(match[2]) : match[2];
  }
  result.projectId = result.project;
  scope(result);
  if (!Number.isInteger(result.limit) || result.limit < 1 || result.limit > privacyLimits.records || (result.cursor !== null && !safeId(result.cursor))) fail('invalid-bound');
  if (argv.includes('--dry-run') && result.mode !== 'preview') fail('conflicting-mode');
  return result;
}

async function main() {
  const options = parsePrivacyOptions(process.argv.slice(2));
  // This release deliberately provides no production mutation approval adapter.
  if (options.mode !== 'preview') demoScope({ ...options, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST });
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { initializeApp } = require('firebase-admin/app');
  const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');
  const firestore = options.mode === 'preview' ? getFirestore(initializeApp({ projectId: options.projectId }))
    : createPrivacyDemoFirestore({ projectId: options.projectId, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST });
  if (options.mode === 'preview') firestore.privacyDocumentId = FieldPath.documentId();
  let backupStore;
  if (options['backup-dir'] || options['key-file'] || options['expires-at']) {
    if (!options['backup-dir'] || !options['key-file'] || !options['expires-at']) fail('invalid-backup-config');
    const keyStat = await lstat(options['key-file']);
    if (!keyStat.isFile() || keyStat.isSymbolicLink() || (keyStat.mode & 0o077) !== 0 || (process.geteuid && keyStat.uid !== process.geteuid())) fail('unsafe-key-file');
    const keyPath = await realpath(options['key-file']);
    const backupDirectory = await realpath(options['backup-dir']);
    if (within(keyPath, await realpath(repositoryRoot)) || within(keyPath, backupDirectory)) fail('unsafe-key-location');
    const key = await readFile(options['key-file']);
    backupStore = await PrivatePrivacyBackupStore.open({ directory: options['backup-dir'], key, expiresAt: Number(options['expires-at']) });
  }
  if (options.mode === 'preview') {
    const manifest = await previewPrivacy({ ...options, firestore });
    const conflicts = manifest.entries.filter(entry => entry.status !== 'ready').length;
    if (backupStore) await backupStore.writeVerified(manifest);
    console.log(JSON.stringify({ status: 'preview', scanned: manifest.scanned, targets: manifest.entries.length, conflicts, exhausted: manifest.exhausted, privateManifestPersisted: Boolean(backupStore) }));
    return;
  }
  if (!backupStore || !validHash(options['manifest-hash'])) fail('reviewed-backup-required');
  const { manifest } = await backupStore.readVerified(options['manifest-hash']);
  const input = { ...options, firestore, manifest, expectedManifestHash: options['manifest-hash'], backupStore, deleteValue: () => FieldValue.delete() };
  console.log(JSON.stringify(await (options.mode === 'apply' ? applyPrivacy(input) : options.mode === 'restore' ? restorePrivacy(input) : verifyPrivacy(input))));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(JSON.stringify({ status: 'stopped', reason: error.name === 'PrivacyMigrationError' ? error.code : 'environment-or-execution-failure' })); process.exitCode = 1; });
}
