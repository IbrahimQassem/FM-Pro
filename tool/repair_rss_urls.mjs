#!/usr/bin/env node
import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { createRequire } from 'node:module';
import { constants } from 'node:fs';
import { open, realpath, lstat } from 'node:fs/promises';
import { resolve, relative, join, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentIdentity, validContentId } from '../functions/lib/admin-content.js';
import { decodeXmlEntities, fetchAndParseRss } from '../functions/lib/rss-ingestion.js';
import { isSafePublicUrl } from '../functions/lib/public-fetch.js';
import { prepareRssIdentities } from '../functions/lib/admin-content-relations.js';
import { readCommentCountFence } from '../functions/lib/comment-count-maintenance.js';
import { encodeCleanupValue } from './remove_old_locations.mjs';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { FieldPath } = require('firebase-admin/firestore');
const demoTransports = new WeakMap(), backupStores = new WeakSet(), backupToken = Symbol('rss-backup');
const recoveryWindow = 3600000;
const roots = ['HudHudDev', 'HudHudOfficial'];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fingerprint = value => hash(encodeCleanupValue(value));
const same = (first, second) => hash(first) === hash(second);
const HEX = /^[a-f0-9]{64}$/;
const fail = () => { throw new Error('RSS repair scope, backup or source precondition failed.'); };
const target = (options, db) => {
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(options.projectId ?? '') || !roots.includes(options.root) ||
      !validContentId(options.programId) || db.projectId !== options.projectId) fail();
};
const bounds = options => {
  const maxRecords = options.maxRecords ?? 100, maxItems = options.maxItems ?? 25;
  if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 100 ||
      !Number.isInteger(maxItems) || maxItems < 1 || maxItems > 25 ||
      (options.cursor !== undefined && !validContentId(options.cursor))) fail();
  return { maxRecords, maxItems };
};
const mutableDemo = (options, emulatorHost) => {
  // No production mutation adapter is implemented or implied by a caller flag.
  if (!options.projectId.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(emulatorHost ?? '') ||
      Number(emulatorHost.split(':').at(-1)) < 1 || Number(emulatorHost.split(':').at(-1)) > 65535) fail();
};
/** Construct and freeze the actual demo SDK transport; arbitrary facades cannot register. */
export function createRssDemoFirestore({ projectId, emulatorHost = process.env.FIRESTORE_EMULATOR_HOST }) {
  mutableDemo({ projectId }, emulatorHost);
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== emulatorHost) fail();
  const { Firestore } = require('firebase-admin/firestore');
  const client = new Firestore(); client.settings({ projectId, host: emulatorHost, ssl: false });
  const facade = Object.freeze({ projectId, doc: client.doc.bind(client), collection: client.collection.bind(client),
    runTransaction: client.runTransaction.bind(client), terminate: client.terminate.bind(client) });
  demoTransports.set(facade, { projectId, host: emulatorHost }); return facade;
}
function trustedMutation(options, db, host) {
  mutableDemo(options, host);
  const binding = demoTransports.get(db);
  if (!binding || binding.projectId !== options.projectId || binding.host !== host ||
      (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== binding.host)) fail();
}
const aliasesFor = (programId, item) => [...new Set([item.beforeUrl, item.afterUrl]
  .map(audioUrl => contentIdentity('episodes', { programId, audioUrl })))];
const ownsAlias = (data, key, id) => data?.targetKind === 'episodes' && data.targetId === id && data.keyHash === key;

