#!/usr/bin/env node
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCommentCountFence } from '../functions/lib/comment-count-maintenance.js';
import { auditContentPagination, paginationFail as fail, paginationHash, paginationId, paginationImage,
  paginationLimits, paginationPaths, paginationPlan, paginationResources, paginationRoots,
  paginationSame as same, paginationScope, paginationSummary, paginationToolVersion,
  parsePaginationOptions, verifyPaginationManifest } from './audit_content_pagination.mjs';
const backupToken = Symbol('content-pagination-backup'), demoTransports = new WeakMap();
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const minimumRecoveryWindow = 3600000, maximumRetention = 30 * 86400000;
const stable = JSON.stringify;
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const within = (path, parent) => { const suffix = relative(parent, path); return suffix === '' || (!suffix.startsWith(`..${sep}`) && suffix !== '..' && !isAbsolute(suffix)); };
function demoScope(input) {
  paginationScope(input);
  const host = input.emulatorHost ?? process.env.FIRESTORE_EMULATOR_HOST;
  const match = typeof host === 'string' && /^(?:127\.0\.0\.1|localhost|\[::1\]):(\d+)$/.exec(host);
  if (!input.projectId.startsWith('demo-') || !match || Number(match[1]) < 1 || Number(match[1]) > 65535) fail('production-mutation-disabled');
  return host;
}