/** Private, immutable RSS-specific backups; not a general storage framework. */
export class RssRepairBackupStore {
  #directory; #key; #expiresAt; #repositoryRoot; #now; #identity; #files = new Map();
  constructor(token, { directory, key, expiresAt, repositoryRoot, now }, identity) {
    if (token !== backupToken) fail();
    this.#identity = identity;
    if (!Buffer.isBuffer(key) || key.length !== 32 || !Number.isSafeInteger(expiresAt)) fail();
    this.#directory = resolve(directory); this.#key = Buffer.from(key); this.#expiresAt = expiresAt;
    this.#repositoryRoot = resolve(repositoryRoot); this.#now = now;
  }
  static async open(config) {
    const { directory, key, expiresAt, now = Date.now } = config;
    if (Object.hasOwn(config, 'repositoryRoot') || typeof directory !== 'string' || !isAbsolute(directory) || typeof now !== 'function') fail();
    const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
    const actual = await realpath(directory), stat = await lstat(directory);
    if (stat.isSymbolicLink()) fail();
    const store = new RssRepairBackupStore(backupToken, { directory: actual, key, expiresAt, repositoryRoot, now }, { dev: stat.dev, ino: stat.ino });
    await store.checkDirectory(); backupStores.add(store); return Object.freeze(store);
  }
  async checkDirectory() {
    const currentTime = this.#now();
    if (!Number.isSafeInteger(currentTime) || this.#expiresAt - currentTime < recoveryWindow || this.#expiresAt > currentTime + 30 * 86400000) fail();
    const stat = await lstat(this.#directory), actual = await realpath(this.#directory), repo = await realpath(this.#repositoryRoot);
    const inside = relative(repo, actual);
    if (stat.dev !== this.#identity.dev || stat.ino !== this.#identity.ino || actual !== this.#directory || !stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 ||
        (process.getuid && stat.uid !== process.getuid()) || !inside || (inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside)) ||
        actual.split('/').includes('.boss')) fail();
    return actual;
  }
  async put(manifest) {
    const directory = await this.checkDirectory();
    if (!HEX.test(manifest.runId)) fail();
    const nonce = randomBytes(12), aad = Buffer.from(`rss-repair:2:${manifest.runId}:${this.#expiresAt}`);
    const cipher = createCipheriv('aes-256-gcm', this.#key, nonce); cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(manifest)), cipher.final()]);
    const bytes = JSON.stringify({ version: 2, runId: manifest.runId, expiresAt: this.#expiresAt,
      nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') });
    let handle;
    try {
      handle = await open(join(directory, `${manifest.runId}.rss-backup`), 'wx', 0o600);
      await handle.writeFile(bytes); await handle.sync();
    } catch (error) { if (error?.code !== 'EEXIST') throw error; }
    finally { await handle?.close(); }
    const folder = await open(directory, 'r'); try { await folder.sync(); } finally { await folder.close(); }
    if (!same(await this.get(manifest.runId), manifest)) fail();
    return manifest.runId;
  }
  async get(runId) {
    const directory = await this.checkDirectory(); if (!HEX.test(runId)) fail();
    const path = join(directory, `${runId}.rss-backup`), stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 ||
        (process.getuid && stat.uid !== process.getuid())) fail();
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    let envelope; try {
      const opened = await handle.stat(), prior = this.#files.get(runId);
      if (!opened.isFile() || (opened.mode & 0o077) !== 0 || (process.getuid && opened.uid !== process.getuid()) || opened.dev !== stat.dev || opened.ino !== stat.ino || (prior && (prior.dev !== opened.dev || prior.ino !== opened.ino))) fail();
      this.#files.set(runId, { dev: opened.dev, ino: opened.ino });
      envelope = JSON.parse(await handle.readFile('utf8'));
    } finally { await handle.close(); }
    await this.checkDirectory();
    if (envelope.version !== 2 || envelope.runId !== runId || envelope.expiresAt !== this.#expiresAt || envelope.expiresAt <= this.#now()) fail();
    const decipher = createDecipheriv('aes-256-gcm', this.#key, Buffer.from(envelope.nonce, 'base64'));
    decipher.setAAD(Buffer.from(`rss-repair:2:${runId}:${envelope.expiresAt}`));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const value = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
    if (value.runId !== runId || hash(Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'runId'))) !== runId) fail();
    return value;
  }
}

Object.freeze(RssRepairBackupStore.prototype);

export function validateRssRepairManifest(manifest, options) {
  const { runId, ...body } = manifest ?? {};
  if (manifest?.version !== 2 || !HEX.test(runId ?? '') || hash(body) !== runId ||
      ['projectId', 'root', 'programId'].some(key => manifest[key] !== options[key]) ||
      !manifest.programVersion || !HEX.test(manifest.feedProof ?? '') || !Array.isArray(manifest.items) || manifest.items.length > 100 || !Array.isArray(manifest.blockers) ||
      new Set(manifest.items.map(item => item.id)).size !== manifest.items.length ||
      manifest.items.some(item => !validContentId(item.id) || !HEX.test(item.beforeFingerprint) || !HEX.test(item.afterFingerprint) ||
        typeof item.beforeUrl !== 'string' || !/^https:\/\//i.test(item.afterUrl ?? '') || !isSafePublicUrl(item.afterUrl) || item.afterUrl !== decodeXmlEntities(item.beforeUrl) || item.beforeUrl === item.afterUrl ||
        !Array.isArray(item.externalIds) || item.externalIds.length > 2 || item.externalIds.some(value => typeof value !== 'string') ||
        !item.beforeVersion || !item.beforeCreateTime || !Array.isArray(item.reservations) ||
        item.reservations.length !== aliasesFor(manifest.programId, item).length ||
        new Set(item.reservations.map(value => value.key)).size !== item.reservations.length ||
        item.reservations.some(value => !aliasesFor(manifest.programId, item).includes(value.key) || !Object.hasOwn(value, 'before')) ||
        aliasesFor(manifest.programId, item).some(key => !key))) fail();
  return manifest;
}

/** Preview is bounded/read-only. Only positive raw-feed provenance authorizes a URL candidate. */
export async function previewRssRepairs(options, db, feedItems) {
  target(options, db); const { maxRecords } = bounds(options);
  if (!Array.isArray(feedItems)) fail();
  const programRef = db.doc(`${options.root}/programs/programs/${options.programId}`), program = await programRef.get();
  if (!program.exists || program.get('adminDeletionToken')) fail();
  const pairs = new Map();
  for (const item of feedItems) if (item.legacyAudioUrl && item.legacyAudioUrl !== item.audioUrl) {
    if (pairs.has(item.legacyAudioUrl) && pairs.get(item.legacyAudioUrl).audioUrl !== item.audioUrl) fail();
    pairs.set(item.legacyAudioUrl, item);
  }
  const items = [], blockers = []; let read = 0, cursor = options.cursor, hasMore = false;
  const collection = db.collection(`${options.root}/episodes/episodes`).where('programId', '==', options.programId);
  while (read <= maxRecords) {
    const pageLimit = Math.min(50, maxRecords - read + 1);
    let query = collection.orderBy(FieldPath.documentId()).limit(pageLimit);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    for (const document of snapshot.docs) {
      if (read === maxRecords) { hasMore = true; break; }
      read++; cursor = document.id;
      const data = document.data(), feed = pairs.get(data.audioUrl);
      if (!feed) continue;
      if (!validContentId(document.id) || data.adminDeletionToken || data.stationId !== program.get('stationId') ||
          (data.externalId !== feed.externalId && data.externalId !== feed.legacyExternalId)) {
        blockers.push({ id: document.id, reason: 'feed-identity-conflict' }); continue;
      }
      const entry = { id: document.id, beforeUrl: data.audioUrl, afterUrl: feed.audioUrl,
        externalIds: [feed.externalId, feed.legacyExternalId], beforeVersion: encodeCleanupValue(document.updateTime), beforeCreateTime: encodeCleanupValue(document.createTime),
        beforeFingerprint: fingerprint(data), afterFingerprint: fingerprint({ ...data, audioUrl: feed.audioUrl }), reservations: [] };
      for (const key of aliasesFor(options.programId, entry)) {
        const reservation = await db.doc(`${options.root}/importKeys/importKeys/${key}`).get();
        if (reservation.exists && !ownsAlias(reservation.data(), key, document.id)) blockers.push({ id: document.id, reason: 'reservation-conflict' });
        entry.reservations.push({ key, before: reservation.exists ? encodeCleanupValue(reservation.data()) : null });
      }
      items.push(entry);
    }
    if (hasMore || snapshot.size < pageLimit) break;
    if (snapshot.empty) break;
  }
  const after = await programRef.get();
  if (!after.exists || !same(encodeCleanupValue(program.updateTime), encodeCleanupValue(after.updateTime))) fail();
  const body = { version: 2, projectId: options.projectId, root: options.root, programId: options.programId,
    programVersion: encodeCleanupValue(program.updateTime), items, blockers, read, cursor: cursor ?? null, hasMore,
    feedProof: hash([...pairs.values()].map(item => [item.legacyAudioUrl, item.audioUrl, item.legacyExternalId, item.externalId])) };
  return { ...body, runId: hash(body) };
}

const receiptData = (manifest, item, index, mode) => ({ version: 2, runId: manifest.runId,
  id: item.id, index, mode, sourceCreateTime: item.beforeCreateTime,
  beforeFingerprint: mode === 'apply' ? item.beforeFingerprint : item.afterFingerprint,
  afterFingerprint: mode === 'apply' ? item.afterFingerprint : item.beforeFingerprint });
const receiptRef = (db, jobPath, index, mode) => db.doc(`${jobPath}/${mode === 'apply' ? 'items' : 'restores'}/${String(index).padStart(3, '0')}`);
function assertReceipt(manifest, item, index, mode, current, receipt) {
  if (!current.exists || !receipt.exists ||
      fingerprint(receipt.data()) !== fingerprint(receiptData(manifest, item, index, mode)) ||
      !same(encodeCleanupValue(current.createTime), item.beforeCreateTime) ||
      !same(encodeCleanupValue(current.updateTime), encodeCleanupValue(receipt.updateTime)) ||
      fingerprint(current.data()) !== (mode === 'apply' ? item.afterFingerprint : item.beforeFingerprint)) fail();
}

export async function executeRssRepair(options, db, { manifest, store, reviewedHash, emulatorHost = process.env.FIRESTORE_EMULATOR_HOST,
  owner = randomUUID(), now = Date.now, afterCommit = async () => {} } = {}) {
  target(options, db); const { maxItems } = bounds(options); trustedMutation(options, db, emulatorHost);
  validateRssRepairManifest(manifest, options);
  if (reviewedHash !== manifest.runId || manifest.blockers.length || !backupStores.has(store) || !validContentId(owner)) fail();
  const mode = options.mode ?? 'apply'; if (!['apply', 'restore'].includes(mode)) fail();
  // The verified capability has private immutable custody/key/expiry configuration.
  // Executor never recreates a lost backup; preview/review must persist it first.
  const verifyBackup = async () => { if (!same(await store.get(manifest.runId), manifest)) fail(); };
  await verifyBackup();
  const root = options.root, programId = options.programId;
  const programRef = db.doc(`${root}/programs/programs/${programId}`), jobPath = `${root}/rssUrlRepairs/runs/${manifest.runId}`, jobRef = db.doc(jobPath);
  const validProgram = program => program.exists && !program.get('adminDeletionToken') &&
    same(encodeCleanupValue(program.updateTime), manifest.programVersion);
  const validateJob = job => {
    if (!job || job.version !== 2 || job.runId !== manifest.runId || !['applying', 'applied', 'restoring', 'restored'].includes(job.status) ||
        !Number.isSafeInteger(job.generation) || job.generation < 1 || !Number.isSafeInteger(job.next) || job.next < 0 || job.next > manifest.items.length ||
        !Number.isSafeInteger(job.restored) || job.restored < 0 || job.restored > job.next || !Number.isSafeInteger(job.leaseUntil) || !validContentId(job.owner) ||
        (job.status === 'applied' && job.next !== manifest.items.length) || (job.status === 'restored' && job.restored !== job.next)) fail();
  };
  const verifyPrefix = async (tx, job) => {
    // At most100 manifest entries. Unknown commit/replay is accepted only with
    // immutable transaction receipts whose commit versions still own the source.
    for (let index = 0; index < job.next; index++) {
      const item = manifest.items[index], applied = await tx.get(receiptRef(db, jobPath, index, 'apply'));
      if (!applied.exists || fingerprint(applied.data()) !== fingerprint(receiptData(manifest, item, index, 'apply'))) fail();
      const state = index < job.restored ? 'restore' : 'apply';
      const current = await tx.get(db.doc(`${root}/episodes/episodes/${item.id}`));
      const receipt = state === 'apply' ? applied : await tx.get(receiptRef(db, jobPath, index, 'restore'));
      assertReceipt(manifest, item, index, state, current, receipt);
      for (const key of aliasesFor(programId, item)) {
        const alias = await tx.get(db.doc(`${root}/importKeys/importKeys/${key}`));
        if (!alias.exists || !ownsAlias(alias.data(), key, item.id)) fail();
      }
    }
  };
  const lease = await db.runTransaction(async tx => {
    await readCommentCountFence(tx, db, root);
    const [snapshot, program] = await Promise.all([tx.get(jobRef), tx.get(programRef)]);
    if (!validProgram(program)) fail();
    const previous = snapshot.exists ? snapshot.data() : null;
    if (previous) { validateJob(previous); await verifyPrefix(tx, previous); }
    if (previous?.owner !== owner && previous?.leaseUntil > now()) fail();
    if (mode === 'apply' && previous && ['restoring', 'restored'].includes(previous.status)) fail();
    if (mode === 'restore' && !previous) fail();
    const status = mode === 'apply' ? (previous?.status ?? (manifest.items.length ? 'applying' : 'applied')) :
      (previous?.status === 'restored' || previous?.next === 0 ? 'restored' : 'restoring');
    const next = { version: 2, runId: manifest.runId, owner, generation: (previous?.generation ?? 0) + 1, leaseUntil: now() + 120000,
      status, next: previous?.next ?? 0, restored: previous?.restored ?? 0 };
    // Including an empty manifest: loss, expiry or custody drift blocks lease writes.
    await verifyBackup(); tx.set(jobRef, next); return next;
  });
  const start = mode === 'apply' ? lease.next : lease.restored;
  const total = mode === 'apply' ? manifest.items.length : lease.next;
  let changed = 0;
  for (let index = start; index < Math.min(total, start + maxItems); index++) {
    const item = manifest.items[index], ref = db.doc(`${root}/episodes/episodes/${item.id}`), receipt = receiptRef(db, jobPath, index, mode);
    await db.runTransaction(async tx => {
      await readCommentCountFence(tx, db, root);
      const [job, current, program, priorReceipt] = await Promise.all([tx.get(jobRef), tx.get(ref), tx.get(programRef), tx.get(receipt)]);
      if (!job.exists || job.get('owner') !== owner || job.get('generation') !== lease.generation || job.get('runId') !== manifest.runId ||
          job.get('leaseUntil') <= now() || job.get('status') !== (mode === 'apply' ? 'applying' : 'restoring') || job.get(mode === 'apply' ? 'next' : 'restored') !== index ||
          !validProgram(program) || !current.exists || priorReceipt.exists || current.get('adminDeletionToken') ||
          current.get('programId') !== programId || current.get('stationId') !== program.get('stationId') ||
          !same(encodeCleanupValue(current.createTime), item.beforeCreateTime)) fail();
      if (mode === 'apply') {
        if (fingerprint(current.data()) !== item.beforeFingerprint || !same(encodeCleanupValue(current.updateTime), item.beforeVersion)) fail();
      } else assertReceipt(manifest, item, index, 'apply', current, await tx.get(receiptRef(db, jobPath, index, 'apply')));
      const resulting = { ...current.data(), audioUrl: mode === 'apply' ? item.afterUrl : item.beforeUrl };
      if (fingerprint(resulting) !== (mode === 'apply' ? item.afterFingerprint : item.beforeFingerprint)) fail();
      const identity = await prepareRssIdentities(tx, db, { root, programId, stationId: program.get('stationId'), id: item.id,
        audioUrls: [item.beforeUrl, item.afterUrl], externalIds: item.externalIds, candidateIds: [item.id] });
      if (!identity.existing || identity.id !== item.id) fail();
      for (const reservation of item.reservations) {
        const value = await tx.get(db.doc(`${root}/importKeys/importKeys/${reservation.key}`));
        if (mode === 'apply' && !same(value.exists ? encodeCleanupValue(value.data()) : null, reservation.before)) fail();
        if (mode === 'restore' && (!value.exists || !ownsAlias(value.data(), reservation.key, item.id))) fail();
      }
      // File integrity, recovery window and custody are rechecked after all reads,
      // inside every retried mutation transaction, immediately before its writes.
      await verifyBackup();
      if (mode === 'apply') for (const write of identity.writes) write();
      tx.update(ref, { audioUrl: mode === 'apply' ? item.afterUrl : item.beforeUrl });
      tx.create(receipt, receiptData(manifest, item, index, mode));
      tx.update(jobRef, { [mode === 'apply' ? 'next' : 'restored']: index + 1,
        status: index + 1 === total ? (mode === 'apply' ? 'applied' : 'restored') : (mode === 'apply' ? 'applying' : 'restoring'), leaseUntil: now() + 120000 });
    });
    changed++; await afterCommit(index);
  }
  const job = await db.runTransaction(async tx => {
    await readCommentCountFence(tx, db, root);
    const [snapshot, program] = await Promise.all([tx.get(jobRef), tx.get(programRef)]), current = snapshot.exists ? snapshot.data() : null;
    validateJob(current);
    if (!validProgram(program) || current.owner !== owner || current.generation !== lease.generation || current.leaseUntil <= now()) fail();
    await verifyPrefix(tx, current); await verifyBackup(); return current;
  });
  const cursor = mode === 'apply' ? job.next : job.restored;
  return { mode, changed, completed: cursor === total, total, remaining: Math.max(0, total - cursor) };
}

export function parseRssRepairArgs(args) {
  const options = { mode: 'preview' }, names = { '--project': 'projectId', '--root': 'root', '--program': 'programId',
    '--backup-dir': 'directory', '--key-file': 'keyFile', '--expires-at': 'expiresAt', '--manifest': 'manifestHash', '--max-records': 'maxRecords', '--max-items': 'maxItems', '--cursor': 'cursor' };
  let selected;
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (['--dry-run', '--apply', '--restore'].includes(key)) { if (selected) fail(); selected = key; options.mode = key === '--dry-run' ? 'preview' : key.slice(2); }
    else if (names[key] && options[names[key]] === undefined && args[index + 1] && !args[index + 1].startsWith('--')) options[names[key]] = args[++index];
    else fail();
  }
  options.maxRecords = Number(options.maxRecords ?? 100); options.maxItems = Number(options.maxItems ?? 25);
  options.expiresAt = Number(options.expiresAt);
  target(options, { projectId: options.projectId }); bounds(options);
  if (!options.directory || !options.keyFile || !Number.isSafeInteger(options.expiresAt) ||
      (options.mode !== 'preview' && !HEX.test(options.manifestHash ?? ''))) fail();
  return options;
}

async function main() {
  const options = parseRssRepairArgs(process.argv.slice(2));
  if (options.mode !== 'preview') mutableDemo(options, process.env.FIRESTORE_EMULATOR_HOST);
  const keyStat = await lstat(options.keyFile);
  if (!keyStat.isFile() || keyStat.isSymbolicLink() || (keyStat.mode & 0o077) !== 0 || (process.getuid && keyStat.uid !== process.getuid())) fail();
  const keyHandle = await open(options.keyFile, constants.O_RDONLY | constants.O_NOFOLLOW);
  let key; try {
    const stat = await keyHandle.stat();
    if (!stat.isFile() || (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid())) fail();
    key = await keyHandle.readFile();
  } finally { await keyHandle.close(); }
  const store = await RssRepairBackupStore.open({ directory: options.directory, key, expiresAt: options.expiresAt });
  const { initializeApp } = require('firebase-admin/app');
  const db = options.mode === 'preview'
    ? require('firebase-admin/firestore').getFirestore(initializeApp({ projectId: options.projectId }))
    : createRssDemoFirestore({ projectId: options.projectId });
  if (options.mode === 'preview') {
    const program = await db.doc(`${options.root}/programs/programs/${options.programId}`).get();
    if (!program.exists) fail();
    const manifest = await previewRssRepairs(options, db, await fetchAndParseRss(program.get('rssFeedUrl')));
    await store.put(manifest);
    console.log(JSON.stringify({ mode: 'preview', examined: manifest.read, candidates: manifest.items.length, blockers: manifest.blockers.length, hasMore: manifest.hasMore, manifestHash: manifest.runId }));
  } else {
    const manifest = await store.get(options.manifestHash);
    console.log(JSON.stringify(await executeRssRepair(options, db, { manifest, store, reviewedHash: options.manifestHash })));
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('RSS repair stopped: scope, backup or source preconditions were not satisfied.'); process.exitCode = 1;
});