/** Own the SDK configuration; callers cannot register an arbitrary transport. */
export function createPaginationDemoFirestore({ projectId, emulatorHost }) {
  const host = demoScope({ projectId, emulatorHost, root: paginationRoots[0], resource: paginationResources[0] });
  // The installed SDK gives this environment variable precedence over settings.
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== host) fail('conflicting-emulator-transport');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { Firestore, FieldPath } = require('firebase-admin/firestore');
  const client = new Firestore();
  // Public settings() freezes configuration after this call; no private SDK API.
  client.settings({ projectId, host, ssl: false });
  const facade = Object.freeze({ projectId, paginationDocumentId: FieldPath.documentId(),
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

export class ContentPaginationBackupStore {
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
    return new ContentPaginationBackupStore(backupToken, actual, Buffer.from(key), now, expiresAt, { device: stat.dev, inode: stat.ino });
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
  #path(hash) { if (!validHash(hash)) fail('invalid-backup-id'); return resolve(this.#directory, `${hash}.pagination.aes`); }
  async #syncDirectory() { const handle = await open(this.#directory, 'r'); try { await handle.sync(); } finally { await handle.close(); } }
  async writeVerified(manifest) {
    await this.#checkDirectory();
    verifyPaginationManifest(manifest, manifest.hash);
    const createdAt = this.#now();
    if (this.#expiry - createdAt < minimumRecoveryWindow) fail('backup-recovery-window');
    const iv = randomBytes(12);
    const header = { schemaVersion: 1, algorithm: 'aes-256-gcm', purpose: paginationToolVersion, manifestHash: manifest.hash, createdAt, expiresAt: this.#expiry, iv: iv.toString('base64') };
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
      if (header.schemaVersion !== 1 || header.purpose !== paginationToolVersion || header.algorithm !== 'aes-256-gcm' || header.manifestHash !== hash ||
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
      verifyPaginationManifest(manifest, hash);
      return { manifest, expiresAt: header.expiresAt, createdAt: header.createdAt };
    } catch (error) {
      if (error.name === 'ContentPaginationError') throw error;
      fail('backup-integrity');
    }
  }
}


export function paginationJobPath(root, hash) {
  if (!paginationRoots.includes(root) || !validHash(hash)) fail('invalid-job-scope');
  return `${root}/contentPaginationMigrationJobs/jobs/${hash}`;
}
const targets = manifest => manifest.entries.filter(entry => entry.status === 'repairable');
const receiptPath = (jobPath, index) => `${jobPath}/items/${String(index).padStart(3, '0')}`;
function after(entry) {
  return { $map: Object.fromEntries(Object.entries({ ...entry.before.source.data.$map, ...entry.fixes }).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) };
}
function boundJob(job, manifest, count) {
  const fields = new Set(['schemaVersion', 'toolVersion', 'manifestHash', 'projectId', 'root', 'resource', 'owner', 'generation', 'leaseUntil', 'nextIndex', 'status', 'expiresAt']);
  if (!job || Object.keys(job).some(key => !fields.has(key)) || job.schemaVersion !== 1 || job.toolVersion !== paginationToolVersion || job.manifestHash !== manifest.hash || job.projectId !== manifest.projectId || job.root !== manifest.root || job.resource !== manifest.resource ||
      !Number.isInteger(job.nextIndex) || job.nextIndex < 0 || job.nextIndex > count || !Number.isSafeInteger(job.generation) || job.generation < 1 ||
      !['running', 'completed', 'restored'].includes(job.status) || (job.status !== 'running' && job.nextIndex !== count) ||
      typeof job.owner !== 'string' || !job.owner || !Number.isSafeInteger(job.leaseUntil) || !Number.isSafeInteger(job.expiresAt)) fail('job-conflict');
}
function entryRefs(firestore, manifest, entry) {
  const path = paginationPaths(manifest.root, manifest.resource, entry.id, entry.before.source.data.$map);
  return [path.source, path.station, ...(manifest.resource === 'episodes' ? [path.program] : [])].map(path => firestore.doc(path));
}
function images(snapshots, resource) {
  return { source: paginationImage(snapshots[0]), station: paginationImage(snapshots[1]), program: resource === 'episodes' ? paginationImage(snapshots[2]) : null };
}
function parentsSame(current, entry) { return same(current.station, entry.before.station) && same(current.program, entry.before.program); }
function checkReceipt(current, entry, receiptSnapshot, manifest, index, state) {
  const receipt = receiptSnapshot.data();
  if (!receiptSnapshot.exists || receipt.schemaVersion !== 1 || receipt.state !== state || receipt.manifestHash !== manifest.hash || receipt.index !== index || receipt.beforeHash !== paginationHash(entry.before) || receipt.afterHash !== paginationHash(after(entry)) ||
      !current.source.exists || current.source.version !== paginationImage(receiptSnapshot).version || !parentsSame(current, entry) ||
      !same(current.source.data, state === 'applied' ? after(entry) : entry.before.source.data)) fail('postimage-conflict');
}
async function verifyEntry(firestore, manifest, entry, index, state = 'applied') {
  const refs = [...entryRefs(firestore, manifest, entry), firestore.doc(receiptPath(paginationJobPath(manifest.root, manifest.hash), index))];
  const snapshots = await firestore.getAll(...refs), receipt = snapshots.pop();
  checkReceipt(images(snapshots, manifest.resource), entry, receipt, manifest, index, state);
}
function executor(input) {
  demoMutation(input, input.firestore);
  verifyPaginationManifest(input.manifest, input.expectedManifestHash);
  if (input.manifest.projectId !== input.projectId || input.manifest.root !== input.root || input.manifest.resource !== input.resource) fail('manifest-scope-mismatch');
  if (!(input.backupStore instanceof ContentPaginationBackupStore)) fail('verified-backup-required');
}
async function durable(input) {
  const backup = await input.backupStore.readVerified(input.manifest.hash);
  if (!same(backup.manifest, input.manifest)) fail('backup-manifest-mismatch');
  if (backup.expiresAt - input.now() < minimumRecoveryWindow) fail('backup-recovery-window');
  return backup;
}

/** Demo-only explicit repair. Unresolved records remain unresolved. */
export async function backfillContentPagination({ firestore, manifest, expectedManifestHash, backupStore,
  projectId, root, resource, emulatorHost, now = () => Date.now(), owner = randomUUID(), leaseMs = 60000, fault = () => {} }) {
  const input = { firestore, manifest, expectedManifestHash, backupStore, projectId, root, resource, emulatorHost, now };
  executor(input);
  if (!paginationId(owner) || !Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000 || !Number.isSafeInteger(now()) || now() <= 0 || !Number.isSafeInteger(now() + leaseMs)) fail('invalid-executor-config');
  const backup = await durable(input), entries = targets(manifest);
  await fault('after-backup');
  const jobPath = paginationJobPath(root, manifest.hash), jobRef = firestore.doc(jobPath);
  const lease = await firestore.runTransaction(async tx => {
    if (resource === 'episodes') await readCommentCountFence(tx, firestore, root);
    const snapshot = await tx.get(jobRef), prior = snapshot.data();
    const currentBackup = await durable(input);
    if (backup.expiresAt !== currentBackup.expiresAt) fail('backup-job-mismatch');
    if (snapshot.exists) {
      boundJob(prior, manifest, entries.length);
      if (prior.expiresAt !== backup.expiresAt) fail('backup-job-mismatch');
      if (prior.status === 'restored') fail('manifest-already-restored');
      if (prior.status === 'completed') return { ...prior, completed: true };
      if (prior.leaseUntil > now()) fail('lease-busy');
      if (prior.generation === Number.MAX_SAFE_INTEGER) fail('job-generation-overflow');
    }
    const job = { schemaVersion: 1, toolVersion: paginationToolVersion, manifestHash: manifest.hash, projectId, root, resource, owner,
      generation: snapshot.exists ? prior.generation + 1 : 1, leaseUntil: now() + leaseMs, nextIndex: snapshot.exists ? prior.nextIndex : 0,
      status: entries.length ? 'running' : 'completed', expiresAt: backup.expiresAt };
    tx.set(jobRef, job); return job;
  });
  for (let index = 0; index < lease.nextIndex; index++) await verifyEntry(firestore, manifest, entries[index], index);
  if (lease.completed) return { status: 'completed-safe-repairs', applied: 0, alreadyApplied: entries.length, unresolved: manifest.entries.filter(entry => entry.status === 'unresolved').length };
  let applied = 0;
  for (let batch = lease.nextIndex; batch < entries.length; batch += paginationLimits.transactionsPerBatch) {
    for (let index = batch; index < Math.min(entries.length, batch + paginationLimits.transactionsPerBatch); index++) {
      const entry = entries[index], refs = entryRefs(firestore, manifest, entry), receiptRef = firestore.doc(receiptPath(jobPath, index));
      await fault('before-item', index); await durable(input);
      await firestore.runTransaction(async tx => {
        if (resource === 'episodes') await readCommentCountFence(tx, firestore, root);
        const snapshots = await Promise.all([jobRef, receiptRef, ...refs].map(ref => tx.get(ref)));
        const [jobSnapshot, receiptSnapshot, ...sourceSnapshots] = snapshots, job = jobSnapshot.data();
        boundJob(job, manifest, entries.length); await durable(input);
        if (job.owner !== owner || job.generation !== lease.generation || job.leaseUntil <= now() || job.nextIndex !== index || receiptSnapshot.exists) fail('lease-or-checkpoint-conflict');
        const current = images(sourceSnapshots, resource);
        if (!same(current, entry.before) || !same(paginationPlan({ before: current }, resource), { problems: entry.problems, fixes: entry.fixes, status: entry.status })) fail('source-conflict');
        tx.update(refs[0], entry.fixes);
        tx.create(receiptRef, { schemaVersion: 1, manifestHash: manifest.hash, index, state: 'applied', beforeHash: paginationHash(entry.before), afterHash: paginationHash(after(entry)) });
        await fault('before-checkpoint', index); await durable(input);
        if (job.leaseUntil <= now()) fail('lease-expired');
        tx.update(jobRef, { nextIndex: index + 1, leaseUntil: now() + leaseMs, status: index + 1 === entries.length ? 'completed' : 'running' });
      });
      applied++; await fault('after-commit-before-ack', index); await verifyEntry(firestore, manifest, entry, index); await fault('after-checkpoint', index);
    }
  }
  return { status: 'completed-safe-repairs', applied, alreadyApplied: lease.nextIndex, unresolved: manifest.entries.filter(entry => entry.status === 'unresolved').length };
}

export async function verifyContentPagination({ firestore, manifest, expectedManifestHash }) {
  verifyPaginationManifest(manifest, expectedManifestHash);
  if (firestore.projectId !== manifest.projectId) fail('project-mismatch');
  const entries = targets(manifest);
  for (let index = 0; index < entries.length; index++) await verifyEntry(firestore, manifest, entries[index], index);
  return { status: 'verified-safe-repairs', verified: entries.length, unresolved: manifest.entries.filter(entry => entry.status === 'unresolved').length };
}

/** Only remove the two fields this attempt inserted. Never rewrite a snapshot. */
export async function restoreContentPagination({ firestore, manifest, expectedManifestHash, backupStore, projectId, root, resource, emulatorHost,
  now = () => Date.now(), deleteValue, fault = () => {} }) {
  const input = { firestore, manifest, expectedManifestHash, backupStore, projectId, root, resource, emulatorHost, now };
  executor(input);
  if (typeof deleteValue !== 'function' || !Number.isSafeInteger(now()) || now() <= 0) fail('invalid-executor-config');
  const entries = targets(manifest), jobRef = firestore.doc(paginationJobPath(root, manifest.hash));
  await durable(input);
  let restored = 0;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index], refs = entryRefs(firestore, manifest, entry), receiptRef = firestore.doc(receiptPath(jobRef.path, index));
    await firestore.runTransaction(async tx => {
      if (resource === 'episodes') await readCommentCountFence(tx, firestore, root);
      const snapshots = await Promise.all([jobRef, receiptRef, ...refs].map(ref => tx.get(ref)));
      const [jobSnapshot, receiptSnapshot, ...sourceSnapshots] = snapshots, job = jobSnapshot.data();
      boundJob(job, manifest, entries.length); await durable(input);
      if (job.status !== 'completed' && job.status !== 'restored') fail('incomplete-apply');
      if (job.expiresAt !== (await durable(input)).expiresAt) fail('backup-job-mismatch');
      const current = images(sourceSnapshots, resource);
      if (receiptSnapshot.data()?.state === 'restored') { checkReceipt(current, entry, receiptSnapshot, manifest, index, 'restored'); return; }
      checkReceipt(current, entry, receiptSnapshot, manifest, index, 'applied');
      tx.update(refs[0], Object.fromEntries(Object.keys(entry.fixes).map(key => [key, deleteValue()])));
      tx.update(receiptRef, { state: 'restored' });
      await fault('before-restore-commit', index); await durable(input);
    });
    restored++; await fault('after-restore-commit', index);
  }
  await firestore.runTransaction(async tx => {
    if (resource === 'episodes') await readCommentCountFence(tx, firestore, root);
    const snapshots = await Promise.all([jobRef, ...entries.map((_, index) => firestore.doc(receiptPath(jobRef.path, index)))].map(ref => tx.get(ref)));
    const job = snapshots[0].data(); boundJob(job, manifest, entries.length); await durable(input);
    if (!['completed', 'restored'].includes(job.status) || snapshots.slice(1).some(snapshot => snapshot.data()?.state !== 'restored')) fail('incomplete-restore');
    tx.update(jobRef, { status: 'restored' });
  });
  return { status: 'restored-safe-defaults', restored, unresolved: manifest.entries.filter(entry => entry.status === 'unresolved').length };
}

async function main() {
  const options = parsePaginationOptions(process.argv.slice(2));
  if (options.mode !== 'audit') demoScope({ ...options, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST });
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { Firestore, FieldPath, FieldValue } = require('firebase-admin/firestore');
  const firestore = options.mode === 'audit' ? new Firestore({ projectId: options.projectId }) : createPaginationDemoFirestore({ projectId: options.projectId, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST });
  if (options.mode === 'audit') firestore.paginationDocumentId = FieldPath.documentId();
  try {
    let backupStore;
    if (options['backup-dir'] || options['key-file'] || options['expires-at']) {
      if (!options['backup-dir'] || !options['key-file'] || !options['expires-at']) fail('invalid-backup-config');
      const stat = await lstat(options['key-file']);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 || (process.geteuid && stat.uid !== process.geteuid())) fail('unsafe-key-file');
      const keyPath = await realpath(options['key-file']), directory = await realpath(options['backup-dir']);
      if (within(keyPath, await realpath(repositoryRoot)) || within(keyPath, directory)) fail('unsafe-key-location');
      backupStore = await ContentPaginationBackupStore.open({ directory, key: await readFile(keyPath), expiresAt: Number(options['expires-at']) });
    }
    if (options.mode === 'audit') {
      const manifest = await auditContentPagination({ ...options, firestore });
      if (backupStore) await backupStore.writeVerified(manifest);
      console.log(JSON.stringify({ ...paginationSummary(manifest), privateManifestPersisted: Boolean(backupStore) })); return;
    }
    if (!backupStore || !validHash(options['manifest-hash'])) fail('reviewed-backup-required');
    const { manifest } = await backupStore.readVerified(options['manifest-hash']);
    const input = { ...options, firestore, manifest, expectedManifestHash: options['manifest-hash'], backupStore, deleteValue: () => FieldValue.delete() };
    console.log(JSON.stringify(await (options.mode === 'apply' ? backfillContentPagination(input) : options.mode === 'restore' ? restoreContentPagination(input) : verifyContentPagination(input))));
  } finally { await firestore.terminate(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(JSON.stringify({ status: 'stopped', reason: error.name === 'ContentPaginationError' ? error.code : 'environment-or-execution-failure' })); process.exitCode = 1; });
}
